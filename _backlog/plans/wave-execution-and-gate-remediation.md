---
title: Wave execution and gate remediation
status: change_1_archived_change_2_proposed_ready_for_explore
created: 2026-07-23
revised: 2026-07-24
covered_bugs: BUG-100, BUG-101, BUG-102, BUG-105, BUG-107, BUG-108, BUG-109, BUG-110, BUG-111, BUG-112, BUG-113
out_of_scope_bugs: BUG-099, BUG-103, BUG-104, BUG-106 (owned by silent-autonomous-execution.md)
evidence_bundle: dpt_rb_openspec-large-project-maintenance-patterns
---

# Wave Execution And Gate Remediation

## 1. Decision

本文件是 Wave producer、pre-Wave readiness 与 Gate remediation 的自包含 review context，覆盖 11 个 bug：`100--102、105、107--113`。`099、103、104、106` 的静默自主、direct phase entry 与 host liveness 已移入独立的 [Silent Autonomous Execution](silent-autonomous-execution.md) 计划；它们不再是本计划的 change 或 completion dependency。

复核 accepted specs、当前实现、真实 bundle、上一份 closed plan 与全部 `guidelines/` 后，本计划维持 **恰好三个 sequential OpenSpec changes**：

| Order | Fixed OpenSpec change | Bugs | One externally visible capability loop |
|---|---|---|---|
| 1 | `make-pre-wave-readiness-feedback-direct` | 100, 101, 102 | HITL1/seed producer fact -> earliest check -> one legal pre-Wave readiness path |
| 2 | `make-wave-producer-contract-and-closeout-direct` | 105, 107, 108, 111, 112 | authoring contract -> dry-submit/submit -> submitted backing -> Phase-owned closeout -> inspect |
| 3 | `simplify-wave-gate-feedback-and-degradation-policy` | 109, 110, 113 | evaluator findings -> smallest independent repair set -> fail-closed eligible degradation decision |

三个 change 的内部任务可触及多个较小 seam，但每组只拥有一条可验收的 Agent-visible loop。拆开会使同一条正常路径跨多个 active change；合并则不得扩大为 generic controller。

### Execution Progress

- [x] **Change 1 archived**: `make-pre-wave-readiness-feedback-direct` was archived at `openspec/changes/archive/2026-07-24-make-pre-wave-readiness-feedback-direct/` and finalized in commits `0dfa52cad` / `542f7833a`. BUG-100--102 now have deterministic pre-Wave contract, CLI/bundle, and simulated lifecycle proof; the provider-scoped real Agent/search/fetch claim is honestly `NOT_RUN` because this host lacks the configured independent Subject launcher.
- [x] **Change 2 proposed**: `make-wave-producer-contract-and-closeout-direct` now contains proposal, design, four focused delta specs, tasks, and a four-class verification plan for BUG-105, BUG-107, BUG-108, BUG-111, and BUG-112. It is ready for deliberate `/opsx:explore` polishing; no Wave/Gate target surface changes are authorized before its `/opsx:apply`.
- [ ] **Change 3 remains blocked by order**: begin only after Change 2 has archived truthful producer and submitted-backing facts.

已经作出的决定：

1. **BUG-110 改判为错误归因。** Wave1 已有仅允许 `per_topic_ref_md_count_floor` 的窄 degradation path；该 production run 有 queue、provenance、required structure、reference backing 等 ineligible roots，fail closed 正确。Change 3 只把现有语义迁入共享 policy 并用回归锁定，不放宽 Wave1。
2. **BUG-113 是 adapter consistency defect，而不是这次 Wave2 应通过的理由。** `gate-skeleton` 已要求 lifecycle Gate 对 eligible repeated failure 支持 degraded handoff，Wave2 adapter 目前没有该 policy path。Change 3 让三个 Wave adapters 消费同一个 metadata-backed evaluator；Wave2 当前没有 accepted eligible rule，所以此次 failures 仍必须失败。

目标不是让 Gate 容易通过，而是让 Phase Agent 在唯一合法路径上完成真实工作：

```text
direct producer feedback
  -> truthful submitted-backed Phase projection
  -> smallest independent Gate roots
  -> legal handoff only when all non-degradable authority facts pass
```

## 2. Authority And Guideline Context

冲突按以下顺序裁决：

```text
AGENTS.md + openspec/config.yaml
  -> accepted specs + executable contracts + active bundle truth
  -> guidelines/project-charter.md
  -> paired Evolution Directions
  -> mechanism-specific guidelines
  -> this plan
  -> original bug suggestions
```

