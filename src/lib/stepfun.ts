/**
 * StepFun（OpenAI 兼容）聊天接口的最小封装。
 *
 * 两个关键设计，都是针对线上踩过的坑：
 *
 * 1) 绝不把 `reasoning` 当成答案。reasoning 模型会把 max_tokens 全烧在思考上
 *    （finish_reason === 'length'），此时 `content` 为空。旧代码回退去取 reasoning，
 *    于是拿一大段内心独白去 JSON.parse，必然失败。
 *    正确做法是补发一次「接着上文直接给结论」的请求。
 *
 * 2) 不要加 `stop: ['```']`。它拦不掉 reasoning，只会把正常输出截断。
 */

import { AVAILABLE_MODELS, envDefaultModel, resolveModel, type ModelOption } from './models';

export interface StepFunConfig {
  url: string;
  key: string;
  model: string;
}

export interface ChatResult {
  /** 只取 message.content —— 模型的正式回复 */
  content: string;
  /** 仅供诊断，永远不当答案用 */
  reasoning: string;
  finishReason: string | null;
  truncated: boolean;
  usedContinuation: boolean;
  /** 网关返回的 id，排查编码问题时有用 */
  responseId: string | null;
  usage: unknown;
  /** 各阶段耗时（毫秒），用于定位慢在哪 */
  durations: {
    firstRequest: number;
    continuationRequest: number;
  };
  /** 实际发出去的模型名，便于确认覆盖有没有生效 */
  modelUsed: string;
}

export interface ChatOptions {
  system: string;
  user: string;
  /** 要求模型只输出 JSON（OpenAI 兼容的 response_format） */
  json?: boolean;
  maxTokens?: number;
  /** 覆盖模型；不传则用 .env.local 的默认值 */
  model?: string;
}

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

/** 只声明我们用到的字段，其余当作未知，避免 any */
interface ChatCompletion {
  id?: unknown;
  choices?: {
    message?: {
      content?: unknown;
      reasoning?: unknown;
      reasoning_content?: unknown;
    };
    finish_reason?: unknown;
  }[];
  usage?: unknown;
}

const DEFAULT_URL = 'https://api.stepfun.com/step_plan/v1';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * 模型优先级：调用方显式指定 > .env.local 的 STEPFUN_MODEL > 兜底值。
 * 非白名单的名字一律忽略，不会出现在出网请求里。
 */
export function getConfig(modelOverride?: string): StepFunConfig {
  const key = process.env.STEPFUN_API_KEY;
  if (!key) {
    throw new Error('STEPFUN_API_KEY 未配置：请在项目根目录的 .env.local 中设置');
  }
  return {
    url: trimSlash(process.env.STEPFUN_API_URL || DEFAULT_URL),
    key,
    model: resolveModel(modelOverride),
  };
}

/** 不含密钥的配置视图，给设置页展示用 */
export function publicConfig(): {
  url: string;
  model: string;
  keyConfigured: boolean;
  availableModels: readonly ModelOption[];
} {
  return {
    url: trimSlash(process.env.STEPFUN_API_URL || DEFAULT_URL),
    model: envDefaultModel(),
    keyConfigured: Boolean(process.env.STEPFUN_API_KEY),
    availableModels: AVAILABLE_MODELS,
  };
}

type Attempt =
  | { ok: true; data: ChatCompletion }
  | { ok: false; status: number; body: string };

async function requestOnce(
  config: StepFunConfig,
  messages: Message[],
  maxTokens: number,
  jsonFormat: boolean
): Promise<Attempt> {
  const response = await fetch(`${config.url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
      ...(jsonFormat ? { response_format: { type: 'json_object' as const } } : {}),
    }),
    cache: 'no-store',
  });

  const body = await response.text();
  if (!response.ok) return { ok: false, status: response.status, body };

  try {
    return { ok: true, data: JSON.parse(body) as ChatCompletion };
  } catch {
    return { ok: false, status: response.status, body };
  }
}

function readChoice(data: ChatCompletion) {
  const choice = data?.choices?.[0] ?? {};
  const message = choice.message ?? {};
  return {
    content: typeof message.content === 'string' ? message.content : '',
    reasoning:
      typeof message.reasoning_content === 'string'
        ? message.reasoning_content
        : typeof message.reasoning === 'string'
          ? message.reasoning
          : '',
    finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
  };
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
  const config = getConfig(options.model);
  const { system, user, json = false, maxTokens = 2048 } = options;

  const baseMessages: Message[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  let firstMs = 0;
  let t0 = Date.now();
  let attempt = await requestOnce(config, baseMessages, maxTokens, json);
  firstMs += Date.now() - t0;

  // 部分网关不认 response_format，会回 400；去掉参数重试一次
  if (!attempt.ok && json && attempt.status === 400) {
    t0 = Date.now();
    attempt = await requestOnce(config, baseMessages, maxTokens, false);
    firstMs += Date.now() - t0;
  }

  if (!attempt.ok) {
    throw new Error(`StepFun API 错误 ${attempt.status}: ${attempt.body.slice(0, 300)}`);
  }

  const first = readChoice(attempt.data);
  let content = first.content;
  let usedContinuation = false;
  let lastData = attempt.data;
  let continuationMs = 0;

  // content 为空、且是因为 token 被思考占满 → 补一次续写，把 reasoning 作为上文交给模型
  // 注意：这会让总耗时接近翻倍，durations 里单独计量，便于判断是否值得
  if (!content.trim() && first.reasoning.trim()) {
    usedContinuation = true;
    const c0 = Date.now();
    const followUp = await requestOnce(
      config,
      [
        ...baseMessages,
        { role: 'assistant' as const, content: first.reasoning },
        {
          role: 'user' as const,
          content: '请基于以上分析直接给出最终结论，不要重复分析过程。',
        },
      ],
      Math.max(512, Math.floor(maxTokens / 2)),
      false
    );
    continuationMs = Date.now() - c0;

    if (followUp.ok) {
      const second = readChoice(followUp.data);
      content = second.content;
      lastData = followUp.data;
    }
  }

  const summary = readChoice(lastData);

  return {
    content,
    reasoning: first.reasoning || summary.reasoning,
    finishReason: summary.finishReason,
    truncated: summary.finishReason === 'length',
    usedContinuation,
    responseId: typeof lastData?.id === 'string' ? lastData.id : null,
    usage: lastData?.usage ?? null,
    durations: { firstRequest: firstMs, continuationRequest: continuationMs },
    modelUsed: config.model,
  };
}
