import { NextRequest, NextResponse } from 'next/server';
import { testSSHConnection } from '@/lib/ssh-pool';

// 测试连接（未保存前，前端传完整信息直接测试）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await testSSHConnection(
    body.host,
    body.port ?? 22,
    body.username,
    body.auth_type,
    body.credential
  );
  return NextResponse.json(result);
}
