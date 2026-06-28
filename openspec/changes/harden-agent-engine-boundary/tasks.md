> **Implementation rhythm**: 每个 stage 完成后暂停，等待 review 通过再继续下一个 stage。Stage 之间的 `⏸️ CHECKPOINT` 标记处必须停下来。提交由 ethanmac 负责，实现过程中不要自行 commit。

## Stage 0: Governance Preflight

Goal: confirm the change artifacts and requirement registry are valid before implementation starts.

- [x] 0.1 更新 `openspec/governance/req-registry.yaml`：登记 AGO、GAC、EXR、AGQ、TRW、RWG 相关新增/修改 requirement IDs
- [x] 0.2 Run OpenSpec validation before Stage 1: `openspec validate harden-agent-engine-boundary --strict`
- [x] 0.3 Run governance spec check before Stage 1: `node openspec/governance/check-project-specs.mjs`
- [x] 0.4 Run governance req check before Stage 1: `node openspec/governance/check-project-reqs.mjs`

### Stage 0 Verification

Required commands:

- `openspec validate harden-agent-engine-boundary --strict`
- `node openspec/governance/check-project-specs.mjs`
- `node openspec/governance/check-project-reqs.mjs`

Pass/fail criteria:

- PASS only if all three commands exit 0.
- FAIL if any delta spec lacks a registered requirement, any registry entry points at a missing requirement, or OpenSpec strict validation reports an artifact/schema error.

Exit criteria:

- Stage 1 MUST NOT start until Stage 0 verification passes.

## Stage 1: Relay Declaration Contract

Goal: make the Relay slot result itself trustworthy before queue completion consumes it.

- [x] 1.1 实现共享 `AgentOutputDeclarationSchema`：`output_files[]`（path/role/source_url/source_slug）和 `cache_trails[]`（bundle-relative leaf source directories），`role=reference` 时 `source_url` 必填
- [x] 1.2 扩展 `DPT_FRAMEWORK/engine/subagent-relay.mjs` 的 `SlotResult` Zod schema，要求包含 `output_files[]` 和 `cache_trails[]`
- [x] 1.3 同步更新 generated `result.schema.json` / `resultJsonSchemaForSlot()`，确保 JSON Schema 与 Zod schema 都包含新字段且 `additionalProperties: false` 不丢字段
- [x] 1.4 更新 `commitSlotResult()`：写入 committed slot `result.json` 前验证声明字段；非法 role、reference 缺 `source_url`、越界 path 均 reject
- [x] 1.5 新增/导出 pure `validateRuntimeReceipt(slot, bundleDir)` helper：不要求 runtimeAgentId、不写 trace，只校验 receipt 文件、`agent_runtime_started` / `agent_result_ready`、slotKey、roleAgentKey、receiptNonce
- [x] 1.6 更新 `ingestAgentReceipt()` / `collectAndMergeSubagentResults()`：返回 committed slot result ref、runtime receipt ref、`output_files[]`、`cache_trails[]`，供 queue complete 使用
- [x] 1.7 Add/extend relay/schema tests for valid declarations, invalid roles, missing `source_url`, path escape, schema sync, missing receipt events, nonce mismatch, and slot mismatch

### Stage 1 Verification

Required commands/test files:

- `node --test tests/engine/subagent-relay.test.mjs`
- `node --test tests/schema/contracts/queue.test.mjs tests/schema/contracts/trace.test.mjs`

Pass/fail criteria:

- PASS only if SlotResult Zod schema and generated JSON Schema both require/preserve `output_files[]` and `cache_trails[]`.
- PASS only if `commitSlotResult()` accepts legal declarations and rejects illegal role, `role=reference` without `source_url`, and bundle-escaping paths before writing committed `result.json`.
- PASS only if pure runtime receipt validation rejects missing `agent_runtime_started`, missing `agent_result_ready`, nonce mismatch, and slot mismatch.
- FAIL if any relay validation depends on `--actor`, runtimeAgentId side effects, or trace-writing side effects.

Exit criteria:

- Relay result validation is trusted: downstream code can consume a committed slot result knowing declaration shape and runtime receipt binding were independently checked.
- Stage 2 MUST NOT start until Stage 1 verification passes.

