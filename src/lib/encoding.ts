/**
 * 处理「GBK 字节被当成 UTF-8 解读」产生的乱码。
 *
 * 变换链条（已在生产日志中逐字节验证）：
 *   原文 --encode('gbk')--> 字节序列 --decode('utf-8', replace)--> 乱码
 * 例：'学习永远不嫌晚。'.encode('gbk').decode('utf-8', 'replace')
 *     === 'ѧϰ�' 开头的 13 个字符
 * 其中 '学' 的 GBK 字节 D1 A7 恰好是合法 UTF-8 两字节序列，被解码成西里尔字母 ѧ(U+0467)；
 * 而 '永' 的 GBK 字节 D3 C0 不是合法 UTF-8，两个字节各自变成 U+FFFD。
 *
 * 逆向（只对「字节恰好构成合法 UTF-8」的位置有效）：
 *   乱码 --encode('utf-8')--> GBK 字节 --decode('gbk')--> 原文
 *
 * 关键限制：凡是已经变成 U+FFFD 的位置，原始字节信息永久丢失。
 * 所以修复时按 U+FFFD 切分、逐段还原，每个 U+FFFD 还原成一个 '�' 占位。
 */

/** 中日韩表意文字（扩展 A + 基本区 + 兼容表意） */
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/;

/** GBK 双字节被误读为 UTF-8 后，字符高频落在：替换符 / 希腊 / 西里尔 区 */
const MOJIBAKE_HINT_RE = /[�Ͱ-ϿЀ-ӿ]/;

/**
 * U+FFFD 的 UTF-8 编码是 EF BF BD，这 3 个字节再被按 GBK 误读，
 * 就会产出「锟斤拷」一族的二次乱码。还原后把这些连续串收敛成一个占位符。
 */
const DOUBLE_MOJIBAKE_RE = /[锟斤拷窖撅]{2,}/g;

const PLACEHOLDER = '�';

/**
 * Node 的 Buffer 只白名单支持 utf8 / latin1 / base64 / hex 等，
 * `Buffer.toString('gbk')` 会直接抛 ERR_UNKNOWN_ENCODING。
 * GBK 这类编码只能用 WHATWG 的 TextDecoder（Node 默认构建带 full-icu，浏览器全支持）。
 */
export function gbkAvailable(): boolean {
  try {
    new TextDecoder('gbk');
    return true;
  } catch {
    return false;
  }
}

/**
 * 只应对「本该是中文」的字段调用：不含任何 CJK 字符、却带着误读特征 → 判定为乱码。
 * 这样英文原文（如 "It is never too late to learn."）永远不会被误判。
 */
export function looksLikeMojibake(text: string): boolean {
  if (!text) return false;
  if (CJK_RE.test(text)) return false;
  return MOJIBAKE_HINT_RE.test(text);
}

/** 按码点计的字符数，避免代理对被拆开 */
export function charLength(text: string): number {
  return [...text].length;
}

function countCjk(text: string): number {
  let n = 0;
  for (const ch of text) if (CJK_RE.test(ch)) n += 1;
  return n;
}

export interface RepairResult {
  /** 修复后的文本；未判定为乱码时原样返回 */
  text: string;
  /** 输入是否被判定为乱码 */
  wasMojibake: boolean;
  /** 成功还原回中文的字符数 */
  recovered: number;
  /** 信息已丢失、只能记作 '�' 的字符数 */
  lost: number;
  /** recovered / (recovered + lost)；不是乱码时为 1 */
  confidence: number;
}

const CLEAN: Omit<RepairResult, 'text'> = {
  wasMojibake: false,
  recovered: 0,
  lost: 0,
  confidence: 1,
};

/** 修复乱码，并报告有多少字符真的救回来了 */
export function repairMojibake(text: string): RepairResult {
  if (!looksLikeMojibake(text) || !gbkAvailable()) return { ...CLEAN, text };

  try {
    // 整段按 GBK 还原（实测比分段还原救回更多字：字节边界整体对齐）
    const decoded = new TextDecoder('gbk').decode(new TextEncoder().encode(text));
    // 还原后应当不再是乱码；否则说明判定有误，保持原样
    if (looksLikeMojibake(decoded)) return { ...CLEAN, text };

    const tidied = decoded.replace(DOUBLE_MOJIBAKE_RE, PLACEHOLDER);
    const recovered = countCjk(tidied);
    let lost = 0;
    for (const ch of tidied) if (ch === PLACEHOLDER) lost += 1;
    const total = recovered + lost;

    return {
      text: tidied,
      wasMojibake: true,
      recovered,
      lost,
      confidence: total > 0 ? recovered / total : 0,
    };
  } catch {
    return { ...CLEAN, text };
  }
}
