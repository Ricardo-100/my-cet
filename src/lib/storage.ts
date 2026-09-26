import { AppState, TranslationRecord, WrongRecord, UserProgress, Direction, Difficulty } from './types';

const STORAGE_KEY = 'cet_translation_app';

const defaultState: AppState = {
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
    difficulty: 'cet4',
    autoAdvance: true,
  },
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      progress: {
        ...defaultState.progress,
        ...(parsed.progress || {}),
        scoreHistory: parsed.progress?.scoreHistory || [],
      },
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silently fail if storage is full
  }
}

export function getState(): AppState {
  return loadState();
}

export function updateSettings(
  updates: Partial<{ direction: Direction; difficulty: Difficulty; autoAdvance: boolean }>
): AppState {
  const state = loadState();
  state.settings = { ...state.settings, ...updates };
  saveState(state);
  return state;
}

export function addRecord(record: TranslationRecord): AppState {
  const state = loadState();
  state.records.unshift(record);

  // Update progress
  state.progress.totalPractices++;
  state.progress.scoreHistory.push(record.score);
  const sum = state.progress.scoreHistory.reduce((a, b) => a + b, 0);
  state.progress.averageScore = Math.round(
    sum / state.progress.scoreHistory.length
  );
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
  const state = loadState();
  state.wrongRecords = state.wrongRecords.filter(w => w.sentenceId !== sentenceId);
  saveState(state);
  return state;
}

export function clearWrongRecords(): AppState {
  const state = loadState();
  state.wrongRecords = [];
  saveState(state);
  return state;
}

export function resetAllData(): AppState {
  saveState({ ...defaultState });
  return { ...defaultState };
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

export function getRecentRecords(records: TranslationRecord[], days: number = 7): TranslationRecord[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter(r => r.timestamp > cutoff);
}