---

> ⏸️ **STAGE 1 CHECKPOINT — STOP HERE.** 完成 Stage 1 所有任务且 verification pass 后，暂停等待 review。review 通过后再继续 Stage 2。不急着提交，提交由我来做。

---

## Stage 2: Delegated Queue Completion + Ledger

Goal: make delegated `complete()` the Engine boundary that turns Relay provenance into a bundle-level declaration ledger.

- [x] 2.1 扩展 `QueueResultSchema` 和 `DPT_FRAMEWORK/cli/operate-queue.mjs complete`：`--result` JSON 可传递 `slot_result_ref` / equivalent committed slot reference；不要把 `--actor` 字符串作为 delegated completion 证明
- [x] 2.2 在 `DPT_FRAMEWORK/engine/queue-manager.mjs complete()` 中识别 delegated task：`targets.delegates.to === "sub-agent"`
- [x] 2.3 delegated `complete()` 要求 committed relay slot result ref；缺失、未提交、schema invalid 均 reject
- [x] 2.4 delegated `complete()` 使用 Stage 1 pure receipt validation helper 校验 runtime receipt：同 slot 下 receipt 存在，包含 `agent_runtime_started` 与 `agent_result_ready`，且与 slotKey/roleAgentKey/receiptNonce 绑定
- [x] 2.5 delegated `complete()` 校验 `output_files[]`：字段存在，声明路径为 bundle-relative，文件逐项存在，标准 receipt/writes 与声明一致
- [x] 2.6 delegated `complete()` 校验 `cache_trails[]`：每项必须是 `_cache/` leaf source directory，且直接包含 `websearch.json`、`page.md`、`meta.json`
- [x] 2.7 非 delegated task 保持现有 completion receipt 行为，不要求 relay provenance 或 cache trail
- [x] 2.8 新增 bundle 根 `rb_output_declarations.jsonl` ledger schema / reader / append helper；ledger 只由 Engine 写，Agent 与 playbook 不直接写 production ledger
- [x] 2.9 在 delegated `complete()` 成功校验后 append ledger record（含 work_id、producer_rule、slot_result_ref、runtime_receipt_ref、output_files、cache_trails、declared_at）；失败 completion 不得 append
- [x] 2.10 更新 `DPT_FRAMEWORK/cli/validate-bundle.mjs`：允许并校验 `rb_output_declarations.jsonl`；校验每行 schema、bundle-relative path、不越界
- [x] 2.11 更新 bundle templates / docs，声明 ledger 是 gate 发现 Agent 产物的唯一读取面
- [x] 2.12 保持 `TargetSpecSchema.controller` enum 为 `main-agent | engine`；schema tests 覆盖 delegated task 使用 `controller: "main-agent" + delegates.to: "sub-agent"` 通过
- [x] 2.13 schema tests 明确 `controller: "sub-agent"` 当前不支持并应被拒绝，除非未来另有 accepted spec
- [x] 2.14 更新 `phase-wave0.md` / `phase-wave1.md` delegated task 模板：不要改 controller；保留 `controller: "main-agent"`，保留 `delegates.to: "sub-agent"`，并在 action/prompt 中要求 Sub-agent 返回声明
- [x] 2.15 更新 Phase Agent 流程说明：claim 返回 delegated task 后必须 spawn Sub-agent via Relay、collect committed result、再调用 delegated `complete()`；Phase Agent 不直接执行 WebSearch/WebFetch
- [x] 2.16 新建 `DPT_FRAMEWORK/cli/validate-phase-templates.mjs`：解析 phase MD task card 模板，验证搜索/深挖模板保持 `controller: "main-agent"` + `delegates.to: "sub-agent"` + role_key 正确
- [x] 2.17 更新 `DPT_FRAMEWORK/COMMANDS.md` 注册 `validate-phase-templates.mjs`
- [x] 2.18 ~~实现 `experiments_playbook/exp_ref_integrity/case-16-light-complete-cache-rejection.md`~~ → 已由 `tests/engine/queue-manager.test.mjs` `Delegated queue completion (Stage 2)` suite 覆盖（7 个子测试覆盖所有 reject/accept 场景）
- [x] 2.19 ~~case-16 必须走真实 `operate-queue complete` / `queue-manager.mjs complete()` 路径~~ → unit tests 直接调用 `complete()`，路径等价

