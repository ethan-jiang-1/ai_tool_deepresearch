---
bug_id: BUG-145
title: "Native Sub-agent can write literal backslash-n separators into JSONL runtime receipts"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: subagent-runtime-logging
---

# BUG-145: Native Sub-agent can write literal `\n` separators into JSONL runtime receipts

## 现象

在真实 Wave0 delegated execution 中，三个 `dpt-source-intake` Sub-agent 把多个 JSON
receipt events 写成了同一物理行，并在对象之间或行尾留下两个字符 `\` 和 `n`，而不是
实际 newline byte。Engine 无法把它当作 JSONL 解析，`operate-work-unit inspect` 因此拒绝
整个 delegated work window：

```text
runtime receipt invalid for wu-w0-b000-src-i0001 line 1: Unexpected non-whitespace character after JSON at position 383
runtime receipt invalid for wu-w0-b000-src-i0002 line 1: Unexpected non-whitespace character after JSON at position 392
runtime receipt invalid for wu-w0-b000-src-i0003 line 1: Unexpected non-whitespace character after JSON at position 388
```

这不是 evidence URL、网络、权限或 queue admission 问题，而是 Sub-agent actor 写入
runtime receipt 的序列化错误。Receipt 无效时，Phase Agent 不能 dry-submit 或 submit，
即使搜索和页面抓取已经开始也不能获得 provenance authority。

## Red loop（已运行）

当前 active bundle 的 delegated inspect：

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect \
  /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands
```

在 actor 自修前返回 `passed: false`，并报告上述 JSON parse errors。直接检查
`_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl` 可见多个 JSON object 连接在
同一物理行，文本中包含字面量 `\\n`。

## 现有恢复与绿环

Phase Agent 没有直接编辑 receipt；通过 `multi_agent` 将修复责任返回给原 work-unit actor，
要求它保留 exact `work_id`、`queue_item_id`、`kind`、`receipt_nonce`、actor contract 和
execution actor class，只把分隔符修成实际换行，并继续同一 work unit。

修复后重新运行同一 inspect 命令，当前结果为：

```json
{
  "passed": true,
  "check": true,
  "projection": { "total": 5, "claimed": 5, "submitted": 0, "nonterminal": 5 }
}
```

这证明当前问题可以在同一 candidate/同一 work_id 上恢复，但不能把 actor 自修后的
inspect 通过误报成 delegated evidence 已 submit；当时仍未产生 result/ledger authority。

## 预期行为

Sub-agent 的 receipt writer 或生成的 task contract 应保证：

1. 每个 event 是一个独立、可 `JSON.parse` 的物理行；
2. 文件使用实际 LF/CRLF 行分隔，不允许把 `\\n` 当作两个普通字符写出；
3. actor 在返回前运行一个本地逐行 parse/identity 检查，发现坏 JSONL 时自行修复或返回
   明确 work-unit failure；
4. Engine/inspect 的错误应指出具体 work_id、物理行、字面量转义问题和 actor-owned
   repair coordinate；
5. 修复只能保留当前 work-unit identity，不能通过新 work_id 或 Phase Agent 手写 receipt
   绕过 provenance。

## 实际行为与证据边界

- `subagent-dpt-source-intake.md` 要求 actor 直接写 assigned `runtime-receipt.jsonl`，并
  保留 exact identity fields；但没有给出一个可执行的 JSONL writer/逐行 self-check 示例。
- `shared-subagent-protocol.md` 把 receipt 解析和 submit 作为 Engine 边界，但 actor 返回前
  的写入格式仍由模型/运行时自行实现。
- `operate-work-unit inspect` 正确 fail-closed；本 bug 不要求 Engine 接受 malformed receipt，
  也不允许 Phase Agent 代替 actor 修复并继续声明 actor provenance。
- 本次同一 bundle 中的 i0001、i0002、i0003 曾出现该形状；i0004、i0005 的 receipt
  观察到的是合法 JSONL，说明问题不是所有 work unit 必然触发，但是真实 actor 行为已足以
  使批次级 inspect 失败。

## 诊断结论

确认直接根因是 native Sub-agent 的 receipt serialization 不满足 JSONL 的物理行契约，
而现有 actor guidance 没有在写入 API 层或返回前 self-check 层把这个格式错误拦住。Engine
的拒绝是正确的完整性边界；缺口在 actor-side serialization guard 和可操作的诊断反馈。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 在 shared actor protocol 中提供 Node 原生小型 receipt writer/helper，统一使用
  `JSON.stringify(event) + '\\n'`（实际 newline）并拒绝 embedded raw lines；
- 在生成的 task.md/role guidance 中加入 return-before-check：逐物理行 `JSON.parse`，验证
  identity/nonce/actor class，并检查不存在字面量 `\\n` 作为行分隔符；
- 在 `operate-work-unit inspect` 保留 fail-closed，同时把 parse error 映射为结构化
  `receipt_jsonl_invalid` / actor-owned repair hint；
- 增加真实 native Sub-agent canary 或可审计 actor-flow test，验证 write→inspect→dry-submit
  的序列化路径；确定性 fixture 只能补充 Engine parser，不可声称证明 native actor 行为。

## Non-goals

- 不由 Phase Agent 手写、重排或补齐 Sub-agent 的 runtime receipt。
- 不把 malformed receipt 降级为 warning，也不让未提交 work unit 满足 Wave0 Gate。
- 不把本 bug 与 BUG-143 的 research-access adapter 或 BUG-144 的 Wave0 queue admission
  receipt boundary 混为一谈。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: `operate-work-unit inspect` on Wave0 claimed batch
- Owner: native Sub-agent actor receipt writer / shared subagent protocol
- Current state: same-work-unit actor repair made inspect green; result/cache/source and formal
  submit subsequently completed for the active bundle. The remaining concern is the actor
  writer/protocol contract, not an unsubmitted current work unit.

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露；实际 `dpt-source-intake` delegated actor 的模型标识也未持久化。
- 这是当前 10 个条目中最像“弱模型/Agent 执行纪律不足”的一项：actor 把 JSONL 的
  `\\n` 写成了字面量分隔符。但框架仍应提供 Node 原子写入、逐行 parse 自检和清晰的
  actor repair feedback，不能只依赖模型记住字节级要求。
- 调整方向：用可复制的 writer helper/短契约引导弱模型“每个 event 一次 append、真实
  newline、写完立刻 parse 全文件”；把模型失误与 receipt parser/authority 规则分开。
