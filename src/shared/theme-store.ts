import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export interface SavedTheme {
  id: string;
  name: string;
  appearance: 'auto' | 'light' | 'dark';
  directory: string;
  imagePath: string;
  tagline?: string;
}

export interface ActiveTheme extends SavedTheme {
  savedThemeId: string | null;
}

function stateRoot(): string {
  return path.join(os.homedir(), 'AppData', 'Local', 'CodexDreamSkin');
}

export function themePaths() {
  const root = stateRoot();
  return {
    root,
    // Legacy copy-target from the old file-based watcher; kept only so an
    // upgrade from the previous version doesn't leave orphaned state.
    active: path.join(root, 'active-theme'),
    saved: path.join(root, 'themes'),
    activePointer: path.join(root, 'active-theme.json'),
  };
}

async function readThemeJson(directory: string): Promise<SavedTheme | null> {
  try {
    const raw = await fs.readFile(path.join(directory, 'theme.json'), 'utf8');
    const theme = JSON.parse(raw);
    if (!theme || typeof theme !== 'object' || Array.isArray(theme) || !theme.image) return null;
    const imagePath = path.join(directory, String(theme.image));
    return {
      id: String(theme.id ?? path.basename(directory)),
      name: String(theme.name ?? path.basename(directory)),
      appearance: theme.appearance === 'light' || theme.appearance === 'dark' ? theme.appearance : 'auto',
      directory,
      imagePath,
      tagline: typeof theme.tagline === 'string' ? theme.tagline : undefined,
    };
  } catch {
    return null;
  }
}

export async function listSavedThemes(): Promise<SavedTheme[]> {
  const { saved } = themePaths();
  let entries: string[];
  try {
    entries = (await fs.readdir(saved, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  const themes = await Promise.all(
    entries.map((name) => readThemeJson(path.join(saved, name))),
  );
  return themes
    .filter((theme): theme is SavedTheme => theme !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

export async function readActiveTheme(): Promise<ActiveTheme | null> {
  const { activePointer } = themePaths();
  let directory: string;
  try {
    const raw = await fs.readFile(activePointer, 'utf8');
    directory = String(JSON.parse(raw).directory ?? '');
    if (!directory) return null;
  } catch {
    return null;
  }
  const theme = await readThemeJson(directory);
  if (!theme) return null;
  return { ...theme, savedThemeId: null };
}

// Persists which saved theme directory is active so the app remembers the
// selection across restarts. Injection itself happens live over CDP --
// this file is bookkeeping only, not an IPC channel.
export async function writeActiveTheme(directory: string): Promise<void> {
  const { root, activePointer } = themePaths();
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(activePointer, JSON.stringify({ directory }), 'utf8');
}
