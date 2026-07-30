import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

// Resolve vendor path the same way codex-bridge does.
function vendorPath(...segments: string[]): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'vendor')
    : path.join(__dirname, '..', '..', 'vendor');
  return path.join(base, ...segments);
}

// Dynamically import loadPayload from the vendored injector at runtime.
async function importLoadPayload(): Promise<(themeDir: string) => Promise<{ payload: string; revision: string }>> {
  const injectorPath = vendorPath('scripts', 'injector.mjs');
  const mod = await import(/* webpackIgnore: true */ `file:///${injectorPath.replace(/\\/g, '/')}`);
  return mod.loadPayload;
}

interface SelectorEntry { key: string; selector: string; tier: string; required: boolean }

// Loaded once from vendor's selectors.json (the same file the vendored
// injector.mjs itself reads) so the Codex-shell probe below uses the exact
// same anchors instead of a hand-guessed selector list.
let codexShellSelectorsCache: string[] | null = null;
async function codexShellSelectors(): Promise<string[]> {
  if (codexShellSelectorsCache) return codexShellSelectorsCache;
  const raw = await fs.readFile(vendorPath('assets', 'selectors.json'), 'utf8');
  const doc = JSON.parse(raw) as { selectors: SelectorEntry[] };
  codexShellSelectorsCache = doc.selectors
    .filter((entry) => entry.tier === 'L1' && entry.required && entry.key !== 'home-icon' && entry.key !== 'home-route')
    .map((entry) => entry.selector);
  return codexShellSelectorsCache;
}

interface CdpTarget {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

// Minimal CDP session over a loopback WebSocket, using Electron's Node
// runtime's built-in global WebSocket (same as the vendored injector.mjs --
// no external `ws` package, which packaged Electron builds can't resolve
// unless it's separately vendored into node_modules).
class CdpSession {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve(v: unknown): void; reject(e: Error): void; timer: NodeJS.Timeout }>();
  closed = false;

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
  }

  async open(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => { this.ws.close(); reject(new Error('CDP WS open timed out')); }, 5_000);
      this.ws.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
      this.ws.addEventListener('error', () => { clearTimeout(t); reject(new Error('CDP WS open failed')); }, { once: true });
    });
    this.ws.addEventListener('message', (event) => this.onMessage(String(event.data)));
    this.ws.addEventListener('close', () => this.onClose(), { once: true });
    this.ws.addEventListener('error', () => this.onClose(), { once: true });
    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  private onMessage(data: string): void {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(data); } catch { this.close(); return; }
    if (typeof msg.id === 'number') {
      const p = this.pending.get(msg.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(String((msg.error as Record<string, unknown>).message ?? 'CDP error')));
      else p.resolve(msg.result);
    }
  }

  private onClose(): void {
    this.closed = true;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('CDP session closed')); }
    this.pending.clear();
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('CDP session is closed'));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10_000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err as Error);
      }
    });
  }

  async evaluate(expression: string): Promise<unknown> {
    const result = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true, userGesture: false,
    }) as Record<string, unknown>;
    if (result.exceptionDetails) {
      const ex = result.exceptionDetails as Record<string, unknown>;
      throw new Error(`Renderer eval failed: ${(ex.exception as Record<string, unknown>)?.description ?? ex.text}`);
    }
    return (result.result as Record<string, unknown>)?.value;
  }

  close(): void {
    if (!this.closed) { try { this.ws.close(); } catch {} }
    this.onClose();
  }
}

async function fetchTargets(port: number): Promise<CdpTarget[]> {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(2_000), redirect: 'error',
  });
  if (!res.ok) throw new Error(`CDP /json/list HTTP ${res.status}`);
  const list = await res.json() as unknown[];
  return list.filter((t): t is CdpTarget =>
    !!t && typeof t === 'object' &&
    (t as CdpTarget).type === 'page' &&
    typeof (t as CdpTarget).webSocketDebuggerUrl === 'string' &&
    ((t as CdpTarget).url?.startsWith('app://') ?? false),
  );
}

// Same probe intent as vendor's private probeSession(): confirm this is the
// Codex shell before touching it, using the L1-required selectors from the
// shared selectors.json contract rather than a guessed selector list.
async function isCodexTarget(session: CdpSession): Promise<boolean> {
  try {
    const selectors = await codexShellSelectors();
    const result = await session.evaluate(`(function(){
      const selectors = ${JSON.stringify(selectors)};
      return location.protocol === 'app:' && selectors.every((sel) => document.querySelector(sel));
    })()`);
    return result === true;
  } catch {
    return false;
  }
}

// Manages the live CDP connection + theme injection.
// Replaces the old utilityProcess.fork(injector.mjs) approach entirely.
export class InjectionManager {
  private session: CdpSession | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  private currentThemeDir: string | null = null;
  private currentRevision: string | null = null;
  private loadPayloadFn: ((themeDir: string) => Promise<{ payload: string; revision: string }>) | null = null;

  constructor(
    private readonly port: number,
    private readonly browserId: string,
  ) {}

  async start(initialThemeDir: string): Promise<void> {
    this.currentThemeDir = initialThemeDir;
    this.loadPayloadFn = await importLoadPayload();
    await this.tryConnect();
    this.pollTimer = setInterval(() => { void this.poll(); }, 2_000);
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.session?.close();
    this.session = null;
  }

  // Apply a new theme immediately.
  async applyTheme(themeDir: string): Promise<{ ok: boolean; error?: string }> {
    this.currentThemeDir = themeDir;
    this.currentRevision = null; // force re-inject on next poll too
    return this.inject(themeDir);
  }

  private async poll(): Promise<void> {
    if (this.stopped) return;
    if (!this.session || this.session.closed) {
      await this.tryConnect();
    }
  }

  private async tryConnect(): Promise<void> {
    try {
      const targets = await fetchTargets(this.port);
      for (const target of targets) {
        if (this.stopped) return;
        let session: CdpSession | null = null;
        try {
          session = new CdpSession(target.webSocketDebuggerUrl);
          await session.open();
          if (!await isCodexTarget(session)) { session.close(); continue; }
          this.session = session;
          // Inject current theme right away on fresh connect.
          if (this.currentThemeDir) await this.inject(this.currentThemeDir);
          return;
        } catch {
          session?.close();
        }
      }
    } catch {
      // CDP not yet available; poll will retry.
    }
  }

  // Ground truth for whether theming is actually working right now --
  // independent of bridge.ps1's detect call, which only re-verifies package
  // identity and can time out on a slow CIM session even while this live
  // WebSocket keeps working fine.
  isSessionAlive(): boolean {
    return !this.stopped && this.session !== null && !this.session.closed;
  }

  private async inject(themeDir: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.loadPayloadFn) return { ok: false, error: 'InjectionManager not started' };
    if (!this.session || this.session.closed) return { ok: false, error: 'No active CDP session' };
    try {
      const loaded = await this.loadPayloadFn(themeDir);
      if (loaded.revision === this.currentRevision) return { ok: true };
      await this.session.evaluate(loaded.payload);
      this.currentRevision = loaded.revision;
      return { ok: true };
    } catch (err) {
      this.session?.close();
      this.session = null;
      return { ok: false, error: (err as Error).message };
    }
  }
}
