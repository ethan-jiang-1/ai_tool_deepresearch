# Repair-Friendly Framework — 预先留痕迹，让修补有据可查

> 状态：设计阶段 | 创建：2026-07-16 | 更新：2026-07-16（第二版——从"修后留痕"改为"预先留痕"）

---

## 一句话

**不是修完之后写 repair journal——而是在正常 pipeline 运行时就预先留下"我做了什么、覆盖了什么、跳过了什么"的结构化声明。后来修的人（或 Agent）打开 bundle，不需要重做审计就能知道 gap 在哪。**

---

## 这次迁移暴露了什么

修 `pragmatic-summit-2026-ai-impact` 最耗时的一步是**发现问题**。我跑了 3 个 Explore agent、读了 30+ 个文件、写了多个检查脚本，才搞清楚：

| 发现 | 怎么发现的 | 如果预先留了痕迹 |
|------|-----------|-----------------|
| pair_count 声称 10 实际 8 | 人肉对比 finding-index 和 scan matrix | 如果 wave2 完成时写了一份 coverage manifest，列出 "scanned: [01x02, 01x03, ...] (8 pairs), deferred: [02x05, 03x05] (reason: incremental topic)"，秒发现 |
| rb_status 说 not_started 但 wave2 已完成 | 读了 status + 看了 artifacts 目录 | 如果每个 gate pass 时更新了 status + 写了 gate-pass manifest，一眼看出漂移 |
| queue 里还有遗留 running item | 读了 queue | 如果 queue 关闭时写了 drain summary，直接看到残留 |
| timed_out WU 缺 retry linkage | 读了 index + 交叉对比 retry | 如果 work unit submit 时在 index 里写了 retry_work_ids，链是完整的 |

**根本问题不是"修的时候没写 repair journal"——是 pipeline 正常运行时没留下足够的结构化声明，导致后来的人（或 Agent）要修的时候必须先花大量精力重新审计。**

---

## 核心设计：Phase Completion Manifest

每个 phase 在 gate pass 时，额外写一份 **phase completion manifest**——一份结构化的 YAML/JSON 文件，声明本 phase 的覆盖范围。存在 `_checkpoints/` 旁边或者 `artifacts/<wave>/` 下。

和已有机制的区别：

| 已有机制 | 记录什么 | 为什么不够 |
|----------|---------|-----------|
| `rb_trace.jsonl` | 事件流（gate_attempt、work_unit_submitted……） | 事件不是声明。你不知道 "wave0 应该收 10 个 source 实际收了几个"——你得 parse 事件再数。 |
| `_diagnostics/gates/` | gate 的 pass/fail + inspect 详情 | 面向 gate 规则，不面向"这个 phase 产出了什么"。 |
| `_checkpoints/` | gate-pass 时刻的快照 | 是状态快照，不是覆盖声明。不告诉你缺了什么。 |
| `rb_output_declarations.jsonl` | work unit 的 output file 列表 | 只覆盖 work unit 产出，不覆盖 phase 级别的 completeness 声明（如 cross-topic 矩阵覆盖）。 |

**Phase completion manifest 是上面所有东西都不提供的那个信息层：phase 完成后，Agent 必须回答"我做了什么、覆盖了多少、跳过了什么、为什么"。**

### Manifest 格式（以 wave2 为例）

```yaml
# artifacts/wave2/completion-manifest.yaml
phase: wave2
gate: wave2-complete
completed_at: "2026-07-10T02:55:50.193Z"
produced_by: "wave2_synthesis_agent"

coverage:
  topic_count: 5
  cross_topic_pairs_possible: 10
  cross_topic_pairs_scanned: 8
  scanned_pairs:
    - ["01", "02"]
    - ["01", "03"]
    - ["01", "04"]
    - ["01", "05"]
    - ["02", "03"]
    - ["02", "04"]
    - ["03", "04"]
    - ["04", "05"]
  deferred_pairs:
    - pair: ["02", "05"]
      reason: "topic 05 added via HITL2 rerun; wave2 scan ran before topic was added"
    - pair: ["03", "05"]
      reason: "topic 05 added via HITL2 rerun; wave2 scan ran before topic was added"

outputs:
  findings_count: 9
  finding_ids: ["W2F-001", ..., "W2F-009"]
  consumer_reference_projections: 5
  findings_without_projection:
    - "W2F-003": "process-only synthesis finding"
    - "W2F-005": "open dispute, not resolvable from existing evidence"
    - "W2F-006": "emergent question, routed to HITL2"
    - "W2F-008": "limitation caveat, not a finding with backing evidence"

gaps_declared:
  - kind: "missing_cross_topic_pairs"
    detail: "2 of 10 possible pairs deferred"
    severity: "known_gap"
  - kind: "no_primary_transcript"
    detail: "no indexed Pragmatic Summit 2026 session transcript"
    severity: "evidence_limitation"
```

### 这个 manifest 的消费者

1. **下一个 phase**（readiness/final）——知道自己拿到的是什么质量的 wave2 产出，有哪些已知 gap，不需要重新审计
2. **后续 rerun**——知道 "02x05 和 03x05 是上次跳过的，这次应该补"
3. **修复 agent**（人或 LLM）——打开 bundle 先读 manifest，5 秒定位 gap，不用跑 3 个 Explore agent
4. **consistency check CLI**——读 manifest，对比实际文件，报告漂移

