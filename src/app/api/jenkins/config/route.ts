import { NextRequest, NextResponse } from 'next/server';
import { saveJenkinsConfig, getJenkinsConfigPublic } from '@/lib/jenkins';

// 获取配置（不返回 token）
export async function GET() {
  return NextResponse.json(getJenkinsConfigPublic());
}

// 保存配置
export async function POST(req: NextRequest) {
  const body = await req.json();
  saveJenkinsConfig(body.url, body.user, body.token);
  return NextResponse.json({ success: true });
}
