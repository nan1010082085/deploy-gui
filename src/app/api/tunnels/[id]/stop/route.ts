import { NextRequest, NextResponse } from 'next/server';
import { stopTunnel } from '@/lib/tunnel';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  stopTunnel(parseInt(id));
  return NextResponse.json({ success: true });
}
