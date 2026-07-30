import { useState } from 'react';
import type { ThemeSummary } from '../shared/ipc-contract';

export function ThemeGallery({ themes, busy }: { themes: ThemeSummary[]; busy: boolean }) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleApply(themeId: string) {
    setPendingId(themeId);
    try {
      await window.dreamSkin.applyTheme(themeId);
    } finally {
      setPendingId(null);
    }
  }

  if (themes.length === 0) {
    return (
      <div className="empty-gallery">
        <p>还没有已保存的主题。</p>
        <p className="empty-gallery-hint">
          用 Dream Skin Theme Designer 生成的主题会出现在这里。
        </p>
      </div>
    );
  }

  return (
    <div className="theme-gallery">
      {themes.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          disabled={busy}
          pending={pendingId === theme.id}
          onApply={() => handleApply(theme.id)}
        />
      ))}
    </div>
  );
}

function ThemeCard({
  theme,
  disabled,
  pending,
  onApply,
}: {
  theme: ThemeSummary;
  disabled: boolean;
  pending: boolean;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      className={`theme-card${theme.active ? ' theme-card-active' : ''}`}
      style={{ backgroundImage: `url(${theme.imageUrl})` }}
      disabled={disabled}
      onClick={onApply}
    >
      <span className="theme-card-veil" aria-hidden="true" />
      <span className="theme-card-body">
        <span className="theme-card-name">{theme.name}</span>
        {theme.tagline && <span className="theme-card-tagline">{theme.tagline}</span>}
      </span>
      {theme.active && <span className="theme-card-badge">正在使用</span>}
      {pending && <span className="theme-card-badge theme-card-badge-pending">切换中…</span>}
    </button>
  );
}
