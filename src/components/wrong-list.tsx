'use client';

import { WrongRecord } from '@/lib/types';

interface Props {
  records: WrongRecord[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReview: (id: string) => void;
}

export default function WrongList({ records, onDelete, onClearAll, onReview }: Props) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">错题集为空</h3>
        <p className="text-sm text-gray-500">
          完成翻译练习后，分数低于 60 分的题目会自动加入错题集
        </p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          共 {records.length} 道错题
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          清空错题集
        </button>
      </div>

      <div className="space-y-3">
        {records.map(record => (
          <div
            key={record.sentenceId}
            className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${getScoreColor(record.score)}`}>
                    {record.score}分
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(record.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {record.direction === 'en-zh' ? '英译汉' : '汉译英'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onReview(record.sentenceId)}
                  className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400
                    rounded hover:bg-blue-600/30 transition-colors"
                >
                  重做
                </button>
                <button
                  onClick={() => onDelete(record.sentenceId)}
                  className="px-3 py-1 text-xs bg-red-600/20 text-red-400
                    rounded hover:bg-red-600/30 transition-colors"
                >
                  移除
                </button>
              </div>
            </div>

            {/* Source text */}
            <div className="text-sm">
              <span className="text-gray-500">题目：</span>
              <span className="text-gray-300">{record.sourceText}</span>
            </div>

            {/* User's answer */}
            <div className="text-sm">
              <span className="text-red-400">你的答案：</span>
              <span className="text-gray-300">{record.userTranslation}</span>
            </div>

            {/* Reference */}
            <div className="text-sm">
              <span className="text-green-400">参考答案：</span>
              <span className="text-gray-300">{record.referenceTranslation}</span>
            </div>

            {/* Practice count */}
            {record.practiceCount > 1 && (
              <div className="text-xs text-gray-500">
                已练习 {record.practiceCount} 次
              </div>
            )}

            {/* Feedback summary */}
            <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
              {record.feedback.slice(0, 200)}
              {record.feedback.length > 200 ? '...' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
