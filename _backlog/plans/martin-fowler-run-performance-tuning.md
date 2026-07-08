# Plan: martin-fowler run 性能调优 — 消除 delegated 契约漂移的修复循环

> **状态：待 review（未批准，勿实施）**
> 来源：`dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run 的 profiling 复盘。
> 用户已定方向：① 优先「治卡（contract）」；② 研究成本「只提速不降覆盖」。
> **与 [`martin-fowler-run-bugfix-change-split.md`](martin-fowler-run-bugfix-change-split.md) 有重叠**：那份从 bug 修复角度切分 BUG-066~070；本份从**性能**角度切入同一批根因，并额外加 `dry-submit` 预检、抓取并行、phase-doc 一致性测试、"floor+余量"抓取策略。**建议 review 时二选一合并**：要么把本份的性能增量并入 bugfix-split 的 Change 1，要么单独成一个 change。下文按"单独一个 change"写。

> **覆盖标注图例**（相对 [`bugfix-change-split`](martin-fowler-run-bugfix-change-split.md) 两 change）：✅ 全覆盖 ｜ 🟡 半覆盖（点名缺口）｜ ❌ 未覆盖。**C1**=`stabilize-agent-facing-work-unit-contracts`，**C2**=`align-gate-contracts-and-reference-navigation`。
> **一句话结论**：真正的性能差集 = **D（dry-submit）、E（抓取并行）、以及 B(i)/C3 的更强预防/回归网**；A/C1/C2 已被 bugfix-split 全覆盖，B(ii) 被两 change 显式排除。

---

## Context — 为什么做这个

对刚跑完的 martin-fowler run（**~128 min**）做了 profiling（`_logs/run.log` + `rb_trace.jsonl` 逐事件算时间）：

| 桶 | 估算 | 性质 |
|----|------|------|
| 真实网页研究（sub-agent 并行） | ~40–46 min | 合法，可机制提速 |
| **契约漂移的"卡"（诊断+修复）** | **~25–30 min** | ⚠️ 可消除，每次 run 都付、修一次永久受益 |
| 报 bug 岔路（用户要求） | ~15–20 min | 独立任务，干净跑没有 |
| HITL 等待 | ~9–11 min | 合法 |
| 正常编排+写作 | ~20 min | 合法 |

**硬数据**：12 次 `work_unit_submit_rejected` + 4 次 gate 首过失败（hitl1/setup/wave1/wave2）。拒绝本身亚秒级（两簇 12:34 / 13:05）；**贵的是拒绝之间读 Engine 源码逆向真实契约**（idle 窗口 603s / 741s / 984s）。

**机理**：`engine/work-unit-envelope.mjs:49` 的 `resultSchemaDocument(manifest)` **手搓、不分 kind、无视它已收到的 `manifest.output_contract`**，emit 一个比真实 `.strict()` validator 更松且自相矛盾的 schema。对应 BUG-066/067/068/069。

**目标**：delegated work-unit **首次 submit 即通过、gate 首过即过**，把 ~25–30 min/run 的逆向修复清零；顺带机制提速抓取。

**治理约束**：`DPT_FRAMEWORK/` 只读到 `/opsx:apply`，改动走 OpenSpec propose→apply；禁新依赖（仅 `zod`/`yaml`）；测试在 repo-root `tests/`（`node:test`+`node:assert`）。

---

## Work item A — emitted schema 从 contract 派生（最高 ROI）

> **覆盖**：✅ 全覆盖 — **C1** `stabilize-agent-facing-work-unit-contracts`。emitted schema 从 `output_contract` 派生正是 C1 核心：wave0/2 省略 `source_claims`/`accepted_source_urls`、wave1 严格 6-key item、`output_files[].role` enum 对齐 allowed_roles，逐条对应。A 的「共享常量单一真相源」是本份的实现选择，C1 只要求结果不要求该结构。

`engine/work-unit-envelope.mjs` → `resultSchemaDocument(manifest)`（:49-69）重写为读 `manifest.output_contract`：
- **source_claims / accepted_source_urls**：仅 `oc.source_claims?.allowed === true`（wave1）才作 property；wave0/wave2 **省略**（顶层 `additionalProperties:false` → 遵循 schema 的 sub-agent 不会 emit → 满足 `validateSourceClaims`（`engine/work-unit-validation.mjs:303-305`）禁令）。允许时 `source_claims.items` = 严格 6-key。
- **output_files.items**：从 `oc.output_files` 派生 → `required:[path,role]`、`role:{enum: allowed_roles}`、`reference_requires_source_url` 用 `if/then`。**不能比 engine 更严**（engine item 是非 strict `z.object`）——`additionalProperties` 保持宽松。
- **required** 从 `oc.required_result_fields` 派生（补 `summary`）。

**单一真相源**：`schema/contracts/work-unit.mjs` 新增 `WORK_UNIT_SOURCE_CLAIM_KEYS` + `sourceClaimItemsJsonSchema()`，让 `WorkUnitSourceClaimSchema`（:201-208）与 envelope 都引用，测试断言 key 集一致。

**JSON-Schema 表达不了的跨字段规则**（`source_ref∈output_files`、`cache_trail↔URL`、文件存在）留在 imperative validators + `taskMarkdown`（:167-183）"## Output Contract" 明写「schema-valid ≠ submit-valid」。

**测试** `tests/engine/work-unit-envelope-schema.test.mjs`。

## Work item B — 关闭 Wave1 role 陷阱

**B(i)（主）**：

> **覆盖**：🟡 半覆盖 — 目标（Wave1 必需产出以 gate 可见 role 落 ledger）由 **C2** 的 Wave1 output coverage 覆盖，但**机制不同**：C2 用 submit 时确定性 role 归一化兜底，本份走预防（emit `role.enum` + 文档绑定 path→role 让首次 submit 就对）。缺：emission/文档侧 path→role 绑定与 `subagent-dpt-evidence-extractor.md` 改动 C2 未点名；且依赖 A（C1）先 emit role.enum。

A emit `role.enum` 后，在 schema + `taskMarkdown`（:173-178）+ `subagent-dpt-evidence-extractor.md`（:228、:230-243）明写 **path→role 绑定**：`evidence-summary.md→evidence_summary`、`question-list.md→question_list`、`reference/*.md→reference`，`other` 仅留无类型附件 → 首次 submit 满足 gate coverage selector `[reference,evidence_summary,question_list]`。**不要**把 `other` 加进 selector。

**B(ii)（可选，有 ledger-rewrite 风险，标 optional）**：

> **覆盖**：❌ 未覆盖 — **C1 与 C2 均显式排除** submitted-ledger 元数据改写（C1 out-of-scope、C2「Do not add a general submitted-ledger amend path」）。

`engine/work-unit-submit.mjs:315-323` 放松为允许**仅 role 变化**的 `metadata_only_relabel` 重提（其余 byte-identical、事务化、发 `work_unit_submit_relabeled`）。不做则回退"新开 supplementary unit"。

## Work item C — 修文档漂移 + phase-doc 一致性测试

- **C1** `phase-seed-topics.md`：task card(:61) + result 模板(:223-224) `"work_id"`→`"queue_item_id"`（BUG-067）。
- **C2** `phase-wave1.md:158`：depth-review 例去尾斜杠（`wave-depth-contracts.mjs:378` 精确匹配 ledger `work_unit_ref`——BUG-068）。
- **C3** 新 `cli/validate-phase-contracts.mjs`：解析 `workflows/nodes/phases/*.md` 内联 json/yaml 例块，占位替换后 `safeParse` 到 `QueueDemandItemSchema`/`QueueResultSchema`/`WorkUnitResultSchema`/depth-review/finding-index（BUG-069 要的回归网）。测试 `tests/integration/cli/validate-phase-contracts.test.mjs`。

## Work item D — dry-submit 预检

- **D1** 新 `engine/work-unit-preflight.mjs` → `dryValidateWorkUnitResult()`：**只读**、累积**全部**违规（`readAndValidateResult`、`validateOutputFiles`、`validateSourceClaims`、`validateCacheTrails(...,{record:null})`——`record:null` 保证不写 `page.md`），复用 `reasonCodeForSubmit`。
- **D2** `cli/operate-work-unit.mjs` 加 `dry-submit` 子命令（barrel re-export）→ 一次报全违规，N 次 gate 往返压成一次批量修。测试 `tests/integration/cli/operate-work-unit-dry-submit.test.mjs`。

## Work item E — 机制提速抓取（只提速不降覆盖）

**不动** `schema/research-styles/exploratory_map.json` floors。只改散文：
- `subagent-dpt-source-intake.md` §5(:149-158)、`subagent-dpt-evidence-extractor.md` §5(:256-264)：降级链是**单 URL 内**逐级 fallback；**不同 URL 并行/分批抓**（当前串行是每 agent 12–15 页顺序抓的直接原因）。
- `phase-wave0.md`/`phase-wave1.md` intake 段：读 profile floor，抓 **floor + 小余量**，删高于 floor 的硬编码 aim（本次 run 我提示"aim 12"超射 floor 10——纯策略浪费）。
- 可选：`validate-work-unit-hygiene.mjs` 加 pattern flag 未绑 profile 的硬编码抓取数。

---

## OpenSpec 打包（一个 change，四能力，仿已存档先例）

仿 `openspec/changes/archive/2026-07-08-stabilize-work-unit-submit-and-gate-handoff/`（DEW/QIV/CPT/GSK 打成一个 change）。slug：`harden-delegated-contract-emission-and-preflight`：
- **delegated-work-units**（DEW-013+）：emitted schema SHALL 从 `output_contract` 派生且不比 strict validator 更严；(可选) metadata-only relabel；read-only `dry-submit` 报全违规不消耗单元。
- **queue-input-validation**（QIV-006）：phase-doc 例块 SHALL 通过当前 schema 校验。
- **cli-phase-transition**（CPT-009）：phase 模板 SHALL 用 `queue_item_id`、无尾斜杠 ref。
- **gate-skeleton**（GSK-011）：Wave1 typed-output 覆盖 SHALL 由 emitted contract 引导首次 role 标注满足（保持 selector typed）。
- E 纯散文，并入 tasks 文档更新。
新 ID 登记 `openspec/governance/req-registry.yaml`。

---

## Verification（证明"卡"消失）

1. `node --test tests/engine/work-unit-envelope-schema.test.mjs tests/integration/cli/operate-work-unit-dry-submit.test.mjs tests/integration/cli/validate-phase-contracts.test.mjs`（+ B(ii) 则加 relabel 测试）。
2. `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` + `node DPT_FRAMEWORK/cli/validate-phase-contracts.mjs DPT_FRAMEWORK/workflows/nodes/phases/*.md`（exit 0）。
3. `node openspec/governance/check-project-reqs.mjs` + `check-project-specs.mjs` 全 0。
4. **Disposable E2E**（`dpt_disp_*` 真跑 wave0→wave2）：
   - `grep -c 'work_unit_submit_rejected' <bundle>/_logs/run.log` → **0**（本次 12）
   - `grep 'gate_attempt' <bundle>/_logs/run.log | grep -c '"passed":false'` → **0**（本次 4）
   - 每次真 submit 前 `dry-submit` 返回 `ok:true`。

---

## Risks

- **emitted schema 比 engine 更严**：output_files.items 保持宽松、只"省略"被禁字段；A 的 negative test 兜底。
- **旧 bundle 兼容**：A 只在 claim/envelope-write 生效，已写文件与已提交 ledger 不受影响，无迁移。
- **B(ii) 改写终态 ledger 行**：与 DEW-010 drift 检测冲突风险，限死"仅 role、事务化、独立事件"并标 optional。
- **`validate-phase-contracts.mjs` 占位替换**：`{topic.slug}`/`<work_id>` 换 schema-合法 stand-in，`work_id`→`queue_item_id` 映射，避免误报。

## Critical Files
- `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`（A/B）
- `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`（A：共享常量）
- `DPT_FRAMEWORK/engine/work-unit-submit.mjs`（B(ii) 可选）
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs` + 新 `engine/work-unit-preflight.mjs`（D）
- 新 `DPT_FRAMEWORK/cli/validate-phase-contracts.mjs`（C）
- `DPT_FRAMEWORK/workflows/nodes/phases/{phase-seed-topics,phase-wave1,phase-wave0}.md` + `subagent-dpt-{source-intake,evidence-extractor}.md`（C1/C2/E）
- `openspec/changes/harden-delegated-contract-emission-and-preflight/` + `openspec/governance/req-registry.yaml`
