# BUG-069 — Agent-facing 契约不自洽导致"静默自主执行"不可达

| 属性 | 值 |
|------|-----|
| ID | BUG-069 |
| 发现日期 | 2026-07-08 |
| 最后复审 | 2026-07-10 — 静态交叉验证全部 failure point 与当前 engine source |
| 严重级别 | **P2**（原 P1，已降级） |
| 当前状态 | **大部分已修。** 6 个具体 failure point 已修 5 个；4 个根因中 dry-run preflight + emitted schema 对齐已落地。Wave0/Wave1 的首过可达性大幅改善。Wave2 phase MD 仍不完整但 gate rules 本身已清晰——残余风险是文档完整性问题而非契约矛盾 |
| 来源 | `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（exploratory_map，5 topics） |
| 修复来源 | `stabilize-agent-facing-work-unit-contracts` (v0.12, `f67609881`)、`align-gate-contracts-and-reference-navigation` (v0.13, `9fb3eb40c`)、`harden-delegated-preflight-and-fetch-hygiene` (v0.14, `fe6232f8e`) |
| 子 Bug（均已随本 bug 修复） | [[BUG-066]] emitted schema 字段矛盾、[[BUG-067]] task card 用 work_id 被拒、[[BUG-068]] phase MD 示例与 gate selector 漂移 |

---

## 1. 问题本质

框架有四份东西在说"同一个 work unit 应该产出什么"：

1. **phase MD**（`workflows/nodes/phases/phase-*.md`）— Agent 读的指令
2. **emitted `result.schema.json`**（`engine/work-unit-envelope.mjs` 为每个 work unit 生成）— sub-agent 的契约
3. **gate definition JSON**（`schema/gate_definitions/*.definition.json`）— gate 的规则
4. **`.strict()` Zod validator**（`schema/contracts/work-unit.mjs`、`engine/helpers/wave-depth-contracts.mjs`）— 真正的校验逻辑

它们各自演进、互相漂移，没有自动化测试把它们钉在一起。

后果：Agent 只靠"读 phase node + emitted schema"产出 artifact → gate 失败 → 必须去读 engine 源码才能知道真正的字段名/role/ref 格式/正则要求 → 修复 → 重跑。`shared-silent-execution` 要求 stop:no phase 不提问不浮出水面，但每一个 gate 失败都是一个"停下来搞清楚状况"的介入点。**无人值守的前提（首过成功或确定性自愈）不成立。**

---

## 2. 发现时的症状

2026-07-08 一次正式 run（5 topics，exploratory_map）中，seed-topics 到 wave1 gate **没有任何一个 wave 首过即通过**。每次失败后 Agent 都必须读 engine 源码才能修复：

| Phase | 首过失败 | 根因 | 真相在 |
|-------|---------|------|--------|
| seed-topics | task card 含 `work_id` 被 queue schema 拒绝 | phase MD 模板就是错的 | `queue.mjs` superRefine |
| wave0 submit | `source_claims`/`accepted_source_urls` 被 contract 拒绝 | emitted schema 广告了 validator 禁用的字段 | `work-unit-validation.mjs:331` |
| wave1 submit | `source_claims[]` 含未知 key 被 `.strict()` 拒绝 | emitted schema 写 `items:{type:object}` 无约束 | `work-unit.mjs:201` |
| wave1 gate | evidence-summary.md 的 output role 必须是 `evidence_summary` | contract 没说清楚 role↔path 绑定 | `gate-wave1-complete.definition.json` selectors |
| wave1 gate | depth-review `reviewed_work_unit_refs` 不能带尾斜杠 | phase MD 示例带斜杠 | `wave-depth-contracts.mjs:378` |
| wave2 gate | ledger 六段、finding-index 11 字段、`W2F-\d{3}`、`00-cross` provenance、synthesis 链接格式 | phase MD 仅覆盖部分；精确约束在 gate def + helpers | `gate-wave2-complete.definition.json` + `wave-depth-contracts.mjs` |

共同模式：phase MD 和 emitted schema 组成的"Agent-facing surface"与 engine validator 之间有一条只能靠读源码跨越的沟。

---

## 3. 根因

不是某个 phase 的问题，而是**缺少单一真相源 + 跨 surface 一致性保证**：

- **四 surface 各自演进。** phase MD、emitted schema、gate def、Zod validator 是四个独立维护的 artifact，字段名/格式/约束在其中漂移。
- **emitted schema 是给 sub-agent 的"可满足契约"，却不自洽。** wave0 广告了 validator 会拒绝的字段；wave1 不告诉 sub-agent 哪些 key 合法。
- **phase MD 内联示例无 lint。** task card 用 `work_id`、ref 带尾斜杠——这些示例如果能被 CI 静态校验为"与当前 schema/validator 一致"，就不会进入 Agent 上下文。

---

## 4. 已修复（FP1–FP5）

以下 5 个 failure point 在 v0.12–v0.14 中修复。对每个问题，修复覆盖了 emitted schema、phase MD、validator 三者中至少两层，确保它们不再矛盾。

### FP1: seed-topics task card 用 `work_id` 被拒 ✅

**修复**: `QueueDemandItemSchema.superRefine` (`schema/contracts/queue.mjs:56-61`) 显式拒绝含 `work_id` 的 task card，message 写清 queue identity 是 `queue_item_id`。phase-seed-topics.md 模板已改用 `queue_item_id`。CI 工具 `validate-work-unit-hygiene.mjs:386-394` 扫描 phase MD 中的 queue result JSON 示例，检测 `work_id` 误用。

三层防护：schema 拒绝（运行时） + phase 模板修正（文档） + CI lint（构建期）。

### FP2: wave0 emitted schema 广告 `source_claims`/`accepted_source_urls` 但 validator 拒绝 ✅

**根源**: `validateSourceClaims` (`work-unit-validation.mjs:331-333`) 要求 `outputContract.source_claims.allowed === true`。但 emitted `result.schema.json` 不管 contract 是什么，永远包含这两个字段——等于告诉 sub-agent "你可以填这个"，然后 submit 时拒绝。

**修复**: `resultSchemaDocument()` (`work-unit-envelope.mjs:113-115`) 改为**条件生成**——仅当 `outputContract.source_claims.allowed === true` 时才 emit 这两个字段。emitted schema 与 validator 一致。

### FP3: wave1 emitted schema 不约束 `source_claims[]` 字段，sub-agent 写未知 key 被 strict 拒绝 ✅

**根源**: `WorkUnitSourceClaimSchema` (`work-unit.mjs:201-208`) 是 `.strict()`，只接受 6 个字段。但 `sourceClaimItemSchema()` (`work-unit-envelope.mjs:80-98`) 之前 emit 的 JSON Schema 是 `items: {type: object}`——零约束。sub-agent 不知道边界在哪。

**修复**: `sourceClaimItemSchema()` 现在 emit `additionalProperties: false` + 精确的 properties 列表（`url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, `degraded_capture_ref`），与 Zod strict 对齐。

### FP4: evidence-summary.md 的 output role 必须是 `evidence_summary`，但 contract 未说清 ✅

**修复** — 三层对齐：

1. **Gate 层**: `gate-wave1-complete.definition.json:154-158` — `output_selectors.roles: ["reference", "evidence_summary", "question_list"]`
2. **Submit 层**: `validateOutputFiles` (`work-unit-validation.mjs:218-238`) 校验 output file 的 role 必须在 `outputContract.output_files.allowed_roles` 内
3. **Schema 层**: `outputFileItemSchema()` (`work-unit-envelope.mjs:62-77`) 从 `allowed_roles` 生成 role enum 写入 emitted schema。无 allowed roles 时生成 `{not: {}}`——不可满足的 schema，明确告诉 sub-agent 不要写 output_files

sub-agent 在读到 `result.schema.json` 的那一刻就知道合法的 role 值。

### FP5: depth-review `reviewed_work_unit_refs` 尾斜杠导致 mismatch ✅

**修复**: `canonicalizeSubmittedWorkUnitRef()` (`wave-depth-contracts.mjs:103-111`) 用 `ref.replace(/\/+$/g, '')` 去尾斜杠。带/不带尾斜杠的差异记录为 diagnostic（`canonicalized ... from "x/" to "x"`），不产生 failure。自愈 + 非阻塞 diagnostic。

---

## 5. 根因修复状态

### 根因 A: 契约单一真相源 → ⚠️ 手动同步，非自动生成

emitted `result.schema.json` 现在从 `output_contract` 派生（conditional fields、role enum、strict shapes），FP1–FP5 的修复都依赖这个改进。与发现时相比，三个 surface（emitted schema、validator、gate def）已不再矛盾。

**残余风险** — 两个 gap：

- `resultSchemaDocument()` (`work-unit-envelope.mjs:101-125`) 是**手写代码**，未用 zod-to-json-schema 从 `WorkUnitResultSchema` 自动生成。如果 Zod schema 增字段而手写代码未同步，FP2/FP3 类漂移会复发。当前风险低——字段已对齐——但缺乏自动化保证。
- `output_contract` 的字段（`allowed_roles`、`source_claims.allowed`、`required_result_fields`）仍然在 queue item payload 中手动设置，没有从 `kind` 到 contract 的自动派生。

### 根因 B: preflight / dry-run → ✅ 已修

v0.14 新增 `operate-work-unit dry-submit`——零副作用预检，跑完整 submit validator 管线（result schema、output files、source claims、cache trails、receipt、nonce、queue binding），返回 structured `ok/violations/normalizations`。不写任何持久状态。

这是四个修复方向中**最关键的一项**。它把"gate 失败 → 读源码 → 逆向修复 → 重跑"的串行循环压成了"一次 dry-submit 批量校验"。Agent 在正式 submit 前就能拿到所有契约不符项，不需要等到 gate 逐条爆。

代码: `engine/work-unit-submit.mjs:554` (`drySubmitWorkUnit`), CLI: `cli/operate-work-unit.mjs:110`。

### 根因 C: phase-doc 契约一致性测试 → ⚠️ queue 示例已覆盖，更深层未覆盖

两项 CI 工具已存在：

| 工具 | 覆盖 | 缺失 |
|------|------|------|
| `validate-work-unit-hygiene.mjs` `checkPhaseQueueExamples()` | 解析 phase MD JSON fence，用 `QueueDemandItemSchema` + `QueueResultSchema` 校验 | 不校验 result JSON 示例 vs `WorkUnitResultSchema`、不校验 depth-review/finding-index YAML 示例 |
| `validate-phase-templates.mjs` | 检查 task card 的 `controller`/`delegates` | 范围极窄——不检查任何字段级契约 |

FP1（`work_id` 误用）已被 CI 拦截。但以下示例类型仍无校验：
- phase MD 中的 result JSON 示例 vs `WorkUnitResultSchema`
- phase MD 中的 output role 示例 vs gate-allowed roles
- phase MD 中的 ref 格式示例 vs canonical format
- phase MD 中的 depth-review YAML 示例 vs `checkWave1DepthReviewContract`
- phase MD 中的 finding-index YAML 示例 vs `checkWave2FindingIndexContract`

### 根因 D: 自愈防御 → ⚠️ 已有 6 项，strict rejection 仍是主流

已实现的自愈 normalization（均在 `work-unit-validation.mjs` 和 `wave-depth-contracts.mjs`）：

1. **尾斜杠 strip** — `canonicalizeSubmittedWorkUnitRef` (`wave-depth-contracts.mjs:105`)
2. **receipt nonce 补全** — 从 index record 覆盖 (`validation.mjs:95-113`)
3. **receipt binding identity autofill** — work_id/queue_item_id/kind 从 record 补全 (`validation.mjs:164-204`)
4. **schema_version defaulting** — receipt event 缺省补 `WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION` (`validation.mjs:149-158`)
5. **page-content.md canonicalization** — 无 page.md 时从 page-content.md 生成 (`validation.mjs:241-266`)
6. **result wrapper unwrapping** — `{result: {...}}` → inner object (`validation.mjs:71-84`)

未实现：多余 key 自动 strip（`WorkUnitResultSchema.strict()` 对未知字段仍是 hard reject）、role 大小写归一化、ref 双斜杠规范化。

---

## 6. 仍存在的问题

### FP6: Wave2 gate 格式要求 — phase MD 不完整 ⚠️

这是 6 个 failure point 中唯一未完全消除的。Gate 规则本身已很清晰——`checkWave2FindingIndexContract()` (`wave-depth-contracts.mjs:472-611`) 对 finding-index.yaml 做完整验证（`W2F-\d{3}` 格式、11 个必需字段、`W2_TYPES`/`W2_PRIORITIES`/`W2_STATUSES`/`W2_DECISIONS`/`W2_CONFIDENCE`/`W2_GAP_STATUS` 六个 enum、confidence/backing 一致性、gap_status 收敛、cross-reference materialization、synthesis eligibility）。`gate-wave2-complete.definition.json` 含 `finding_index_contract`、`cross_artifact_references`、`wave1_evidence_ref` 等显式 rule。

但 **phase-wave2.md 没有枚举这些约束**。Phase Agent 仍然需要理解 gate definition 或 `wave-depth-contracts.mjs` 才能确保首过成功。这不是契约矛盾（gate rules 和 validator 是一致的），而是 Agent-facing 文档不完整——phase MD 告诉你"要交 finding-index.yaml"，但没告诉你里面 11 个字段分别叫什么、哪些 enum value 合法。

与 FP1–FP5 的关键区别：那些问题涉及**矛盾**（surface A 说 X，surface B 说 Y），而 FP6 是**缺失**（surface A 没说全，surface B 是对的，Agent 需要自己去 surface B 找）。

---

## 7. 当前综合判定

| 维度 | 状态 | 关键证据 |
|------|------|---------|
| FP1 — work_id 被拒 | ✅ 已修 | queue.mjs superRefine + phase 模板 + CI lint |
| FP2 — emitted schema 广告禁用字段 | ✅ 已修 | envelope.mjs 条件生成 |
| FP3 — emitted schema 无字段约束 | ✅ 已修 | additionalProperties:false 对齐 Zod strict |
| FP4 — output role selector 漂移 | ✅ 已修 | gate roles + submit validation + emitted schema enum |
| FP5 — trailing slash refs | ✅ 已修 | canonicalizeSubmittedWorkUnitRef + diagnostic |
| FP6 — Wave2 格式要求 | ⚠️ 改善 | gate rules 清晰，phase MD 不枚举 |
| 根因 A — 契约单一真相 | ⚠️ 手动同步 | emitted schema 手写，非 Zod 生成 |
| 根因 B — preflight/dry-run | ✅ 已修 | operate-work-unit dry-submit (v0.14) |
| 根因 C — phase-doc CI 测试 | ⚠️ queue 示例已覆盖 | result/YAML 示例未覆盖 |
| 根因 D — 自愈防御 | ⚠️ 6 项已实现 | strict rejection 仍是主流 |

**核心判断**: 标题的"静默自主执行不可达"在 Wave0/Wave1 **已基本不成立**。Emitted schema 不再骗人、dry-submit 能提前发现问题、trailing slash 不再致命、output role 在 schema 中就有 enum。Agent 靠 phase MD + emitted schema + dry-submit 三个 surface 的组合，有了一条不读 engine 源码也能首过成功的路径。对 Wave2，phase MD 仍不够自足——但 gap 的性质已从"契约矛盾"退化为"文档不完整"。严重级别从 P1 降为 P2。

---

## 8. 建议后续

1. **Wave2 phase MD 补全**。在 `phase-wave2.md` 中列出 finding-index.yaml 的 11 个必需字段、六个 allowed enum 的合法值、`W2F-\d{3}` 格式、cross-topic-ledger 6 段标题。消除最后一个"Agent 必须读 gate def 才知道格式"的 gap。

2. **扩展 phase-doc CI 校验**。`validate-phase-templates.mjs` 当前只检查 controller/delegates——范围太窄。增加：result JSON 示例 vs `WorkUnitResultSchema`、output role 示例 vs gate-allowed roles、ref 格式示例 vs canonical format。让 `validate-work-unit-hygiene.mjs` 的 `checkPhaseQueueExamples` 模式覆盖更多示例类型。

3. **zod-to-json-schema（non-blocking）**。如果 `WorkUnitResultSchema` 后续频繁变化，自动生成 emitted schema 可消除手写漂移风险。当前手动同步已对齐，风险低。

4. **自愈扩展**。对可确定性修复的偏差在 submit 侧 auto-normalize + 记 `silent_degradation`：多余 key strip、role case normalization、ref double-slash collapse。与已实现的 nonce/identity autofill 哲学一致。
