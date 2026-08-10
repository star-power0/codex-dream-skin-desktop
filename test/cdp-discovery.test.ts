import assert from 'node:assert/strict';
import test from 'node:test';
import {
  browserIdFromWebSocketUrl,
  isPrimaryCodexTarget,
  pickPrimaryCodexTarget,
  probeCdpEndpoint,
  validateLoopbackWebSocketUrl,
} from '../src/main/cdp-discovery';

const port = 32123;

function target(overrides: Partial<{
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}> = {}) {
  return {
    id: 'codex-main',
    type: 'page',
    title: 'Codex',
    url: 'app://-/index.html',
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/codex-main`,
    ...overrides,
  };
}

test('accepts only loopback WebSocket URLs on the expected port', () => {
  assert.equal(validateLoopbackWebSocketUrl(`ws://127.0.0.1:${port}/devtools/page/a`, port), true);
  assert.equal(validateLoopbackWebSocketUrl(`ws://[::1]:${port}/devtools/page/a`, port), true);
  assert.equal(validateLoopbackWebSocketUrl(`ws://localhost:${port}/devtools/page/a`, port), false);
  assert.equal(validateLoopbackWebSocketUrl(`ws://127.0.0.1:${port + 1}/devtools/page/a`, port), false);
  assert.equal(validateLoopbackWebSocketUrl(`https://127.0.0.1:${port}/devtools/page/a`, port), false);
});

test('extracts only a valid browser DevTools ID', () => {
  assert.equal(browserIdFromWebSocketUrl(`ws://127.0.0.1:${port}/devtools/browser/browser-id`), 'browser-id');
  assert.equal(browserIdFromWebSocketUrl(`ws://127.0.0.1:${port}/devtools/page/page-id`), null);
});

test('selects the normal Codex renderer and rejects auxiliary targets', () => {
  assert.equal(isPrimaryCodexTarget(target()), true);
  assert.equal(isPrimaryCodexTarget(target({ title: 'Settings' })), false);
  assert.equal(isPrimaryCodexTarget(target({ url: 'app://-/index.html?initialRoute=%2Favatar-overlay' })), false);
  assert.equal(isPrimaryCodexTarget(target({ url: 'app://-/index.html?initialRoute=%2Fchatgpt%2Fquick-chat-prewarm' })), false);

  const chosen = pickPrimaryCodexTarget([
    target({ id: 'overlay', url: 'app://-/index.html?initialRoute=%2Favatar-overlay' }),
    target({ id: 'main' }),
  ]);
  assert.equal(chosen?.id, 'main');
});

test('verifies browser identity and target before accepting a status-file port', async () => {
  const fetchImpl = async (input: string): Promise<Response> => {
    if (input.endsWith('/json/version')) {
      return Response.json({
        Browser: 'Electron/Codex',
        webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/browser/browser-id`,
      });
    }
    if (input.endsWith('/json/list')) return Response.json([target()]);
    return new Response(null, { status: 404 });
  };
  const endpoint = await probeCdpEndpoint(
    { port, source: 'codexplusplus-status', host: 'codexplusplus' },
    fetchImpl,
  );
  assert.deepEqual(endpoint, {
    port,
    source: 'codexplusplus-status',
    host: 'codexplusplus',
    browserId: 'browser-id',
    targetId: 'codex-main',
    targetWebSocketUrl: `ws://127.0.0.1:${port}/devtools/page/codex-main`,
  });
});

test('rejects a status-file port when the selected target has an unsafe WebSocket URL', async () => {
  const fetchImpl = async (input: string): Promise<Response> => {
    if (input.endsWith('/json/version')) {
      return Response.json({
        Browser: 'Electron/Codex',
        webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/browser/browser-id`,
      });
    }
    if (input.endsWith('/json/list')) return Response.json([target({ webSocketDebuggerUrl: 'ws://10.0.0.9:1234/devtools/page/codex-main' })]);
    return new Response(null, { status: 404 });
  };
  const endpoint = await probeCdpEndpoint(
    { port, source: 'codexplusplus-status', host: 'codexplusplus' },
    fetchImpl,
  );
  assert.equal(endpoint, null);
});
