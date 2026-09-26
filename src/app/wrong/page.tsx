'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppState, Sentence, Direction } from '@/lib/types';
import { getState, removeWrongRecord, clearWrongRecords, addRecord } from '@/lib/storage';
import WrongList from '@/components/wrong-list';
import { getRandomSentence } from '@/lib/data';

export default function WrongPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState>(getState());
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [translation, setTranslation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const reload = () => {
    setState(getState());
    setIsReloading(prev => !prev);
  };

  // Listen for storage changes
  useEffect(() => {
    const handleStorage = () => {
      const s = getState();
      setState(s);
      if (currentSentence && !s.wrongRecords.find(w => w.sentenceId === currentSentence.id)) {
        setCurrentSentence(null);
        setResult(null);
        setTranslation('');
        setIsReviewing(false);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentSentence]);

  const handleReview = (sentenceId: string) => {
    const sentence = currentSentence;
    if (!sentence || sentence.id !== sentenceId) {
      const sentenceData = sentenceId;
      // Find from wrong records
      const state = getState();
      const wrong = state.wrongRecords.find(w => w.sentenceId === sentenceId);
      if (wrong) {
        // Create a sentence-like object for reviewing
        setCurrentSentence({
          id: wrong.sentenceId,
          text: wrong.sourceText,
          direction: wrong.direction,
          difficulty: 'cet4',
          enOriginal: wrong.sourceText,
          zhReference: wrong.referenceTranslation,
        } as Sentence);
      }
    }
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
          sourceText: currentSentence.text,
          userTranslation: translation.trim(),
          referenceTranslation: currentSentence.zhReference || '',
          direction: currentSentence.direction,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '评分失败');

      const isWrong = data.score < 70;

      const record = {
        sentenceId: currentSentence.id,
        direction: currentSentence.direction,
        sourceText: currentSentence.text,
        userTranslation: translation.trim(),
        referenceTranslation: currentSentence.zhReference || '',
        score: data.score,
        accuracy: data.accuracy,
        fluency: data.fluency,
        feedback: data.feedback,
        timestamp: Date.now(),
        isWrong,
      };

      addRecord(record);
      setResult(data);

      if (!isWrong) {
        removeWrongRecord(currentSentence.id);
      }
    } catch (err) {
      setResult({
        score: 0,
        accuracy: 0,
        fluency: 0,
        feedback: err instanceof Error ? err.message : '评分失败',
        reference: currentSentence.zhReference || '',
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
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <WrongList
          records={state.wrongRecords}
          onDelete={(id) => {
            removeWrongRecord(id);
            reload();
          }}
          onClearAll={() => {
            if (confirm('确定清空所有错题？此操作不可撤销。')) {
              clearWrongRecords();
              reload();
            }
          }}
          onReview={handleReview}
        />
      </main>
    </div>
  );
}
