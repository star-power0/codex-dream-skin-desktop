export type CodexHostKind = 'codexbridge' | 'codexplusplus';

export type CdpPortSource =
  | 'codexplusplus-status'
  | 'codexplusplus-default'
  | 'codexbridge-default';

export interface ThemeSummary {
  id: string;
  name: string;
  appearance: 'auto' | 'light' | 'dark';
  directory: string;
  imageUrl: string;
  tagline?: string;
  active: boolean;
}

export type CodexConnectionState =
  | { status: 'not-installed' }
  | { status: 'not-running' }
  | { status: 'codexplusplus-not-running'; port?: number }
  | { status: 'running-unthemed' }
  | { status: 'connecting' }
  | {
    status: 'connected';
    host: CodexHostKind;
    port: number;
    portSource: CdpPortSource;
    browserId: string;
    targetId: string;
  }
  | { status: 'error'; message: string };

export interface RendererSnapshot {
  connection: CodexConnectionState;
  themes: ThemeSummary[];
  busy: boolean;
}

export interface DreamSkinApi {
  getSnapshot(): Promise<RendererSnapshot>;
  onSnapshot(listener: (snapshot: RendererSnapshot) => void): () => void;
  applyTheme(themeId: string): Promise<{ ok: boolean; error?: string }>;
  connectCodex(restartExisting: boolean): Promise<{ ok: boolean; error?: string }>;
  disconnectCodex(): Promise<{ ok: boolean }>;
  refreshThemes(): Promise<RendererSnapshot>;
}

declare global {
  interface Window {
    dreamSkin: DreamSkinApi;
  }
}
