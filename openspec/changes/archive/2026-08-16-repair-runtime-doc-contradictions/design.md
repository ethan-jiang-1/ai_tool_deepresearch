# Design: repair-runtime-doc-contradictions

## Context

See `proposal.md` (Why / What Changes). The nine fixes are all alignment work against already-accepted requirements, plus two normative pins (SCO-001 order clause, CMI-001 ledger-file clarification) that make the fixes durable. Current state constraints that shape the approach:

- `engine/cli-exit-code-conventions` CLE-003 already requires `validate-workflow-package.mjs` docs to state tri-state `0/1/2` "as current behavior" and "SHALL NOT present it as a pending drift" — the stale note at `cli/README.md:78` violates it.
- `engine/schema-core` SCO-001 currently pins the *old* enum order (`rerun_ready` between `hitl2_recorded` and `readiness_passed`), while `workflow/workflow-node-contract` WNC-001 pins the manifest order (`readiness` → `rerun`) — two normative texts contradict each other; this change keeps the manifest order and modifies only SCO-001 (the enum reorder requires the MODIFIED delta, written).
- `bundle/cmd-bundle-instantiation` CMI-001 pins "five `rb_*` control files" at instantiation time; the sixth ledger file exists at runtime only.
- `engine/runtime-reentry-debuggability` already requires `--at` to normalize into `kind: gate` | `kind: phase`; `research/post-final-recovery` playbook omits saying so.
- `research/plan-hostfile-sections` PHS-004 requires the Progress checklist "in lifecycle order"; `agent/agent-context-routing` ACR-001 requires CONTEXT.md to carry the `hints[]`/`repair_kind` feedback vocabulary.
- `tests/integration/cli/transition-integrity.test.mjs` already locks manifest-gate ↔ `CurrentGate` 1:1 coverage (snake↔kebab helpers exist) but not order, and no test pins the plan-template Progress order, the stale drift note, or CONTEXT.md's face rows.

## Goals / Non-Goals

**Goals:**

- Remove the one live contradiction (stale exit-code note) and collapse the three "same concept, multiple spellings/orders" surfaces to a single derivation rule and a single lifecycle order.
- Make the convergences drift-proof: one existing regression extended with two order assertions; the two normative pins written into the owning specs.
- Zero runtime behavior change: exit codes, gate rules, schema membership, receipts, trace, transitions all untouched.

**Non-Goals:**

- No kebab↔snake lookup table (a second hand-written mapping would itself drift — `runtime-reentry-debuggability` forbids exactly that pattern). A one-line mechanical derivation rule replaces it.
- No repair of the `/opsx:archive` command-surface fault (separate change, per user decision).
- No renaming of `repair_kind` faces (code-level vocabulary change is out of scope; this change only documents the third face).
- No reconciliation of the remaining doc-language mix beyond one convention sentence.

## Decisions

**D1 — Canonical lifecycle order is the manifest order; enum and plan template follow it.**
`workflows/manifest.json` is the routing source of record; WNC-001 pins its `phases` array as `…hitl2 → readiness → rerun → final`. `schema/enums.mjs` `CurrentGate` and `rb_plan.md.tmpl` Progress reorder to match (`readiness_passed` before `rerun_ready`), with `none` kept last as the terminal sentinel. Alternatives considered: (a) keep two orders and annotate only — rejected, the permanent mental conversion is the exact burden being removed; (b) converge on rerun-first — rejected, it would require MODIFYing the manifest order pinned by WNC-001, a larger surface.

**D2 — Derivation rule instead of a lookup table.**
The manifest gate key and the `CurrentGate` value differ only by `-` ↔ `_` (`advance-status.mjs:38-44` implements exactly this). COMMANDS.md and cli/README.md state the rule plus the two single sources; no table to maintain. Alternatives considered: (a) a full 10-row table locked by a markdown-parsing test — rejected as a new drift surface with no added reader value; (b) silence — rejected, the missing rule is the original finding.

**D3 — Bootstrap status exception becomes visible at the two surfaces that read it.**
WNC-010 already declares the instantiation/HITL1 bootstrap status shape a compatibility exception. Add a comment in `rb_templates/rb_status.json.tmpl` (the file itself) and cross-reference it from `DEEP_RESEARCH_HARNESS/README.md` execution mode and `BUNDLE_MAP.md.tmpl` gate-window note. No spec change needed beyond what exists.

**D4 — Third `repair_kind` face documented in CONTEXT.md as a compressed owner-pointer.**
ACR-001 requires compressed definitions that defer to owners, so the new entry names the six `bundle/file-observability` values and points to `engine/helpers/file-observability.mjs` as owner — it does not copy the semantics. The existing two-face rows stay as-is. Known gap recorded: the `bundle/file-observability` main spec does not currently enumerate these six values (the code emits them without spec ownership); pinning them in that spec is deliberately out of scope here and remains a candidate for a separate change.

**D5 — Verification: extend `tests/integration/cli/transition-integrity.test.mjs` with two static order assertions.**
(a) `CurrentGate` declaration order == manifest gate order (readiness before rerun, `none` last); (b) `rb_plan.md.tmpl` Progress checklist order == manifest order. Both are pure static reads of existing repo files, same class as the test's current coverage checks. The pre-existing 1:1 coverage assertions already fail loudly if anyone adds a gate to only one surface; the new assertions fail if anyone reorders.

**D6 — F6 header rename: 「disposition 反馈面」→「适用情形/触发条件」.**
The decision table is keyed by `repair_kind` (its row set is already test-locked and derives from `WORK_UNIT_REPAIR_KINDS`); the first column mixes dispositions and routing conditions, so the neutral header is the honest name. DEW/CHI-004's unified `attempt_disposition` + `next` shape is untouched.

**D7 — F9 language convention, one sentence in the Harness README.**
"精确 token/命令/枚举/文件坐标用英文，推理与边界说明用中文；同一控制面内不混用两套主语言。" Recorded as guidance, no spec owner (Discovery table marks Excluded).

## Risks / Trade-offs

- [Enum reorder breaks a hidden order-dependent consumer] → Verified by grep: no engine/CLI code iterates `CurrentGate` for routing; only `tests/integration/cli/transition-integrity.test.mjs` parses the enum (coverage-only) and `tests/schema/enums.test.mjs` (membership-only). Full `npm test` after apply is the proof.
- [Deleting the stale note breaks a doc-scan assertion] → Grep found no test asserting the note's presence; `command-contract-docs` asserts absence-of-contradiction classes, which the deletion improves.
- [CONTEXT.md row addition breaks `agent-context-routing-contract.test.mjs`] → The test does not pin specific rows; it checks routing/authority shape. Will re-run to confirm.
- [The MODIFIED SCO-001 sentence still pins a linear order between two sibling HITL2 exits] → Accepted trade-off: a presentation order is unavoidable in any linear enum; the sentence now names the manifest as the single authority, which is the net simplification. The mutual-exclusion semantics stay owned by WNC-010/transition chain, not by the enum order.
- [plan-template Progress reorder vs PHS-004 "lifecycle order" ambiguity for sibling gates] → The order now equals the manifest order, which is the same source PHS-004's "lifecycle order" was written against; annotation marks the HITL2 pair as mutually exclusive exits.

## Migration Plan

No runtime migration: template/enum/doc edits only affect newly instantiated bundles and readers. Existing bundles keep their already-materialized plan files (their Progress order is a stale presentation at worst; `writePlanProgress` flips lines by name, not position). No rollback beyond git revert; no data conversion.

## Open Questions

（无——所有可能改变 spec 或任务分解的问题已在 Decisions 中解决。）
