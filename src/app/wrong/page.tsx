'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sentence, EvaluateResult } from '@/lib/types';
import {getState, removeWrongRecord, clearWrongRecords, addRecord} from '@/lib/storage';
import { useClientData } from '@/lib/use-client-data';
import WrongList from '@/components/wrong-list';
import { getSentenceById } from '@/lib/data';

export default function WrongPage() {
  const router = useRouter();
  // useSyncExternalStore：首帧与 SSR 一致，挂载后自动切到真实数据
  const { state } = useClientData();
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [translation, setTranslation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  /** 退出复习模式并清空输入；错题被删除时调用 */
  const exitReview = useCallback(() => {
    setCurrentSentence(null);
    setResult(null);
    setTranslation('');
    setIsReviewing(false);
  }, []);

  const handleReview = (sentenceId: string) => {
    const wrong = getState().wrongRecords.find(w => w.sentenceId === sentenceId);
    if (!wrong) return;

    // 题库里有原文就更可靠：用它补上难度和正确的参考译文字段
    const fromBank = getSentenceById(wrong.sentenceId);
    const reference = fromBank
      ? fromBank.direction === 'en-zh'
        ? fromBank.zhReference ?? wrong.referenceTranslation
        : fromBank.enOriginal ?? wrong.referenceTranslation
      : wrong.referenceTranslation;

    setCurrentSentence({
      id: wrong.sentenceId,
      text: wrong.sourceText,
      direction: wrong.direction,
      difficulty: fromBank?.difficulty ?? 'cet4',
      enOriginal: wrong.direction === 'en-zh' ? wrong.sourceText : reference,
      zhReference: wrong.direction === 'en-zh' ? reference : wrong.sourceText,
    });
    setTranslation('');
    setResult(null);
    setIsReviewing(true);
  };

  const handleSubmit = async () => {
    if (!currentSentence || !translation.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentenceId: currentSentence.id,
          sourceText: currentSentence.text,
          userTranslation: translation.trim(),
          referenceTranslation: currentSentence.zhReference || '',
          direction: currentSentence.direction,
          model: getState().settings.model,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '评分失败');

      const evalResult = data as EvaluateResult;
      const isWrong = evalResult.score < 70;

      addRecord({
        sentenceId: currentSentence.id,
        direction: currentSentence.direction,
        sourceText: currentSentence.text,
        userTranslation: translation.trim(),
        referenceTranslation: currentSentence.zhReference || '',
        score: evalResult.score,
        accuracy: evalResult.accuracy,
        fluency: evalResult.fluency,
        feedback: evalResult.feedback,
        timestamp: Date.now(),
        isWrong,
      });

      setResult(evalResult);

      if (!isWrong) {
        // 已经掌握了：从错题集移除，并退出复习模式
        removeWrongRecord(currentSentence.id);
        exitReview();
      }
    } catch (err) {
      setResult({
        score: 0,
        accuracy: 0,
        fluency: 0,
        feedback: err instanceof Error ? err.message : '评分失败',
        reference: currentSentence.zhReference || '',
        vocab: [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review mode
  if (isReviewing && currentSentence) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="border-b border-gray-800">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsReviewing(false);
                  setCurrentSentence(null);
                  setResult(null);
                  setTranslation('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← 返回错题集
              </button>
            </div>
            <span className="text-sm text-orange-400">复习模式</span>
          </div>
        </div>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-6 mb-6">
            <div className="flex gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-600/20 text-orange-400 border border-orange-600/30">
                错题复习
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-600/30">
                {currentSentence.difficulty === 'cet4' ? 'CET-4' : 'CET-6'}
              </span>
            </div>
            <p className="text-xl text-white leading-relaxed font-medium">
              {currentSentence.text}
            </p>
          </div>

          {!result && (
            <div className="space-y-4">
              <textarea
                value={translation}
                onChange={e => setTranslation(e.target.value)}
                placeholder={
                  currentSentence.direction === 'en-zh'
                    ? '请重新翻译这个句子...'
                    : 'Please re-translate this sentence...'
                }
                rows={6}
                className="w-full rounded-lg border border-gray-600 bg-gray-700/50 text-gray-100
                  placeholder-gray-500 px-4 py-3 text-base leading-relaxed
                  resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500
                  focus:border-transparent transition-all duration-200"
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !translation.trim()}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500
                  disabled:bg-gray-600 disabled:cursor-not-allowed
                  text-white font-medium transition-colors duration-200"
              >
                {isSubmitting ? '评分中...' : '提交答案'}
              </button>
            </div>
          )}

          {result && (
            <div className="bg-gray-700/30 rounded-xl p-6 space-y-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${result.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.score} 分
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {result.score >= 70 ? '已掌握！' : '继续加油！'}
                </div>
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-gray-500">参考译文：</span>
                <span>{result.reference}</span>
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-gray-500">评语：</span>
                <span>{result.feedback}</span>
              </div>
              <button
                onClick={() => {
                  setIsReviewing(false);
                  setCurrentSentence(null);
                  setResult(null);
                  setTranslation('');
                }}
                className="w-full py-3 rounded-lg bg-gray-600 hover:bg-gray-500
                  text-white font-medium transition-colors duration-200"
              >
                返回错题集
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-white">📕 错题集</h1>
          <Link href="/settings" className="text-sm text-gray-400 hover:text-white">设置</Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <WrongList
          records={state.wrongRecords}
          onDelete={(id) => {
            removeWrongRecord(id);
            // 删掉的正是正在复习的那道，就退出复习模式
            if (currentSentence?.id === id) exitReview();
          }}
          onClearAll={() => {
            if (confirm('确定清空所有错题？此操作不可撤销。')) {
              clearWrongRecords();
              exitReview();
            }
          }}
          onReview={handleReview}
        />
      </main>
    </div>
  );
}
