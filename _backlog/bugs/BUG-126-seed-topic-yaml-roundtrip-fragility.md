---
bug_id: BUG-126
title: "Seed topic YAML frontmatter round-trip fragility — parse errors only surface at queue complete time"
severity: P2
discovered: 2026-07-26
bundle: dpt_rb_openspec-influence-landscape
phase: seed-topics
node: phases/phase-seed-topics.md
---

# BUG-126: Seed topic 的 YAML frontmatter 在 hand-author 和 Engine parse 之间存在 round-trip 断裂

## 现象

Phase Agent 在 seed-topics phase 手写 seed topic 文件的 YAML frontmatter 时，两次遇到 parse error：

**第一次**：`forbidden_broadening` 字段值中包含未转义的括号：
```yaml
- "OpenAPI specification" (this is NOT OpenAPI — filter aggressively)
```
YAML parser 报 `Unexpected scalar at node end at line 22, column 31`，因为 `(` 和 `)` 在 YAML 中有特殊语义。

**第二次**：`preferred_sources` 中包含嵌套双引号：
```yaml
- Comparison posts: "OpenSpec vs Spec Kit vs Kiro" from trusted technical bloggers
```
YAML parser 报 `Unexpected scalar at node end at line 31, column 56`，因为双引号内的双引号破坏了 YAML 的 quoted scalar 解析。

**修复过程**：第一轮手写 → parse error → 修复 → 第二处 parse error → 修复 → 第三轮用 `yaml.stringify()` 以程序方式生成 frontmatter 才通过。

这个 parse 循环发生在 `operate-queue.mjs complete` 阶段——Phase Agent 以为文件已经写好了，但在 complete 时才收到 parse error。每个 parse error 需要一次完整的 repair → rerun complete 循环。

## 重现线索

1. Phase Agent 手写 seed topic 文件，在 YAML frontmatter 中使用 `(`、`)`、嵌套引号、em-dash（—）、Unicode 箭头（→）
2. `operate-queue.mjs complete` → parse error
3. Phase Agent 修复 → rerun complete → 另一个 parse error
4. 循环直到所有特殊字符被转义或替换

## 根因假设

**主因**：Seed topic 的 YAML frontmatter 是 Phase Agent 手写的（`shared-seed-topic-authoring.md` 中的模板是 Markdown 伪代码，不是 executable template），但 Engine 用严格的 YAML 1.2 parser 解析。Agent 的训练数据中 YAML 的 escaping 规则（特别是 flow scalar 中的特殊字符）不够精确，导致 hand-author 的 YAML 经常不合法。

**副因**：Parse error 只在 `operate-queue.mjs complete` 时暴露。seed-topics phase 的执行步骤是 agent 写文件 → complete → receipt check。文件写入本身不触发 parse。这意味着从"写错了"到"知道写错了"之间有延迟。

**第三因**：`shared-seed-topic-authoring.md` 提供的模板是 human-readable Markdown，不是可以直接 copy-paste 的 YAML。模板中的 `pending — seed-topics Agent must...` 包含 em-dash，如果 Agent 照抄这个格式写真实内容，parse 会失败。

## 框架层面的问题

1. 没有 seed topic frontmatter 的 pre-commit YAML 校验——Phase Agent 写文件后应该可以运行一个 lint/validate 命令，而不是等到 complete 才发现
2. `shared-seed-topic-authoring.md` 的模板和实际 YAML 格式之间有一层翻译——Agent 必须理解并手动遵守 YAML escaping 规则
3. Complete 阶段的 parse error 触发的是 repair → rerun 循环，但每个循环只暴露一个 parse error（parser 在第一个非法 token 处停止），导致多错误文件需要多次循环

## 建议方向

- **短期**：提供 `validate-seed-topic-frontmatter.mjs <file>` CLI，Phase Agent 在 complete 之前可以自检 YAML 合法性（不检查语义，只做 parse）
- **短期**：`shared-seed-topic-authoring.md` 的模板改为 executable YAML 示例（所有字段值用合法的 YAML string literal），Agent 可以直接替换
- **中期**：`operate-queue.mjs complete` 的 YAML parse 错误报告改为**收集所有 parse error 后一次性返回**（而不是在第一个错误处停止），减少 repair 循环次数
- **中期**：Seed topic 的创建不再依赖 Phase Agent 手写 YAML——`operate-topic-state.mjs apply` 已经写了正确的 skeleton，Phase Agent 只需要编辑 body（非 frontmatter），或者 Engine 提供一个安全的部分更新 API
