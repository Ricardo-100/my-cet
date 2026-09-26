'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppState, Direction, Difficulty } from '@/lib/types';
import { getState, updateSettings } from '@/lib/storage';

export default function HomePage() {
  const [state, setState] = useState<AppState>(getState());

  useEffect(() => {
    const handleStorage = () => setState(getState());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const changeSetting = (key: 'direction' | 'difficulty' | 'autoAdvance', value: any) => {
    updateSettings({ [key]: value });
    setState(getState());
  };

  const { settings, progress, wrongRecords } = state;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📝</div>
            <div>
              <h1 className="text-2xl font-bold text-white">CET 翻译训练营</h1>
              <p className="text-sm text-gray-400">四六级翻译专项练习 · AI 智能批改</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickStat label="已完成" value={`${progress.totalPractices} 题`} />
          <QuickStat label="平均分" value={`${progress.averageScore} 分`} />
          <QuickStat label="连续优秀" value={`${progress.bestStreak} 题`} />
          <QuickStat label="错题数" value={`${wrongRecords.length} 题`} />
        </div>

        {/* Settings Panel */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">练习设置</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Direction */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">翻译方向</label>
              <div className="flex gap-2">
                {[
                  { value: 'en-zh', label: '英译汉' },
                  { value: 'zh-en', label: '汉译英' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => changeSetting('direction', opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium
                      transition-all duration-200 ${
                        settings.direction === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">难度等级</label>
              <div className="flex gap-2">
                {[
                  { value: 'cet4', label: '四级' },
                  { value: 'cet6', label: '六级' },
                  { value: 'mixed', label: '混合' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => changeSetting('difficulty', opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium
                      transition-all duration-200 ${
                        settings.difficulty === opt.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto advance */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">自动跳转</label>
              <button
                onClick={() => changeSetting('autoAdvance', !settings.autoAdvance)}
                className={`w-full py-2 px-3 rounded-lg text-sm font-medium
                  transition-all duration-200 ${
                    settings.autoAdvance
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                {settings.autoAdvance ? '开启' : '关闭'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/practice/${settings.direction}`}
            className="group flex flex-col items-center justify-center
              bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600
              rounded-xl p-8 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎯</div>
            <div className="text-lg font-semibold text-white">开始练习</div>
            <div className="text-sm text-blue-200 mt-1">
              {settings.direction === 'en-zh' ? '英译汉' : '汉译英'} · {settings.difficulty === 'cet4' ? '四级' : settings.difficulty === 'cet6' ? '六级' : '混合'}
            </div>
          </Link>

          <Link
            href="/wrong"
            className="group flex flex-col items-center justify-center
              bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600
              rounded-xl p-8 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📕</div>
            <div className="text-lg font-semibold text-white">错题集</div>
            <div className="text-sm text-red-200 mt-1">
              {wrongRecords.length > 0 ? `${wrongRecords.length} 道题待复习` : '暂无错题'}
            </div>
          </Link>

          <Link
            href="/stats"
            className="group flex flex-col items-center justify-center
              bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600
              rounded-xl p-8 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📊</div>
            <div className="text-lg font-semibold text-white">学习统计</div>
            <div className="text-sm text-purple-200 mt-1">
              查看你的进步曲线
            </div>
          </Link>
        </div>

        {/* How it works */}
        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">使用说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Step icon="1️⃣" title="选择题目" desc="系统随机出题，也可选择英译汉或汉译英方向" />
            <Step icon="2️⃣" title="输入翻译" desc="输入你的翻译，Ctrl+Enter 快速提交" />
            <Step icon="3️⃣" title="查看评分" desc="AI 智能评分，详细反馈帮你提升翻译能力" />
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center border border-gray-700">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function Step({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="font-medium text-white">{title}</div>
        <div className="text-sm text-gray-400">{desc}</div>
      </div>
    </div>
  );
}