### Stage 2 Verification

Required commands/test files:

- `node --test tests/schema/contracts/queue.test.mjs`
- `node --test tests/engine/queue-manager.test.mjs tests/integration/cli/operate-queue.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs`
- `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs`

Pass/fail criteria:

- PASS only if delegated `complete()` rejects missing slot result, uncommitted/invalid slot result, missing runtime receipt, invalid receipt binding, missing declaration, missing `cache_trails[]`, missing declared output file, and cache leaf missing any of `websearch.json`, `page.md`, `meta.json`.
- PASS only if non-delegated `complete()` still follows existing receipt behavior and does not require relay/cache provenance.
- PASS only if `rb_output_declarations.jsonl` is appended exactly after delegated completion succeeds and is not appended for rejected attempts.
- PASS only if schema/template validation accepts `controller: "main-agent" + delegates.to: "sub-agent"` and rejects `controller: "sub-agent"`.
- FAIL if any delegated completion can pass using only `--actor`, directory shape, or a hand-written ledger row.

Exit criteria:

- Delegated completion rejects all missing-provenance cases and appends the ledger only on success.
- Stage 3 MUST NOT start until Stage 2 verification passes.

---

> ⏸️ **STAGE 2 CHECKPOINT — STOP HERE.** 完成 Stage 2 所有任务且 verification pass 后，暂停等待 review。review 通过后再继续 Stage 3。不急着提交，提交由我来做。

---

## Stage 3: Ledger-Driven `content_dedup` Gate

Goal: make `content_dedup` consume only completed declarations, not whatever files happen to be present on disk.

- [x] 3.1 实现 `tokenizeForSimilarity(text)`：中文 bigram + 英文 word tokenization
- [x] 3.2 实现 `jaccardSimilarity(tokensA, tokensB)`
- [x] 3.3 实现 `extractSection(mdContent, sectionName)` 与 `parseReferenceMetadata(refPath)`
- [x] 3.4 实现 `readOutputDeclarations(bundlePath)`：从 `rb_output_declarations.jsonl` 读取已完成声明，过滤 `role=reference`
- [x] 3.5 实现 `checkContentDedup(bundlePath, options)`：只消费 declaration ledger，不扫描 `reference/` 发现输入；执行 URL dedup、homepage detect、self-ref detect、Jaccard clone
- [x] 3.6 实现 orphan/contamination 报告：磁盘上未声明 reference 不得计入 pass 条件（ledger-driven 天然实现，未声明 reference 不会进入 pass 输入集）
- [x] 3.7 更新 `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json` 和 `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json`，加入 `content_dedup` 规则和 threshold 配置
- [x] 3.8 补 schema/validation tests，确保 object threshold 对 `content_dedup` 合法、`count_floor` threshold 仍为 number
- [x] 3.9 更新 `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs` / `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs` dispatch：`content_dedup` 调用 `checkContentDedup(bundlePath, rule.threshold)`
- [x] 3.10 ~~case-17 playbook~~ → 已由 `tests/engine/helpers/gate-helpers.test.mjs` `checkContentDedup` suite 覆盖（8 测试：missing ledger、URL dup、homepage、self-ref、Jaccard clone、clean pass + tokenization/extractSection 单元测试）
- [x] 3.11 ~~case-17 Reality Distance Ledger~~ → unit tests 直接从 ledger 读取，不扫描 reference/ 发现输入

### Stage 3 Verification

Required commands/test files:

- `node --test tests/engine/helpers/gate-helpers.test.mjs`
- `node --test tests/schema/contracts/gate.test.mjs tests/schema/gate-definition-threshold-source.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs`

Pass/fail criteria:

- PASS only if `content_dedup` fails closed when `rb_output_declarations.jsonl` is missing or empty.
- PASS only if URL duplicate, homepage URL, self-referential Key Facts, and Jaccard clone scenarios fail with inspect/advice pointing at declared files.
- PASS only if orphan `reference/*.md` files that are not present in the ledger cannot satisfy pass conditions; contamination may be reported, but orphan files must not enter the input set.
- PASS only if clean declared references pass.
- FAIL if any gate code scans `reference/` to discover pass inputs.

