'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sentence, Direction } from '@/lib/types';
import { allSentences, bankCount } from '@/lib/data';
import { bankExamOptions } from '@/lib/bank';
import { useClientData } from '@/lib/use-client-data';

const PAGE_SIZE = 20;

type DirectionFilter = 'all' | Direction;
type DifficultyFilter = 'all' | 'cet4' | 'cet6';
type SourceFilter = 'all' | 'handmade' | 'exam' | 'custom';

const DIRECTION_LABEL: Record<Direction, string> = {
  'en-zh': '英译汉',
  'zh-en': '汉译英',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  cet4: 'CET-4',
  cet6: 'CET-6',
  mixed: '混合',
};

/** 真题条目带 exam 字段，手工例句和自定义题都没有 */
function isExamItem(item: Sentence): boolean {
  return typeof item.exam === 'string';
}

function isCustomItem(item: Sentence): boolean {
  return item.id.startsWith('custom-');
}

export default function BankPage() {
  const router = useRouter();
  // 内置题库是静态模块数据，SSR 就能渲染；自定义题目来自 localStorage
  const { customSentences } = useClientData();

  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [source, setSource] = useState<SourceFilter>('all');
  const [exam, setExam] = useState<string>('all');
  const [page, setPage] = useState(1);

  const all = useMemo(
    () => [...allSentences, ...customSentences],
    [customSentences]
  );

  const handmadeCount = all.filter(s => !isExamItem(s) && !isCustomItem(s)).length;

  const filtered = useMemo(() => {
    return all.filter(item => {
      if (direction !== 'all' && item.direction !== direction) return false;
      if (difficulty !== 'all' && item.difficulty !== difficulty) return false;
      if (source === 'exam' && !isExamItem(item)) return false;
      if (source === 'custom' && !isCustomItem(item)) return false;
      if (source === 'handmade' && (isExamItem(item) || isCustomItem(item))) return false;
      if (exam !== 'all' && item.exam !== exam) return false;
      return true;
    });
  }, [all, direction, difficulty, source, exam]);

  // 筛选条件一变就回第一页，否则可能停在不存在的页码上
  const changeFilter = useCallback(
    <T,>(setter: (value: T) => void) => (value: T) => {
      setter(value);
      setPage(1);
    },
    []
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

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
          <h1 className="text-lg font-semibold text-white">📚 题库</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 筛选 */}
        <section className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 space-y-4">
          <FilterRow
            label="翻译方向"
            value={direction}
            onChange={changeFilter(setDirection)}
            options={[
              { value: 'all', label: '全部' },
              { value: 'en-zh', label: '英译汉' },
              { value: 'zh-en', label: '汉译英' },
            ]}
          />
          <FilterRow
            label="难度"
            value={difficulty}
            onChange={changeFilter(setDifficulty)}
            options={[
              { value: 'all', label: '全部' },
              { value: 'cet4', label: '四级' },
              { value: 'cet6', label: '六级' },
            ]}
          />
          <FilterRow
            label="来源"
            value={source}
            onChange={changeFilter(setSource)}
            options={[
              { value: 'all', label: '全部' },
              { value: 'exam', label: `真题（${bankCount}）` },
              { value: 'handmade', label: `手工例句（${handmadeCount}）` },
              { value: 'custom', label: `自定义（${customSentences.length}）` },
            ]}
          />
          {bankExamOptions.length > 0 && (
            <FilterRow
              label="考试场次（仅真题）"
              value={exam}
              onChange={changeFilter(setExam)}
              options={[
                { value: 'all', label: '全部场次' },
                ...bankExamOptions.map(o => ({ value: o.value, label: o.label })),
              ]}
            />
          )}
        </section>

        {/* 计数与分页 */}
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-gray-400">
            共 <span className="text-white font-medium">{filtered.length}</span> 题
            {filtered.length !== all.length && ` / 全部 ${all.length} 题`}
          </p>
          {totalPages > 1 && (
            <p className="text-gray-500">
              第 {safePage} / {totalPages} 页
            </p>
          )}
        </div>

        {/* 列表 */}
        {visible.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">没有符合条件的题目</h3>
            <p className="text-sm text-gray-500">换个筛选条件试试</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(item => (
              <SentenceCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* 分页按钮 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-4 py-2 rounded-lg text-sm bg-gray-700 text-gray-200
                hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600
                disabled:cursor-not-allowed transition-colors"
            >
              ← 上一页
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-4 py-2 rounded-lg text-sm bg-gray-700 text-gray-200
                hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600
                disabled:cursor-not-allowed transition-colors"
            >
              下一页 →
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          题库仅供查看。想添加自己的题目，请回到首页的「导入真题题目」。
        </p>
      </main>
    </div>
  );
}

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

function FilterRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              value === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SentenceCard({ item }: { item: Sentence }) {
  const examItem = isExamItem(item);
  const customItem = isCustomItem(item);
  // 汉译英时参考译文是英文；英译汉时是中文
  const reference =
    item.direction === 'en-zh' ? item.zhReference : item.enOriginal;

  const sourceLabel = customItem ? '自定义' : examItem ? '真题' : '手工';
  const sourceClass = customItem
    ? 'bg-green-600/20 text-green-400 border-green-600/30'
    : examItem
      ? 'bg-amber-600/20 text-amber-400 border-amber-600/30'
      : 'bg-gray-600/20 text-gray-400 border-gray-600/30';

  return (
    <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30">
            {DIRECTION_LABEL[item.direction]}
          </span>
          <span className="px-2 py-0.5 rounded text-xs bg-purple-600/20 text-purple-400 border border-purple-600/30">
            {DIFFICULTY_LABEL[item.difficulty] ?? item.difficulty}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs border ${sourceClass}`}>
            {sourceLabel}
          </span>
          {examItem && typeof item.paper === 'number' && (
            <span className="text-xs text-gray-500">第 {item.paper} 套</span>
          )}
        </div>
        <code className="text-xs text-gray-600 shrink-0">{item.id}</code>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-1">
          {item.direction === 'en-zh' ? '英文原文' : '中文原文'}
        </div>
        <p className="text-gray-200 leading-relaxed">{item.text}</p>
      </div>

      {/* 真题原卷给的英文提示词，对汉译英是实打实的帮手 */}
      {item.hints && item.hints.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">原卷提示</div>
          <div className="flex flex-wrap gap-1.5">
            {item.hints.map((word, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-amber-900/30 text-amber-300 rounded"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-gray-500 mb-1">
          {item.direction === 'en-zh' ? '参考译文' : '参考英译'}
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          {reference?.trim()
            ? reference
            : '（无——批改时由 AI 直接给出参考译文）'}
        </p>
      </div>

      {item.vocab && item.vocab.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">关键词</div>
          <div className="flex flex-wrap gap-1.5">
            {item.vocab.map((word, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-gray-800/60 text-gray-400 rounded"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
