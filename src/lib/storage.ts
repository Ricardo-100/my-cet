import {
  AppState,
  Sentence,
  TranslationRecord,
  Direction,
  Difficulty,
} from './types';
import { resolveModel } from './models';

export const STATE_KEY = 'cet_translation_app';
export const CUSTOM_KEY = 'cet_custom_sentences';

/** 从 localStorage 读原始字符串；服务端或抛错时一律返回 null */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 存储满或隐私模式，静默失败
  }
}

/**
 * 一份不依赖 localStorage 的初始状态。
 *
 * SSR 首屏和客户端首帧必须用它，两边才会渲染出一模一样的 HTML；
 * 真实数据等挂载后再由 useSyncExternalStore 交出来。否则服务端渲染 0 题、
 * 客户端一 hydration 就变成 3 题，React 会报 hydration mismatch。
 */
export function createDefaultState(): AppState {
  return {
    records: [],
    wrongRecords: [],
    progress: {
      totalPractices: 0,
      averageScore: 0,
      bestStreak: 0,
      currentStreak: 0,
      lastPracticed: 0,
      scoreHistory: [],
    },
    settings: {
      direction: 'en-zh',
      // 真题题库是六级的，用 mixed 才能抽到；new users 默认 mixed
      difficulty: 'mixed',
      model: 'step-3.7-flash',
    },
  };
}

function parseState(raw: string | null): AppState {
  if (!raw) return createDefaultState();
  try {
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultState(),
      ...parsed,
      // settings 和 progress 都必须深合并：老数据是整体替换，
      // 新增字段（如 model）会被旧数据里的同名字段顶掉，导致读到 undefined
      settings: {
        ...createDefaultState().settings,
        ...(parsed.settings || {}),
        // 模型名一律过白名单，老数据不会让界面停在一个失效选项上
        model: resolveModel(parsed.settings?.model),
      },
      progress: {
        ...createDefaultState().progress,
        ...(parsed.progress || {}),
        scoreHistory: parsed.progress?.scoreHistory || [],
      },
    };
  } catch {
    return createDefaultState();
  }
}

function parseCustomSentences(raw: string | null): Sentence[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Sentence[]) : [];
  } catch {
    return [];
  }
}

function saveState(state: AppState): void {
  writeRaw(STATE_KEY, JSON.stringify(state));
  emitStoreChange();
}

// === 外部 store：让 useSyncExternalStore 能订阅 localStorage ===
//
// 本文件不 import react，因为 route handler（src/app/api/evaluate/route.ts）
// 会通过 data.ts 间接引用它 —— server 模块里不能出现客户端 hook。
// 订阅与快照函数在这里导出，hook 本身放在 use-client-data.ts。

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // 跨标签页同步
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', listener);
    }
  };
}

/** 任何写 localStorage 之后都要调用，否则订阅方不会重新渲染 */
export function emitStoreChange(): void {
  for (const listener of listeners) listener();
}

export interface ClientData {
  state: AppState;
  /** 自定义题目数量 */
  customCount: number;
  /** 自定义题目本体，题库页要用；内置题库在 data.ts，是静态的、不走这里 */
  customSentences: Sentence[];
}

/**
 * getSnapshot 必须对同一份底层数据返回同一个引用，否则 React 会陷入
 * "getSnapshot should be cached" 的死循环。所以按原始字符串做缓存。
 */
let snapshotCache: { key: string; data: ClientData } | null = null;

export function readClientData(): ClientData {
  const stateRaw = readRaw(STATE_KEY);
  const customRaw = readRaw(CUSTOM_KEY);
  const key = `${stateRaw ?? ''}\n${customRaw ?? ''}`;

  if (snapshotCache && snapshotCache.key === key) return snapshotCache.data;

  // 只解析一次自定义题目，数量和数组共用同一份
  const sentences = parseCustomSentences(customRaw);

  const data: ClientData = {
    state: parseState(stateRaw),
    customCount: sentences.length,
    customSentences: sentences,
  };
  snapshotCache = { key, data };
  return data;
}

/** 服务端快照：与客户端首帧渲染保持一致 */
export function readClientDataOnServer(): ClientData {
  return { state: createDefaultState(), customCount: 0, customSentences: [] };
}

export function getState(): AppState {
  return readClientData().state;
}

