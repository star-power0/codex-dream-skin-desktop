import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { DreamSkinController } from './main/dream-skin-controller';

if (started) {
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
const controller = new DreamSkinController();

protocol.registerSchemesAsPrivileged([
  { scheme: 'dream-skin-asset', privileges: { secure: true, supportFetchAPI: true } },
]);

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1160,
    height: 760,
    minWidth: 920,
    minHeight: 600,
    show: false,
    backgroundColor: '#15161a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.on('ready-to-show', () => window.show());
  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  return window;
}

function createTray(): void {
  // In dev, assets/ sits at the project root; packaged builds ship it via
  // extraResource (same mechanism as vendor/), landing in resources/assets.
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'tray-icon.png')
    : path.join(__dirname, '..', '..', 'assets', 'tray-icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Codex Dream Skin');
  refreshTrayMenu();
  tray.on('double-click', () => mainWindow?.show());
}

function refreshTrayMenu(): void {
  if (!tray) return;
  const snapshot = controller.getSnapshot();
  const connectionLabel = snapshot.connection.status === 'connected'
    ? `已连接 ${snapshot.connection.host === 'codexplusplus' ? 'Codex++' : 'Codex'} · ${snapshot.connection.port}`
    : '未连接 Codex';
  const themeItems = snapshot.themes.map((theme) => ({
    label: theme.name,
    type: 'radio' as const,
    checked: theme.active,
    click: () => controller.applyTheme(theme.id),
  }));

  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: '打开主题库', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: connectionLabel, enabled: false },
    { label: '切换主题', submenu: themeItems.length > 0 ? themeItems : [{ label: '暂无已保存主题', enabled: false }] },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

app.whenReady().then(() => {
  protocol.handle('dream-skin-asset', (request) => {
    const encodedPath = request.url.slice('dream-skin-asset://'.length);
    const filePath = decodeURIComponent(encodedPath);
    return net.fetch(`file://${filePath.replace(/\\/g, '/')}`);
  });

  mainWindow = createWindow();
  createTray();

  controller.on('snapshot', (snapshot) => {
    mainWindow?.webContents.send('dream-skin:snapshot', snapshot);
    refreshTrayMenu();
  });
  void controller.start();

  ipcMain.handle('dream-skin:get-snapshot', () => controller.getSnapshot());
  ipcMain.handle('dream-skin:apply-theme', (_event, themeId: string) => controller.applyTheme(themeId));
  ipcMain.handle('dream-skin:connect', (_event, restartExisting: boolean) => controller.connect(restartExisting));
  ipcMain.handle('dream-skin:disconnect', () => controller.disconnect());
  ipcMain.handle('dream-skin:refresh-themes', () => controller.refreshThemesNow());
});

app.on('window-all-closed', () => {
  // Tray-resident app: closing the window must not quit the process.
});

app.on('before-quit', () => {
  isQuitting = true;
  controller.stop();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('second-instance', () => {
  mainWindow?.show();
  mainWindow?.focus();
});