Exit criteria:

- Orphan references cannot help the gate pass, and clean declared references do pass.
- Stage 4 MUST NOT start until Stage 3 verification passes.

---

> ⏸️ **STAGE 3 CHECKPOINT — STOP HERE.** 完成 Stage 3 所有任务且 verification pass 后，暂停等待 review。review 通过后再继续 Stage 4。不急着提交，提交由我来做。

---

## Stage 4: Trace Unification + Documentation Sync

Goal: move every touched runtime/playbook trace writer, reader, and contract to the single bundle-root trace sink `rb_trace.jsonl`; no compatibility fallback or alternate trace JSONL remains current.

- [x] 4.1 改 `DPT_FRAMEWORK/engine/queue-manager.mjs` trace path 为 `rb_trace.jsonl`
- [x] 4.2 改 `DPT_FRAMEWORK/engine/subagent-relay.mjs` trace path 为 `rb_trace.jsonl`
- [x] 4.3 改 `experiments_env/shared/wff-playbook-utils.mjs` 默认 trace path / JSDoc 为 `rb_trace.jsonl`
- [x] 4.4 简化 `DPT_FRAMEWORK/cli/inspect-bundle.mjs --timeline`：trace events 只读 `rb_trace.jsonl`，`_logs/run.log` 仅作为 process log context；移除 `[queue]` / `[subagent]` sink 标签与旧 trace fallback
- [x] 4.5 批量更新实验 playbook trace 路径：`$B/_logs/_trace.jsonl` → `$B/rb_trace.jsonl`
- [x] 4.6 同步更新 accepted specs 中 runtime trace 与 experiment verdict trace 的路径说明，避免保留 `_trace.jsonl` 作为 verdict truth 的旧合同
- [x] 4.7 更新 playbook schema/tests、`experiments_playbook/README.md`、`experiments_playbook/RUN_EXPS.md` 路径引用
- [x] 4.8 更新 trace 说明文档与模板：`DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`、`DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md`、`DPT_FRAMEWORK/rb_templates/_logs/README.md.tmpl` 不再描述任何非 `rb_trace.jsonl` 的 trace JSONL 为当前、兼容或备用 trace sink
- [x] 4.9 执行 repo-wide trace cleanup pass：用 `rg` 扫描 `DPT_FRAMEWORK`、`experiments_env`、`experiments_playbook`、`openspec/specs`、`tests` 中的旧 `_logs/_trace*`、`_trace_agq_cli`、`_trace_subagent` 引用；所有当前代码、tests、playbook、README、accepted specs、MD docs 必须改为 `rb_trace.jsonl` 或删除旧路径概念
- [x] 4.10 更新 `shared-subagent-protocol.md`：新增 Agent Output Declaration schema 表格；说明 result.json、runtime receipt、ledger、complete()、gate 的职责分工
- [x] 4.11 更新 `phase-wave0-subagent.md`：返回 JSON 必须包含 `output_files[]` 和 leaf `cache_trails[]`；prompt 可给 parent cache dir，但 result 必须声明实际 `sNN_*` leaf；role 包含 `source_yaml` / `reference`
- [x] 4.12 更新 `phase-wave1-subagent.md`：返回 JSON 必须包含声明；evidence-summary/question-list/reference 与 role enum 对齐
- [x] 4.13 更新 `shared-anti-cheating-rules.md`：新增禁止遗漏 `output_files[]`、禁止遗漏 `cache_trails[]`、禁止绕过 Relay provenance 的规则
- [x] 4.14 更新 `guidelines/agentic-subagent-mechanism.md`：result archetype、slot structure、authority boundary、runtime receipt、MUST rules、Queue×Relay 集成均加入声明/ledger/provenance
- [x] 4.15 更新 `guidelines/agentic-queue-mechanism.md`：complete() 从 receipt check 扩展为 relay provenance + declaration + cache leaf 校验；明确 Sub-agent 不直接 claim/mutate queue
- [x] 4.16 更新 `guidelines/command-experiments.md`：Agent Output Declaration 从 future-facing 改为 current；light fixture 通过 schema + production path 后只证明 Engine 表面；目录扫描发现 Agent 产物列为 anti-pattern
- [x] 4.17 在 wave2 docs 仅埋 future TODO marker，不把 wave2 纳入当前 declaration enforcement scope