本 plan 不创造 accepted behavior。Agent 搜索、判断与写作；Markdown 控制 Agent Flow；JS/CLI 执行 schemas、state、receipts、trace 与 verdict。Queue、work unit 与 submitted ledger 仍是 delegated coverage 的唯一生产路径。

非协商边界：

- Engine 不检查 chat、tool calls、intent、token count 或 context pressure。
- Gate 不修复 status、queue、result、receipt、ledger 或 trace。
- rich reference authority 仍是 canonical path + parser-aligned metadata/semantic sections + backing；fenced/bare YAML 不是第二 authority。
- Queue、submitted provenance、receipt/lifecycle binding、invalid structure 和 required authority 永远不 fatigue-degradable。
- `DPT_FRAMEWORK/`、`tests/` 与 `experiments_playbook/` 只在所属 `/opsx:apply` task 中修改。

## 3. Evidence Method And Corrected Facts

### 3.1 Epistemic Labels

- **Observed**: current code, trace, diagnostic or bundle bytes prove it.
- **Accepted**: an accepted spec proves the contract.
- **Hypothesis**: may explain an observation but lacks causal proof.
- **Proposed**: a future change design, not current runtime truth.

Production evidence bundle `dpt_rb_openspec-large-project-maintenance-patterns` is read-only diagnosis evidence. New proof uses disposable `dpt_disp_*` bundles.

### 3.2 High-Signal Facts

- Wave0 attempts 1/2 failed `shared_ref_count_floor`; attempt 3 had only eligible quality failure and legally degraded.
- Wave1 first pass had 11 base failed rules, 35 masked dependent ids and 43 primary hints; later output reached 113 hints. The issue is root projection, not merely `masked_rule_ids`.
- Only one of five Wave1 work units formally submitted. Four were rejected for cache/receipt roots; a dry-submit validator already existed but was not made direct in the Wave1 path.
- Forty rich per-source files used noncanonical names such as `01-01_...`; the five canonical-prefix aggregate files selected by the Gate were bare YAML arrays. This is not evidence that the Markdown metadata parser is whitespace-strict.
- Wave1 fatigue failures included queue, submitted provenance, required structure, reference/backing and depth-review roots, so its existing narrow degradation path correctly refused them.
- Wave2 lacked the adapter policy path, but its observed failures included queue, finding-index, cross-artifact and reference-binding roots. This is not a quality-only degraded-pass counterexample.

### 3.3 Bug Dispositions

| Bugs | Corrected understanding | Fixed owner in this plan |
|---|---|---|
| 100--102 | Access observation, topic-state materialization and seed YAML each arrive too late or contradict their own pre-Wave route. | Change 1 |
| 105, 111 | `source.yaml` and rich reference contracts were conflated; canonical filename, rich content and submitted backing are distinct roots. | Change 2 |
| 107, 108, 112 | Dry-submit exists; the missing loop is returned-work preflight and Phase-owned submitted-row closeout. | Change 2 |
| 109 | Existing evaluator facts are expanded into a nonminimal primary repair wall. | Change 3 |
| 110 | Existing Wave1 fail-closed result is correct. | Change 3 regression plus bug reclassification, no behavior relaxation. |
| 113 | Wave2 adapter lacks generic eligible-degradation support, but current rules/failures remain ineligible. | Change 3 |

## 4. Three Change Cards

### Change 1: `make-pre-wave-readiness-feedback-direct` (BUG-100, BUG-101, BUG-102)

**Capability boundary:** before Wave0 begins, the Phase Agent can establish research-access observation, canonical topic state and valid seed frontmatter through one legal readiness route, without first failing a late Gate to discover a producer error.

**Why one change:** the three facts have separate parsers/owners, but all are inputs to the same HITL1 -> setup -> seed-topics readiness path. One proposal can state one user-visible guarantee and one disposable pre-Wave proof path; its tasks must retain three isolated implementation/test seams.

**Direct authorities:** `rb_profile.yaml#/research_access`; retained topic intent plus Engine-owned topic-state workspace; seed Markdown bytes plus the existing Gate YAML/schema parser.

**Required design:** topic state applies idempotently in the legal HITL1 pre-Gate window. The access probe performs one neutral capability-only search, considers at most the first three syntactically eligible actual HTTP(S) results in returned order, and gives each candidate only the existing bounded native-fetch then permitted curl-fallback sequence. It records one final direct observation, including only the selected/final candidate information required by the accepted schema plus bounded candidate-count/ordinal facts, not query or URL history. A real page from any candidate establishes `available`; no successful candidate establishes `unavailable` with its bounded reason and no Setup/Wave route. Seed authoring/batch completion runs one named owning validation checkpoint reusing the Gate parser.

