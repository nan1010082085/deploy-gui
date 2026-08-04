import { NextRequest, NextResponse } from 'next/server';
import { getDb, sanitizeServer, type ServerRow } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { testSSHConnection } from '@/lib/ssh-pool';

// 列表
export async function GET() {
  const rows = getDb().prepare('SELECT * FROM servers ORDER BY id DESC').all() as ServerRow[];
  return NextResponse.json(rows.map(sanitizeServer));
}

// 创建
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO servers (name, host, port, username, auth_type, credential)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    body.name, body.host, body.port ?? 22,
    body.username, body.auth_type, encrypt(body.credential)
  );
  const row = db.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid) as ServerRow;
  return NextResponse.json(sanitizeServer(row));
}