### 什么时候写 manifest

Phase agent 在 gate pass 之后、`enter-phase` 之前写。Gate fail → retry 时更新。Phase 内容有实质性改动（比如 rerun 补了 2 个 pair）→ 更新 manifest。

---

## 配套机制

### P0 — Gap check 进 gate definition

Manifest 告诉"人"gap 在哪。Gate 告诉"框架"gap 在哪——gate fail 是框架层面的阻断。

**wave2-complete gate 新增检查**：
```
manifest.coverage.cross_topic_pairs_scanned == C(manifest.coverage.topic_count, 2)
```
Fail 时 hint 直接引用 manifest 的 `deferred_pairs`：
```json
{
  "repair_kind": "agent_action",
  "missing_fact": "cross-topic scan missing 2 pairs (see manifest.deferred_pairs)",
  "pairs": [["02","05"], ["03","05"]],
  "write_to": "wave2 cross-topic scan matrix + finding-index + synthesis",
  "rerun": "check-gate-wave2-complete --same-check"
}
```

通用原则：**能推导的值不让 Agent 手写**。`topic_count` 从 `rb_plan.md` 读，`C(n,2)` 是纯数学，pair 命名是纯组合。

### P1 — Consistency check CLI（基于 manifest）

```bash
node DPT_FRAMEWORK/cli/check-consistency.mjs --bundle <path>
```

不重新审计。只做 **manifest vs 实际文件** 的 diff：
```
✓ wave2/manifest: 9 findings declared, 9 found in finding-index.yaml
✗ wave2/manifest: scan_matrix has 8 rows, manifest.scanned_pairs has 8 entries — but topic_count=5 → C(5,2)=10  
  → 2 missing pairs: 02×05, 03×05 (see manifest.deferred_pairs)
✓ reference/: manifest claims 56 refs, _INDEX has 56 rows, disk has 56 files
✗ rb_status.json: state="not_started" but wave2 manifest exists at 2026-07-10 → drift
✗ rb_queue.json: active_window has 2 items but manifest declares phase complete → likely leftover
```

输出里每个 `✗` 都可以直接定位到文件:行:字段。Agent 不需要理解"这意味着什么"——manifest 已经给了语义。

### P2 — Artifact provenance marker

每个 artifact 文件标注出处（成本极低，修补时价值极高）：

```
- produced_by: wu-w1-b000-deep-i0008
```

手写/后修的文件：
```
- produced_by: "manual_repair:2026-07-16-migration-audit"
```

### P2 — Repair trace events

框架外的修改（手动编辑、脚本迁移）在 trace 里留记录：

```jsonl
{"ts":"...", "event":"repair_session_start", "repair_id":"migration-audit", "scope":"format + metadata"}
{"ts":"...", "event":"repair_session_end", "repair_id":"migration-audit", "outcome":"completed"}
```

配合 `_repairs/<repair_id>.md`（human-readable journal），但不是主角——主角是 manifest。

---

## 为什么 manifest 比 repair journal 更重要

| | Phase Completion Manifest | Repair Journal |
|---|---|---|
| 谁写 | Phase agent（正常 pipeline 内） | 修复者（pipeline 外） |
| 什么时候写 | Gate pass 时 | 出问题后 |
| 记录什么 | "我覆盖了什么、跳过了什么" | "我修了什么" |
| 主要消费者 | 下一 phase、rerun、repair agent | 审计者 |
| 作用 | 让 gap 预先可见 | 让修复可追溯 |

**Repair journal 是补救措施。Manifest 是让补救变得简单的预先措施。** 两个都要，但 manifest 的杠杆更高——它让问题在 pipeline 内就被标注出来，而不是等到修的时候才被发现。

---

## 以本次迁移为验证场景

如果 v0.15 的 wave2 在 gate pass 时写了一份 manifest，声明了 `deferred_pairs: [02×05, 03×05]`：

1. 我打开 bundle，`check-consistency` 5 秒告诉我 "2 pairs deferred"
2. 我不用跑 3 个 Explore agent 去审计 —— gap 已经标好了
3. 我不需要手动写 W2F-010/011 —— 我知道缺什么，触发一次 targeted wave2 rerun，Agent 拿着 manifest 的 deferred_pairs 直接补
4. 修完之后，更新的 manifest 声明 `cross_topic_pairs_scanned: 10, deferred_pairs: []`
5. Trace 里有 `repair_session` event，manifest 的 `updated_at` 变了，provenance 链完整

**整个修复从"先花 30 分钟审计再手动写内容"变成"读 manifest → 触发 targeted rerun → Agent 补 → 验证"。**

---

## 不做的事

- **不做自动修复**——manifest 声明 gap，gate 报告 gap，但修不修、怎么修是 Agent（或人）的决定
- **不建 repair lifecycle/controller**——repair 是 pipeline 外的例外，不编码进状态机
- **不要求老 bundle 补 manifest**——backward compat。新 phase 产出的 bundle 才写 manifest
- **不把 manifest 变成新的 source of truth**——它是对 phase 产出的声明，不是替代。如果 manifest 和实际文件不一致，以实际文件为准，manifest 标记为 `stale`
