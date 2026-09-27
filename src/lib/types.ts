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
  /** 原卷给出的英文提示词（真题 Translation 段的括号提示），按句归属 */
  hints?: string[];
  /** 真题考次，如 '2024.12'；手工题没有这个字段 */
  exam?: string;
  /** 真题套号 1-3 */
  paper?: number;
  /** 四级还是六级真题。四六级同一考次都存在，光看 exam 分不清 */
  level?: 'cet4' | 'cet6';
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
    /** 选中的模型 id，须在 AVAILABLE_MODELS 白名单内 */
    model: string;
  };
};
