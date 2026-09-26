'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  label: string;
  disabled?: boolean;
}

export default function TranslationEditor({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  placeholder,
  label,
  disabled,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isSubmitting && !disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || ''}
        disabled={disabled}
        rows={6}
        className="w-full rounded-lg border border-gray-600 bg-gray-700/50 text-gray-100
          placeholder-gray-500 px-4 py-3 text-base leading-relaxed
          resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500
          focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">
          {value.length > 0 ? `${value.length} 字` : ''}
        </span>
        <span className="text-xs text-gray-500">
          Ctrl+Enter 快速提交
        </span>
      </div>
    </div>
  );
}