export function getCustomSentences(): Sentence[] {
  return parseCustomSentences(readRaw(CUSTOM_KEY));
}

export function updateSettings(
  updates: Partial<{ direction: Direction; difficulty: Difficulty; model: string }>
): AppState {
  const state = getState();
  state.settings = {
    ...state.settings,
    ...updates,
    // 模型名过白名单，别把乱七八糟的值写进存储
    model: resolveModel(updates.model ?? state.settings.model),
  };
  saveState(state);
  return state;
}

export function addCustomSentences(
  items: { source: string; reference: string; direction: Direction; difficulty: string }[]
): Sentence[] {
  const existing = getCustomSentences();
  const now = Date.now();
  const newItems: Sentence[] = items.map((item, i) => {
    const base = {
      id: `custom-${now}-${i}`,
      text: item.source,
      direction: item.direction,
      difficulty: item.difficulty as 'cet4' | 'cet6' | 'mixed',
      vocab: [] as string[],
    };
    const reference = item.reference.trim();
    return item.direction === 'zh-en'
      ? { ...base, zhReference: item.source, enOriginal: reference || undefined }
      : { ...base, enOriginal: item.source, zhReference: reference || undefined };
  });

  const combined = [...existing, ...newItems];
  writeRaw(CUSTOM_KEY, JSON.stringify(combined));
  emitStoreChange();
  return combined;
}

export function addRecord(record: TranslationRecord): AppState {
  const state = getState();
  state.records.unshift(record);

  // Update progress
  state.progress.totalPractices++;
  state.progress.scoreHistory.push(record.score);
  const sum = state.progress.scoreHistory.reduce((a, b) => a + b, 0);
  state.progress.averageScore = Math.round(sum / state.progress.scoreHistory.length);
  state.progress.lastPracticed = Date.now();

  // Streak logic
  if (record.score >= 70) {
    state.progress.currentStreak++;
    if (state.progress.currentStreak > state.progress.bestStreak) {
      state.progress.bestStreak = state.progress.currentStreak;
    }
  } else {
    state.progress.currentStreak = 0;
  }

  // Add to wrong records if score < 70
  if (record.score < 70) {
    const existing = state.wrongRecords.find(w => w.sentenceId === record.sentenceId);
    if (existing) {
      existing.practiceCount++;
      existing.lastReviewed = Date.now();
      existing.userTranslation = record.userTranslation;
      existing.score = record.score;
      existing.accuracy = record.accuracy;
      existing.fluency = record.fluency;
      existing.feedback = record.feedback;
      existing.timestamp = record.timestamp;
      existing.isWrong = true;
    } else {
      state.wrongRecords.unshift({
        ...record,
        practiceCount: 1,
        lastReviewed: Date.now(),
      });
    }
  }

  saveState(state);
  return state;
}

export function removeWrongRecord(sentenceId: string): AppState {
  const state = getState();
  state.wrongRecords = state.wrongRecords.filter(w => w.sentenceId !== sentenceId);
  saveState(state);
  return state;
}

export function clearWrongRecords(): AppState {
  const state = getState();
  state.wrongRecords = [];
  saveState(state);
  return state;
}

export function resetAllData(): AppState {
  const fresh = createDefaultState();
  saveState(fresh);
  return fresh;
}

export function getScoreDistribution(records: TranslationRecord[]): Record<number, number> {
  const dist: Record<number, number> = {};
  records.forEach(r => {
    const band = Math.floor(r.score / 10) * 10;
    dist[band] = (dist[band] || 0) + 1;
  });
  return dist;
}

export function getDirectionStats(records: TranslationRecord[]): {
  enZh: { count: number; avg: number };
  zhEn: { count: number; avg: number };
} {
  const enZh = records.filter(r => r.direction === 'en-zh');
  const zhEn = records.filter(r => r.direction === 'zh-en');

  const avg = (list: TranslationRecord[]) =>
    list.length ? Math.round(list.reduce((s, r) => s + r.score, 0) / list.length) : 0;

  return {
    enZh: { count: enZh.length, avg: avg(enZh) },
    zhEn: { count: zhEn.length, avg: avg(zhEn) },
  };
}

export function getRecentRecords(
  records: TranslationRecord[],
  days: number = 7
): TranslationRecord[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter(r => r.timestamp > cutoff);
}
