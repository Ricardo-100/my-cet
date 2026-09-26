'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppState, TranslationRecord } from '@/lib/types';
import { getState } from '@/lib/storage';
import StatsDisplay from '@/components/stats-display';

export default function StatsPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState>(getState());

  useEffect(() => {
    setState(getState());
  }, []);

  const { records, progress } = state;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← 返回首页
          </button>
          <h1 className="text-lg font-semibold text-white">📊 学习统计</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <StatsDisplay records={records} progress={progress} />
      </main>
    </div>
  );
}
