import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CdpPortCandidate } from './cdp-discovery';

export interface CodexPlusPlusLaunchStatus {
  status?: string;
  debugPort: number;
}

function validPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 65_535;
}

export function parseCodexPlusPlusLaunchStatus(input: unknown): CodexPlusPlusLaunchStatus | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as { status?: unknown; debug_port?: unknown };
  if (!validPort(value.debug_port)) return null;
  return {
    status: typeof value.status === 'string' ? value.status : undefined,
    debugPort: value.debug_port,
  };
}

export function codexPlusPlusStatusPath(homeDirectory = os.homedir()): string {
  return path.join(homeDirectory, '.codex-session-delete', 'latest-status.json');
}

export async function readCodexPlusPlusLaunchStatus(
  homeDirectory = os.homedir(),
): Promise<CodexPlusPlusLaunchStatus | null> {
  try {
    const contents = await fs.readFile(codexPlusPlusStatusPath(homeDirectory), 'utf8');
    return parseCodexPlusPlusLaunchStatus(JSON.parse(contents));
  } catch {
    return null;
  }
}

export function buildCdpPortCandidates(status: CodexPlusPlusLaunchStatus | null): CdpPortCandidate[] {
  const candidates: CdpPortCandidate[] = [];
  const append = (candidate: CdpPortCandidate) => {
    if (!candidates.some((current) => current.port === candidate.port)) candidates.push(candidate);
  };

  if (status) append({ port: status.debugPort, source: 'codexplusplus-status', host: 'codexplusplus' });
  append({ port: 9229, source: 'codexplusplus-default', host: 'codexplusplus' });
  append({ port: 9335, source: 'codexbridge-default', host: 'codexbridge' });
  return candidates;
}
