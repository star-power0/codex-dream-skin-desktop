import { EventEmitter } from 'node:events';
import { detectCodex, startCodexTheming, stopCodexTheming } from './codex-bridge';
import type { DetectResult } from './codex-bridge';
import { buildCdpPortCandidates, readCodexPlusPlusLaunchStatus } from './codex-plusplus-status';
import { discoverCdpEndpoint } from './cdp-discovery';
import type { VerifiedCdpEndpoint } from './cdp-discovery';
import { InjectionManager } from './injection-manager';
import { listSavedThemes, readActiveTheme, writeActiveTheme } from '../shared/theme-store';
import type { CodexConnectionState, RendererSnapshot, ThemeSummary } from '../shared/ipc-contract';

const CODEX_BRIDGE_PORT = 9335;
const POLL_INTERVAL_MS = 4000;

export class DreamSkinController extends EventEmitter {
  private connection: CodexConnectionState = { status: 'not-installed' };
  private busy = false;
  private themes: ThemeSummary[] = [];
  private activeThemeId: string | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private polling = false;
  private stopped = false;
  private injectionManager: InjectionManager | null = null;

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
    this.injectionManager?.stop();
    this.injectionManager = null;
  }

  private sameEndpoint(endpoint: VerifiedCdpEndpoint): boolean {
    const current = this.injectionManager?.getEndpoint();
    return current?.port === endpoint.port
      && current.browserId === endpoint.browserId
      && current.targetId === endpoint.targetId;
  }

  private async startInjectionManagerIfNeeded(endpoint: VerifiedCdpEndpoint): Promise<void> {
    if (this.sameEndpoint(endpoint)) return;
    this.stopInjectionManager();
    const activeTheme = this.themes.find((theme) => theme.active) ?? this.themes[0];
    if (!activeTheme) return;
    const manager = new InjectionManager(endpoint);
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

  async refreshThemesNow(): Promise<RendererSnapshot> {
    await this.refreshThemes();
    this.emitSnapshot();
    return this.getSnapshot();
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

  private async discoverRunningEndpoint(): Promise<{ endpoint: VerifiedCdpEndpoint | null; hasCodexPlusPlusStatus: boolean; statusPort?: number }> {
    const status = await readCodexPlusPlusLaunchStatus();
    const endpoint = await discoverCdpEndpoint(buildCdpPortCandidates(status));
    return { endpoint, hasCodexPlusPlusStatus: status !== null, statusPort: status?.debugPort };
  }

  private connectedState(endpoint: VerifiedCdpEndpoint): CodexConnectionState {
    return {
      status: 'connected',
      host: endpoint.host,
      port: endpoint.port,
      portSource: endpoint.source,
      browserId: endpoint.browserId,
      targetId: endpoint.targetId,
    };
  }

  private async poll(): Promise<void> {
    if (this.stopped || this.busy || this.polling) return;
    this.polling = true;
    try {
      const discovered = await this.discoverRunningEndpoint();
      if (discovered.endpoint) {
        await this.startInjectionManagerIfNeeded(discovered.endpoint);
        this.connection = this.connectedState(discovered.endpoint);
        this.emitSnapshot();
        return;
      }

      if (this.connection.status === 'connected' && this.injectionManager?.isSessionAlive()) {
        this.emitSnapshot();
        return;
      }
      this.stopInjectionManager();

      const result = await detectCodex(CODEX_BRIDGE_PORT).catch((error: Error): DetectResult | null => {
        this.connection = { status: 'error', message: error.message };
        return null;
      });
      if (!result) { this.emitSnapshot(); return; }
      if (!result.installed) {
        this.connection = { status: 'not-installed' };
        this.emitSnapshot();
        return;
      }
      if (result.running) {
        this.connection = { status: 'running-unthemed' };
        this.emitSnapshot();
        return;
      }
      if (discovered.hasCodexPlusPlusStatus) {
        this.connection = { status: 'codexplusplus-not-running', port: discovered.statusPort };
        this.emitSnapshot();
        return;
      }
      await this.connect(false);
    } finally {
      this.polling = false;
    }
  }

  async connect(restartExisting: boolean): Promise<{ ok: boolean; error?: string }> {
    if (this.busy) return { ok: false, error: 'Another operation is already running.' };
    if (this.connection.status === 'codexplusplus-not-running') {
      return {
        ok: false,
        error: 'Codex++ is attach-only. Start Codex from the Codex++ launcher, then this app will connect automatically.',
      };
    }
    this.busy = true;
    this.connection = { status: 'connecting' };
    this.emitSnapshot();
    try {
      const result = await startCodexTheming(CODEX_BRIDGE_PORT, restartExisting);
      if (!result.ok || !result.browserId) {
        this.connection = result.needsRestart
          ? { status: 'running-unthemed' }
          : { status: 'error', message: result.error ?? 'Failed to start theming.' };
        return { ok: false, error: result.error };
      }

      const endpoint = await discoverCdpEndpoint([{ port: result.port ?? CODEX_BRIDGE_PORT, source: 'codexbridge-default', host: 'codexbridge' }]);
      if (!endpoint) {
        this.connection = { status: 'error', message: 'Codex started, but its verified renderer is not ready yet.' };
        return { ok: false, error: 'Codex renderer is not ready yet.' };
      }
      await this.startInjectionManagerIfNeeded(endpoint);
      this.connection = this.connectedState(endpoint);
      return { ok: true };
    } catch (error) {
      this.connection = { status: 'error', message: (error as Error).message };
      return { ok: false, error: (error as Error).message };
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
      const endpoint = this.injectionManager?.getEndpoint();
      this.stopInjectionManager();
      if (endpoint?.host === 'codexbridge') await stopCodexTheming(endpoint.port);
      this.connection = { status: 'not-running' };
      return { ok: true };
    } finally {
      this.busy = false;
      this.emitSnapshot();
    }
  }

  async applyTheme(themeId: string): Promise<{ ok: boolean; error?: string }> {
    if (this.busy) return { ok: false, error: 'Another operation is already running.' };
    const theme = this.themes.find((candidate) => candidate.id === themeId);
    if (!theme) return { ok: false, error: 'Unknown theme.' };
    if (!this.injectionManager) return { ok: false, error: 'No verified Codex renderer is connected.' };

    this.busy = true;
    this.emitSnapshot();
    try {
      const injectResult = await this.injectionManager.applyTheme(theme.directory);
      if (!injectResult.ok) return injectResult;
      await writeActiveTheme(theme.directory).catch(() => { /* Theme persistence is best-effort. */ });
      this.activeThemeId = theme.id;
      this.themes = this.themes.map((candidate) => ({ ...candidate, active: candidate.id === theme.id }));
      const endpoint = this.injectionManager.getEndpoint();
      this.connection = this.connectedState(endpoint);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    } finally {
      this.busy = false;
      this.emitSnapshot();
    }
  }
}
