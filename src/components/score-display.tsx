'use client';

import { Direction, EvaluateResult } from '@/lib/types';

interface Props {
  result: EvaluateResult;
  onNext: () => void;
  isLast?: boolean;
  isWrong: boolean;
  direction: Direction;
  /** 学生提交的翻译，用来和参考译文对照 */
  userTranslation: string;
}

export default function ScoreDisplay({ result, onNext, isLast, isWrong, direction, userTranslation }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '及格';
    return '需加强';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full space-y-6">
      {/* Score Circle */}
      <div className="flex flex-col items-center gap-2">
        <div className={`relative w-32 h-32 flex items-center justify-center`}>
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="54"
              fill="none" stroke="currentColor" strokeWidth="8"
              className="text-gray-700"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none" stroke="currentColor" strokeWidth="8"
              strokeDasharray={`${result.score * 3.39} 339`}
              strokeLinecap="round"
              className={getScoreColor(result.score)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}
            </span>
            <span className={`text-xs ${getScoreColor(result.score)}`}>
              {getScoreLabel(result.score)}
            </span>
          </div>
        </div>
        {isWrong && (
          <span className="text-xs text-red-400 bg-red-400/10 px-3 py-1 rounded-full">
            已加入错题集
          </span>
        )}
      </div>

      {/* Breakdown Bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/30 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">准确性</span>
            <span className={`text-sm font-medium ${getScoreColor(result.accuracy)}`}>
              {result.accuracy}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(result.accuracy)}`}
              style={{ width: `${result.accuracy}%` }}
            />
          </div>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">流畅性</span>
            <span className={`text-sm font-medium ${getScoreColor(result.fluency)}`}>
              {result.fluency}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(result.fluency)}`}
              style={{ width: `${result.fluency}%` }}
            />
          </div>
        </div>
      </div>

      {/* AI Feedback */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">AI 评语</h4>
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {result.feedback}
        </div>
      </div>

      {/* 你的翻译 vs 参考译文 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            你的翻译 ({direction === 'en-zh' ? '中文' : 'English'})
          </h4>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {userTranslation || '（未填写）'}
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-300 mb-2">
            参考译文 ({direction === 'en-zh' ? '中文' : 'English'})
          </h4>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {result.reference || '（无）'}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onNext}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500
          text-white font-medium transition-colors duration-200"
      >
        {isLast ? '练习完成，返回首页' : '下一题 →'}
      </button>
    </div>
  );
}
