import { NextRequest, NextResponse } from 'next/server';
import { getBuilds, getBuildLog } from '@/lib/jenkins';

// 获取构建历史
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const logNumber = req.nextUrl.searchParams.get('log');

  try {
    if (logNumber) {
      // 获取构建日志
      const log = await getBuildLog(name, parseInt(logNumber));
      return new NextResponse(log, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const builds = await getBuilds(name);
    return NextResponse.json(builds);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
