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

  useEffect(() => {
    void window.dreamSkin.getSnapshot().then(setSnapshot);
    return window.dreamSkin.onSnapshot(setSnapshot);
  }, []);

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
        <ConnectionBar connection={snapshot.connection} busy={snapshot.busy} />
      </header>
      <main className="app-main">
        <ThemeGallery themes={snapshot.themes} busy={snapshot.busy} />
      </main>
    </div>
  );
}
