import { NextRequest, NextResponse } from 'next/server';
import { EvaluateResult } from '@/lib/types';

function getApiKey(): string {
  const key = process.env.STEPFUN_API_KEY;
  if (!key) throw new Error('STEPFUN_API_KEY not configured');
  return key;
}

function getApiUrl(): string {
  const base = process.env.STEPFUN_API_URL || 'https://api.stepfun.com/step_plan/v1';
  return `${base}/chat/completions`;
}

function getModel(): string {
  return process.env.STEPFUN_MODEL || 'step-5-preview';
}

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

export async function POST(request: NextRequest) {
  try {
    const { sourceText, userTranslation, referenceTranslation, direction } = await request.json();

    if (!sourceText || !userTranslation) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const langMap: Record<string, { source: string; target: string }> = {
      'en-zh': { source: '英文', target: '中文' },
      'zh-en': { source: '中文', target: '英文' },
    };
    const langs = langMap[direction] || langMap['en-zh'];

    const userPrompt = `## 翻译批改任务

**原文 (${langs.source})：**
${sourceText}

**学生翻译 (${langs.target})：**
${userTranslation}

**参考译文：**
${referenceTranslation}

请按照评分标准严格评分，并用 JSON 格式输出结果。`;

    const apiKey = getApiKey();
    const apiUrl = getApiUrl();
    const model = getModel();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: EVAL_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      return NextResponse.json(
        { error: `API 错误: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty response:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'AI 返回空内容' },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let result: EvaluateResult;
    try {
      // Clean potential markdown code fences
      const cleaned = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      // Fallback: extract JSON with regex
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        console.error('Failed to parse AI response:', content);
        return NextResponse.json(
          { error: '无法解析 AI 评分结果' },
          { status: 500 }
        );
      }
    }

    // Clamp values to valid ranges
    result.score = Math.max(0, Math.min(100, Math.round(result.score)));
    result.accuracy = Math.max(0, Math.min(100, Math.round(result.accuracy)));
    result.fluency = Math.max(0, Math.min(100, Math.round(result.fluency)));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
