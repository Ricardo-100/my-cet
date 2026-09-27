import { NextRequest, NextResponse } from 'next/server';
import { EvaluateResult, Direction } from '@/lib/types';
import { chat, type ChatResult } from '@/lib/stepfun';
import { looksLikeMojibake, repairMojibake } from '@/lib/encoding';
import { getSentenceById } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 批改接口。
 *
 * 相比旧版的三个关键修正：
 *
 * 1) 参考译文改为服务端按 sentenceId 查表，不再信任客户端传来的那份。
 *    题库在 data.ts 里是干净 UTF-8，查表能彻底绕开可能被 GBK 化的传输通道。
 *
 * 2) 解析 JSON 时只认 message.content。旧代码在 content 为空时回退取 reasoning，
 *    拿内心独白去 parse，必然失败（线上 "Failed to parse AI response" 的根因之一）。
 *
 * 3) 去掉了 `stop: ['```']`——拦不掉 reasoning，只会截断正常输出。
 */

const EVAL_SYSTEM_PROMPT = `你是一个专业的英语-中文翻译批改老师，专门帮助中国学生提高四六级翻译能力。请根据以下评分标准，对学生的翻译进行评分和反馈。

## 评分标准

**准确性 (accuracy)** 0-100分：
- 是否准确传达了原文的含义
- 是否有误译、漏译或增译
- 关键词汇、语法结构是否正确

**流畅性 (fluency)** 0-100分：
- 译文的语言是否自然流畅
- 是否符合目标语言的表达习惯
- 是否有语法错误或 Chinglish 问题

**总分 (score)**：大约 60%准确性 + 40%流畅性的加权平均

## 分数段说明
- 90-100：接近完美，仅有细微风格差异
- 75-89：良好，有少量小错误但不影响理解
- 60-74：及格，有明显问题但整体可理解
- 40-59：存在较大问题，但能表达基本意思
- 0-39：大部分错误或完全错误

## 反馈要求
1. 鼓励性但具体指出错误
2. 指出具体词汇/短语的改进空间
3. 解释为什么参考译文更好
4. 使用中文反馈
5. 格式：总体评价 → 具体问题 → 改进建议

请严格按照以下 JSON 格式回复（不要用 Markdown 代码块包裹）：

{
  "accuracy": 85,
  "fluency": 90,
  "score": 87,
  "feedback": "总体评价...具体问题...改进建议...",
  "reference": "优化后的翻译/参考译文"
}`;

const LANG_MAP: Record<string, { source: string; target: string }> = {
  'en-zh': { source: '英文', target: '中文' },
  'zh-en': { source: '中文', target: '英文' },
};

/** 低于这个还原置信度就不评分了——拿乱码打分比不打分更糟 */
const MIN_REPAIR_CONFIDENCE = 0.9;

interface RequestBody {
  sentenceId?: string;
  sourceText?: string;
  userTranslation?: string;
  referenceTranslation?: string;
  direction?: Direction;
  /** 要用的模型；不在白名单会被忽略并回落默认值 */
  model?: string;
}

/** 去掉首尾 Markdown 代码围栏 */
function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

