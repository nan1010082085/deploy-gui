import { NextRequest, NextResponse } from 'next/server';
import { startTunnel } from '@/lib/tunnel';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const info = await startTunnel(parseInt(id));
    return NextResponse.json({ success: true, status: info.status });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
