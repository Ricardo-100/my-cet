'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Direction, Sentence, EvaluateResult } from '@/lib/types';
import { getRandomSentence } from '@/lib/data';
import { addRecord, getState } from '@/lib/storage';
import TranslationEditor from '@/components/translation-editor';
import ScoreDisplay from '@/components/score-display';

const TOTAL_PER_SESSION = 10;

export default function PracticeClient({
  initialDirection,
}: {
  initialDirection: Direction;
}) {
  const router = useRouter();
  const [direction] = useState<Direction>(initialDirection);
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [translation, setTranslation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const usedIds = useRef<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  // 提交期间显示已等待时长：评分要好几秒，有数字比干等更容易接受
  // 注意：清零放在 handleSubmit 里，不放在 effect 里，避免 setState-in-effect
  useEffect(() => {
    if (!isSubmitting) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(timer);
  }, [isSubmitting]);

  const loadNext = useCallback(() => {
    const state = getState();
    const next = getRandomSentence(direction, state.settings.difficulty, usedIds.current);
    setSentence(next);
    usedIds.current.push(next.id);
    setTranslation('');
    setResult(null);
    setError(null);
  }, [direction]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  const handleSubmit = async () => {
    if (!sentence || !translation.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setElapsed(0);
    setError(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 带上 sentenceId，服务端会按题库查表拿权威的原文和参考译文
          sentenceId: sentence.id,
          sourceText: sentence.text,
          userTranslation: translation.trim(),
          referenceTranslation: sentence.zhReference || '',
          direction: sentence.direction,
          model: getState().settings.model,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '评分失败，请重试');
      }

      const evalResult = data as EvaluateResult;

      addRecord({
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
        isWrong: evalResult.score < 70,
      });

      setSessionCount(prev => prev + 1);
      setResult(evalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '评分失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (sessionCount >= TOTAL_PER_SESSION - 1) {
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

  const isLast = sessionCount >= TOTAL_PER_SESSION - 1;

  return (
    <div className="min-h-screen bg-gray-900">
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
            进度：{sessionCount}/{TOTAL_PER_SESSION}
          </div>
        </div>
      </div>

      <div className="w-full h-1 bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{
            width: `${((sessionCount + (result ? 1 : 0)) / TOTAL_PER_SESSION) * 100}%`,
          }}
        />
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30">
            {direction === 'en-zh' ? '英译汉' : '汉译英'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-600/30">
            {sentence.difficulty === 'cet4' ? 'CET-4' : 'CET-6'}
          </span>
          {sentence.exam && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700/40 text-gray-400 border border-gray-700">
              {sentence.exam} 第{sentence.paper}套
            </span>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">翻译以下句子</h2>
          <p className="text-xl text-white leading-relaxed font-medium">{sentence.text}</p>
        </div>

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

        {!result && (
          <div className="space-y-4">
            <TranslationEditor
              value={translation}
              onChange={setTranslation}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              label="你的翻译"
              placeholder={
                direction === 'en-zh' ? '请输入中文翻译...' : 'Please enter your English translation...'
              }
            />

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-3 whitespace-pre-wrap">
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
                  评分中… {elapsed.toFixed(1)}s
                </>
              ) : (
                <>提交评分 ✨</>
              )}
            </button>
          </div>
        )}

        {result && (
          <ScoreDisplay
            result={result}
            onNext={handleNext}
            isLast={isLast}
            isWrong={result.score < 70}
            direction={direction}
            userTranslation={translation.trim()}
          />
        )}
      </main>
    </div>
  );
}