**Proof:** focused parser/transition tests; integration coverage for no eligible candidate, first-two-blocked/third-fetchable, all-candidates-unavailable, invalid topic intent and invalid seed shape; one deterministic pre-Wave E2E proves a first-pass legal route. External access claims require a real call or honest `NOT_RUN`.

**Done:** BUG-100--102 are first discovered at their producer decision point, without manual authority edits or a late phase-end first failure; bounded search/fetch failure returns an explicit unavailable/no-advance result rather than an unbounded retry or implicit second-route choice.

### Change 2: `make-wave-producer-contract-and-closeout-direct` (BUG-105, BUG-107, BUG-108, BUG-111, BUG-112)

**Capability boundary:** a Wave producer has one legal chain from authoring to consumer-visible, submitted-backed Phase projections:

```text
canonical path + rich-reference authoring
  -> dry-submit
      mechanical candidate root: repair same `work_id`, then rerun dry-submit
      semantic post-`work_done` root: fail and replace under a new `work_id`
      integrity/no-legal-path root: owner, terminal, or missing-contract boundary
  -> only a PASS proceeds to formal submit -> submitted ledger row
  -> Phase-owned reference/depth/backfill closeout
  -> inspect
```

**Why one change:** individual parsers and submit operations remain independent modules, but the external contract is inseparable: a Phase Agent cannot legally materialize consumer projections until a truthful submit, and a submit cannot yield useful consumer evidence if producer authoring is uncountable.

**Direct authorities:** canonical bundle-relative path and rich file bytes; existing `parseReferenceMetadata()`/reference evaluator; work-unit index/result/receipt/cache; successful submitted-ledger row; Phase Agent's nondelegable depth judgment and consumer projections.

**Required design:** Wave0 receives the canonical rich-reference template at authoring. Wave1 makes `dry-submit -> eligible mechanical same-work_id repair -> dry-submit -> formal submit` direct. A semantic root after `work_done` follows the existing fail-and-replace path with a fresh same-obligation work unit; integrity or missing-contract roots return their existing Engine owner/terminal boundary and never invite authority edits. Only successful formal rows unlock reference/index, `depth-review.yaml` and seed return-map closeout; inspect runs after all dispositions and queue/in-flight drain.

**Hard bounds:** no YAML fence/bare YAML rich-reference authority; no generic Markdown linter; no disk scan that amends declarations; no Sub-agent ownership of Phase depth/backfill; no Phase Agent fabrication of Sub-agent semantics/cache declaration.

**Proof:** parser/path/backing unit and integration cases; rejected dry-submit prevents formal submit; mechanical same-attempt repair; semantic post-`work_done` failure follows fail-and-replace; integrity/no-path diagnostics reject hand edits; one-topic and multi-topic real Agent flows reach closeout before Gate.

**Done:** BUG-105/111 close only when canonical naming, rich content and backing are separately diagnosed at first authoring. BUG-107/108/112 close only when real Phase flow preflights, submits and materializes required projections before inspect.

### Change 3: `simplify-wave-gate-feedback-and-degradation-policy` (BUG-109, BUG-110, BUG-113)

**Capability boundary:** every Wave Gate projects one structured evaluator result into both a minimal primary repair surface and a legally fail-closed degraded-handoff decision. `hints[]` and degradation are projections of the same facts, never a second verdict.

**Direct authorities:** existing evaluator findings, schema-parsed Gate definitions, lifecycle preflight/trace durability and current Gate attempt lineage.

**Required design:** prerequisite roots short-circuit dependent content checks; same-topic/same-parent roots collapse to one nearest repair; independent roots remain separate; durable diagnostics retain dependent detail. A pure metadata-backed evaluator replaces Wave0/1 hard-coded eligibility sets and is consumed by all Wave adapters. Eligibility defaults false; current accepted soft floors remain the only true production values and Wave2 has none. The change delta spec SHALL authorize one schema-valid, inactive test-only Wave2 definition fixture carrying an eligible quality rule, so the shared production adapter can prove its positive metadata path without adding an active Wave2 eligible rule.

**Hard bounds:** no general dependency graph engine, automatic downgrade, partial advance, reclassification of structure/provenance as presentation, or separate inspect/Gate grouping and eligibility implementation.

