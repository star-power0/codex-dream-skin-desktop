import { useEffect, useState } from 'react';
import type { RendererSnapshot } from '../shared/ipc-contract';
import { ThemeGallery } from './ThemeGallery';
import { ConnectionBar } from './ConnectionBar';
import appIcon from '../../assets/app-icon.png';

const EMPTY_SNAPSHOT: RendererSnapshot = {
  connection: { status: 'not-installed' },
  themes: [],
  busy: false,
};

export function App() {
  const [snapshot, setSnapshot] = useState<RendererSnapshot>(EMPTY_SNAPSHOT);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void window.dreamSkin.getSnapshot().then(setSnapshot);
    return window.dreamSkin.onSnapshot(setSnapshot);
  }, []);

  async function handleRefreshThemes() {
    setRefreshing(true);
    try {
      setSnapshot(await window.dreamSkin.refreshThemes());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img className="brand-mark" src={appIcon} alt="" aria-hidden="true" />
          <div>
            <h1>Codex Dream Skin</h1>
            <p className="brand-sub">给 Codex 桌面端换一张会呼吸的脸</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-action"
            disabled={refreshing}
            onClick={handleRefreshThemes}
          >
            {refreshing ? '正在刷新…' : '刷新主题库'}
          </button>
          <ConnectionBar connection={snapshot.connection} busy={snapshot.busy} />
        </div>
      </header>
      <main className="app-main">
        <ThemeGallery themes={snapshot.themes} busy={snapshot.busy} />
      </main>
    </div>
  );
}
