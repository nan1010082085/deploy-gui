import { NextRequest, NextResponse } from 'next/server';
import { getDb, type ServerRow } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { getSSHConnection, releaseConn } from '@/lib/ssh-pool';
import type { SFTPWrapper } from 'ssh2';

async function withSftp<T>(
  serverId: number,
  fn: (sftp: SFTPWrapper) => Promise<T>
): Promise<T> {
  const row = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(serverId) as ServerRow | undefined;
  if (!row) throw new Error('Server not found');

  const conn = await getSSHConnection(row);
  try {
    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      conn.sftp((err, s) => err ? reject(err) : resolve(s));
    });
    try {
      return await fn(sftp);
    } finally {
      sftp.end();
    }
  } finally {
    releaseConn(row.id);
  }
}

// 列目录
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const path = req.nextUrl.searchParams.get('path') || '/';

  try {
    const items = await withSftp(parseInt(serverId), async (sftp) => {
      const list = await new Promise<any[]>((resolve, reject) => {
        sftp.readdir(path, (err, res) => err ? reject(err) : resolve(res));
      });
      return list.map(item => ({
        filename: item.filename,
        longname: item.longname,
        type: item.longname?.startsWith('d') ? 'dir' : 'file',
        size: item.attrs.size,
        mode: item.attrs.mode,
        mtime: item.attrs.mtime,
        uid: item.attrs.uid,
        gid: item.attrs.gid,
      }));
    });
    return NextResponse.json({ path, items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// 创建目录 / 删除 / 重命名
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const body = await req.json();
  const { action, path, newPath } = body;

  try {
    await withSftp(parseInt(serverId), async (sftp) => {
      switch (action) {
        case 'mkdir':
          await new Promise<void>((resolve, reject) => {
            sftp.mkdir(path, err => err ? reject(err) : resolve());
          });
          break;
        case 'rmdir':
          await new Promise<void>((resolve, reject) => {
            sftp.rmdir(path, err => err ? reject(err) : resolve());
          });
          break;
        case 'delete':
          await new Promise<void>((resolve, reject) => {
            sftp.unlink(path, err => err ? reject(err) : resolve());
          });
          break;
        case 'rename':
          await new Promise<void>((resolve, reject) => {
            sftp.rename(path, newPath, err => err ? reject(err) : resolve());
          });
          break;
        default:
          throw new Error('Unknown action: ' + action);
      }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