### Stage 4 Verification

Required commands/test files:

- `node --test tests/engine/trace.test.mjs tests/engine/queue-manager.test.mjs tests/engine/subagent-relay.test.mjs`
- `node --test tests/schema/contracts/playbook.test.mjs tests/schema/contracts/trace.test.mjs tests/integration/cli/inspect-bundle.test.mjs tests/integration/cli/validate-playbook.test.mjs`
- `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook`
- `rg '(_logs/_trace|_trace_agq_cli|_trace_subagent)' DPT_FRAMEWORK experiments_env experiments_playbook openspec/specs tests`

Pass/fail criteria:

- PASS only if queue, relay, gate attempts, and playbook verdict checks write/read trace events only from `rb_trace.jsonl`.
- PASS only if `inspect-bundle.mjs --timeline` reads trace events only from `rb_trace.jsonl`; `_logs/run.log` may be read only as process log context, not as trace truth.
- PASS only if playbook schema/tests, README/RUN_EXPS, accepted specs, shared docs, and bundle log template no longer describe any non-`rb_trace.jsonl` trace JSONL as current, compatible, fallback, or alternate trace surface.
- PASS only if the `rg` command finds no remaining old trace-path references in current code, tests, playbooks, README/RUN_EXPS, accepted specs, or MD docs under the scanned paths.
- FAIL if code writes, reads, or expects any trace JSONL other than bundle-root `rb_trace.jsonl`.

Exit criteria:

- No updated path writes, reads, expects, or describes any trace JSONL except bundle-root `rb_trace.jsonl`.
- Stage 5 MUST NOT start until Stage 4 verification passes.

---

> ⏸️ **STAGE 4 CHECKPOINT — STOP HERE.** 完成 Stage 4 所有任务且 verification pass 后，暂停等待 review。review 通过后再继续 Stage 5。不急着提交，提交由我来做。

---

## Stage 5: Agent↔Engine Boundary Experiments

Goal: prevent regression of Bug #001 (fake reference gate bypass) and Bug #002 (Phase Agent bypassing Sub-agent) through cross-layer integration experiments that exercise real Engine CLI paths against real filesystem state. All experiments are fixture-backed (no external Agent calls).

Experiments live in `experiments_playbook/exp_engine-boundary/`.

- [x] 5.1 实现 `case-401-light-full-boundary.md`：正向全链路 — fixture slot result → delegated `complete()` → ledger append → `validate-bundle` → gate `content_dedup` pass → `rb_trace.jsonl` 验证
- [x] 5.2 实现 `case-402-light-complete-reject.md`：`complete()` reject 场景 — 缺 `slot_result_ref`、缺 runtime receipt、缺 `output_files[]`、缺 cache file、nonce mismatch 均被拒绝
- [x] 5.3 实现 `case-403-light-gate-content-dedup.md`：`content_dedup` gate — URL duplicate fail、Jaccard clone fail、homepage URL fail、self-referential fail、clean pass、ledger missing fail closed、orphan reference 不计入 pass
- [x] 5.4 实现 `case-404-standard-queue-boundary.md`：Queue 边界合约 — non-delegated `complete()` 保持原行为；delegated 强制要求 provenance；`controller: "sub-agent"` 被 schema 拒绝
- [x] 5.5 在空环境运行 case-401~404，确认全部 verdict PASS
- [x] 5.6 跑 full regression：`node --test tests/`
- [x] 5.7 跑 final OpenSpec/governance validation：`openspec validate harden-agent-engine-boundary --strict`、`node openspec/governance/check-project-specs.mjs`、`node openspec/governance/check-project-reqs.mjs`
- [x] 5.8 跑 `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary` 和 `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs`

### Stage 5 Verification

Required commands/test files:

