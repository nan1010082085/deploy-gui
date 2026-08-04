import { NextRequest, NextResponse } from 'next/server';
import { getDb, sanitizeServer, type ServerRow } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { testSSHConnection } from '@/lib/ssh-pool';

// 更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as ServerRow | undefined;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const name = body.name ?? existing.name;
  const host = body.host ?? existing.host;
  const port = body.port ?? existing.port;
  const username = body.username ?? existing.username;
  const auth_type = body.auth_type ?? existing.auth_type;
  const credential = body.credential ? encrypt(body.credential) : existing.credential;

  db.prepare(
    `UPDATE servers SET name=?, host=?, port=?, username=?, auth_type=?, credential=?, updated_at=datetime('now') WHERE id=?`
  ).run(name, host, port, username, auth_type, credential, id);

  const row = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as ServerRow;
  return NextResponse.json(sanitizeServer(row));
}

// 删除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  getDb().prepare('DELETE FROM servers WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

// 测试已保存的连接
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(id) as ServerRow | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const credential = decrypt(row.credential);
  const result = await testSSHConnection(row.host, row.port, row.username, row.auth_type, credential);
  return NextResponse.json(result);
}
