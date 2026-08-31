export type CodexHostKind = 'codexbridge' | 'codexplusplus';

export type CdpPortSource =
  | 'codexplusplus-status'
  | 'codexplusplus-default'
  | 'codexbridge-default';

export interface CdpPortCandidate {
  port: number;
  source: CdpPortSource;
  host: CodexHostKind;
}

export interface CdpBrowserIdentity {
  Browser: string;
  webSocketDebuggerUrl: string;
}

export interface CdpPageTarget {
  id: string;
  type: string;
  title?: string;
  url: string;
  webSocketDebuggerUrl: string;
}

export interface VerifiedCdpEndpoint {
  port: number;
  source: CdpPortSource;
  host: CodexHostKind;
  browserId: string;
  targetId: string;
  targetWebSocketUrl: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  return normalized === '127.0.0.1' || normalized === '::1';
}

export function browserIdFromWebSocketUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = /^\/devtools\/browser\/([^/]+)$/.exec(parsed.pathname);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function validateLoopbackWebSocketUrl(url: string, expectedPort: number): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'ws:' || parsed.protocol === 'wss:')
      && isLoopbackHost(parsed.hostname)
      && Number(parsed.port) === expectedPort;
  } catch {
    return false;
  }
}

function initialRoute(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'app:' || parsed.hostname !== '-' || parsed.pathname !== '/index.html') return null;
    return parsed.searchParams.get('initialRoute');
  } catch {
    return null;
  }
}

function isExcludedRoute(route: string | null): boolean {
  if (!route) return false;
  const normalized = route.toLowerCase();
  return normalized === '/avatar-overlay'
    || normalized === '/chatgpt/quick-chat'
    || normalized === '/chatgpt/quick-chat-prewarm'
    || normalized.startsWith('/chatgpt/quick-chat/');
}

// Codex 26.825 renames the main renderer's title from "Codex" to "ChatGPT",
// so a title that only matches "codex" drops the one target we must inject
// into. Both spellings identify the shell window; auxiliary windows such as
// Settings keep their own titles and stay rejected.
const PRIMARY_TITLE_PATTERN = /codex|chatgpt/;

export function isPrimaryCodexTarget(target: CdpPageTarget): boolean {
  if (target.type !== 'page' || !target.webSocketDebuggerUrl || !target.url.startsWith('app://')) return false;
  if (isExcludedRoute(initialRoute(target.url))) return false;
  const title = target.title?.trim().toLowerCase();
  return title ? PRIMARY_TITLE_PATTERN.test(title) : false;
}

export function pickPrimaryCodexTarget(targets: CdpPageTarget[]): CdpPageTarget | null {
  return targets.find(isPrimaryCodexTarget) ?? null;
}

async function fetchJson<T>(fetchImpl: FetchLike, url: string): Promise<T | null> {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(2_000), redirect: 'error' });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function probeCdpEndpoint(
  candidate: CdpPortCandidate,
  fetchImpl: FetchLike = fetch,
): Promise<VerifiedCdpEndpoint | null> {
  for (const host of ['127.0.0.1', '[::1]']) {
    const baseUrl = `http://${host}:${candidate.port}`;
    const identity = await fetchJson<CdpBrowserIdentity>(fetchImpl, `${baseUrl}/json/version`);
    if (!identity || !validateLoopbackWebSocketUrl(identity.webSocketDebuggerUrl, candidate.port)) continue;
    const browserId = browserIdFromWebSocketUrl(identity.webSocketDebuggerUrl);
    if (!browserId) continue;

    const targets = await fetchJson<CdpPageTarget[]>(fetchImpl, `${baseUrl}/json/list`);
    if (!Array.isArray(targets)) continue;
    const target = pickPrimaryCodexTarget(targets);
    if (!target || !validateLoopbackWebSocketUrl(target.webSocketDebuggerUrl, candidate.port)) continue;

    return {
      port: candidate.port,
      source: candidate.source,
      host: candidate.host,
      browserId,
      targetId: target.id,
      targetWebSocketUrl: target.webSocketDebuggerUrl,
    };
  }
  return null;
}

export async function discoverCdpEndpoint(
  candidates: CdpPortCandidate[],
  fetchImpl: FetchLike = fetch,
): Promise<VerifiedCdpEndpoint | null> {
  for (const candidate of candidates) {
    const endpoint = await probeCdpEndpoint(candidate, fetchImpl);
    if (endpoint) return endpoint;
  }
  return null;
}
