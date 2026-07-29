---
bug_id: BUG-148
title: "Concurrent formal work-unit submits leak raw .lock EEXIST failures"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: work-unit-concurrency-operability
---

# BUG-148: Concurrent formal work-unit submits leak raw `.lock` `EEXIST` failures

## 现象

Wave0 已有四个 independent candidates 通过 dry-submit。对它们执行并行 formal submit
时，唯一锁竞争使三个命令直接输出非 JSON 的原始错误：

```text
EEXIST: file already exists, mkdir
'/Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands/_work_units/.lock'
```

同一批次中另一个 submit 成功。失败的三个 work unit 没有收到结构化
`busy`/`retry`/`wait` 建议，仍保持 claimed；随后它们的 initial lease 过期，需要额外
执行 `timeout-preflight` 才能合法恢复到同一 candidate 的 submit。

## Red / green loop（已运行）

Red：同时运行四个 `operate-work-unit submit`，i0001、i0002、i0003 返回上述 `EEXIST`，
只有 i0005 返回 `status: submitted`。

Green：停止并发后，按 `timeout-preflight` 的结构化建议逐个执行：

```text
timeout-preflight wu-w0-b000-src-i0001 => timeout_eligible: false, recommended_action: submit
submit wu-w0-b000-src-i0001 => status: submitted
timeout-preflight wu-w0-b000-src-i0002 => timeout_eligible: false, recommended_action: submit
submit wu-w0-b000-src-i0002 => status: submitted
timeout-preflight wu-w0-b000-src-i0003 => timeout_eligible: false, recommended_action: submit
submit wu-w0-b000-src-i0003 => status: submitted
```

这证明 work-unit candidate、receipt、cache 与 ledger contract 本身可通过；直接问题是
formal submit 的单写锁竞争没有被 CLI 结构化暴露。当前锁目录在命令结束后已清除，没有
遗留锁损坏。

## 预期行为

1. 锁竞争应返回稳定 JSON，包含 `reason_code`、当前操作、建议退避/重试和同一
   work-id 的 rerun 命令；不能泄漏原生 `mkdir` exception 作为唯一结果。
2. 重试等待期间，Phase Agent 应能按 `wait` 或 `retry` 继续，而不是误判 candidate
   failure、重复 claim 或让 lease 无意义地过期。
3. 如果系统明确规定 formal submit 必须串行，generated phase guidance/CLI 应在调用面
   明确该约束，并提供批量串行器或结构化 busy contract。

## 诊断结论

Engine 的单写锁是保护 ledger/queue/index 原子性的合理边界；本 bug 不要求移除锁或允许
并发写入。缺口是合法并行 Phase Agent 行为遇到锁竞争时没有可消费的 JSON 诊断和 lease
保护路径，导致一次可恢复的 contention 变成 claimed/expiry 级联。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 将 lock acquisition failure 映射到现有 structured CLI error/`wait` action，并保留
  work-id、operation 与 rerun command。
- 为多 work-unit formal submit 提供串行安全 guidance，或由 CLI 内部做 bounded retry；
  retry 不得重新 claim、改 result 或写第二套 ledger。
- 增加 concurrent-submit regression，验证一个 writer 成功、其它调用收到 structured
  retry，并且不会伪造 failure/timeout。

## Non-goals

- 不移除 `_work_units/.lock`，不允许并发 ledger mutation，不用 force timeout 处理锁竞争。
- 不把本卡与 BUG-147 的 result 可见性竞态、BUG-145 的 JSONL receipt 格式错误合并。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: concurrent `operate-work-unit submit` calls
- Green workaround: `timeout-preflight` when needed, then serial formal submit for each exact
  work-id
- Owner boundary: work-unit persistence lock acquisition and public CLI error projection

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露；delegated actor 模型未写入 bundle。
- 归因应标为“混合”：一次并行 submit 可能是 Agent 为提速采取的策略，弱模型 guidance
  可以提前规定“claim 可批量、formal submit 必须串行”；但把锁竞争泄漏为原始 `EEXIST`
  且不返回 structured wait/retry 是 framework CLI 的独立问题。
- 调整方向：先在 phase instructions 给出串行提交顺序和同一 work-id 重试规则，再补
  structured lock-busy feedback；不能移除锁或用 force timeout 掩盖竞争。
