import { createServer, Server as NetServer } from 'net';
import { getDb, type ServerRow } from './db';
import { decrypt } from './crypto';
import { Client } from 'ssh2';

/**
 * SSH 隧道管理器
 * 本地端口转发: local:port -> server -> remote_host:remote_port
 * 等同于: ssh -L localPort:remoteHost:remotePort user@server
 */

export interface TunnelInfo {
  id: number;
  name: string;
  serverId: number;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  status: 'running' | 'stopped' | 'error';
  message?: string;
}

const activeTunnels = new Map<number, { server: NetServer; conn: Client }>();

export function getTunnelStatus(tunnelId: number): 'running' | 'stopped' | 'error' {
  return activeTunnels.has(tunnelId) ? 'running' : 'stopped';
}

export function listTunnelStatuses(): Map<number, 'running' | 'stopped'> {
  const result = new Map<number, 'running' | 'stopped'>();
  for (const id of activeTunnels.keys()) {
    result.set(id, 'running');
  }
  return result;
}

export async function startTunnel(tunnelId: number): Promise<TunnelInfo> {
  if (activeTunnels.has(tunnelId)) {
    throw new Error('隧道已在运行');
  }

  const db = getDb();
  const tunnel = db.prepare('SELECT * FROM tunnels WHERE id = ?').get(tunnelId) as any;
  if (!tunnel) throw new Error('隧道不存在');

  const serverRow = db.prepare('SELECT * FROM servers WHERE id = ?').get(tunnel.server_id) as ServerRow;
  if (!serverRow) throw new Error('服务器不存在');

  const credential = decrypt(serverRow.credential);
  const conn = new Client();

  const config: Record<string, unknown> = {
    host: serverRow.host,
    port: serverRow.port,
    username: serverRow.username,
    readyTimeout: 10_000,
  };
  if (serverRow.auth_type === 'key') config.privateKey = credential;
  else config.password = credential;

  // 先建立 SSH 连接
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SSH 连接超时')), 10_000);
    conn.on('ready', () => { clearTimeout(timer); resolve(); });
    conn.on('error', (err) => { clearTimeout(timer); reject(err); });
    conn.connect(config);
  });

  // 创建本地 TCP 服务器
  const netServer = createServer((socket) => {
    conn.forwardOut(
      socket.remoteAddress || '127.0.0.1',
      socket.remotePort || 0,
      tunnel.remote_host,
      tunnel.remote_port,
      (err, stream) => {
        if (err) {
          socket.destroy();
          return;
        }
        socket.pipe(stream);
        stream.pipe(socket);
        socket.on('error', () => stream.end());
        socket.on('close', () => stream.end());
        stream.on('error', () => socket.destroy());
        stream.on('close', () => socket.destroy());
      }
    );
  });

  await new Promise<void>((resolve, reject) => {
    netServer.on('error', reject);
    netServer.listen(tunnel.local_port, '0.0.0.0', resolve);
  });

  // SSH 连接断开时关闭隧道
  conn.on('close', () => {
    stopTunnel(tunnelId);
  });
  conn.on('error', () => {
    stopTunnel(tunnelId);
  });

  activeTunnels.set(tunnelId, { server: netServer, conn });

  db.prepare('UPDATE tunnels SET status = ? WHERE id = ?').run('running', tunnelId);

  return {
    id: tunnelId,
    name: tunnel.name,
    serverId: tunnel.server_id,
    localPort: tunnel.local_port,
    remoteHost: tunnel.remote_host,
    remotePort: tunnel.remote_port,
    status: 'running',
  };
}

export function stopTunnel(tunnelId: number): void {
  const active = activeTunnels.get(tunnelId);
  if (!active) return;

  active.server.close();
  active.conn.end();
  activeTunnels.delete(tunnelId);

  getDb().prepare('UPDATE tunnels SET status = ? WHERE id = ?').run('stopped', tunnelId);
}

export function stopAllTunnels(): void {
  for (const id of activeTunnels.keys()) {
    stopTunnel(id);
  }
}

/** 启动时自动启动 auto_start 的隧道 */
export async function autoStartTunnels(): Promise<void> {
  const db = getDb();
  const tunnels = db.prepare('SELECT id FROM tunnels WHERE auto_start = 1').all() as { id: number }[];
  for (const t of tunnels) {
    try {
      await startTunnel(t.id);
      console.log(`[tunnel] auto-started: #${t.id}`);
    } catch (e) {
      console.error(`[tunnel] auto-start failed #${t.id}:`, (e as Error).message);
    }
  }
}
