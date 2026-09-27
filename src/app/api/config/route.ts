import { NextResponse } from 'next/server';
import { publicConfig } from '@/lib/stepfun';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 给设置页用的配置视图——只暴露 URL / 模型名 / key 是否已配置，绝不返回 key 本身 */
export async function GET() {
  return NextResponse.json(publicConfig());
}
