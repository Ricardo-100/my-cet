export type Direction = 'en-zh' | 'zh-en';
export type Difficulty = 'cet4' | 'cet6' | 'mixed';

export interface Sentence {
  id: string;
  text: string;
  direction: Direction;
  difficulty: Difficulty;
  /** English original for reference (shown after scoring) */
  enOriginal?: string;
  /** Chinese reference translation (shown after scoring) */
  zhReference?: string;
  /** Key vocabulary list */
  vocab?: string[];
}

export interface TranslationRecord {
  sentenceId: string;
  direction: Direction;
  /** The sentence text */
  sourceText: string;
  /** User's translation attempt */
  userTranslation: string;
  /** Reference translation */
  referenceTranslation: string;
  /** Score (0-100) */
  score: number;
  /** Breakdown */
  accuracy: number;
  fluency: number;
  /** LLM feedback text */
  feedback: string;
  /** Timestamp */
  timestamp: number;
  /** Whether this was a wrong answer */
  isWrong: boolean;
}

export interface UserProgress {
  /** Total translations done */
  totalPractices: number;
  /** Average score */
  averageScore: number;
  /** Best streak */
  bestStreak: number;
  /** Current streak of score >= 70 */
  currentStreak: number;
  /** Last practiced timestamp */
  lastPracticed: number;
  /** Score history */
  scoreHistory: number[];
}

export interface WrongRecord extends TranslationRecord {
  /** How many times practiced */
  practiceCount: number;
  /** Last reviewed timestamp */
  lastReviewed: number;
}

export type EvaluateResult = {
  score: number;
  accuracy: number;
  fluency: number;
  feedback: string;
  reference: string;
  vocab?: string[];
};

export type AppState = {
  records: TranslationRecord[];
  wrongRecords: WrongRecord[];
  progress: UserProgress;
  settings: {
    direction: Direction;
    difficulty: Difficulty;
    autoAdvance: boolean;
  };
};
