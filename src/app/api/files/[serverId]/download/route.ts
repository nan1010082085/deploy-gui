import { NextRequest, NextResponse } from 'next/server';
import { getDb, type ServerRow } from '@/lib/db';
import { getSSHConnection, releaseConn } from '@/lib/ssh-pool';
import type { SFTPWrapper } from 'ssh2';

// 下载文件
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const filePath = req.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const row = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(parseInt(serverId)) as ServerRow | undefined;
  if (!row) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const conn = await getSSHConnection(row);
  try {
    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      conn.sftp((err, s) => err ? reject(err) : resolve(s));
    });

    const chunks: Buffer[] = [];
    const readStream = sftp.createReadStream(filePath);

    await new Promise<void>((resolve, reject) => {
      readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      readStream.on('end', resolve);
      readStream.on('error', reject);
    });

    sftp.end();
    const buffer = Buffer.concat(chunks);
    const filename = filePath.split('/').pop() || 'download';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  } finally {
    releaseConn(row.id);
  }
}
