import { spawn } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';

// The bridge owns every Windows Store package / CDP safety check; this module
// only shells out to it and parses the single JSON line it prints on stdout.
function vendorPath(...segments: string[]): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'vendor')
    : path.join(__dirname, '..', '..', 'vendor');
  return path.join(base, ...segments);
}

function runPowerShell(args: string[], timeoutMs = 60_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', vendorPath('scripts', 'bridge.ps1'), ...args],
      { windowsHide: true },
    );
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`bridge.ps1 ${args[0]} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', () => {
      clearTimeout(timer);
      const line = stdout.trim().split('\n').pop() ?? '';
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error(stderr.trim() || stdout.trim() || 'bridge.ps1 produced no output'));
      }
    });
  });
}

export interface DetectResult {
  ok: boolean;
  installed: boolean;
  version?: string;
  running?: boolean;
  cdpActive?: boolean;
  browserId?: string | null;
  port?: number;
  error?: string;
}

export interface StartResult {
  ok: boolean;
  alreadyRunning?: boolean;
  needsRestart?: boolean;
  port?: number;
  browserId?: string;
  strategy?: string;
  error?: string;
}

const DEFAULT_PORT = 9335;

// bridge.ps1's own comment documents a 15-20s cold-start cost for the
// Get-NetTCPConnection CIM session on some machines; 10s was tighter than
// that worst case and produced false "connection error" reports mid-poll.
export function detectCodex(port = DEFAULT_PORT): Promise<DetectResult> {
  return runPowerShell(['detect', '-Port', String(port)], 20_000);
}

export function startCodexTheming(port = DEFAULT_PORT, restartExisting = false): Promise<StartResult> {
  const args = ['start', '-Port', String(port)];
  if (restartExisting) args.push('-RestartExisting');
  return runPowerShell(args, 60_000);
}

export function stopCodexTheming(port = DEFAULT_PORT): Promise<{ ok: boolean; stopped?: boolean; error?: string }> {
  return runPowerShell(['stop', '-Port', String(port)], 30_000);
}
