## 1. Audit

- [x] 1.1 Run targeted searches over active `openspec/specs/` and `DPT_FRAMEWORK/`; record the search commands and candidate files before editing. Req refs: AGQ-007, AGQ-009, AGQ-012, AGQ-014, WDC-003, SCO-002, SCO-009, WAI-001, WAI-002, WAI-003, WAI-004, SUC-002, SUD-003, RWP-001, STM-001.
- [x] 1.2 Classify each active hit as wire/API example, compat note, conceptual prose, verified runtime fact drift, parent runtime/protocol term, duplicate requirement, DPT allowlist candidate, or historical surface. Done condition: every edited hit has a recorded class; every unedited active hit has a reason.
- [x] 1.3 Identify duplicate same-name requirements in active accepted specs, especially `agentic-queue`, and decide whether each duplicate is canonical, stale-to-consolidate, or intentionally retained. Done condition: the apply plan names the duplicate headings (`Queue state and item schema are structured`, `Producer rule source_intake_fan_in`, `Producer rule seed_topic_materialize`) and whether the accepted spec should end with one consolidated active copy or an explicit retained duplicate rationale.

## 2. OpenSpec Specs

- [x] 2.1 Align active `openspec/specs/` conceptual prose with `Phase Agent`, `Sub-agent`, `Agent actor`, and `Markdown control surface` terminology. Done condition: phase-level execution prose uses `Phase Agent`; relay-slot execution prose uses `Sub-agent`; document/projection surfaces use `Agent-facing`, `Agent-readable`, or `LLM-facing`.
- [x] 2.2 Preserve current wire/API examples and explicitly treat `"main-agent"` / `"sub-agent"` as current executable values where needed. Done condition: no schema enum, CLI actor value, JSON example, or queue task wire value is migrated.
- [x] 2.3 Fix verified runtime fact drift in accepted specs without changing behavior. Done condition: `rb_queue.json` remains canonical; stale `gate-definition.mjs` prose is retired in favor of the current gate definition JSON directory plus `gate.mjs` transition-table contract, without claiming a new gate definition Zod schema.
- [x] 2.4 Resolve duplicate `agentic-queue` requirement prose consistently; do not update only one active copy when another active copy keeps the old concept. Done condition: duplicate `Queue state and item schema are structured`, `Producer rule source_intake_fan_in`, and `Producer rule seed_topic_materialize` sections are consolidated or explicitly justified.
- [x] 2.5 Preserve or explicitly classify `Parent Relay`, `actor: "parent"`, and `parentRuntimeAgentId` as runtime/protocol terms when they are not conceptual Phase Agent prose. Done condition: no runtime metadata or trace value is renamed.

## 3. DPT_FRAMEWORK

- [x] 3.1 Align Agent-facing framework README / CLI README prose. Done condition: edited lines are explanatory prose only; stale `gate-definition.mjs` mention is corrected without adding a new executable file or schema requirement.
- [x] 3.2 Align comments in framework engine files only where old `MD controller` wording would confuse future maintainers. Done condition: comments may say `Markdown control surface` / `Phase Agent` as appropriate, but function signatures, defaults, exports, and trace payloads are unchanged.
- [x] 3.3 Align active workflow-node Markdown prose where it describes conceptual roles rather than wire values. Done condition: JSON snippets and CLI snippets keep `main-agent` / `sub-agent`; surrounding prose explains Phase Agent / Sub-agent roles.
- [x] 3.4 Do not edit executable logic, schema, parser behavior, generated role templates, fixtures, runtime metadata comments, or trace values. Done condition: `git diff --name-only` contains only accepted spec Markdown and the narrow DPT allowlist reviewed in 1.2.

## 4. Verification

- [x] 4.1 Re-run targeted searches:
  `MD controller|MD Controller`,
  `main-agent|Main Agent|主 Agent|parent Agent`,
  `Parent Relay|parentRuntimeAgentId|actor: "parent"|actor: 'parent'`,
  `three-layer|三层编排|三道编排|三层架构`,
  `alternate queue state filename`,
  `gate-definition.mjs|gate.mjs`.
- [x] 4.2 Verify remaining hits are current wire/API examples, explicit compatibility notes, parent runtime/protocol terms, archive / backlog historical surfaces, or explicitly justified active-spec variants. Active accepted specs MUST NOT be treated as historical merely because they are already accepted.
- [x] 4.3 Run `openspec validate --all --strict`.
- [x] 4.4 Run `node openspec/governance/check-project-specs.mjs`.
- [x] 4.5 Run `node openspec/governance/check-project-reqs.mjs`.
- [x] 4.6 Run `git diff --check`.
- [x] 4.7 Run `node --test tests/` because `DPT_FRAMEWORK/` readable surfaces are touched.

## 5. Residual Charter / Experiment Cleanup

- [x] 5.1 Fix residual guideline source-map drift directly in `guidelines/`: replace old queue `target` examples with current `targets` / `targets.delegates` terminology, remove stale alternate queue filename prose, and correct `gate.mjs` as the gate transition-table contract rather than a gate definition JSON schema.
- [x] 5.2 Align implementation / experiment Agent-facing prose under this change: use `Phase Agent` instead of conceptual `Main-agent`, replace old `target: main-agent` queue wording with `targets.controller: "main-agent"` where it is a wire example, and remove old prototype queue filename noise rather than preserving it as guidance.
- [x] 5.3 Re-run targeted searches for alternate queue state filename noise, `task.target|target: main-agent|target: sub-agent`, `Main-agent|main-agent` conceptual prose, `gate definition schema target|gate.mjs`, and `MD controller`.
- [x] 5.4 Re-run `openspec validate align-specs-with-guidelines-charter --strict`, `openspec validate --all --strict`, `git diff --check`, and `node --test tests/`.
- [x] 5.5 Re-run a second holistic active-surface audit across `guidelines/`, `openspec/specs/`, `DPT_FRAMEWORK/`, `experiments/`, and `experiments_playbook/`; fix remaining Agent-readable prose that still says `main-agent` executes work as a conceptual role, and tighten guideline prose that could be mistaken for legacy `task.target`.

> Note: Prior exploratory edits were reverted. These tasks are intentionally unchecked until the change is reviewed and explicitly applied.
