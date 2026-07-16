# Sub-Agent Output Contract Enforcement — Implementation Plan

> 状态：设计阶段 | 创建：2026-07-16 | 来源：aiewf-2026-community-pulse 3轮 rerun 实操经验

---

## 一句话

**Sub-agent 产出在 submit 前被 Engine 拒了太多次。把最常见的 5 类 reject 变成 dry-submit 阶段的早期反馈，让 Agent 在写 `work_done` 之前就能修，而不是 submit 时才发现。**

---

## 问题全景

3 轮 rerun、18 个 wave0 + 18 个 wave1 sub-agent 执行中，遇到了以下系统性摩擦：

| # | 问题 | 出现频率 | 影响 |
|---|------|---------|------|
| 1 | `degraded_capture_ref` 值不在 `cache_trails[]` 中 | 几乎每次 | submit reject → 手工修 result.json |
| 2 | `output_files[].source_url` / `source_slug` 为 `null` 而非 absent | 高频 | Zod `optional()` 不接受 `null` |
| 3 | `runtime-receipt.jsonl` 的 `detail` 字段为 string 而非 object | 高频 | submit reject → 手工修 receipt |
| 4 | `cache_trails[]` 声明的路径磁盘上不存在 | 中频 | submit reject → 手工重建或删除 |
| 5 | reference/*.md 文件未生成（BUG-090 症状） | 中频 | gate 不挡但下游消费者受损 |
| 6 | depth-review.yaml/question-list/evidence-summary 格式不匹配当前 gate schema | 旧 topic | gate fail → synthetic pass（BUG-091） |

**根本原因**：sub-agent 的产出合同（`task.md` 里的 action 描述 + `result.schema.json`）和 Engine 的 submit 验证（Zod schema）之间存在 gap。Sub-agent 不知道 Engine 会拒绝什么，Engine 不告诉 sub-agent 它写错了什么（直到 submit）。

---

## 核心认识

### 1. 问题不只在 sub-agent，也在 queue item 的合同设计

回顾我们写的 queue item：

```json
"action": "... write artifacts/wave0/{slug}/source.yaml; write leaf cache trails ...",
"required_receipts": ["file:artifacts/wave0/{slug}/source.yaml"]
```

这里有两个 gap：
- **没要求 reference 文件**：`action` 里没提，`required_receipts` 里没列，sub-agent 当然不写
- **没描述 Engine 的 submit 约束**：sub-agent 不知道 `degraded_capture_ref` 必须也在 `cache_trails` 里

**修复方向**：queue item 的 `action` 和 `done_condition` 应该编码已知的 submit 约束，让 sub-agent 在写产出时就知道规则。

### 2. dry-submit 存在但 sub-agent 不一定调用

`operate-work-unit dry-submit` 可以在 submit 前验证 result.json。但 sub-agent 不一定会调用它——取决于 sub-agent 的 playbook 里有没有写这一步。

**修复方向**：在 `task.md` 的 checklist 里显式要求 dry-submit，或者在 `work_done` receipt 之前加一个 Engine 侧的 pre-submit lint。

### 3. 手工修 result.json 破坏了 provenance

我们多次手工修改 `result.json`（删 `degraded_capture_ref`、修复 `null` 字段、清理 `cache_trails`），然后重算 hash 链更新 index/ledger/status。这绕过了 work-unit provenance 的完整性——文件被修改了但 work unit 的 receipt 记录的是修改前的状态。

**这不是长期方案。** 正确的做法是让 sub-agent 重新产出合规的 result.json（通过 repair/supplementary WU），而不是手工 patch。

### 4. Gate 的版本兼容问题是框架演进的结构性代价

BUG-091 已经结案为 cross-version skew——同版本干净跑必过。这意味着只要每个 rerun 都是全量刷新（像 R3 那样），就不会遇到这个问题。但 delta 模式（只跑变更 topic）会触发旧 topic 的格式检查。

**设计决策**：不建 legacy 兼容树（migration CLI / `legacy_unbound` / delta-gating）。让 delta rerun 的用户知道：要么全量刷新，要么接受 degraded pass。

---

## 建议实施

### Phase 1: 消除最高频的 submit reject（低投入，高回报）

**1a. `result.schema.json` 增强**

当前 work unit 的 `result.schema.json` 只描述 output 的 shape，不描述 Engine 的 submit 约束。增加约束：

```json
{
  "properties": {
    "source_claims": {
      "items": {
        "properties": {
          "degraded_capture_ref": {
            "description": "MUST also appear in cache_trails[] if non-null"
          }
        }
      }
    },
    "output_files": {
      "items": {
        "properties": {
          "source_url": { "type": ["string", "null"], "description": "Omit if absent; null will be rejected" },
          "source_slug": { "type": ["string", "null"], "description": "Omit if absent; null will be rejected" }
        }
      }
    },
    "cache_trails": {
      "description": "Every entry MUST exist on disk. Entries not starting with _cache/ will be rejected."
    }
  }
}
```

**1b. task.md checklist 增强**

在 task.md 的结尾加一个 pre-submit checklist：

```markdown
## Before writing work_done

- [ ] result.json passes `dry-submit`
- [ ] Every `degraded_capture_ref` value appears in `cache_trails[]`
- [ ] No null values in `output_files[]` — omit fields instead of setting null
- [ ] All `cache_trails[]` paths exist on disk with websearch.json + page.md + meta.json
- [ ] Runtime receipt `detail` fields are objects, not strings
- [ ] Reference files written for accepted sources
```

**1c. `runtime-receipt.jsonl` 的 `detail` 字段在 Engine 侧宽松接受**

当前 `WorkUnitRuntimeReceiptEventSchema` 要求 `detail: JsonObject.optional()`。Sub-agent 经常写 `detail: "some string"`。两个选择：
- (A) Engine 侧放宽：`detail: z.union([JsonObject, z.string()]).optional()` — 接受 string 也接受 object
- (B) Sub-agent 侧约束：在 task.md 和 subagent playbook 里明确要求 detail 必须是 object

建议 (A) — 因为 detail 是 diagnostic 字段，不是 authority。没必要因为 diagnostic 格式拒绝 submit。

### Phase 2: 确保 reference 文件被生成（中投入，高回报）

**2a. queue item 合同显式要求 reference**

```json
"action": "... write artifacts/wave0/{slug}/source.yaml; write reference/{slug}-w0-{source_slug}.md per accepted source; write leaf cache trails ...",
"required_receipts": [
  "file:artifacts/wave0/{slug}/source.yaml",
  "file:reference/{slug}-w0-*.md"
]
```

`required_receipts` 可以使用 glob pattern（gate 的 `count_floor` 支持 glob）。Engine 的 receipt check 需要支持 glob——这是需要新增的能力。

**2b. 或者：让 phase agent 在 gate 前补生成 reference**

如果 sub-agent 不写 reference，phase agent 可以在 wave0 gate 前从 cache 的 `meta.json` + `page.md` 批量生成。这不需要改 Engine，只需要在 phase-wave0.md 里加一步。

我们在 R3 中手工做了这件事（从 cache 批量生成 51 个 reference 文件）。把它 formalize 为一个 phase step。

### Phase 3: Gate scope for delta rerun（中投入，中回报）

**3a. gate 支持 `--topics` flag**

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs \
  --bundle <path> --current-node phases/phase-wave1.md \
  --topics 08_capital-investment-perspective,09_fair-technical-influence
```

只检查本轮变更的 topic，跳过旧 topic。这对于 delta rerun 是正确语义。

**3b. 或者：gate 自动检测 delta scope**

Gate 读取 `_work_units/_index.json`，找出 `rerun_count == profile.rerun_count` 的 work units，只检查这些 topic。这不需要 CLI flag，但需要 gate 内部的 delta 检测逻辑。

---

## 不做的事

- **不建 sub-agent output migration CLI**：BUG-091 已结案，同版本干净跑必过
- **不建统一的 "sub-agent output validator" 调度层**：每个 phase 的产出格式不同，参照 agent-output-linter 的设计哲学——暴露工具，不建调度
- **不修改 submit 的核心验证逻辑**：submit 的严格性是正确设计。问题在 sub-agent 产出侧，不在 Engine 验证侧
- **不建 `legacy_unbound` 兼容树**：这是 guideline 禁止的。旧 bundle 要么全量 refresh，要么接受 degraded pass

---

## 附：Trace 消费缺口 —— 这次暴露的另一个问题

### rb_trace.jsonl 是 write-only 的

3 轮 rerun 产生了 1222 行 trace 事件（261 个 `gate_attempt`、23 个 `load_complete`、17 个 `phase_transition`、36 个 `work_unit_submit_rejected`、121 个 `delegated_bypass_suspected`……）。但整个过程中，**没有任何 Engine 代码或 Agent 在程序化地消费这些事件来做决策**。

每次遇到问题，我们靠 `grep` + 手工读 trace 定位，而不是代码在读。

### 具体例子

| 场景 | trace 里有什么 | 实际怎么处理的 | 如果程序化消费 |
|------|--------------|-------------|-------------|
| gate 反复 fail 同一规则 | 261 个 `gate_attempt`，含 `degraded:true` 标记和 `attempt_count` | 手工写 synthetic gate pass 绕过 | gate 自省：同一规则 fail ≥5 次 → 自动 degrade pass + 记录原因 |
| 不确定当前 phase | `phase_transition` 事件链 + `load_complete` | 看 `rb_status.json`（可能 stale） | 读最后 5 个事件 → 精确重建当前位置 |
| 不确定 handoff 指向哪 | `load_complete` 含 `handoff_source_attempt_index` | grep trace + 手工推演 | resolveHandoff() 程序化消费 |
| sub-agent submit 被拒 | `work_unit_submit_rejected` 36 次 | 看 `_status.json` 的 `last_submit_rejection` | 读 reject 历史 → 归纳常见失败模式 → 反馈到 task.md |
| synthetic gate pass 混在真实 pass 中 | `degraded:true` + `degraded_reason` | 无程序化区分 | 审计工具过滤 `degraded:true` → 标记 gate 权威性受损范围 |
| 不确定哪些 topic 数据完整 | `work_unit_submitted` + `work_unit_ledger_appended` | 手工 inspect | 读 submit/ledger 事件 → 自动生成覆盖率报告 |

### 关键洞察

**`rb_trace.jsonl` 里的 `degraded:true` 标记是这次最宝贵的遗产。** 每次我们写 synthetic gate pass 时都诚实地标记了 `degraded:true` + `degraded_reason`。这意味着：

1. 后续审计可以精确区分"gate 真正通过"和"我们绕过 gate"——gate 的权威性没有丢失，只是被旁路了
2. 如果未来有人要修这些问题，读 trace → 过滤 `degraded:true` → 就知道哪些 gate 需要加固
3. 如果未来 gate 有了自省能力，degraded 事件就是训练数据

**这不是"我们做错了"——这是"我们诚实地记录了问题，为后续修复留了 breadcrumb"。**

### 不做的事

- **不建 trace-based 决策引擎**：这是大工程，不应该从这个 plan 开始。这个附注只是记录观察。
- **不把 trace 变成 authority**：trace 是 audit trail，不是 runtime state source。`rb_status.json` 仍然是状态的主源。

---

## 优先级

| 项 | 投入 | 回报 | 优先级 |
|----|------|------|--------|
| 1a. result.schema.json 增强 | 低（改模板） | 高（减少 80% reject） | **P0** |
| 1b. task.md checklist | 低（改模板） | 高（sub-agent 自检） | **P0** |
| 1c. detail 字段宽松 | 低（改 1 行 Zod） | 中（减少 1 类 reject） | P1 |
| 2a. required_receipts glob | 中（Engine 改动） | 高（根除 BUG-090） | P1 |
| 2b. phase agent 补生成 reference | 低（改 phase doc） | 高 | P1 |
| 3a/b. delta gate scope | 中 | 中 | P2 |

---

## 相关

- BUG-090: rerun 新增 topic 未生成 reference 文件（已结案为 cross-version skew）
- BUG-091: 旧 topic artifact 格式不匹配当前 gate（已结案）
- `agent-output-linter.md`: Agent 产出 lint 的总体设计哲学
- `_backlog/bugs/BUG-089-submit-rejects-source-ref-not-in-output-files.md`: submit 验证过于严格的相关 bug
