import { EventEmitter } from 'node:events';
import { detectCodex, startCodexTheming, stopCodexTheming } from './codex-bridge';
import type { DetectResult } from './codex-bridge';
import { InjectionManager } from './injection-manager';
import { listSavedThemes, readActiveTheme, writeActiveTheme } from '../shared/theme-store';
import type { CodexConnectionState, RendererSnapshot, ThemeSummary } from '../shared/ipc-contract';

const CDP_PORT = 9335;
const POLL_INTERVAL_MS = 4000;

// Auto-attach: unlike the PowerShell tray (which requires a manual "apply"
// click), this poller notices a plain Codex launch and connects on its own.
// It cannot theme an already-running unthemed Codex without a restart --
// that CDP flag has to be present at process start -- so it only auto-starts
// theming when Codex isn't running yet, or already exposes the debug port.
export class DreamSkinController extends EventEmitter {
  private connection: CodexConnectionState = { status: 'not-installed' };
  private busy = false;
  private themes: ThemeSummary[] = [];
  private activeThemeId: string | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  private injectionManager: InjectionManager | null = null;
  private cdpPort: number | null = null;
  private cdpBrowserId: string | null = null;

  async start(): Promise<void> {
    await this.refreshThemes();
    void this.poll();
    this.pollTimer = setInterval(() => { void this.poll(); }, POLL_INTERVAL_MS);
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.stopInjectionManager();
  }

  private stopInjectionManager(): void {
    if (this.injectionManager) {
      this.injectionManager.stop();
      this.injectionManager = null;
    }
  }

  private async startInjectionManagerIfNeeded(port: number, browserId: string): Promise<void> {
    this.cdpPort = port;
    this.cdpBrowserId = browserId;
    if (this.injectionManager) return;
    // Fall back to the first saved theme when nothing is marked active yet
    // (fresh install) -- there's always something to inject once a theme exists.
    const activeTheme = this.themes.find((t) => t.active) ?? this.themes[0];
    if (!activeTheme) return;
    const manager = new InjectionManager(port, browserId);
    this.injectionManager = manager;
    await manager.start(activeTheme.directory);
  }

  getSnapshot(): RendererSnapshot {
    return {
      connection: this.connection,
      themes: this.themes,
      busy: this.busy,
    };
  }

  private emitSnapshot(): void {
    this.emit('snapshot', this.getSnapshot());
  }

  private async refreshThemes(): Promise<void> {
    const [saved, active] = await Promise.all([listSavedThemes(), readActiveTheme()]);
    this.activeThemeId = active?.id ?? null;
    this.themes = saved.map((theme) => ({
      id: theme.id,
      name: theme.name,
      appearance: theme.appearance,
      directory: theme.directory,
      imageUrl: `dream-skin-asset://${encodeURIComponent(theme.imagePath)}`,
      tagline: theme.tagline,
      active: theme.id === this.activeThemeId,
    }));
  }

  private async poll(): Promise<void> {
    if (this.stopped || this.busy) return;
    if (this.connection.status === 'connected') {
      const still = await detectCodex(CDP_PORT).catch((): DetectResult | null => null);
      if (still?.cdpActive) return;
      this.stopInjectionManager();
      this.connection = { status: 'not-running' };
      this.emitSnapshot();
    }

    const result = await detectCodex(CDP_PORT).catch((err: Error): DetectResult | null => {
      this.connection = { status: 'error', message: err.message };
      return null;
    });
    if (!result) { this.emitSnapshot(); return; }
    if (!result.installed) {
      this.connection = { status: 'not-installed' };
      this.emitSnapshot();
      return;
    }
    if (result.cdpActive && result.browserId) {
      const port = result.port ?? CDP_PORT;
      this.connection = { status: 'connected', port, browserId: result.browserId };
      await this.startInjectionManagerIfNeeded(port, result.browserId);
      this.emitSnapshot();
      return;
    }
    if (!result.running) {
      await this.connect(false);
      return;
    }
    this.connection = { status: 'running-unthemed' };
    this.emitSnapshot();
  }

  async connect(restartExisting: boolean): Promise<{ ok: boolean; error?: string }> {
    if (this.busy) return { ok: false, error: 'Another operation is already running.' };
    this.busy = true;
    this.connection = { status: 'connecting' };
    this.emitSnapshot();
    try {
      const result = await startCodexTheming(CDP_PORT, restartExisting);
      if (!result.ok || !result.browserId) {
        this.connection = result.needsRestart
          ? { status: 'running-unthemed' }
          : { status: 'error', message: result.error ?? 'Failed to start theming.' };
        return { ok: false, error: result.error };
      }
      const port = result.port ?? CDP_PORT;
      this.connection = { status: 'connected', port, browserId: result.browserId };
      await this.startInjectionManagerIfNeeded(port, result.browserId);
      return { ok: true };
    } catch (err) {
      this.connection = { status: 'error', message: (err as Error).message };
      return { ok: false, error: (err as Error).message };
    } finally {
      this.busy = false;
      this.emitSnapshot();
    }
  }

  async disconnect(): Promise<{ ok: boolean }> {
    if (this.busy) return { ok: false };
    this.busy = true;
    this.emitSnapshot();
    try {
      await stopCodexTheming(CDP_PORT);
      this.stopInjectionManager();
      this.connection = { status: 'not-running' };
      return { ok: true };
    } finally {
      this.busy = false;
      this.emitSnapshot();
    }
  }

  async applyTheme(themeId: string): Promise<{ ok: boolean; error?: string }> {
    if (this.busy) return { ok: false, error: 'Another operation is already running.' };
    const theme = this.themes.find((t) => t.id === themeId);
    if (!theme) return { ok: false, error: 'Unknown theme.' };
    this.busy = true;
    this.emitSnapshot();
    try {
      // Inject directly via the live CDP session — no file-system round-trip.
      // Lazily create the manager here too: it's normally started once a
      // theme is already active, but a fresh install has none yet, so the
      // very first click needs to bootstrap it itself.
      if (!this.injectionManager && this.cdpPort && this.cdpBrowserId) {
        const manager = new InjectionManager(this.cdpPort, this.cdpBrowserId);
        this.injectionManager = manager;
        await manager.start(theme.directory);
      } else if (this.injectionManager) {
        const injectResult = await this.injectionManager.applyTheme(theme.directory);
        if (!injectResult.ok) return injectResult;
      }
      // Persist the selection so the next cold start knows which theme was active.
      await writeActiveTheme(theme.directory).catch(() => {});
      this.activeThemeId = theme.id;
      this.themes = this.themes.map((t) => ({ ...t, active: t.id === theme.id }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    } finally {
      this.busy = false;
      this.emitSnapshot();
    }
  }
}
