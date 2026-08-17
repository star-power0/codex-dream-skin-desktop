import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const cssPath = path.resolve(__dirname, '..', '..', '..', 'vendor', 'assets', 'dream-skin.css');
const css = fs.readFileSync(cssPath, 'utf8');

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
