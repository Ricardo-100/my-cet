# CET 翻译训练营

> 四六级翻译专项练习 · AI 智能批改

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![AI](https://img.shields.io/badge/AI-StepFun-FF6B35)

不是刷选择题，是**动笔写整句翻译**。提交后几秒内拿到总分、分项拆解、参考译文和针对性反馈；做砸的题自动进错题集，进度有曲线。

**442 道内置题**：387 道四六级真题（覆盖 23 个考次）+ 55 道手工例句。按方向 / 难度 / 考次筛选，或者粘贴导入你自己的题。

---

## 功能

| | |
|:---|:---|
| 🎯 **AI 批改** | 总分 + 准确度 / 流利度分项 + 文字反馈 + 参考译文。你的译文和参考译文**并排对照**，差距一眼看得出来 |
| ⚡ **双模型热切换** | `step-3.7-flash`（快，日常首选）· `step-5-preview`（强，但思考耗时长）。设置页一键切，不重启服务 |
| 📚 **题库浏览** | 442 题只读浏览，方向 / 难度 / 来源 / 考次四维筛选 + 分页；真题附原卷给的英文提示词 |
| 📕 **错题集** | 低于阈值的题自动收录，可单独集中刷 |
| 📊 **学习统计** | 近 7 天练习量、分数分布、连续优秀 streak |
| 📥 **导入自己的题** | 粘贴即入库，支持 `原文 \| 参考译文`、`原文 => 译文` 等写法 |

## 快速开始

```bash
git clone <仓库地址> && cd cet
npm install
echo 'STEPFUN_API_KEY=你的key' > .env.local
npm run dev
```

打开 <http://localhost:3000>。练习页 `Ctrl+Enter` 直接提交。

## 配置

根目录建 `.env.local`（`.gitignore` 已忽略，不会进仓库）：

| 变量 | 必填 | 说明 |
|:---|:---:|:---|
| `STEPFUN_API_KEY` | ✅ | StepFun 的 API Key |
| `STEPFUN_API_URL` | | 接口地址，默认 `https://api.stepfun.com/step_plan/v1` |
| `STEPFUN_MODEL` | | 默认模型，默认 `step-3.7-flash` |

> `.env` 只在**服务端启动时**读一次，改完要重启 dev server。而设置页选的模型存在浏览器本地，改完立刻生效，不用重启。

## 目录结构

```
src/
  app/
    page.tsx                   首页：设置 / 入口 / 导入
    practice/[direction]/      练习与批改
    wrong/  stats/  bank/      错题集 / 统计 / 题库
    settings/                  模型切换、连接与编码诊断
    api/
      evaluate/route.ts        批改（服务端查表取参考译文，返回耗时）
      config/route.ts          公开配置（永不返回 key）
      diagnose/route.ts        编码诊断
  lib/
    data.ts       内置题库（442 题）
    stepfun.ts    StepFun 客户端（OpenAI 兼容）
    models.ts     模型白名单
    encoding.ts   GBK 乱码检测与还原
    storage.ts    localStorage 状态
  components/     UI 组件
data/bank/        真题抽取结果（由 scripts/extract-translations.py 生成）
```

## 技术栈

Next.js 16（App Router / Turbopack）· React 19 · Tailwind CSS 4 · TypeScript · StepFun API

---

## 两个值得一提的实现细节

**参考译文不信任客户端。** 批改时前端只传 `sentenceId`，参考译文由服务端查库获取。否则客户端完全可以传一份"标准答案"进来影响评分——防的是这个。

**GBK 乱码就地拦截。** 中文在个别链路上会退化成"GBK 字节被当成 UTF-8 解读"的乱码（`学习` → `ѧϰ`）。路由先检测：能高置信度还原就还原，还原不了返回 `422 ENCODING_CORRUPTED`，不拿乱码去问 AI。
