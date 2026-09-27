import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/stepfun';
import { looksLikeMojibake, repairMojibake, charLength } from '@/lib/encoding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 编码诊断接口，两种模式：
 *
 * GET  —— 让模型回显一个服务端构造的中文探针，检验 Next.js → 网关 这一跳是否干净。
 * POST —— 不调 LLM，只报告服务端从请求体里实际读到的字节，
 *         用来检验 浏览器 → Next.js 这一跳。
 *
 * 为什么需要 POST 模式：GET 的探针是服务端造的，根本没经过浏览器，
 * 所以它干净并不能说明浏览器那一跳没问题（初版 verdict 就在这里过度推断了）。
 */

const PROBE = '诊断探针：学习永远不嫌晚。活到老，学到老。';

const ECHO_SYSTEM = `你是编码诊断工具，唯一任务是原样重复用户发来的文本。
不要翻译、不要解释、不要改写、不要增删任何字符（包括标点）。
严格输出这一行 JSON，不要用 Markdown 代码块包裹：
{"echo":"<用户文本的原样重复>","length":<用户文本的字符数>}`;

export async function GET(request: NextRequest) {
  // 允许 ?model=xxx 指定模型，方便对比不同模型的编码行为与耗时
  const requested = new URL(request.url).searchParams.get('model');
  try {
    const result = await chat({
      system: ECHO_SYSTEM,
      user: PROBE,
      json: true,
      maxTokens: 1024,
      model: requested ?? undefined,
    });

    let echo = '';
    let parsed = false;
    const cleaned = result.content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    try {
      const data = JSON.parse(cleaned);
      echo = typeof data?.echo === 'string' ? data.echo : '';
      parsed = true;
    } catch {
      echo = cleaned;
    }

    const mojibake = looksLikeMojibake(echo);
    const repair = repairMojibake(echo);
    const intact = echo === PROBE;

    // 只有「回显是探针本身」才算真正证明这一跳干净；
    // 回显既不是探针也不是乱码时，说明模型没听话或 JSON 没解析出来，结论是不确定，不是干净。
    let verdict: string;
    if (mojibake) {
      verdict = 'Next.js → 网关 这一跳把中文 GBK 化了（应用代码是干净的，问题在出网请求）';
    } else if (intact) {
      verdict = 'Next.js → 网关 确认干净（回显与探针完全一致）';
    } else {
      verdict =
        'Next.js → 网关 大概率干净（回显含正常中文、不是乱码），但回显与探针不一致，' +
        '无法据此下定论。要定位浏览器那一跳，请用 POST 模式：见下。';
    }

    return NextResponse.json({
      verdict,
      modelUsed: result.modelUsed,
      probe: PROBE,
      probeLength: charLength(PROBE),
      echo,
      echoLength: charLength(echo),
      echoIsMojibake: mojibake,
      echoMatchesProbe: intact,
      jsonParsed: parsed,
      echoRepaired: repair.text,
      repairConfidence: Number(repair.confidence.toFixed(2)),
      finishReason: result.finishReason,
      truncated: result.truncated,
      usedContinuation: result.usedContinuation,
      responseId: result.responseId,
      usage: result.usage,
      rawContent: result.content,
      reasoningExcerpt: result.reasoning.slice(0, 200),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '诊断失败',
        hint: '若提示 STEPFUN_API_KEY 未配置，请检查 .env.local',
      },
      { status: 500 }
    );
  }
}

/** 只报告服务端实际收到的字节，不调 LLM */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');
  const bytes = Buffer.from(await request.arrayBuffer());

  const asUtf8 = bytes.toString('utf8');
  const asGbk = new TextDecoder('gbk').decode(bytes);

  let probe = '';
  let jsonParsed = false;
  let jsonError = '';
  try {
    const data = JSON.parse(asUtf8);
    jsonParsed = true;
    probe = typeof data?.probe === 'string' ? data.probe : '';
  } catch (error) {
    jsonError = error instanceof Error ? error.message : String(error);
  }

  // UTF-8 与 GBK 解读一致 => 纯 ASCII，没测到东西
  const sameUnderBoth = asUtf8 === asGbk;

  return NextResponse.json({
    // 浏览器发过来的声明；没有 charset 时某些解码器会退回系统区域设置（中文 Windows 即 GBK）
    contentTypeReceived: contentType,
    contentLengthReceived: contentLength,
    byteLength: bytes.length,
    hexHead: bytes.subarray(0, 48).toString('hex'),
    decodedAsUtf8: asUtf8,
    decodedAsGbk: asGbk,
    probeFieldUtf8: probe,
    probeFieldIsMojibake: looksLikeMojibake(probe),
    probeFieldRepaired: repairMojibake(probe).text,
    probeFieldRepairConfidence: Number(repairMojibake(probe).confidence.toFixed(2)),
    jsonParsed,
    jsonError,
    asciiOnlyNoSignal: sameUnderBoth,
    headers: {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      acceptEncoding: request.headers.get('accept-encoding'),
    },
  });
}
