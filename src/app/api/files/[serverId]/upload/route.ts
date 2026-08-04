import { NextRequest, NextResponse } from 'next/server';
import { getDb, type ServerRow } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { getSSHConnection, releaseConn } from '@/lib/ssh-pool';
import type { SFTPWrapper } from 'ssh2';
import { createWriteStream, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// 上传文件（multipart/form-data）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const formData = await req.formData();
  const remotePath = formData.get('remotePath') as string;
  const file = formData.get('file') as File;

  if (!remotePath || !file) {
    return NextResponse.json({ error: 'Missing remotePath or file' }, { status: 400 });
  }

  const row = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(parseInt(serverId)) as ServerRow | undefined;
  if (!row) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const conn = await getSSHConnection(row);
  try {
    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      conn.sftp((err, s) => err ? reject(err) : resolve(s));
    });

    const remoteFilePath = remotePath.endsWith('/') ? remotePath + file.name : remotePath + '/' + file.name;
    const writeStream = sftp.createWriteStream(remoteFilePath);

    const buffer = Buffer.from(await file.arrayBuffer());

    await new Promise<void>((resolve, reject) => {
      writeStream.on('close', resolve);
      writeStream.on('error', reject);
      writeStream.write(buffer);
      writeStream.end();
    });

    sftp.end();
    return NextResponse.json({ success: true, path: remoteFilePath });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  } finally {
    releaseConn(row.id);
  }
}
