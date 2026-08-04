import { Client } from 'ssh2';
import type { ServerRow } from './db';
import { decrypt } from './crypto';

/**
 * SSH 连接池
 * 同一台服务器复用一条连接，不同功能从连接上开 channel
 * - 终端: conn.shell()
 * - SFTP:  conn.sftp()
 * - 隧道:  conn.forwardOut()
 * - 命令:  conn.exec()
 */

interface PooledConn {
  conn: Client;
  refCount: number;
  timer: NodeJS.Timeout | null;
}

const pool = new Map<number, PooledConn>();
const IDLE_TIMEOUT = 60_000; // 空闲 60s 后断开

export function getSSHConnection(server: ServerRow): Promise<Client> {
  return new Promise((resolve, reject) => {
    const existing = pool.get(server.id);
    if (existing && existing.conn) {
      // 复用已有连接
      clearTimeout(existing.timer!);
      existing.refCount++;
      resolve(existing.conn);
      return;
    }

    const conn = new Client();
    const credential = decrypt(server.credential);

    const config: Record<string, unknown> = {
      host: server.host,
      port: server.port,
      username: server.username,
      readyTimeout: 10_000,
    };
    if (server.auth_type === 'key') {
      config.privateKey = credential;
    } else {
      config.password = credential;
    }

    conn.on('ready', () => {
      const pooled: PooledConn = { conn, refCount: 1, timer: null };
      pool.set(server.id, pooled);
      scheduleRelease(server.id);
      resolve(conn);
    });

    conn.on('error', (err) => {
      pool.delete(server.id);
      reject(err);
    });

    conn.on('close', () => {
      pool.delete(server.id);
    });

    conn.connect(config);
  });
}

/** 释放引用计数，归零后延时关闭 */
export function releaseConn(serverId: number) {
  const pooled = pool.get(serverId);
  if (!pooled) return;
  pooled.refCount--;
  if (pooled.refCount <= 0) {
    scheduleRelease(serverId);
  }
}

function scheduleRelease(serverId: number) {
  const pooled = pool.get(serverId);
  if (!pooled) return;
  if (pooled.timer) clearTimeout(pooled.timer);
  pooled.timer = setTimeout(() => {
    if (pooled.refCount <= 0) {
      pooled.conn.end();
      pool.delete(serverId);
    }
  }, IDLE_TIMEOUT);
}

/** 测试连接（不放入连接池） */
export function testSSHConnection(
  host: string, port: number, username: string,
  authType: 'password' | 'key', credential: string
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      resolve({ success: false, message: '连接超时 (10s)' });
    }, 10_000);

    conn.on('ready', () => {
      clearTimeout(timer);
      conn.end();
      resolve({ success: true, message: '连接成功' });
    });

    conn.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, message: err.message });
    });

    const config: Record<string, unknown> = { host, port, username, readyTimeout: 10_000 };
    if (authType === 'key') config.privateKey = credential;
    else config.password = credential;

    conn.connect(config);
  });
}
