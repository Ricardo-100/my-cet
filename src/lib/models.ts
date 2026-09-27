/**
 * 可在设置里切换的模型白名单。
 *
 * 为什么用白名单、不让客户端随便传模型名：
 * 1) 拼错名字不会静默打到奇怪模型上，而是明确回落到默认值；
 * 2) 不同模型的思考行为差别极大——step-5-preview 是推理模型，会把 max_tokens
 *    预算全烧在思考上，导致 content 为空、批改慢一倍；step-3.7-flash 快得多。
 *    把这点写进 hint，选哪个就有依据了。
 */

export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

export const AVAILABLE_MODELS: readonly ModelOption[] = [
  {
    id: 'step-3.7-flash',
    label: 'step-3.7-flash',
    hint: '快，日常练习首选',
  },
  {
    id: 'step-5-preview',
    label: 'step-5-preview',
    hint: '更强，但思考耗时长，批改会明显变慢',
  },
];

/** 没有任何选择时的兜底值 */
export const FALLBACK_MODEL = 'step-3.7-flash';

export function isAvailableModel(value: unknown): value is string {
  return (
    typeof value === 'string' && AVAILABLE_MODELS.some(option => option.id === value)
  );
}

/**
 * 服务端默认：.env.local 的 STEPFUN_MODEL；不在白名单就退回兜底值。
 * 浏览器里没有这个变量，同样会走兜底——调用方想知道服务端默认请读 /api/config。
 */
export function envDefaultModel(): string {
  const fromEnv = typeof process !== 'undefined' ? process.env.STEPFUN_MODEL : undefined;
  return isAvailableModel(fromEnv) ? fromEnv : FALLBACK_MODEL;
}

/** 请求里带来的选择：合法就用，否则回落到服务端默认 */
export function resolveModel(requested: unknown): string {
  return isAvailableModel(requested) ? requested : envDefaultModel();
}
