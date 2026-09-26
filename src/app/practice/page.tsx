import { redirect } from 'next/navigation';
import { Direction } from '@/lib/types';

const allowedDirections: Direction[] = ['en-zh', 'zh-en'];

export function generateStaticParams() {
  return allowedDirections.map(d => ({ direction: d }));
}

export default function PracticePage({ params }: { params: Promise<{ direction: string }> }) {
  return null;
}

// Handle both static and dynamic params
export async function generateMetadata({ params }: { params: Promise<{ direction: string }> }) {
  const { direction } = await params;
  const labels: Record<string, string> = {
    'en-zh': '英译汉',
    'zh-en': '汉译英',
  };
  return {
    title: `${labels[direction] || '翻译'}练习 - CET翻译训练营`,
  };
}

// For the actual rendering, redirect to the new page
export async function GET() {
  redirect('/practice/en-zh');
}
