'use client';

import { useState } from 'react';

interface Props {
  onImport: (items: { source: string; reference: string }[], direction: 'en-zh' | 'zh-en', difficulty: string) => void;
}

/** 每行一条，支持 "原文 | 参考译文" / "原文 => 参考译文" / 只有原文三种写法 */
function parseLines(text: string): { source: string; reference: string }[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      for (const separator of ['|', '=>', '→']) {
        const index = line.indexOf(separator);
        if (index !== -1) {
          return {
            source: line.slice(0, index).trim(),
            reference: line.slice(index + separator.length).trim(),
          };
        }
      }
      return { source: line, reference: '' };
    })
    .filter(item => item.source.length > 0);
}

export default function ImportPanel({ onImport }: Props) {
  const [text, setText] = useState('');
  const [direction, setDirection] = useState<'en-zh' | 'zh-en'>('en-zh');
  const [difficulty, setDifficulty] = useState('cet4');

  const items = parseLines(text);
  const complete = items.filter(item => item.reference.length > 0).length;

  const handleImport = () => {
    if (items.length === 0) return;
    onImport(items, direction, difficulty);
    setText('');
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">📥 导入题目</h3>

      {/* Direction & Difficulty */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">翻译方向</label>
          <div className="flex gap-2">
            {[
              { value: 'en-zh' as const, label: '英译汉' },
              { value: 'zh-en' as const, label: '汉译英' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDirection(opt.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  direction === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">难度</label>
          <div className="flex gap-2">
            {[
              { value: 'cet4', label: '四级' },
              { value: 'cet6', label: '六级' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  difficulty === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={
          '每行一条，三种写法都认：\n' +
          'It is never too late to learn. | 学习永远不嫌晚。\n' +
          'It is never too late to learn. => 学习永远不嫌晚。\n' +
          'It is never too late to learn.        （只写原文，参考译文留空）'
        }
        rows={8}
        className="w-full rounded-lg border border-gray-600 bg-gray-700/50 text-gray-100
          placeholder-gray-500 px-4 py-3 text-sm leading-relaxed
          resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          {items.length > 0
            ? `将导入 ${items.length} 条，其中 ${complete} 条带参考译文`
            : '从真题 PDF 复制原文粘贴进来即可'}
        </p>
        <button
          onClick={handleImport}
          disabled={items.length === 0}
          className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500
            disabled:bg-gray-600 disabled:cursor-not-allowed
            text-white font-medium text-sm transition-colors shrink-0"
        >
          导入
        </button>
      </div>
    </div>
  );
}
