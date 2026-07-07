# BUG-041: `reference/00-shared-*.md` 文件存在但 gate 无法计数——ledger-only 计数模型使 Phase Agent 直接创建的文件对 gate 不可见

## 严重程度
P2 — Phase Agent 在 wave0 phase 中可以创建合法、完整、通过 `isCountable()` 验证的 shared reference 文件，但这些文件不在 `rb_output_declarations.jsonl` ledger 中，导致 gate 的 `shared_ref_count_floor` 检查始终返回 0。

## 复现

1. Phase Agent 创建 9 个 `reference/00-shared-ref-*.md` 文件
2. 所有文件均包含：
   - bullet metadata（`- source_url:`、`- acceptance_status: accepted` 等）
   - `## Core Content Capture` (>=100 chars)
   - `## Key Facts` (>=5 bullets)
3. `isCountable()` 对 9/9 个文件返回 `countable: true`
4. Gate `check-gate-wave0-complete.mjs` 调用 `countReferences(bundlePath, { source: 'ledger', targetGlob: 'reference/00-shared-*.md' })` → 返回 `count: 0`
5. Gate 报错：`Count floor not met for reference/00-shared-*.md: 0 countable references (threshold: 9)`

## 根因

`countReferences()` 的 default mode 是 `source: 'ledger'`，它**只从 `rb_output_declarations.jsonl` 读取** declared output paths，完全忽略文件系统上存在但未经 work-unit submit 声明的文件。

相关代码（`ref-count.mjs:225-228`）:
```js
if (source === 'ledger') {
  // Authority mode: read ONLY from submitted Engine-written work-unit rows.
  let declarations;
  try { ... }  // reads rb_output_declarations.jsonl
}
```

而 Phase Agent 直接通过 `Write`/`Bash` 工具创建的文件不会自动进入 ledger。Ledger 行只能通过 `operate-work-unit submit` 写入。

## 为什么这个问题无法在当前 workflow 中修复

1. Wave0 task card 的 `writes_to` 确实声明了 `reference/00-shared-<slug>.md`
2. 但 task card 的 `delegates.to = "sub-agent"`，意味着 shared ref 应该由 sub-agent 写入
3. Sub-agent 没有写任何文件（BUG-039）
4. Phase Agent 不能 hand-write ledger rows（anti-cheating rules）
5. Phase Agent 无法为已完成的 work unit 重新 submit（work unit 已 terminal）

**唯一合法的修复路径**：创建新的 delegated queue items，专门用于 shared reference 产出，通过完整的 claim → sub-agent → submit 流程。但这对于 Phase Agent 在 `stop: no` 模式下是繁重的。

## 建议修复

1. **短期**：允许 Phase Agent 通过 `operate-queue complete`（非 delegated 路径）声明已创建的文件进入 ledger
2. **中期**：`countReferences()` 添加 `source: 'hybrid'` 模式——先查 ledger，再 fallback 到文件系统 `isCountable()` 扫描
3. **长期**：所有 reference 产出统一走 work-unit submit 路径，sub-agent 修复 BUG-039 后此问题自然消失

## 发现时间
2026-07-07，aidlc-investigation run，wave0 gate failed 9 attempts（前 5 次是 YAML 格式，后 4 次是 ledger 问题）
