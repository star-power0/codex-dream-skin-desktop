import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const cssPath = path.resolve(__dirname, '..', '..', '..', 'vendor', 'assets', 'dream-skin.css');
// Assertions below anchor on `\n` to pin exact declaration order. The checkout
// carries CRLF, so normalize once here; otherwise every such anchor silently
// fails on a detail that has nothing to do with the rule being tested.
const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

test('uses one wallpaper layer for the generated Codex++ task surface', () => {
  const taskSurface = /main\[class\*="MainContentSurface"\]:not\(:has\(\[role="main"\]\)\)::before \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

  assert.match(css, /:not\(\[data-dream-route="settings"\]\)[^\n]*:has\(main\[class\*="MainContentSurface"\]\)/);
  assert.match(css, /:has\(main\[class\*="MainContentSurface"\]\):not\(:has\(main\[class\*="MainContentSurface"\] \[role="main"\]\)\) body/);
  assert.match(css, /main\[class~="bg-token-main-surface-primary"\]/);
  assert.match(css, /main\[class~="bg-token-main-surface-primary"\] > :is\(webview, \[class~="bg-token-main-surface-primary"\]\)/);
  assert.match(css, /\[class\*="MainContentViewport"\]/);
  assert.match(css, /\[class\*="MainContentFrame"\]/);
  assert.match(taskSurface, /background-image: var\(--ds-task-fade\), var\(--ds-task-shade\);/);
  assert.doesNotMatch(taskSurface, /dream-skin-art/);
  assert.match(css, /data-dream-shell="light"\][\s\S]*?main\[class\*="MainContentSurface"\]:not\(:has\(\[role="main"\]\)\)::before \{\n\x20{2}opacity: \.72;/);
});