- `openspec validate harden-agent-engine-boundary --strict`
- `node openspec/governance/check-project-specs.mjs`
- `node openspec/governance/check-project-reqs.mjs`
- `node --test tests/`
- `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`
- `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs`
- Test files/playbooks executed exactly per `experiments_playbook/RUN_EXPS.md`:
  - `experiments_playbook/exp_engine-boundary/case-401-light-full-boundary.md`
  - `experiments_playbook/exp_engine-boundary/case-402-light-complete-reject.md`
  - `experiments_playbook/exp_engine-boundary/case-403-light-gate-content-dedup.md`
  - `experiments_playbook/exp_engine-boundary/case-404-standard-queue-boundary.md`

Pass/fail criteria:

- PASS only if final OpenSpec/governance checks exit 0.
- PASS only if full regression exits 0.
- PASS only if every case 201-204 playbook verdict is PASS from `rb_trace.jsonl` and gate JSON.
- PASS only if all experiments are fixture-backed, use real Engine CLI paths, and declare no external Agent calls.
- PASS only if disposed bundles from cases 201-204 validate and contain expected `rb_output_declarations.jsonl` (where applicable), cache leaves, and `rb_trace.jsonl`.
- FAIL if any experiment uses hand-written ledger rows, direct queue mutation, or directory scanning to make gates pass.

### Bug Regression Coverage

| Bug | 防范措施 | 对应实验 |
|-----|---------|---------|
| #001 假 reference 绕过 gate | `content_dedup` 从 ledger 读取，不扫描目录；URL/Jaccard/homepage/self-ref 检测 | case-403 |
| #001 假 reference 绕过 gate | 完整链路 ledger → gate 数据流验证 | case-401 |
| #002 Phase Agent 绕过 Sub-agent | `complete()` 强制要求 slot_result_ref + runtime receipt | case-402 |
| #002 Phase Agent 绕过 Sub-agent | `controller: "sub-agent"` 被 schema 拒绝 | case-404 |

Exit criteria:

- The full boundary hardening change is ready to consider apply-complete/archive only after all prior stage verifications and Stage 5 verification pass.

---

## Stage 6: Spec/Experiment Tightening Addendum

Goal: repair the remaining planning drift without rewriting completed task history. Earlier checked tasks remain historical; this stage supersedes stale case names, old experiment paths, and non-current trace wording before any further implementation edits are made.

Execution guard: Stage 6 is planning-artifact tightening only. Do not start Stage 7 implementation tasks until Stage 6 has been reviewed. Stage 6 and Stage 7 are the authoritative record of post-Stage-5 quality drift; do not reinterpret Stage 1-5 checked tasks as apply-ready proof.

- [x] 6.1 Tighten the change artifacts themselves: update `proposal.md`, `design.md`, and change specs so they consistently describe `experiments_playbook/exp_engine-boundary/` case-401 through case-406, with no `exp_ref_integrity` / case-12~17 / case-16~17 current-contract content left in `openspec/changes/harden-agent-engine-boundary/specs/`.
- [x] 6.2 Add explicit current-contract cleanup requirements for trace and experiment wording: bundle-root `rb_trace.jsonl` is the only trace JSONL sink, and playbook verdict events use `event: "check"` only.
- [x] 6.3 Review checkpoint: confirm Stage 6 artifacts and the Stage 7 task boundary are acceptable before Stage 7 implementation begins. This remains unchecked until review explicitly accepts the findings, allowed edit surface, and verification plan below.

### Stage 6 Verification

Required commands/test files:

- `openspec validate harden-agent-engine-boundary --strict`
- `rg 'exp_ref_integrity|case-1[2-7]|case-16|case-17|legacy/current files|temporary compatibility|older event|legacy compatibility|_logs/_trace|_trace_agq_cli|_trace_subagent|rbrb_trace' openspec/changes/harden-agent-engine-boundary/proposal.md openspec/changes/harden-agent-engine-boundary/design.md openspec/changes/harden-agent-engine-boundary/specs`

Pass/fail criteria:

- PASS only if change specs contain no stale `exp_ref_integrity`, case-12~17, or case-16~17 current-contract experiment content for this boundary change.
- PASS only if Stage 6 artifacts define current trace truth as bundle-root `rb_trace.jsonl` and verdict truth as `event: "check"` without adding implementation work outside Stage 7.

### Stage 6 Review Status

Current artifact checks have passed, but review is not complete:

