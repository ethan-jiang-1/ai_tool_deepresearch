---
bug_id: BUG-147
title: "Wave0 result.json can be observed by dry-submit while the candidate is still unstable"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: subagent-result-persistence
---

# BUG-147: Wave0 `result.json` can be observed before a stable final write

## 现象

真实 Wave0 work unit `wu-w0-b000-src-i0002` 的 candidate `result.json` 在 actor 完成
写入窗口中被 dry-submit 读取。第一次 dry-submit 返回：

```text
invalid_result: Unexpected non-whitespace character after JSON at position 2957
recommended_action: return_to_actor
```

随后对同一绝对路径运行 Node `JSON.parse` 已经得到 `valid`，再次对同一 work-id、同一
candidate 运行 dry-submit 通过，并最终 formal submit 成功。文件没有被 Phase Agent 手工
修改，也没有换 work-id。

## Red / green loop（已运行）

第一次批量 dry-submit 中 i0002 的结构化结果：

```json
{
  "ok": false,
  "reason_codes": ["invalid_result"],
  "recommended_action": "return_to_actor",
  "missing_fact": "Unexpected non-whitespace character after JSON at position 2957",
  "write_to": ".../_work_units/wave0/wu-w0-b000-src-i0002/result.json#/"
}
```

紧接着读取同一路径的 Node 检查返回 `valid`；重跑同一命令返回
`expected_submit: pass`，`result_hash: 086b8a...`，随后：

```text
operate-work-unit submit ... --work-id wu-w0-b000-src-i0002 ...
=> status: submitted
```

该 work unit 的 runtime receipt 在 `file_written` 后记录了
`result_draft_started`，但没有一个清晰的 actor-owned `result_written`/stable-result
事件让 Phase Agent 区分“结果仍在写”与“结果已完成但语义非法”。

## 预期行为

1. Actor 应使用原子或等价的稳定写入边界，让 `result.json` 只有完整候选可见；或者在
   返回前逐文件 parse 并记录 durable completion。
2. 如果 Engine 在写入窗口读到 mutable/partial candidate，应返回结构化
   `result_in_progress`/`wait` 或明确的 actor-owned repair，而不是把瞬时状态诊断成
   `invalid_result` 并要求返回 actor。
3. 同一 work-id 的 polling/retry 应保留 candidate identity，不能因为瞬时 partial read
   促使 Phase Agent 新建替代 work unit。

## 诊断结论

直接缺口是 actor result 的可见性与 dry-submit 读取之间没有稳定写入/完成标记协议。它
不同于 BUG-145 的 JSONL 物理换行错误：这里同一 result 文件随后自然变为合法 JSON，说明
问题是结果写入/观察竞态，而不是 receipt parser 永久拒绝。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 在共享 actor protocol 中提供 Node 原生 result writer：临时路径完整写入、parse/schema
  self-check 后再进入最终路径，或使用现有持久化边界。
- 在 runtime receipt/inspect 中记录结果稳定完成事实，并让 dry-submit 对短暂变化给出
  可轮询的 `wait`/`result_in_progress` 根因。
- 增加真实 actor-flow 或最小确定性 persistence regression，覆盖 partial-read → stable
  reread → same-work-id submit；不把 malformed result 降级为可接受证据。

## Non-goals

- 不让 Engine 接受 malformed JSON，不手工改已提交 result，不换 work-id 绕过 candidate
  authority。
- 不把本卡与 BUG-145 的 JSONL receipt serialization 或 BUG-148 的提交锁竞争合并。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: `operate-work-unit dry-submit` for `wu-w0-b000-src-i0002`
- Green recovery: same candidate reread → dry-submit → formal submit
- Owner boundary: native actor result writer / result-stability observation contract

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露；delegated actor 的具体模型未记录。
- 归因应标为“混合”：模型/actor 可能在最终写入前就让轮询看到 candidate，但仅凭一次
  partial read 不能证明模型能力不足；缺少稳定写入/完成 witness 是 writer/Engine
  observation contract 的确定性缺口。
- 调整方向：指导弱模型使用“临时文件→完整 JSON parse/schema self-check→原子 rename→
  再 dry-submit”的固定顺序；同时让 Engine 将短暂 partial read 报为 wait，而不是要求
  更换 work ID 或手改 result。
