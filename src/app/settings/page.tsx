'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {updateSettings} from '@/lib/storage';
import { useClientData } from '@/lib/use-client-data';
import { AVAILABLE_MODELS } from '@/lib/models';

interface ModelOptionView {
  id: string;
  label: string;
  hint: string;
}

interface Config {
  url: string;
  model: string;
  keyConfigured: boolean;
  availableModels: ModelOptionView[];
}

interface DiagnoseResult {
  verdict?: string;
  modelUsed?: string | null;
  echoMatchesProbe?: boolean;
  echoIsMojibake?: boolean;
  echoRepaired?: string;
  repairConfidence?: number;
  finishReason?: string | null;
  truncated?: boolean;
  responseId?: string | null;
  error?: string;
  hint?: string;
}

/** POST 模式（不调 LLM）回显的字段 */
interface BrowserProbeResult {
  contentTypeReceived?: string | null;
  byteLength?: number;
  decodedAsUtf8?: string;
  probeFieldIsMojibake?: boolean;
  asciiOnlyNoSignal?: boolean;
  jsonParsed?: boolean;
  error?: string;
}

const BROWSER_PROBE = '学习永远不嫌晚。';

type TestState = 'idle' | 'loading' | 'ok' | 'warn' | 'fail';

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [testState, setTestState] = useState<TestState>('idle');
  const [diagnose, setDiagnose] = useState<DiagnoseResult | null>(null);

  const [probeState, setProbeState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [probe, setProbe] = useState<BrowserProbeResult | null>(null);

  // 当前选中的模型。走 useSyncExternalStore：首帧与 SSR 一致，挂载后自动拿到真实选择
  const { state: clientState } = useClientData();
  const selectedModel = clientState.settings.model;

  useEffect(() => {
    fetch('/api/config', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Config) => setConfig(data))
      .catch(err => setConfigError(err instanceof Error ? err.message : '读取配置失败'));
  }, []);

  const chooseModel = useCallback((id: string) => {
    updateSettings({ model: id });
  }, []);

  const runDiagnose = useCallback(async () => {
    setTestState('loading');
    setDiagnose(null);
    try {
      const res = await fetch(`/api/diagnose?model=${encodeURIComponent(selectedModel)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as DiagnoseResult;
      setDiagnose(data);
      if (!res.ok) {
        setTestState('fail');
      } else if (data.echoMatchesProbe) {
        setTestState('ok');
      } else {
        // 能通，但回显和探针不一致——可能是编码问题，也可能只是模型不听话
        setTestState('warn');
      }
    } catch (err) {
      setDiagnose({ error: err instanceof Error ? err.message : '请求失败' });
      setTestState('fail');
    }
  }, [selectedModel]);

  /** 不调 LLM，只让服务端报告它从请求体里实际读到的字节 */
  const runBrowserProbe = useCallback(async () => {
    setProbeState('loading');
    setProbe(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ probe: BROWSER_PROBE }),
        cache: 'no-store',
      });
      setProbe((await res.json()) as BrowserProbeResult);
    } catch (err) {
      setProbe({ error: err instanceof Error ? err.message : '请求失败' });
    } finally {
      setProbeState('done');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← 返回首页
          </Link>
          <h1 className="text-lg font-semibold text-white">⚙️ 设置</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 当前配置 */}
        <section className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-1">当前 API 配置</h2>
          <p className="text-sm text-gray-400 mb-5">
            评分由 StepFun 提供。配置写在服务端 <code className="text-green-400">.env.local</code>，
            不会下发到浏览器，因此改完需要重启开发服务器。
          </p>

          {configError && (
            <p className="text-sm text-red-400 mb-4">读取配置失败：{configError}</p>
          )}

          <dl className="space-y-3">
            <Row label="API URL">
              <code className="text-green-400">{config?.url ?? '…'}</code>
            </Row>
            <Row label=".env.local 默认模型">
              <code className="text-green-400">{config?.model ?? '…'}</code>
            </Row>
            <Row label="当前生效模型">
              <code className="text-blue-400">{selectedModel}</code>
            </Row>
            <Row label="API Key">
              {config ? (
                config.keyConfigured ? (
                  <span className="text-green-400">已配置</span>
                ) : (
                  <span className="text-red-400">未配置 —— 评分会失败</span>
                )
              ) : (
                <span className="text-gray-500">…</span>
              )}
            </Row>
          </dl>
        </section>

        {/* 模型切换 */}
        <section className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-1">批改模型</h2>
          <p className="text-sm text-gray-400 mb-5">
            选择存在这个浏览器里，即时生效、重启也不丢，并且会覆盖{' '}
            <code className="text-green-400">.env.local</code> 里的默认模型。
            不同模型的耗时差距很大，可以切完用下面的「① 诊断」按钮对比。
          </p>

          <div className="space-y-3">
            {AVAILABLE_MODELS.map(option => {
              const active = option.id === selectedModel;
              return (
                <button
                  key={option.id}
                  onClick={() => chooseModel(option.id)}
                  aria-pressed={active}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    active
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:bg-gray-600/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{option.label}</span>
                    {active && (
                      <span className="text-xs text-blue-300 shrink-0">使用中</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{option.hint}</p>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            想让所有浏览器都用同一个模型，把 <code className="text-green-400">.env.local</code> 里的{' '}
            <code className="text-green-400">STEPFUN_MODEL</code> 改成对应值并重启开发服务器即可。
          </p>
        </section>

        {/* 连接与编码诊断 */}
        <section className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-1">连接与编码诊断</h2>
          <p className="text-sm text-gray-400 mb-5">
            编码问题分两跳查：①「Next.js → API 网关」用 GET 探针，会用上面选中的模型
            （{selectedModel}）回显一串中文；②「浏览器 → Next.js」用 POST 探针，
            不调 LLM，只让服务端报告它从请求体里实际读到的字节。
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={runDiagnose}
              disabled={testState === 'loading'}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                disabled:bg-gray-600 disabled:cursor-not-allowed
                text-white font-medium text-sm transition-colors"
            >
              {testState === 'loading' ? '诊断网关中…' : '① 诊断 Next.js → 网关'}
            </button>

            <button
              onClick={runBrowserProbe}
              disabled={probeState === 'loading'}
              className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600
                disabled:bg-gray-600 disabled:cursor-not-allowed
                text-white font-medium text-sm transition-colors"
            >
              {probeState === 'loading' ? '探测中…' : '② 诊断浏览器 → Next.js'}
            </button>
          </div>

          {diagnose && (
            <div className="mt-5 space-y-3 text-sm">
              {diagnose.error ? (
                <p className="text-red-400">
                  诊断失败：{diagnose.error}
                  {diagnose.hint ? `（${diagnose.hint}）` : ''}
                </p>
              ) : (
                <>
                  <p
                    className={
                      testState === 'ok'
                        ? 'text-green-400'
                        : testState === 'warn'
                          ? 'text-yellow-300'
                          : 'text-red-400'
                    }
                  >
                    {diagnose.verdict}
                  </p>
                  <Row label="实际使用的模型">
                    <code className="text-gray-300">{diagnose.modelUsed ?? '—'}</code>
                  </Row>
                  <Row label="探针原样返回">
                    {diagnose.echoMatchesProbe ? '是' : '否'}
                  </Row>
                  <Row label="回显是否为乱码">{diagnose.echoIsMojibake ? '是' : '否'}</Row>
                  <Row label="finish_reason">{diagnose.finishReason ?? '—'}</Row>
                  <Row label="响应 ID">
                    <code className="text-gray-500 text-xs break-all">
                      {diagnose.responseId ?? '—'}
                    </code>
                  </Row>
                </>
              )}
            </div>
          )}

          {probe && (
            <div className="mt-5 space-y-3 text-sm">
              {probe.error ? (
                <p className="text-red-400">探测失败：{probe.error}</p>
              ) : probe.asciiOnlyNoSignal ? (
                <p className="text-yellow-300">请求体是纯 ASCII，这一跳没测到有效信号。</p>
              ) : (
                <>
                  <p className={probe.probeFieldIsMojibake ? 'text-red-400' : 'text-green-400'}>
                    {probe.probeFieldIsMojibake
                      ? '确认：浏览器 → Next.js 这一跳把中文 GBK 化了'
                      : '浏览器 → Next.js 这一跳是干净的'}
                  </p>
                  <Row label="收到的 Content-Type">
                    <code className="text-gray-300 break-all">
                      {probe.contentTypeReceived ?? '（未声明）'}
                    </code>
                  </Row>
                  <Row label="字节数">{probe.byteLength ?? '—'}</Row>
                  <Row label="服务端读到的内容">
                    <code className="text-gray-300 break-all">
                      {probe.decodedAsUtf8 ?? '—'}
                    </code>
                  </Row>
                  <Row label="是否为乱码">{probe.probeFieldIsMojibake ? '是' : '否'}</Row>
                </>
              )}
            </div>
          )}
        </section>

        {/* 如何修改 */}
        <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">修改配置</h2>
          <p className="text-sm text-gray-400 mb-4">
            编辑项目根目录的 <code className="bg-gray-700/50 px-2 py-0.5 rounded text-green-400">.env.local</code>，
            保存后重启 <code className="bg-gray-700/50 px-2 py-0.5 rounded text-green-400">npm run dev</code> 生效：
          </p>
          <pre className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`# StepFun API（OpenAI 兼容）
STEPFUN_API_KEY=你的API密钥
STEPFUN_API_URL=https://api.stepfun.com/step_plan/v1
# 默认模型：可填 step-3.7-flash 或 step-5-preview
# 在「设置 → 批改模型」里选的会覆盖这个值
STEPFUN_MODEL=step-3.7-flash`}
          </pre>
          <p className="text-xs text-gray-500 mt-3">
            .env* 已在 .gitignore 中，密钥不会被提交。
          </p>
        </section>

        {/* 真题题库 */}
        <section className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">真题题库</h2>
          <p className="text-sm text-gray-400 mb-3">
            题库来自 <code className="bg-gray-700/50 px-2 py-0.5 rounded text-green-400">data/</code> 里的
            四六级真题，由 <code className="bg-gray-700/50 px-2 py-0.5 rounded text-green-400">scripts/extract-translations.py</code> 生成：
          </p>
          <pre className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`python3 scripts/extract-translations.py --level all   # 四六级一起（默认产物）
python3 scripts/extract-translations.py --level cet4  # 只抽四级
python3 scripts/extract-translations.py --level cet6  # 只抽六级
python3 scripts/extract-translations.py --ocr         # 扫描件走 OCR`}
          </pre>
          <p className="text-xs text-gray-500 mt-3">
            每道题带原卷的英文提示词（如「木结构（timberwork）」），按句归属。
            扫描件只认最后两页——Translation 是最后一个 Part。
          </p>
        </section>
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-300 min-w-0 break-words">{children}</dd>
    </div>
  );
}
