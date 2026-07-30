import { contextBridge, ipcRenderer } from 'electron';
import type { DreamSkinApi, RendererSnapshot } from './shared/ipc-contract';

const api: DreamSkinApi = {
  getSnapshot: () => ipcRenderer.invoke('dream-skin:get-snapshot'),
  onSnapshot: (listener: (snapshot: RendererSnapshot) => void) => {
    const handler = (_event: unknown, snapshot: RendererSnapshot) => listener(snapshot);
    ipcRenderer.on('dream-skin:snapshot', handler);
    return () => ipcRenderer.removeListener('dream-skin:snapshot', handler);
  },
  applyTheme: (themeId: string) => ipcRenderer.invoke('dream-skin:apply-theme', themeId),
  connectCodex: (restartExisting: boolean) => ipcRenderer.invoke('dream-skin:connect', restartExisting),
  disconnectCodex: () => ipcRenderer.invoke('dream-skin:disconnect'),
  refreshThemes: () => ipcRenderer.invoke('dream-skin:refresh-themes'),
};

contextBridge.exposeInMainWorld('dreamSkin', api);