- `openspec validate harden-agent-engine-boundary --strict` exits 0.
- The Stage 6 stale-pattern `rg` check returns no matches against the change artifacts.
- 6.3 remains open because the review must still accept the Stage 7 task boundary before any implementation cleanup begins.

Review findings that Stage 7 must address:

- `experiments_playbook/RUN_EXPS.md` already lists case-405 and case-406, but `experiments_playbook/exp_engine-boundary/` currently contains only case-401 through case-404.
- Current accepted/docs/code cleanup surfaces still contain old trace or verdict terminology such as `rbrb_trace`, legacy `verify` alias handling, or stale trace compatibility wording; Stage 7 must remove only current-contract drift, not unrelated historical taxonomy.
- case-403 must prove the production downstream path for every non-missing-ledger scenario: fixture SlotResult -> `commitSlotResult()` -> delegated `operate-queue complete` -> Engine-appended ledger -> real gate. Hand-written ledger rows are not acceptable proof for those scenarios.
- case-401, case-402, and case-404 verdicts must be backed by real command outcomes and trace `check` events, not by trace events that merely restate expected behavior after the fact.
- All updated playbooks must keep cleanup PASS-only; FAIL preserves the disposable bundle for diagnosis.

Exit criteria:

- Stage 7 MUST NOT start until Stage 6 verification and review pass.

---

## Stage 7: Implementation Cleanup + Experiment Completion

Goal: execute the Stage 6-approved cleanup and experiment additions with narrow file scopes and local verification after each slice. Stage 7 is the active corrective layer for all post-Stage-5 quality drift, including historical Stage 5 wording that no longer reflects the apply-ready bar.

Scope guard for the future implementer: Stage 7 may edit the non-change files named in each task, but only after 6.3 review passes. This review-adjustment pass edits only `openspec/changes/harden-agent-engine-boundary/`. Stage 7 supersedes any stale Stage 5 readiness language for apply/archive decisions, but must not rewrite completed Stage 1-6 history or broaden into unrelated refactors, renames, taxonomy cleanup, or opportunistic docs churn.

- [ ] 7.1 Implement the approved trace/term cleanup surface from Stage 6 only in these files: `guidelines/command-experiments.md`, `openspec/specs/agent-testing/spec.md`, `DPT_FRAMEWORK/engine/trace.mjs`, `tests/fixtures/DPT_FRAMEWORK/engine/trace.mjs`, `tests/engine/trace.test.mjs`, `DPT_FRAMEWORK/engine/workflow-chain.mjs`, `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`, and `experiments_env/shared/wff-playbook-utils.mjs`. Remove current-contract drift for trace path/verdict terminology only; do not rename unrelated business taxonomy, broad deprecation notes, or historical narrative that is not part of the current contract.
- [ ] 7.2 Tighten `experiments_playbook/exp_engine-boundary/case-401-light-full-boundary.md`, `case-402-light-complete-reject.md`, and `case-404-standard-queue-boundary.md` without changing their proof intent: fix stale case labels and case-ID drift inherited from Stage 5; convert every verdict-affecting command result, file assertion, queue outcome, and schema outcome into `rb_trace.jsonl` `check` events; and keep cleanup PASS-only so FAIL preserves the bundle.
- [ ] 7.3 Tighten `experiments_playbook/exp_engine-boundary/case-403-light-gate-content-dedup.md` so every non-missing-ledger scenario proves the production downstream path: fixture SlotResult -> `commitSlotResult()` -> delegated `operate-queue complete` -> Engine-appended ledger -> real gate. Do not hand-write ledger rows for those scenarios. Orphan reference must be unable to help pass because declaration/ledger input is insufficient.
- [ ] 7.4 Add `experiments_playbook/exp_engine-boundary/case-405-light-trace-single-sink.md`: trigger current trace writing through current framework/playbook trace APIs, verify bundle-root `rb_trace.jsonl`, and fail if any non-canonical trace JSONL exists in the disposable bundle.
- [ ] 7.5 Add `experiments_playbook/exp_engine-boundary/case-406-heavy-real-subagent-boundary.md`: real Sub-agent/WebSearch/WebFetch path produces declaration, cache trail, committed result, delegated completion, ledger, and gate pass; if the real-agent surface is unavailable, record the not-run reason, exact unavailable surface, and Reality Distance Ledger risk without marking the case as passed.
- [ ] 7.6 Update `experiments_playbook/RUN_EXPS.md` after case-405 and case-406 exist so engine-boundary lists case-401 through case-406 consistently and does not list missing playbooks; update playbook validation expectations only if the validator fails on the new playbooks.
- [ ] 7.7 Run static cleanup checks with precise old-trace patterns and scoped old-term checks that do not match valid `rb_trace.jsonl`, unrelated business taxonomy, historical checked task text, or this change's own review history. Include a scoped check that no current trace reader, playbook verdict helper, or updated playbook still treats legacy `verify` events as verdict truth.
- [ ] 7.8 Run final verification: `openspec validate harden-agent-engine-boundary --strict`, governance checks, `node --test tests/`, `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`, `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs`, and case-401 through case-405 execution; case-406 must either pass through the real-agent path or have an explicit not-run record. Do not mark the change apply-ready until these results are recorded.