/** 依次尝试：整串 parse → 截取第一个 {...} → 失败 */
function parseJsonPayload(text: string): unknown | null {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // 继续往下试
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function clampScore(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 方向决定「哪些字段本该是中文」，只对这些字段做乱码判定，避免误伤英文 */
function chineseFieldsFor(direction: Direction): ('sourceText' | 'userTranslation' | 'referenceTranslation')[] {
  return direction === 'en-zh'
    ? ['userTranslation', 'referenceTranslation']
    : ['sourceText'];
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const timings = { prepare: 0, llm: 0, firstRequest: 0, continuation: 0, parse: 0 };
  let parseStart = 0;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const requestedDirection: Direction =
    body.direction === 'zh-en' ? 'zh-en' : 'en-zh';

  // 题库优先：服务端查表拿到权威的原文与参考译文
  const known = body.sentenceId ? getSentenceById(body.sentenceId) : undefined;
  const direction: Direction = known?.direction ?? requestedDirection;

  const sourceText = known?.text ?? body.sourceText ?? '';
  const referenceTranslation = known
    ? direction === 'en-zh'
      ? known.zhReference ?? ''
      : known.enOriginal ?? ''
    : body.referenceTranslation ?? '';
  const userTranslation = body.userTranslation ?? '';

  if (!sourceText.trim() || !userTranslation.trim()) {
    return NextResponse.json(
      { error: '缺少必要参数：原文与学生翻译都不能为空' },
      { status: 400 }
    );
  }

  // 客户端传来的字段可能已被 GBK 化，尝试还原
  const repairTargets = chineseFieldsFor(direction);
  const fixed: Record<string, string> = {
    sourceText,
    userTranslation,
    referenceTranslation,
  };

  for (const field of repairTargets) {
    const value = fixed[field];
    if (!looksLikeMojibake(value)) continue;

    const repair = repairMojibake(value);
    if (repair.confidence < MIN_REPAIR_CONFIDENCE) {
      return NextResponse.json(
        {
          error:
            '你的译文在传输中被编码破坏（GBK 字节被当成了 UTF-8 解读），' +
            `仅能还原 ${Math.round(repair.confidence * 100)}% 的字符，无法可靠评分。` +
            '这通常是 LLM 网关的编码配置问题，不是你的输入问题。' +
            '请访问 /api/diagnose 查看诊断结果。',
          code: 'ENCODING_CORRUPTED',
        },
        { status: 422 }
      );
    }
    fixed[field] = repair.text;
    console.warn(`[evaluate] 字段 ${field} 检出乱码，已还原置信度 ${repair.confidence.toFixed(2)}`);
  }

  const langs = LANG_MAP[direction] ?? LANG_MAP['en-zh'];
  timings.prepare = Date.now() - startedAt;

  const userPrompt = `## 翻译批改任务

**原文 (${langs.source})：**
${fixed.sourceText}

**学生翻译 (${langs.target})：**
${fixed.userTranslation}

**参考译文：**
${fixed.referenceTranslation || '（无）'}

请按照评分标准严格评分，并用 JSON 格式输出结果。`;

  let result: ChatPayload;
  let completion: ChatResult | null = null;
  try {
    completion = await chat({
      system: EVAL_SYSTEM_PROMPT,
      user: userPrompt,
      json: true,
      maxTokens: 2048,
      model: body.model,
    });
    timings.llm = Date.now() - startedAt - timings.prepare;
    timings.firstRequest = completion.durations.firstRequest;
    timings.continuation = completion.durations.continuationRequest;

    if (!completion.content.trim()) {
      return NextResponse.json(
        {
          error: 'AI 未返回有效内容（可能是 token 预算被思考过程占满）',
          detail: {
            finishReason: completion.finishReason,
            truncated: completion.truncated,
            usedContinuation: completion.usedContinuation,
          },
        },
        { status: 502 }
      );
    }

    parseStart = Date.now();
    const parsed = parseJsonPayload(completion.content);
    if (!parsed || typeof parsed !== 'object') {
      console.error('[evaluate] JSON 解析失败，原始内容：', completion.content.slice(0, 1000));
      return NextResponse.json(
        { error: '无法解析 AI 评分结果，请稍后重试' },
        { status: 502 }
      );
    }

    const p = parsed as Record<string, unknown>;
    const accuracy = clampScore(p.accuracy, 0);
    const fluency = clampScore(p.fluency, 0);
    // score 缺失时按 60/40 权重复算，别让前端拿到 undefined
    const score =
      p.score === undefined || p.score === null
        ? Math.round(accuracy * 0.6 + fluency * 0.4)
        : clampScore(p.score, Math.round(accuracy * 0.6 + fluency * 0.4));

    const feedback = typeof p.feedback === 'string' ? p.feedback : '';
    if (!feedback.trim()) {
      return NextResponse.json(
        { error: 'AI 返回的评分缺少反馈内容，请重试' },
        { status: 502 }
      );
    }

    result = {
      score,
      accuracy,
      fluency,
      feedback,
      reference: typeof p.reference === 'string' ? p.reference : fixed.referenceTranslation,
      vocab: Array.isArray(p.vocab) ? p.vocab.map(String) : [],
    };
  } catch (error) {
    console.error('[evaluate] 调用失败：', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '评分失败，请重试' },
      { status: 500 }
    );
  }

  timings.parse = Date.now() - parseStart;

  const response = NextResponse.json({
    ...result,
    // 诊断字段：前端用不到，排查"为什么慢"时看这里
    timing: {
      total: Date.now() - startedAt,
      prepareMs: timings.prepare,
      llmMs: timings.llm,
      llmFirstRequestMs: timings.firstRequest,
      llmContinuationMs: timings.continuation,
      parseMs: timings.parse,
    },
    model: completion
      ? {
          usedContinuation: completion.usedContinuation,
          finishReason: completion.finishReason,
          truncated: completion.truncated,
          responseId: completion.responseId,
          usage: completion.usage,
        }
      : null,
    modelUsed: completion ? completion.modelUsed : null,
  });

  response.headers.set(
    'Server-Timing',
    [
      `prepare;dur=${timings.prepare}`,
      `llm-first;dur=${timings.firstRequest}`,
      `llm-continuation;dur=${timings.continuation}`,
      `llm-total;dur=${timings.llm}`,
      `parse;dur=${timings.parse}`,
      `total;dur=${Date.now() - startedAt}`,
    ].join(', ')
  );

  return response;
}

type ChatPayload = EvaluateResult;
