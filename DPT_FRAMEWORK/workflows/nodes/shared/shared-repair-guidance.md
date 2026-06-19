---
node_type: shared
id: shared-repair-guidance
shared_scope: repair
authority: guidance-only
requires: []
suggested_context: []
---

# Shared: Repair Guidance

## Purpose

为 Agent 提供 gate failure 后的 repair posture 和 escalation 规则。

## What This Covers

- Gate failure → 读取 CLI `inspect` / `advice` → 针对性 repair → rerun same gate
- 默认 retry limit 为 3 次（可在 `rb_profile.yaml` 中覆盖）
- No-progress 或超限后必须 escalation/block，不能无限自修
- Transient blocker（网络中断等）进入 waiting/transient state，恢复后继续——不算 stop
- 需要用户 decision、权限缺失、连续 gate failure、无法不造假继续时 → explicit escalation

## Authority Boundary

- Retry limit 的 runtime 值在 `rb_profile.yaml`
- Escalation/block 必须记录到 `rb_status.json` 和 `rb_trace.jsonl`
- 此 shared node 是 guidance，不替代 runtime state
