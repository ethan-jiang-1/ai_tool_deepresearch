# BUG-066 — Work-unit envelope `result.schema.json` 与 submit-time strict validator 互相矛盾：delegated 首次 submit 系统性失败（[[BUG-060]] 的残留/回归）

| 属性 | 值 |
|------|-----|
| ID | BUG-066 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1 — 每个 delegated work unit 的首次 submit 都会在诚实、合规的研究产出上被拒；Phase Agent 被迫从 engine 源码逆向出真实 contract 才能通过 |
| 来源 | `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（exploratory_map，5 topics，wave0 5 work units + wave1 5 work units），全部 sub-agent 真实 WebSearch + curl fetch |
| 相关 Bug | [[BUG-060]]（sub-agent/Engine contract 系统性 mismatch — 声称已修，但本 bug 是其残留实例）、[[BUG-018]] |
| 影响文件 | `engine/work-unit-envelope.mjs`（生成 per-work-unit `result.schema.json`）、`schema/contracts/work-unit.mjs`（`WorkUnitResultSchema` / `WorkUnitSourceClaimSchema`，均 `.strict()`）、`engine/work-unit-validation.mjs`（`validateSourceClaims`）、各 phase `subagent-*.md` role 指令 |

---

## 0. 一句话核心诊断

**Engine 在 work-unit envelope 里 emit 的 `result.schema.json`（sub-agent 被明确要求满足的契约）比真正的 submit-time `.strict()` Zod validator 既"更宽松"又"自相矛盾"：wave1 的 `source_claims.items` 被描述成无约束的 `{type:"object"}`，而 validator 用 `.strict()` 拒绝任何多余 key；wave0 的 schema 甚至列出了 contract 明令禁止的 `source_claims`/`accepted_source_urls` 字段。任何忠实按 emitted schema 产出的 sub-agent 都会在首次 submit 被拒——错误信息（`unrecognized_keys` / `not allowed by this work-unit output contract`）指向"格式不对"，而研究内容其实完全正确。**

---

## 1. 两个具体实例（本 run 100% 复现）

### 实例 A：wave0 schema 广告了 contract 禁止的字段

- 每个 wave0 work unit 的 `_work_units/wave0/<wid>/result.schema.json` 的 `properties` **包含** `source_claims` 和 `accepted_source_urls`（`additionalProperties:false`，即"这些是允许的字段"）。
- 但同一 work unit 的 `_beacon.json` 里 `output_contract.source_claims` 为 `undefined`（即 `contract.allowed !== true`）。
- `validateSourceClaims()`（`engine/work-unit-validation.mjs:303-304`）因此抛：
  ```
  source_claims[] / accepted_source_urls[] are not allowed by this work-unit output contract
  ```
- 结果：sub-agent（或 Phase Agent 的 prompt）按 schema 填了这两个"被允许"的可选字段 → 首次 submit 100% 被拒。

**这正是 [[BUG-060]] Gap 5「source_claims 被 contract 阻止」。该 bug 已被标记 fixed，但修复只动了 contract/gate 侧，emitted `result.schema.json` 至今仍广告这两个被禁字段 → 修复不完整/回归。**

### 实例 B：wave1 schema 对 `source_claims.items` 零约束，validator 却 `.strict()`

- 每个 wave1 work unit 的 `result.schema.json`：
  ```json
  "source_claims": { "type": "array", "items": { "type": "object" } }
  ```
  没有 `properties`、没有 `required`、没有 `additionalProperties:false`——等于告诉 sub-agent"items 是任意 object"。
- 真正的 validator `WorkUnitSourceClaimSchema`（`schema/contracts/work-unit.mjs:201-208`）是 `.strict()`，只允许 6 个 key：
  `url` / `source_ref` / `acceptance_status` / `is_new_vs_wave0` / `cache_trail_refs` / `degraded_capture_ref`。
- 本 run 的 sub-agent 各自加了描述性 key（如 `capture_note`），且不同 sub-agent 用了**不同的 key 命名**（因为 schema 没给权威 key 集），submit 报：
  ```
  { "code": "unrecognized_keys", "keys": ["capture_note"], "path": ["source_claims", 5] }
  ```
- 结果：wave1 首次 submit 5/5 被拒。

---

## 2. 为什么这是系统性 bug（而非某个 sub-agent 的错）

- Envelope 里 emit `result.schema.json` 的**唯一目的**就是让 sub-agent 有一个可满足的契约。当它与 `.strict()` validator 不一致时，这个契约是**误导性**的：越忠实照做越会失败。
- 因为 emitted schema 不给权威 key 集，多个独立 sub-agent 必然产生**互不一致**的 `source_claims` 形状——这不是巧合，是 under-specification 的直接后果。
- Phase Agent 只能：读 engine 源码 → 逆向出 6 个允许 key → 写脚本 strip 多余 key 后重提。**本 run 第一次 strip 甚至丢了数据**（sub-agent 02–05 把 `url`/`acceptance_status` 放在非规范 key 下，strip 后只剩 `cache_trail_refs`），只能再从 `reference-material.json` 重建 `source_claims`。这一整套"处理"都是被本 bug 逼出来的 workaround，不应存在。

---

## 3. 复现步骤

1. 跑任意 delegated wave（wave0 或 wave1），让 sub-agent 按 emitted `result.schema.json` 产出 `result.json`。
2. wave0：在 `result.json` 填入 schema 声明允许的 `accepted_source_urls`/`source_claims` → `operate-work-unit submit` 抛 "not allowed by this work-unit output contract"。
3. wave1：在 `source_claims[]` 条目里放任何非 6-key 之外的字段 → submit 抛 `unrecognized_keys`。

---

## 4. 修复方向

**根治（让 emitted schema 成为单一真相源）——`engine/work-unit-envelope.mjs`：**
- 当 `output_contract.source_claims.allowed !== true`：从 emitted `result.schema.json` **删除** `source_claims`/`accepted_source_urls` 属性（或 `"not": {}`），使 schema 与 validator 一致（wave0 不该广告这两个字段）。
- 当允许时：把 `WorkUnitSourceClaimSchema` 的真实形状**注入** emitted schema 的 `source_claims.items`——列出 6 个 required/optional key 并设 `additionalProperties:false`，让忠实按 schema 产出的 sub-agent 直接通过。理想做法是从 `WorkUnitSourceClaimSchema` 用 `zod-to-json-schema` 生成，避免二次漂移。

**防御（与 [[BUG-060]] 的 auto-repair 哲学一致）——submit 侧：**
- 当唯一问题是 `source_claims[]` 条目里多了未知 key 时，strip-and-warn（记 `silent_degradation`，`gap_impact: none`——内容对，只是多一层），而非 hard-reject。

**回归防护：**
- 加一个测试：对每个 kind emit 的 `result.schema.json` 与对应 `.strict()` Zod validator 做一致性断言（schema 允许的字段集 == validator 允许的字段集；schema 禁止的 == validator 禁止的）。这类"envelope schema ↔ validator" 漂移应由测试常态化拦截。

---

## 5. 严重性论证

研究质量本身很高（本 run wave0 74 个真实源、wave1 每 topic 8–9 个全新源、含 peer-reviewed 研究与 RCT）。但**每一个 delegated work unit 的首次 submit 都失败**，且失败原因是格式契约漂移而非内容。这正是 [[BUG-060]] 想根除的"Agent 花大量时间修格式而非做研究"，说明该类问题尚未真正闭环。
