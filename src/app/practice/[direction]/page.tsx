'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Direction, Difficulty, Sentence, EvaluateResult, TranslationRecord } from '@/lib/types';
import { getRandomSentence, getSentenceById } from '@/lib/data';
import { addRecord, getState } from '@/lib/storage';
import TranslationEditor from '@/components/translation-editor';
import ScoreDisplay from '@/components/score-display';

export default function PracticePage({ params }: { params: Promise<{ direction: string }> }) {
  // We use use() for the unwrapped params
  // For now let's use a wrapper approach
  return <PracticeInner params={params} />;
}

function PracticeInner({ params }: { params: Promise<{ direction: string }> }) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>('en-zh');
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [translation, setTranslation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalInSession, setTotalInSession] = useState(10);
  const usedIds = useRef<string[]>([]);
  const paramsResolved = useRef(false);

  // Resolve params
  useEffect(() => {
    params.then(p => {
      if (p.direction === 'zh-en') {
        setDirection('zh-en');
      }
      paramsResolved.current = true;
    }).catch(() => {
      paramsResolved.current = true;
    });
  }, [params]);

  // Load next sentence
  const loadNext = useCallback(() => {
    const state = getState();
    const newSentence = getRandomSentence(
      direction,
      state.settings.difficulty,
      usedIds.current
    );
    setSentence(newSentence);
    usedIds.current.push(newSentence.id);
    setTranslation('');
    setResult(null);
    setError(null);
  }, [direction]);

  // Initial load
  useEffect(() => {
    if (paramsResolved.current) {
      loadNext();
    }
  }, [paramsResolved, loadNext]);

  const handleSubmit = async () => {
    if (!sentence || !translation.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: sentence.text,
          userTranslation: translation.trim(),
          referenceTranslation: sentence.zhReference || '',
          direction: sentence.direction,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '评分失败，请重试');
      }

      const evalResult: EvaluateResult = data;

      // Determine if wrong (score < 70)
      const isWrong = evalResult.score < 70;

      // Save record
      const record: TranslationRecord = {
        sentenceId: sentence.id,
        direction: sentence.direction,
        sourceText: sentence.text,
        userTranslation: translation.trim(),
        referenceTranslation: sentence.zhReference || '',
        score: evalResult.score,
        accuracy: evalResult.accuracy,
        fluency: evalResult.fluency,
        feedback: evalResult.feedback,
        timestamp: Date.now(),
        isWrong,
      };

      addRecord(record);
      setSessionCount(prev => prev + 1);

      setResult(evalResult);
      setResult(prev => prev ? { ...prev, reference: evalResult.reference } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : '评分失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (sessionCount >= totalInSession - 1) {
      router.push('/');
    } else {
      loadNext();
    }
  };

  if (!sentence) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top bar */}
      <div className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← 返回
            </button>
            <span className="text-gray-500">|</span>
            <span className="text-sm text-gray-400">
              {direction === 'en-zh' ? '英译汉' : '汉译英'}练习
            </span>
          </div>
          <div className="text-sm text-gray-400">
            进度：{sessionCount}/{totalInSession}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${((sessionCount + (result ? 1 : 0)) / totalInSession) * 100}%` }}
        />
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Direction & Difficulty tags */}
        <div className="flex gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30">
            {direction === 'en-zh' ? '英译汉' : '汉译英'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-600/30">
            {sentence.difficulty === 'cet4' ? 'CET-4' : 'CET-6'}
          </span>
        </div>

        {/* Sentence card */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">翻译以下句子</h2>
          <p className="text-xl text-white leading-relaxed font-medium">
            {sentence.text}
          </p>
        </div>

        {/* Vocab hints */}
        {sentence.vocab && sentence.vocab.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs text-gray-500 mb-2">关键词提示</h3>
            <div className="flex flex-wrap gap-2">
              {sentence.vocab.map((word, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs bg-gray-700/50 text-gray-400 rounded"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Translation area */}
        {!result && (
          <div className="space-y-4">
            <TranslationEditor
              value={translation}
              onChange={setTranslation}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              label="你的翻译"
              placeholder={
                direction === 'en-zh'
                  ? '请输入中文翻译...'
                  : 'Please enter your English translation...'
              }
            />

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !translation.trim()}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500
                disabled:bg-gray-600 disabled:cursor-not-allowed
                text-white font-medium transition-colors duration-200
                flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  评分中...
                </>
              ) : (
                <>提交评分 ✨</>
              )}
            </button>
          </div>
        )}

        {/* Result display */}
        {result && (
          <ScoreDisplay
            result={result}
            onNext={handleNext}
            isLast={sessionCount >= totalInSession - 1}
            isWrong={result.score < 70}
            direction={direction}
          />
        )}
      </main>
    </div>
  );
}