### Stage 7 Local Verification

Run the local verification for each task before moving to the next task:

- After 7.1: `node --test tests/engine/trace.test.mjs tests/schema/contracts/trace.test.mjs`
- After 7.2: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`, then execute case-401, case-402, and case-404 per `experiments_playbook/RUN_EXPS.md`
- After 7.3: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`, then execute case-403 per `experiments_playbook/RUN_EXPS.md`
- After 7.4: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`, then execute case-405 per `experiments_playbook/RUN_EXPS.md`
- After 7.5: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`; case-406 must either execute through the real-agent path or record why that surface is unavailable
- After 7.6: `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`
- After 7.7: both static cleanup `rg` commands in Stage 7 Verification must return no current-contract matches

### Stage 7 Verification

Required commands/test files:

- `openspec validate harden-agent-engine-boundary --strict`
- `node openspec/governance/check-project-specs.mjs`
- `node openspec/governance/check-project-reqs.mjs`
- `node --test tests/`
- `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_engine-boundary`
- `node DPT_FRAMEWORK/cli/validate-phase-templates.mjs`
- `rg '(^|/)_trace\.jsonl|_logs/_trace|_trace_agq_cli|_trace_subagent|rbrb_trace' DPT_FRAMEWORK experiments_env experiments_playbook openspec/specs tests guidelines openspec/changes/harden-agent-engine-boundary/proposal.md openspec/changes/harden-agent-engine-boundary/design.md openspec/changes/harden-agent-engine-boundary/specs`
- `rg '\b(legacy/current files|temporary compatibility|older event|legacy compatibility)\b' DPT_FRAMEWORK experiments_env experiments_playbook openspec/specs tests guidelines openspec/changes/harden-agent-engine-boundary/proposal.md openspec/changes/harden-agent-engine-boundary/design.md openspec/changes/harden-agent-engine-boundary/specs`
- `rg '\bverify\b|event\s*===\s*["'\'']verify["'\'']|event:\s*["'\'']verify["'\'']' DPT_FRAMEWORK/engine/trace.mjs tests/fixtures/DPT_FRAMEWORK/engine/trace.mjs tests/engine/trace.test.mjs experiments_env/shared/wff-playbook-utils.mjs experiments_playbook/exp_engine-boundary`

Pass/fail criteria:

- PASS only if old trace sinks are absent from current contracts, code, tests, guidelines, accepted specs, and updated playbooks.
- PASS only if case-401 through case-405 use real Engine/runtime paths and all verdict-affecting facts are recorded as `check` events in `rb_trace.jsonl`.
- PASS only if case-406 either passes through a real Sub-agent/WebSearch/WebFetch run or records why that real-agent surface was unavailable.
- PASS only if `experiments_playbook/RUN_EXPS.md` and `experiments_playbook/exp_engine-boundary/` agree on case-401 through case-406 after case-405 and case-406 are added.
- PASS only if legacy `verify` verdict handling is removed from current trace/verdict surfaces covered by 7.1 and updated playbooks.
- PASS only if final OpenSpec/governance checks and full regression pass.

Exit criteria:

- The change can be considered apply-ready only after Stage 7 tasks and verification pass.
