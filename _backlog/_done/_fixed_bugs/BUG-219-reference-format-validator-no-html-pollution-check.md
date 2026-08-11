# BUG-219: reference format 校验不检测 HTML 污染，物化脚本可产出肉眼不可读的 Key Facts 且 gate 通过

> 状态: 已修复 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-12 | source: 真实 run 执行（enterprise-ai-harness-adoption-open-source wave1）

## Resolution

已由 `harden-agent-authored-contracts`（`ab2f17c49`，v0.88）修复：REF-002 现在只在
required semantic section 的非 fenced-code 内容中识别有限 raw document-markup
signature，并返回既有 `reference_format` repair。focused helper 24/24、Wave CLI
integration 33/33 与全量 suite 均通过。

## Why

Wave1 topic reference 物化时，若从 `page.md`（cache 原始抓取内容）直接截取
句子填充 `## Key Facts`，client-rendered 页面的 `page.md` 就是整段未剥离的
原始 HTML（`<!DOCTYPE html>...` 完整页面源码）。当前框架的 reference format
校验器 `checkReferenceFormatFiles`（`gate-helpers-checks.mjs:532`）**只检查
frontmatter metadata 字段与 topic binding，不检查 body 的 Key Facts 是否含
HTML 标签**。因此含整段 HTML 的 reference 文件能通过 wave1/wave2 gate，
产出肉眼完全不可读的 consumer navigation 文件。

这是确定性框架契约缺口：`shared-reference-template.md` 要求 Key Facts 是
"concrete facts from the fetched page"，但无机器可执行的 HTML 禁入校验。
强模型（或脚本）从 `page.md` 物化时，只要不做 HTML 剥离就会产出污染文件
且 gate 无法拦截——不依赖弱模型执行 artifacts。

## 复现

1. 物化一个 Wave1 topic reference，`Key Facts` 用 `page.md` 原始内容截句：
   ```js
   const facts = pageText.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).slice(0,6);
   // 对 client-rendered 页面，pageText 是 `<!DOCTYPE html><html lang="en">...` 整段
   ```
2. 写入 `reference/{topic}-{host}-{digest}.md`，`Key Facts` 变成一整行 HTML。
3. `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <bundle>`
   → `passed: true`（格式/backing 校验都过）。
4. `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs ...`
   → `passed: true`。

实测：enterprise-ai-harness-adoption-open-source 的 29 个 wave1 topic
reference 全含 `<html>`/`<script>` 原始标签，wave1/wave2 inspect 与 gate
全部通过（如
`reference/01_open-source-harness-landscape-aaif-io-blog-agentic-ai-momentum-report-e7d7133212cb.md`
的 Key Facts 是完整 `<!DOCTYPE html>` 页面源码）。

## Owner / 最小修复

- Owner: `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs` 的
  `checkReferenceFormatFiles`（reference body 内容质量校验层）
- 最小修复: 在 `checkReferenceFormatFiles` 中对每个 file 的 body 增加
  HTML 污染检测——若 `## Key Facts`（或任一必需语义 section）含
  `<!DOCTYPE` / `<html` / `<script` / `<div` 等原始标签且无 code-fence
  包裹，报 blocking `reference_format` finding（repair: 剥离 HTML 或改写为
  plain-text facts）。
- 可观察 done 条件: 含原始 HTML 的 reference 文件在 wave1 inspect 中
  `passed: false`，且报错点名 `reference/{relPath}` 的 HTML 污染。

## 备注

- 本 run 已由 Agent 手工修复 30 个污染文件（Key Facts 改为 meta 事实 +
  degraded 标注），修复后 wave1/wave2 inspect 仍 passed——说明该问题不影响
  已提交的 backing/ledger，只影响 consumer-facing reference 的可读性。
- 根因有两层：Agent 物化脚本未剥离 HTML（执行缺陷）+ 框架无 HTML 校验
  （契约缺口，本 bug）。两者都应修；框架校验是防再犯的确定性子句。
- 相关契约: `shared-reference-template.md` 的 `Key Facts` / `Core Content
  Capture` 语义 section 要求 concrete facts；`ref-count.mjs` 的 `isCountable`
  只数 metadata，不数 body 内容。
