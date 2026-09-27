import type { Metadata } from 'next';
import PracticeClient from './practice-client';

const TITLES: Record<string, string> = {
  'en-zh': '英译汉',
  'zh-en': '汉译英',
};

export function generateStaticParams() {
  return [{ direction: 'en-zh' }, { direction: 'zh-en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string }>;
}): Promise<Metadata> {
  const { direction } = await params;
  return {
    title: `${TITLES[direction] ?? '翻译'}练习 - CET翻译训练营`,
  };
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ direction: string }>;
}) {
  // Next.js 16 起 params 只能异步读取（同步访问已彻底移除）
  const { direction } = await params;
  return <PracticeClient initialDirection={direction === 'zh-en' ? 'zh-en' : 'en-zh'} />;
}