test('keeps settings opaque and preserves the fixed-header exclusion', () => {
  assert.match(css, /\[data-dream-route="settings"\] body \{\n\x20{2}background: var\(--ds-bg\) !important;/);
  assert.match(css, /> :not\(header\) \{/);
  assert.doesNotMatch(css, /> :not\(header\.app-header-tint\)/);
});

test('tags generated Codex++ composer surfaces for theme CSS', () => {
  const selectorsPath = path.resolve(__dirname, '..', '..', '..', 'vendor', 'assets', 'selectors.json');
  const selectors = fs.readFileSync(selectorsPath, 'utf8');
  const rendererPath = path.resolve(__dirname, '..', '..', '..', 'vendor', 'assets', 'renderer-inject.js');
  const renderer = fs.readFileSync(rendererPath, 'utf8');

  assert.match(selectors, /"composer-chrome"[^\n]+ComposerLayoutRoot/);
  assert.match(selectors, /"composer-toolbar"[^\n]+ComposerLayoutFooter/);
  assert.match(renderer, /composer-chrome[\s\S]*?ComposerLayoutRoot/);
  assert.match(renderer, /composer-toolbar[\s\S]*?ComposerLayoutFooter/);
});

test('keeps the theme readability veil while removing native bottom chrome', () => {
  assert.match(css, /--ds-task-fade: linear-gradient\([\s\S]*?rgb\(var\(--ds-bg-rgb\) \/ 1\) 100%\)/);
  assert.doesNotMatch(css, /html\[data-dream-skin="active"\] body \{[^}]*font-family:/);
  assert.match(css, /main\[class\*="MainContentSurface"\]:not\(:has\(\[role="main"\]\)\),[\s\S]*?--color-surface-elevated-secondary: var\(--ds-panel-2\) !important;/);
  assert.doesNotMatch(
    css,
    /html\[data-dream-skin="active"\] \{\n(?:\x20{2}--[^\n]+\n)*\x20{2}--color-surface-elevated-secondary:/,
  );
  assert.match(
    css,
    /:is\(main\.main-surface, main\[class\*="MainContentSurface"\]\):not\(:has\(\[role="main"\]\)\)[\s\S]*?\[class~="bg-gradient-to-t"\]\[class~="from-surface"\]\[class~="via-surface"\] \{[\s\S]*?background-image: none !important;/,
  );
  assert.match(css, /\.app-shell-main-content-top-fade \{[\s\S]*?display: none !important;/);
  assert.match(css, /\[class\*="MainContentViewport"\][\s\S]*?--app-shell-main-content-frame-top-offset: 0px !important;/);
});

test('keeps generated application chrome and new-task composer themed', () => {
  assert.match(css, /\[class\*="ApplicationMenuTopBar"\][\s\S]*?background: rgb\(var\(--ds-panel-rgb\) \/ \.90\) !important;/);
  assert.match(
    css,
    /\[data-dream-route="home"\][\s\S]*?\[class\*="ComposerLayoutRoot"\] > \[class\*="ComposerLayoutBody"\] \{[\s\S]*?background: transparent !important;/,
  );
});

test('themes notice banners and their solid accent button', () => {
  // Usage banners are an `aside.bg-surface` plus a `-z-10` soft backdrop, both
  // resolving to opaque host white. The Codex++ token block only covers hosts
  // without a `[role="main"]`, which home and thread both have, so the banner
  // stayed a white slab over the wallpaper.
  assert.match(
    css,
    /aside\[class~="bg-surface"\]:not\(\.app-shell-left-panel\) \{\n\x20{2}background: rgb\(var\(--ds-panel-rgb\) \/ \.92\) !important;/,
  );
  // The sidebar is an aside too; repainting it would wreck the left panel.
  assert.doesNotMatch(css, /aside\[class~="bg-surface"\](?!:not\(\.app-shell-left-panel\))/);
  assert.match(
    css,
    /aside\[class~="bg-surface"\]:not\(\.app-shell-left-panel\)\n\x20{2}> div\[class~="absolute"\]\[class~="inset-0"\]\[class~="-z-10"\] \{\n\x20{2}background: transparent !important;/,
  );
  // `bg-primary-solid` resolves through the VS Code bridge from
  // --color-text-foreground, and its label from --color-background-control-opaque.
  // Retinting the foreground alone left a near-white button with a white label.
  assert.match(css, /--color-background-primary-solid: var\(--ds-accent\) !important;/);
  assert.match(css, /--color-text-primary-solid: var\(--ds-on-accent\) !important;/);
});

test('themes the sidebar conversation hover preview card', () => {
  // The preview card is a body-level portal painted with the Tailwind alpha
  // utility `bg-surface-elevated-secondary/90`. The elevated-surface bridge is
  // scoped to task hosts and menus, so this portal fell back to host white and
  // turned into a white slab on dark themes.
  assert.match(
    css,
    /\[class~="bg-surface-elevated-secondary\/90"\] \{\n\x20{2}background: rgb\(var\(--ds-panel-rgb\) \/ \.92\) !important;/,
  );
  // Card text must pair with the themed panel, whatever the host palette says.
  assert.match(
    css,
    /\[class~="bg-surface-elevated-secondary\/90"\] \{[^}]*--color-text-default: var\(--ds-text\) !important;/,
  );
  assert.match(
    css,
    /\[class~="bg-surface-elevated-secondary\/90"\] \{[^}]*--color-text-secondary: var\(--ds-muted\) !important;/,
  );
});

test('scales full-bleed wallpaper layers through the optional art zoom', () => {
  // art.zoom is opt-in per theme: painters fall back to plain cover until the
  // injector publishes px sizes computed as cover x zoom for the viewport and
  // the main box, so themes without the field render exactly as before.
  assert.match(css, /background-size: 100% 100%, var\(--dream-art-main-size, cover\);/);
  assert.match(css, /background-size: var\(--dream-art-viewport-size, cover\) !important;/);
  // Banner strips and the home hero card stay on plain cover by design.
  assert.doesNotMatch(
    css,
    /background-position: center top, center top, var\(--ds-art-position\);\s*background-size: 100% 100%, 100% 100%, var\(--dream-art/,
  );
  const rendererPath = path.resolve(__dirname, '..', '..', '..', 'vendor', 'assets', 'renderer-inject.js');
  const renderer = fs.readFileSync(rendererPath, 'utf8');
  assert.match(renderer, /ART_ZOOM = typeof ART\.zoom === "number"/);
  assert.match(renderer, /--dream-art-viewport-size/);
  assert.match(renderer, /--dream-art-main-size/);
  assert.match(renderer, /window\.addEventListener\("resize", resizeHandler\)/);
});
