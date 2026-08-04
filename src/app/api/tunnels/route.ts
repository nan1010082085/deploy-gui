import { NextRequest, NextResponse } from 'next/server';
import { getDb, type TunnelRow } from '@/lib/db';
import { listTunnelStatuses } from '@/lib/tunnel';

// 列表
export async function GET() {
  const rows = getDb().prepare(`
    SELECT t.*, s.name as server_name, s.host as server_host
    FROM tunnels t
    JOIN servers s ON t.server_id = s.id
    ORDER BY t.id DESC
  `).all() as (TunnelRow & { server_name: string; server_host: string })[];

  const statuses = listTunnelStatuses();
  return NextResponse.json(rows.map(r => ({
    ...r,
    status: statuses.has(r.id) ? 'running' : 'stopped',
  })));
}

// 创建
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO tunnels (name, server_id, local_port, remote_host, remote_port, auto_start)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(body.name, body.server_id, body.local_port, body.remote_host || '127.0.0.1', body.remote_port, body.auto_start ? 1 : 0);
  const row = db.prepare(`
    SELECT t.*, s.name as server_name, s.host as server_host
    FROM tunnels t JOIN servers s ON t.server_id = s.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);
  return NextResponse.json(row);
}
