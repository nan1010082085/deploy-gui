import { NextResponse } from 'next/server';
import { listJobs } from '@/lib/jenkins';

export async function GET() {
  try {
    const jobs = await listJobs();
    return NextResponse.json(jobs);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
