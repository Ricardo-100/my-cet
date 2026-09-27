'use client';

import { UserProgress, TranslationRecord } from '@/lib/types';
import { getScoreDistribution, getDirectionStats } from '@/lib/storage';

interface Props {
  records: TranslationRecord[];
  progress: UserProgress;
}

export default function StatsDisplay({ records, progress }: Props) {
  const scoreDist = getScoreDistribution(records);
  const dirStats = getDirectionStats(records);
  const maxBar = Math.max(...Object.values(scoreDist), 1);

  const getDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 用最新一条记录当「今天」的锚点，不读时钟：
  // 一是 Date.now() 在 SSR 与客户端各有一个值，是 hydration mismatch 的经典来源；
  // 二是这样「近7天」永远覆盖有数据的那几天。
  const anchor = records.reduce((max, r) => Math.max(max, r.timestamp), 0);
  const hasRecords = records.length > 0;

  // Last 7 days score chart data
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const cutoff = anchor - i * 24 * 60 * 60 * 1000;
    const dayStart = new Date(cutoff);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(cutoff);
    dayEnd.setHours(23, 59, 59, 999);

    const dayRecords = records.filter(r => {
      const d = new Date(r.timestamp);
      return d >= dayStart && d <= dayEnd;
    });

    const avg = dayRecords.length
      ? Math.round(dayRecords.reduce((s, r) => s + r.score, 0) / dayRecords.length)
      : null;

    last7Days.push({
      label: getDateLabel(cutoff),
      score: avg,
      count: dayRecords.length,
    });
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总练习数" value={progress.totalPractices} icon="📝" />
        <StatCard label="平均分数" value={progress.averageScore} icon="📊" />
        <StatCard label="连续优秀" value={progress.bestStreak} icon="🔥" />
        <StatCard label="当前连续" value={progress.currentStreak} icon="⚡" />
      </div>

      {/* 7-Day Score Trend */}
      <div className="bg-gray-700/30 rounded-lg p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">近7天分数趋势</h3>
        {!hasRecords ? (
          <p className="h-32 flex items-center justify-center text-sm text-gray-500">
            还没有练习记录，去做第一道翻译题吧
          </p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32">
            {last7Days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-gray-400">{day.score ?? '-'}</div>
                <div className="w-full bg-gray-600 rounded-t relative" style={{ height: '80px' }}>
                  {day.score !== null && (
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
                        day.score >= 75 ? 'bg-green-500' :
                        day.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ height: `${(day.score / 100) * 100}%` }}
                    />
                  )}
                </div>
                <div className="text-xs text-gray-500">{day.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Score Distribution */}
      <div className="bg-gray-700/30 rounded-lg p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">分数分布</h3>
        <div className="flex items-end gap-1 h-24">
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(band => {
            const count = scoreDist[band] || 0;
            return (
              <div key={band} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gray-600 rounded-t relative" style={{ height: '64px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t ${
                      band >= 60 ? 'bg-green-500' :
                      band >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${(count / maxBar) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">{band}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direction Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/30 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            英译汉 ({dirStats.enZh.count}题)
          </h3>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${dirStats.enZh.avg >= 60 ? 'text-green-400' : 'text-red-400'}`}>
              {dirStats.enZh.avg || '-'}
            </span>
            {dirStats.enZh.avg && <span className="text-sm text-gray-500 mb-1">/100 平均</span>}
          </div>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            汉译英 ({dirStats.zhEn.count}题)
          </h3>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${dirStats.zhEn.avg >= 60 ? 'text-green-400' : 'text-red-400'}`}>
              {dirStats.zhEn.avg || '-'}
            </span>
            {dirStats.zhEn.avg && <span className="text-sm text-gray-500 mb-1">/100 平均</span>}
          </div>
        </div>
      </div>

      {/* Achievement badges */}
      <div className="bg-gray-700/30 rounded-lg p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">成就</h3>
        <div className="flex flex-wrap gap-3">
          {progress.totalPractices >= 10 && (
            <AchievementBadge icon="🌟" label="初出茅庐" desc="完成10道题" />
          )}
          {progress.totalPractices >= 50 && (
            <AchievementBadge icon="📚" label="勤奋学员" desc="完成50道题" />
          )}
          {progress.totalPractices >= 100 && (
            <AchievementBadge icon="🏆" label="百题斩" desc="完成100道题" />
          )}
          {progress.bestStreak >= 5 && (
            <AchievementBadge icon="🔥" label="连胜达人" desc="连续5题优秀" />
          )}
          {progress.bestStreak >= 10 && (
            <AchievementBadge icon="💪" label="翻译达人" desc="连续10题优秀" />
          )}
          {progress.averageScore >= 80 && progress.totalPractices >= 10 && (
            <AchievementBadge icon="⭐" label="优秀表现" desc="平均分80+" />
          )}
          {records.filter(r => r.score >= 90).length >= 5 && (
            <AchievementBadge icon="💎" label="完美主义者" desc="5次90分以上" />
          )}
          {records.length === 0 && (
            <span className="text-sm text-gray-500">开始练习来解锁成就吧！</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function AchievementBadge({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/30
      rounded-full px-3 py-1.5">
      <span className="text-sm">{icon}</span>
      <div>
        <span className="text-xs font-medium text-yellow-300">{label}</span>
        <span className="text-xs text-gray-500 ml-1">{desc}</span>
      </div>
    </div>
  );
}
