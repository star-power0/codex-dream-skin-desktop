import path from 'node:path';
import { app } from 'electron';
import type { VerifiedCdpEndpoint } from './cdp-discovery';
import { probeCdpEndpoint } from './cdp-discovery';

function vendorPath(...segments: string[]): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'vendor')
    : path.join(__dirname, '..', '..', 'vendor');
  return path.join(base, ...segments);
}

async function importLoadPayload(): Promise<(themeDir: string) => Promise<{ payload: string; revision: string }>> {
  const injectorPath = vendorPath('scripts', 'injector.mjs');
  const mod = await import(/* webpackIgnore: true */ `file:///${injectorPath.replace(/\\/g, '/')}`);
  return mod.loadPayload;
}

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
      const timer = setTimeout(() => { this.ws.close(); reject(new Error('CDP WebSocket open timed out')); }, 5_000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP WebSocket open failed')); }, { once: true });
    });
    this.ws.addEventListener('message', (event) => this.onMessage(String(event.data)));
    this.ws.addEventListener('close', () => this.onClose(), { once: true });
    this.ws.addEventListener('error', () => this.onClose(), { once: true });
    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  private onMessage(data: string): void {
    let message: Record<string, unknown>;
    try { message = JSON.parse(data); } catch { this.close(); return; }
    if (typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(String((message.error as Record<string, unknown>).message ?? 'CDP error')));
    else pending.resolve(message.result);
  }

  private onClose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('CDP session closed'));
    }
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
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error as Error);
      }
    });
  }

  async evaluate(expression: string): Promise<unknown> {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    }) as Record<string, unknown>;
    if (result.exceptionDetails) {
      const exception = result.exceptionDetails as Record<string, unknown>;
      throw new Error(`Renderer eval failed: ${(exception.exception as Record<string, unknown>)?.description ?? exception.text}`);
    }
    return (result.result as Record<string, unknown>)?.value;
  }

  close(): void {
    if (!this.closed) {
      try { this.ws.close(); } catch { /* WebSocket is already closing. */ }
    }
    this.onClose();
  }
}

// Owns one verified renderer target. It keeps all theme parsing in the vendored
// injector and only handles delivery, renderer replacement, and Codex++ takeover.
export class InjectionManager {
  private session: CdpSession | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  private currentThemeDir: string | null = null;
  private currentRevision: string | null = null;
  private loadPayloadFn: ((themeDir: string) => Promise<{ payload: string; revision: string }>) | null = null;

  constructor(private endpoint: VerifiedCdpEndpoint) {}

  async start(initialThemeDir: string): Promise<void> {
    this.currentThemeDir = initialThemeDir;
    this.loadPayloadFn = await importLoadPayload();
    await this.tryConnect();
    this.pollTimer = setInterval(() => { void this.poll(); }, 2_000);
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.session?.close();
    this.session = null;
  }

  getEndpoint(): VerifiedCdpEndpoint {
    return this.endpoint;
  }


  async applyTheme(themeDir: string): Promise<{ ok: boolean; error?: string }> {
    this.currentThemeDir = themeDir;
    this.currentRevision = null;
    return this.inject(themeDir);
  }

  private async poll(): Promise<void> {
    if (this.stopped) return;
    if (!this.session || this.session.closed) {
      await this.tryConnect();
      return;
    }
    if (!this.currentThemeDir) return;
    if (!this.currentRevision) {
      await this.inject(this.currentThemeDir, true);
    }
  }


  private async tryConnect(): Promise<void> {
    try {
      const verified = await probeCdpEndpoint({
        port: this.endpoint.port,
        source: this.endpoint.source,
        host: this.endpoint.host,
      });
      if (!verified || verified.browserId !== this.endpoint.browserId || verified.targetId !== this.endpoint.targetId) return;

      const session = new CdpSession(this.endpoint.targetWebSocketUrl);
      await session.open();
      this.session = session;
      if (this.currentThemeDir) await this.inject(this.currentThemeDir, true);
    } catch {
      this.session?.close();
      this.session = null;
    }
  }

  isSessionAlive(): boolean {
    return !this.stopped && this.session !== null && !this.session.closed;
  }

  private async inject(themeDir: string, force = false): Promise<{ ok: boolean; error?: string }> {
    if (!this.loadPayloadFn) return { ok: false, error: 'Injection manager has not started.' };
    if (!this.session || this.session.closed) return { ok: false, error: 'No active Codex renderer session.' };
    try {
      const loaded = await this.loadPayloadFn(themeDir);
      if (!force && loaded.revision === this.currentRevision) return { ok: true };
      await this.session.evaluate(loaded.payload);
      this.currentRevision = loaded.revision;
      return { ok: true };
    } catch (error) {
      this.session.close();
      this.session = null;
      return { ok: false, error: (error as Error).message };
    }
  }

}