**Proof:** parent-only versus independent root grouping; formal/inspect parity; Wave0/Wave1 quality-only eligible degraded pass; Wave1 queue/provenance/structure failure remains failed; current Wave2 structural roots remain failed; the delta-spec-authorized inactive Wave2 fixture proves the positive metadata path through the same adapter.

**Done:** BUG-109 closes when one parent root cannot expand into a primary repair wall. BUG-110 is reclassified once existing Wave1 policy is regression-proved. BUG-113 closes only when Wave2 consumes common policy in both the authorized inactive positive fixture and current ineligible-failure regression.

## 5. Pre-Proposal Fact Corrections

Before Change 1 proposal, amend backlog documentation only:

1. BUG-105: distinguish `source.yaml` raw YAML from the rich-reference contract; remove the claim that Gate expects top-level YAML rich metadata.
2. BUG-111: record noncanonical filename mismatch plus the selected bare-YAML aggregate files; remove the parser-whitespace conclusion.
3. BUG-112: record that dry-submit validator already exists; the missing owner is Wave1 demand-side/control-flow delivery.
4. BUG-110: record existing narrow Wave1 degradation and the run's ineligible blockers; reclassify its proposed relaxation.
5. BUG-113: record adapter inconsistency and the fact that this run is not quality-only.
6. `_backlog/bugs/README.md`: add BUG-111--113 and correct `Next BUG-111`.

## 6. OpenSpec And Verification Discipline

Each of the three changes follows exactly:

```text
/opsx:propose <one change>
  -> /opsx:explore until its design/tasks are coherent
  -> /opsx:apply in task order
  -> verification and governance
  -> /opsx:archive
  -> next change
```

No target code, test or experiment artifact is written during propose/explore. Every change creates a change-root `verification-plan.yaml`, runs plan mode before edits and assets mode before archive, reviews `req-registry.yaml`, makes an explicit version-bump decision, and runs `check-project-reqs.mjs` plus `check-project-specs.mjs` before archive.

Before `/opsx:apply`, each proposal/design/tasks contains one compact constitutional-admission record: (1) direct authority, owning boundary, legal establishment/change path, or honest owner/terminal/missing-contract result; (2) for an explicitly declared Agent entry/handoff/recovery boundary, its input/context and bounded legal next action or no-path; (3) the shortest legal loop and the complexity removed, merged, or explicitly avoided; (4) the smallest human decision, if any, and the ordinary authorized work that returns to the Agent; and (5) the exact claim/proof boundary. This is a review record, not a mandate to add a receipt, writer, preflight, retry, state field, or controller.

| Claim | Minimum proof |
|---|---|
| Parser/evaluator/pure grouping/eligibility | focused `unit` under root `tests/` |
| CLI and real bundle boundary | `integration` under `tests/integration/` |
| Multi-check deterministic lifecycle | `deterministic_e2e` under `tests/e2e/` |
| Phase Agent preflights or closes out a Wave | `agent_flow_e2e` under `experiments_playbook/` with independent Subject evidence |
| Sub-agent first-return behavior | `agent_flow_e2e` with independent real Sub-agent evidence |
| Search/fetch behavior | real external call or honest `NOT_RUN` |

## 7. Order, Completion And Review Traps

Run Change 1 -> Change 2 -> Change 3. Change 1 removes pre-Wave late discovery; Change 2 makes producer facts truthful; Change 3 simplifies the Gate's consumption of those facts. Do not parallel apply.

```text
Change 2 truthful producer facts
  -> Change 3 primary Gate projection and degradation policy
```

The plan may move to `_backlog/_done/_closed_plans/` only after all three changes are archived, corrections are durable, every covered bug (`100--102、105、107--113`) has a recorded disposition and proof boundary, accepted specs are synced, governance passes, and a disposable path demonstrates pre-Wave readiness, dry-submit-before-submit, Phase-owned closeout, minimal independent repair roots and fail-closed authority/provenance/structure.

Remaining traps:

- Early validation must reuse its owning parser/evaluator, not create a generic linter.
- Consumer projections aid navigation but never manufacture delegated coverage.
- Cleaner Gate output must not turn structural/provenance defects into quality preferences.
- Production observation proves that something occurred, not that a proposed causal fix works.

Supporting indexes: [change sequence](wave-execution-and-gate-remediation/change-sequence.md) and [evidence decisions](wave-execution-and-gate-remediation/evidence-and-decisions.md). Silent-autonomy context is separately owned by [Silent Autonomous Execution](silent-autonomous-execution.md).
