import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCdpPortCandidates, parseCodexPlusPlusLaunchStatus } from '../src/main/codex-plusplus-status';

test('parses only a valid Codex++ debug port', () => {
  assert.deepEqual(parseCodexPlusPlusLaunchStatus({ status: 'running', debug_port: 52111 }), {
    status: 'running',
    debugPort: 52111,
  });
  assert.equal(parseCodexPlusPlusLaunchStatus({ debug_port: '9229' }), null);
  assert.equal(parseCodexPlusPlusLaunchStatus({ debug_port: 0 }), null);
  assert.equal(parseCodexPlusPlusLaunchStatus('{"debug_port":9229}'), null);
});

test('prioritizes the status hint and deduplicates fallback ports', () => {
  assert.deepEqual(buildCdpPortCandidates({ debugPort: 52111 }), [
    { port: 52111, source: 'codexplusplus-status', host: 'codexplusplus' },
    { port: 9229, source: 'codexplusplus-default', host: 'codexplusplus' },
    { port: 9335, source: 'codexbridge-default', host: 'codexbridge' },
  ]);
  assert.deepEqual(buildCdpPortCandidates({ debugPort: 9229 }), [
    { port: 9229, source: 'codexplusplus-status', host: 'codexplusplus' },
    { port: 9335, source: 'codexbridge-default', host: 'codexbridge' },
  ]);
});
