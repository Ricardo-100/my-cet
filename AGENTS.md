<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 改代码的规矩

**一个可回退的改动 = 一个 commit。** 不要把攒了几天的功能、修 bug、顺手改的文案揉进同一个 commit——那样想单独退掉其中一件只能靠手工拆，`revert`、`cherry-pick`、`git bisect` 全会失灵。

- 提交前先想清楚「这次 commit 是为了让哪一件事能被单独回退」；一件事一个 commit，message 就写那件事。
- 一次改动跨多个文件很正常（页面 + 组件 + API + prompt），按**事情**拆，不按文件拆。
- 用 `git add <具体文件>` 精确暂存，别 `git add -A` 或 `git add .`。这个仓库长期存在跨会话未提交改动，一把扫进去会连你不认识的东西一起提交上去。
- message 用 Conventional Commits 前缀（`feat:` / `fix:` / `refactor:` / `chore:`），跟仓库第一个 commit 的风格保持一致。
- 提交前本地过一遍 `npx tsc --noEmit` 和 `npm run lint`；带着类型错误或 lint 报错的 commit 没法干净回退。
- 上面 `nextjs-agent-rules` 那一块是 `next dev` 自动写进本文件的，别手动删。它造成的未提交改动，跟着你当次的改动一起提交，工作区才干净。
