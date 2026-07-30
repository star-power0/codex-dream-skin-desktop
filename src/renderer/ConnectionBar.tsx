import { useState } from 'react';
import type { CodexConnectionState } from '../shared/ipc-contract';

const LABELS: Record<CodexConnectionState['status'], string> = {
  'not-installed': '未检测到 Codex',
  'not-running': 'Codex 未运行',
  'running-unthemed': 'Codex 正在运行（未启用换肤）',
  connecting: '正在连接…',
  connected: '已连接，实时换肤中',
  error: '连接出错',
};

export function ConnectionBar({ connection, busy }: { connection: CodexConnectionState; busy: boolean }) {
  const [restarting, setRestarting] = useState(false);

  async function handleConnect(restartExisting: boolean) {
    setRestarting(restartExisting);
    try {
      await window.dreamSkin.connectCodex(restartExisting);
    } finally {
      setRestarting(false);
    }
  }

  const dotClass =
    connection.status === 'connected'
      ? 'dot-live'
      : connection.status === 'error'
        ? 'dot-error'
        : connection.status === 'connecting'
          ? 'dot-pending'
          : 'dot-idle';

  return (
    <div className="connection-bar">
      <span className={`status-dot ${dotClass}`} aria-hidden="true" />
      <span className="status-label">{LABELS[connection.status]}</span>
      {connection.status === 'error' && (
        <span className="status-detail">{connection.message}</span>
      )}
      {(connection.status === 'running-unthemed' || connection.status === 'error') && (
        <button
          className="primary-action"
          disabled={busy}
          onClick={() => handleConnect(true)}
        >
          {restarting ? '正在重启 Codex…' : '重启并启用换肤'}
        </button>
      )}
      {connection.status === 'not-running' && (
        <button className="primary-action" disabled={busy} onClick={() => handleConnect(false)}>
          启动 Codex
        </button>
      )}
    </div>
  );
}
