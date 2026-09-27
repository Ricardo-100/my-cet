import bankData from '../../data/bank/translations.json';
import { Sentence } from './types';

/**
 * 真题题库。
 *
 * 数据由 `python3 scripts/extract-translations.py` 从 data/ 里的四六级真题
 * 生成，结构见 data/bank/translations.json 的 meta。重新生成后这里的类型
 * 会自动跟着变（JSON 是 as const 读入的）。
 */

export interface BankSentence {
  id: string;
  level: 'cet4' | 'cet6';
  exam: string;
  paper: number;
  seq: number;
  source: string;
  hints: string[];
  vocab: string[];
  sourceFile: string;
  extractedBy: string;
}

export const bankMeta = bankData.meta;

const rawSentences = bankData.sentences as unknown as BankSentence[];

/**
 * 真题的 Translation 段天然是汉译英，所以整库都是 zh-en。
 *
 * 没有参考译文——答案解析不处理。批改时 reference 为空，StepFun 会自己给
 * 参考译文，对翻译批改没有影响（见 api/evaluate 的 prompt）。
 */
export const bankSentences: Sentence[] = rawSentences.map((s) => ({
  id: s.id,
  text: s.source,
  direction: 'zh-en' as const,
  difficulty: s.level === 'cet4' ? 'cet4' : 'cet6',
  zhReference: s.source,
  vocab: s.vocab,
  hints: s.hints,
  exam: s.exam,
  paper: s.paper,
  level: s.level,
}));

export const bankExams: string[] = [...new Set(bankSentences.map((s) => s.exam!))].sort();

/**
 * 场次筛选的选项。同一个考次（如 2015.06）四六级都考，标签要写上级别，
 * 否则「难度=全部」时选了 2015.06 会把两级的卷子混在一起，看不出是谁的。
 */
export interface BankExamOption {
  value: string;
  label: string;
}

export const bankExamOptions: BankExamOption[] = bankExams.map((exam) => {
  const levels = new Set(
    bankSentences.filter((s) => s.exam === exam).map((s) => s.level)
  );
  const tag = [...levels].sort().map(l => (l === 'cet4' ? '四级' : '六级')).join('/');
  return { value: exam, label: `${exam} ${tag}` };
});

export const bankStats = {
  sentences: bankSentences.length,
  papers: bankMeta.papers as number,
  cet4: bankSentences.filter((s) => s.level === 'cet4').length,
  cet6: bankSentences.filter((s) => s.level === 'cet6').length,
  withHints: bankSentences.filter((s) => (s.hints?.length ?? 0) > 0).length,
};
