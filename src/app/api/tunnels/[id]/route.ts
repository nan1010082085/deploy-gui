import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { startTunnel, stopTunnel } from '@/lib/tunnel';

// 更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  db.prepare(
    `UPDATE tunnels SET name=?, server_id=?, local_port=?, remote_host=?, remote_port=?, auto_start=? WHERE id=?`
  ).run(body.name, body.server_id, body.local_port, body.remote_host || '127.0.0.1', body.remote_port, body.auto_start ? 1 : 0, id);
  return NextResponse.json({ success: true });
}

// 删除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  stopTunnel(parseInt(id));
  getDb().prepare('DELETE FROM tunnels WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
