# FOSE Run Bugfix Batch Plan

> Status: closed — all 3 changes archived, all 9 bugs fixed and moved to `_done/_fixed_bugs/`
> Created: 2026-07-08
> Source run: `dpt_rb_fose-europe-engelberg-2026`
> Scope: triage and implementation ordering for active bugs BUG-045, BUG-046, BUG-059, BUG-060, BUG-061, BUG-062, BUG-063, BUG-064, BUG-065

## 0. One-Line Decision

Cut the FOSE run bugfix work into **3 implementation changes**, in this order:

1. `stabilize-work-unit-submit-and-gate-handoff`
2. `parallel-delegated-phase-execution-and-reference-materialization`
3. `harden-run-entry-and-bundle-map`

This is the smallest split that keeps runtime safety, phase execution behavior, and entry/navigation cleanup separate enough to reason about.

## 1. Why Not One, Two, Five, Or Nine Changes

### Not one giant change

One giant change would contain:

- work-unit submit normalization
- CLI argument safety
- gate/handoff legality
- delegated wave parallelism
- active polling
- Wave1/Wave2 reference materialization
- root entry routing rules
- bundle entry file rename
- docs and test migrations

That is too much blast radius for one apply. A regression in runtime submit, phase guidance, or bundle instantiation would be hard to isolate. It would also mix high-risk runtime authority changes with low-risk naming/docs changes.

### Not two changes

Two changes would likely be:

1. runtime + phase behavior
2. entry/navigation

That still mixes the two hardest concerns:

- Engine/runtime truth: submit contract, ledger authority, gate handoff
- Agent execution discipline: claim batching, background sub-agent polling, reference materialization

Those two layers interact, but they should not be implemented in the same change. The first decides what the Engine accepts and how lifecycle handoffs stay legal. The second decides how the Phase Agent uses already-legal primitives. If combined, failures become ambiguous: did the Engine accept too much, or did the Phase Agent drive the loop wrong?

### Not five changes

Five changes would reduce local risk but add coordination overhead:

- BUG-059 could be standalone, but it is tiny and shares CLI safety with runtime hardening.
- BUG-046 and BUG-062 are both delegated execution efficiency problems and should be fixed together.
- BUG-064 and BUG-065 are both reference materialization responsibility gaps and should be fixed with the delegated execution guidance.
- BUG-045 and BUG-061 are both entry/navigation UX cleanup and can safely share a low-risk change.

### Not nine bugs -> nine changes

Nine changes would overfit the bug list. Several bugs are symptoms of the same failure mode:

- BUG-060 is the main contract mismatch disease.
- BUG-063 is the lifecycle cascade triggered by unresolved gate failure.
- BUG-046 and BUG-062 are the same scheduling/waiting loop problem.
- BUG-064 and BUG-065 are the same "who materializes reference files?" responsibility gap.

The implementation should follow root causes, not bug document count.

## 2. Dependency Graph

```text
BUG-060  work-unit contract mismatch
   |
   v
BUG-063  gate failure cascade / illegal manual status bypass
   |
   v
Change 1 must land first

BUG-046  serial claim strategy
BUG-062  passive waiting
BUG-064  Wave1 reference gap
BUG-065  Wave2 cross-reference gap
   |
   v
Change 2 depends on Change 1, because better phase execution is only useful once submit/gate behavior is stable.

BUG-045  entry skill-routing friction
BUG-061  misleading START_FROM_HERE
   |
   v
Change 3 can happen last. It improves future runs and reloadability but does not unblock runtime correctness.
```

## 3. Evidence From The FOSE Run

The run shows real improvement compared with older runs, but the remaining bugs cluster around a few repeating boundaries.

### Positive signal

- The run followed the DPT framework path rather than invoking the built-in `deep-research` shortcut.
- Wave0 eventually ran semi-parallel after the first topic.
- Wave1 produced substantial evidence summaries and cache trails.
- Wave2 artifacts exist on disk: `artifacts/wave2/synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml`.

### Remaining runtime failures

- `rb_trace.jsonl` ends with `wave1-complete` failing.
- `rb_status.json` later says the bundle is at `phases/phase-final.md`.
- That mismatch means status was advanced outside the legal handoff chain.
- Wave0 gate stalled on `shared_ref_count_floor` and `cache_coverage`.
- Wave1 gate then failed preflight because the latest deterministic handoff still targeted `phases/phase-wave0.md`.

### Remaining phase execution failures

- Wave0 first claimed only one topic, waited for it, then claimed the rest.
- Wave1 also claimed one work unit first, then several later.
- Phase Agent behavior depended too much on user nudges or external task notifications instead of active polling.
- Wave1 sub-agents did research but mostly did not produce topic reference files.
- Wave2 pure synthesis produced synthesis artifacts but no `reference/00-cross-*.md`.

### Remaining UX/navigation failures

- Root `CLAUDE.md` still lacks the strong `deep-research` suppression rule found in `DPT_FRAMEWORK/RUN.md`.
- `START_FROM_HERE.md` reads like an action entrypoint, but in a live or completed bundle it is really a passive map of where evidence, state, logs, diagnostics, and final outputs live.

## 4. Recommended Changes

## Change 1: `stabilize-work-unit-submit-and-gate-handoff`

### Bugs covered

- BUG-059: `operate-queue` / `operate-work-unit` treat `--help` as a bundle path and create junk directories.
- BUG-060: sub-agent output contract mismatch causes repeated submit/gate friction.
- BUG-063: gate failure leads to manual status edits, broken handoff chain, and skipped Wave2.

### Goal

Make the Engine robust against predictable LLM-shaped output drift while preserving strict runtime authority. Then ensure lifecycle handoff cannot be bypassed silently when a gate fails.

This change is first because every later improvement assumes:

- submit validation can distinguish harmless shape drift from unsafe output;
- gate failures produce a legal next action or fail closed;
- downstream phases cannot be entered by manually drifting status.

### Implementation intent

#### 1. Work-unit result normalization

Add a narrow normalization step inside the submit path before `WorkUnitResultSchema.parse`.

Allowed normalization:

- If the submitted JSON is exactly `{ "result": { ... } }`, unwrap it.
- If the wrapper has extra sibling keys, reject it.
- After unwrapping, validate the inner object with the normal strict schema.

Required observability:

- Accepted normalized submits should record a diagnostic normalization event or metadata that is visible in trace/log/submit output.
- Ledger rows must still store the canonical flat result.

Non-goals:

- Do not accept arbitrary nested result shapes.
- Do not accept chat summaries as result JSON.
- Do not relax required identity binding.

#### 2. Runtime receipt identity autofill

When `runtime-receipt.jsonl` events are parseable JSON but missing one or more identity fields:

- fill missing `schema_version`, `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` from the claimed work-unit record;
- preserve event-specific fields such as `event`, `ts`, and `detail`;
- reject if an identity field is present but conflicts with the record.

This handles the common LLM behavior of writing only the changing fields while still refusing wrong bindings.

Required observability:

- Record `receipt_autofill` style diagnostics, including line numbers and autofilled fields.

Non-goals:

- Do not repair invalid JSONL.
- Do not accept receipt events with wrong `work_id` or wrong `queue_item_id`.
- Do not accept an empty receipt file.

#### 3. Cache leaf file normalization

When validating cache trails:

- if `page.md` is missing and `page-content.md` exists in the same leaf directory, rename or canonicalize it to `page.md`;
- continue to require `websearch.json`, `page.md`, and `meta.json`;
- continue to validate non-empty or explicitly degraded page content;
- reject if both `page.md` and `page-content.md` exist with divergent content.

Required observability:

- Record `cache_file_renamed` or equivalent diagnostic.

Non-goals:

- Do not accept cache trails that point to files instead of leaf directories.
- Do not accept missing `meta.json`.
- Do not accept placeholder `page.md` without degraded/fetch-failure evidence.

#### 4. Constrained nonce repair

The desired steady state is single source of truth from `_beacon.json` / manifest / index. The submit path should still defend against the observed failure where sub-agents use a stale prompt nonce.

Allowed correction:

- If `work_id`, `queue_item_id`, and `kind` match the claimed record, but `receipt_nonce` differs in result/receipt, the Phase Agent or Engine may normalize it to the record nonce only when the result path is inside that work unit's assigned directory and all other identity fields match.

Reject:

- wrong work id;
- wrong queue item id;
- wrong kind;
- result path outside the assigned work-unit directory;
- mismatched nonce plus any other identity mismatch.

Required observability:

- Record `nonce_normalized_from_record` or equivalent.

Important caution:

- This is a compatibility defense, not a new authority source. The record/beacon nonce remains canonical.

#### 5. Source claims and derived references

Do not simply loosen `source_claims` or cache coverage globally. The FOSE failure exposed a more precise distinction:

- fetched-source reference: a reference file that represents a real fetched source and should map to a cache trail;
- derived/synthesis reference: a Phase-owned or synthesis-owned projection grounded in already submitted sources.

For Change 1, prefer minimal runtime stabilization:

- Keep fetched reference outputs strict.
- Do not let a synthesis-only reference pretend to be a fetched source by declaring an unrelated `source_url`.
- If a new derived-reference role is introduced, it must be explicit, non-counting for fetched-source floors unless backed by source refs, and covered by tests.

This point may be partly completed in Change 2 if the cleanest design is Phase-owned reference materialization guidance rather than Engine role expansion.

#### 6. `--help` and suspicious bundle guards

Fix both:

- `DPT_FRAMEWORK/cli/operate-queue.mjs`
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs`

Expected behavior:

- `node ... operate-queue.mjs --help` prints usage and exits 0.
- `node ... operate-work-unit.mjs --help` prints usage and exits 0.
- `node ... operate-queue.mjs enqueue --help` prints usage or a clear argument error and does not create `--help/`.
- `node ... operate-work-unit.mjs claim --help` prints usage or a clear argument error and does not create `--help/`.
- Bundle positional values beginning with `-` are rejected before any queue/work-unit load creates logs, trace, or directories.

#### 7. Gate handoff cascade hardening

Do not add a broad `advance-status --force`.

Required behavior:

- Downstream lifecycle handoff must come from a passed gate attempt with `check.next`, clean or degraded.
- If a gate fails and no degraded handoff is legal, the Agent holds silently with diagnostics rather than editing status.
- `advance-status` must continue failing when trace lacks the required source-gate handoff.
- Readiness/final must not be authorized by file presence or status drift alone.

Important nuance:

- Accepted specs already define degraded gate attempts as legal handoffs when runtime-truth preconditions are satisfied and only degradation-eligible quality rules remain.
- This change should wire or test that existing concept, not invent manual force-advance.

### Acceptance criteria

- A result file with exactly one top-level `result` wrapper submits successfully and lands as a flat canonical ledger row.
- A result file with wrong `work_id` still fails.
- A runtime receipt missing identity fields is accepted only if those fields can be filled from the record and no conflicting identity fields exist.
- A runtime receipt with conflicting identity fails.
- A cache trail with `page-content.md` but no `page.md` is normalized and accepted.
- A cache trail with neither page file fails.
- `--help` invocations do not create directories.
- A bundle with failed Wave0 gate cannot legally advance to Wave1/Wave2/HITL2/final unless a clean or degraded gate handoff exists.
- A status-drifted bundle is reported as drift, not accepted as proof of lifecycle completion.

### Test plan

Add or update tests under:

- `tests/engine/work-unit-submit.test.mjs`
- `tests/engine/work-unit-core.test.mjs`
- `tests/integration/cli/operate-queue.test.mjs`
- `tests/integration/cli/operate-work-unit.test.mjs`
- `tests/integration/cli/advance-status.test.mjs`
- `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`
- `tests/integration/cli/check-gate-readiness-passed.test.mjs`
- `tests/integration/cli/audit-phase-status.test.mjs`

Suggested specific tests:

- submit unwraps single `result` wrapper;
- submit rejects wrapper with sibling keys;
- submit autofills missing receipt identity;
- submit rejects conflicting receipt identity;
- submit canonicalizes `page-content.md`;
- submit rejects divergent `page.md` and `page-content.md`;
- CLI `--help` does not create `--help/`;
- `advance-status --to wave1_complete` fails if latest legal handoff is still Wave0;
- readiness gate fails when prior gate pass evidence is missing even if later artifacts exist.

### Risks

- Too much normalization could hide real bugs. Keep normalization narrow and logged.
- Derived reference handling could accidentally weaken provenance. Keep fetched-source reference and synthesis-derived reference separate.
- Degraded pass logic must not become a broad bypass. It should only apply when runtime-truth blockers are absent.

## Change 2: `parallel-delegated-phase-execution-and-reference-materialization`

### Bugs covered

- BUG-046: Wave0 source intake starts serially instead of fully parallel.
- BUG-062: Phase Agent passively waits for sub-agent notifications rather than actively polling.
- BUG-064: Wave1 topic-specific reference files are mostly missing.
- BUG-065: Wave2 `reference/00-cross-*.md` files are never produced.

### Goal

Make Wave0/Wave1 delegated execution efficient and autonomous, and assign reference materialization to the component best suited for exact formatting: the Phase Agent.

This change depends on Change 1 because active polling and batched submit will produce more submit attempts faster. The Engine must first be able to handle predictable contract drift without turning every format issue into a gate deadlock.

### Implementation intent

#### 1. Batched independent claims

Update delegated phase guidance:

- Wave0 should claim all currently eligible independent topic source-intake work units up to a bounded parallelism limit.
- Wave1 should do the same for topic deepening work units.
- The phase should not wait for topic 01 to submit before claiming topic 02-05 when tasks are independent.

Recommended default:

- Use the queue active window or a profile/runtime parameter as the upper bound.
- If no explicit parameter exists, use a conservative default equal to the available independent topic count, capped at a small number such as 5.

Do not change:

- Wave2 dependency rule: cross-topic synthesis still waits for Wave1 completion.
- Queue authority: claims still go through `operate-work-unit claim`.

#### 2. Active polling after background spawn

Phase Agent loop should be explicit:

1. Claim a batch.
2. Spawn one sub-agent per claimed work unit.
3. Record or keep the work-unit refs.
4. Enter a polling loop.
5. Every bounded interval, inspect each claimed work-unit directory.
6. If `result.json` and receipt are ready, submit immediately.
7. If submit rejects, repair the same attempt when possible.
8. If deadline passes or the attempt is unrecoverable, close it with `fail`, `timeout`, or `abandon`.
9. Continue until `operate-work-unit inspect` or claim result says the phase is drained.

The Phase Agent must not wait for:

- user "continue";
- external task notification;
- unrelated background workflow state.

Possible implementation surfaces:

- Documentation-only guidance in `shared-subagent-protocol.md`, `shared-silent-execution.md`, `phase-wave0.md`, and `phase-wave1.md`.
- Optional CLI helper later: `operate-work-unit wait`, but do not make that a prerequisite unless the apply finds the guidance-only path insufficient.

#### 3. Wave1 reference materialization becomes Phase-owned

Do not make sub-agents responsible for canonical rich reference files.

New responsibility:

- Sub-agent gathers evidence, writes `evidence-summary.md`, `question-list.md`, result JSON, receipt, and cache trails.
- Phase Agent reads submitted evidence and ledger/cache refs after successful submit.
- Phase Agent writes `reference/{topic.slug}-<source-slug>.md` in canonical shared-reference format.
- Phase Agent updates `reference/_INDEX.md`.
- Phase Agent uses references in seed topic backfill.

Why:

- Sub-agents are good at search/fetch/extraction.
- Phase Agent is better positioned to enforce exact formatting and maintain bundle-level consumer navigation.
- Adding more required receipts to sub-agent tasks repeats the BUG-060 failure mode.

Reference file minimum:

- metadata block with the accepted nine fields;
- five standard sections from `shared-reference-template.md`;
- concrete source URL;
- relationship to topic;
- refs back to `artifacts/wave1/{topic}/evidence-summary.md`, cache leaf, and work-unit when available.

Important:

- Phase-owned materialization must not create delegated evidence authority by itself.
- If the reference claims new fetched evidence, it must be grounded in submitted work-unit cache/ledger rows.

#### 4. Wave2 cross-reference materialization

Wave2 has two paths:

- pure synthesis from existing submitted evidence;
- targeted delegated evidence for new searches.

Clarify both:

Pure synthesis path:

- Phase Agent may write `reference/00-cross-*.md` for cross-topic findings only when concrete backing already exists in Wave0/Wave1 submitted evidence.
- Such files should cite existing source refs and synthesis artifacts.
- They must not pretend to be new fetched-source references.

Targeted evidence path:

- If new external search is required, enqueue `wave2_targeted_evidence`.
- Only submitted targeted work units can authorize new fetched-source `00-cross` references.

If the repo introduces a role distinction:

- `role: reference` remains fetched-source reference.
- A new explicit role such as `derived_reference` or `synthesis_reference` may be considered, but only with clear gate semantics and tests.

#### 5. Seed topic backfill and reference index updates

After reference materialization:

- update `reference/_INDEX.md`;
- include Wave1 topic refs in `__BACKFILL_WAVE1_*__`;
- include Wave2 finding refs and `W2F-xxx` ids in `__BACKFILL_WAVE2_JUDGMENT__`;
- never backfill from synthesis prose alone when structured ledger/index refs exist.

### Acceptance criteria

- Wave0 guidance no longer instructs `claim --count 1` as the default loop for independent topics.
- Wave1 guidance no longer instructs `claim --count 1` as the default loop for independent topics.
- Shared delegated protocol tells Phase Agent to actively poll work-unit dirs after background spawn.
- Stop:no guidance explicitly forbids waiting for user continuation or unrelated task notifications.
- Wave1 reference files are Phase-owned after submit, not sub-agent-required receipts.
- Wave2 pure synthesis path explicitly materializes `00-cross` refs when existing concrete backing exists.
- New Wave2 external evidence remains delegated through `wave2_targeted_evidence`.

### Test plan

Add or update tests under:

- `tests/integration/md/phase-wave0-queue-loop.test.mjs`
- `tests/integration/md/phase-wave2-queue-loop.test.mjs`
- `tests/integration/md/phase-wave2-md-structure.test.mjs`
- `tests/integration/md/wave-depth-contract-guidance.test.mjs`
- `tests/integration/md/no-phase-bypass-advice.test.mjs`
- `tests/engine/static-regression.test.mjs`

Suggested tests:

- Wave0 phase text includes batched claim guidance and does not present hardcoded `--count 1` as the normal strategy.
- Wave1 phase text includes batched claim guidance and active polling.
- Shared sub-agent protocol includes poll/submit loop after background spawn.
- Silent execution guidance says task-notification is not a continuation condition.
- Wave1 text says Phase Agent materializes topic reference files after successful submit.
- Wave2 text says Phase Agent materializes `00-cross` refs from concrete existing backing in pure synthesis.
- Wave2 text still requires targeted work units for new external search.

### Risks

- Batch claiming may increase simultaneous sub-agent load. Use a bounded parallelism cap.
- Active polling may produce noisy loops. Keep polling interval and timeout explicit.
- Phase-owned references may accidentally become unsourced summaries. Require concrete source backing and refs.

## Change 3: `harden-run-entry-and-bundle-map`

### Bugs covered

- BUG-045: Agent may prefer built-in `deep-research` skill instead of DPT framework.
- BUG-061: `START_FROM_HERE.md` is misleading and should become `BUNDLE_MAP.md`.

### Goal

Reduce future run startup mistakes and make active/completed bundles easier to reload without implying that the map file is an execution command surface.

This change is last because it is mostly UX/navigation. It matters, but it should not be mixed with runtime authority fixes.

### Implementation intent

#### 1. Lift skill suppression to repo root

Update repo-root:

- `CLAUDE.md`
- `AGENTS.md`

Add a short high-priority rule:

- When the user expresses research/deep-research intent and this repo's `DPT_FRAMEWORK/` is the selected or relevant entry, do not invoke built-in `deep-research` or equivalent shortcut.
- Use `DPT_FRAMEWORK/RUN.md` and the framework workflow.

Keep this consistent with:

- `DPT_FRAMEWORK/RUN.md`
- `DPT_FRAMEWORK/CLAUDE.md`
- `DPT_FRAMEWORK/AGENTS.md`

#### 2. Rename `START_FROM_HERE.md` to `BUNDLE_MAP.md`

Template rename:

- `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl`
- becomes `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`

Bundle generated file:

- new bundles should contain `BUNDLE_MAP.md`;
- old bundles may still contain `START_FROM_HERE.md`, so readers/checkers should handle compatibility where appropriate.

Content positioning:

- `BUNDLE_MAP.md` is a passive map, not an action launcher.
- It should tell readers where to find research content, runtime state, diagnostics, logs, cache, work units, and final outputs.
- It should not duplicate detailed run commands that belong in `RUN.md`, command playbooks, or phase nodes.

Recommended sections:

1. Research Content Map
   - `seed_topics/`
   - `reference/`
   - `artifacts/wave0/`
   - `artifacts/wave1/`
   - `artifacts/wave2/`
   - `final/`

2. Runtime Control Map
   - `rb_status.json`
   - `rb_queue.json`
   - `rb_trace.jsonl`
   - `rb_output_declarations.jsonl`
   - `_work_units/`

3. Diagnostics Map
   - `_logs/`
   - `_diagnostics/`
   - `_checkpoints/`

4. Reentry Pointers
   - read `rb_status.json.current_node`;
   - read trace and diagnostics;
   - do not infer phase completion from this map file.

#### 3. Update references and compatibility checks

Likely affected surfaces:

- bundle instantiation template mapping;
- `inspect-bundle.mjs` required/expected files;
- `check-reentry.mjs` advice text;
- `gate-instantiation-complete.definition.json`;
- file observability root-control-file list;
- phase-instantiation expected artifact list;
- `RUN.md`, `README.md`, `COMMANDS.md`, and command playbooks;
- tests and fixtures that expect `START_FROM_HERE.md`.

Compatibility choice:

- New bundles should use `BUNDLE_MAP.md`.
- Existing historical/test bundles may keep `START_FROM_HERE.md` unless tests are explicitly migrated.
- Inspection tools can report legacy `START_FROM_HERE.md` as deprecated rather than instantly invalid, if that keeps old run forensics readable.

### Acceptance criteria

- Root `CLAUDE.md` and `AGENTS.md` contain the built-in research shortcut suppression rule.
- New bundle instantiation writes `BUNDLE_MAP.md`.
- Instantiation gate expects or accepts the correct map file according to the chosen compatibility policy.
- `START_FROM_HERE.md` is no longer the primary name in docs for new bundles.
- `BUNDLE_MAP.md` content is primarily a bundle map, not a run command guide.

### Test plan

Add or update tests under:

- `tests/integration/cli/instantiate-run-bundle.test.mjs`
- `tests/integration/cli/inspect-bundle.test.mjs`
- `tests/integration/cli/check-reentry.test.mjs`
- `tests/integration/cli/validate-bundle.test.mjs`
- `tests/engine/helpers/file-observability.test.mjs`
- `tests/engine/static-regression.test.mjs`

Suggested tests:

- instantiation writes `BUNDLE_MAP.md`;
- inspect-bundle reports the bundle map;
- legacy `START_FROM_HERE.md` behavior is either accepted with deprecation or rejected with clear migration advice, depending on selected compatibility rule;
- docs/static tests confirm root entry files mention not using `deep-research` shortcut.

### Risks

- Renaming a root bundle file touches many tests and docs. Keep compatibility explicit.
- If both names are accepted forever, naming cleanup becomes toothless. Prefer a deprecation path: new bundles require `BUNDLE_MAP.md`; old bundles get readable advice.

## 5. Cross-Change Implementation Order

### Step 1: Runtime and handoff

Implement Change 1 completely before touching phase guidance.

Reason:

- Phase execution improvements will increase submit volume.
- If submit is still brittle, more parallelism means faster failure, not better throughput.
- Gate/handoff legality must be fixed before trying to prove Wave2 no longer skips.

### Step 2: Delegated phase behavior

Implement Change 2 after Change 1 tests pass.

Reason:

- Once submit and handoff are stable, Phase Agent can safely claim batches and submit as soon as files appear.
- Reference materialization depends on knowing which submitted ledger/cache rows are canonical.

### Step 3: Entry and bundle map

Implement Change 3 last.

Reason:

- It has broad docs/test churn but less runtime risk.
- It is easier to migrate names once the runtime behavior being documented is stable.

## 6. Bug Closure Mapping

| Bug | Close when |
| --- | --- |
| BUG-059 | CLI `--help` and suspicious bundle args cannot create junk directories. |
| BUG-060 | Predictable sub-agent output drift is normalized or rejected with clear diagnostics; submit/gate no longer burns attempts on wrapper/receipt/page-name/nonce mismatch. |
| BUG-063 | Failed gate cannot cascade into skipped Wave2/HITL2/final through manual status drift; legal handoff evidence is required. |
| BUG-046 | Wave0/Wave1 guidance uses bounded batch claim for independent work instead of serial `--count 1`. |
| BUG-062 | Phase Agent guidance actively polls work-unit outputs and does not wait for user "continue" or task notification. |
| BUG-064 | Wave1 topic reference files are Phase-owned materializations after successful submit. |
| BUG-065 | Wave2 pure synthesis explicitly creates source-backed `00-cross` references when appropriate, while new evidence remains delegated. |
| BUG-045 | Root entry instructions suppress built-in `deep-research` shortcut when DPT framework is selected. |
| BUG-061 | New bundles use `BUNDLE_MAP.md`, and content is a passive map rather than an action entrypoint. |

## 7. Open Questions To Resolve During Implementation

These should not block the plan, but they should be made explicit in the relevant change design/tasks.

1. Should derived/synthesis references use a new `output_files[].role`, or should Phase-owned reference files stay outside delegated ledger authority?
   - Recommended default: keep Phase-owned derived references outside delegated fetched-source authority unless a new role is explicitly specified and tested.

2. Should `page-content.md` normalization physically rename the file or only read it as canonical?
   - Recommended default: physically write/rename to `page.md` during submit normalization so later gate checks see canonical cache leaves.

3. Should nonce normalization rewrite the input result/receipt files or only canonicalize the accepted ledger row?
   - Recommended default: canonicalize accepted runtime files in the work-unit directory and ledger row, with a trace/log diagnostic.

4. Should old bundles with `START_FROM_HERE.md` pass validation?
   - Recommended default: new bundles require `BUNDLE_MAP.md`; legacy bundles get deprecation advice where possible.

5. Should active polling be documentation-only or backed by a CLI `wait` helper?
   - Recommended default: documentation-only first. Add `wait` only if implementation finds the loop too error-prone for agents to follow.

## 8. Non-Goals

- Do not add dependencies.
- Do not use Python.
- Do not move Agent semantic research, search, synthesis, or judgment into JS.
- Do not make Markdown the authority for queue, receipt, ledger, status, or gate truth.
- Do not create a broad manual `--force` status advance.
- Do not weaken provenance by counting direct filesystem files as delegated evidence without submitted ledger rows.
- Do not make `reference/00-cross-*.md` a place to invent unsupported synthesis claims.

## 9. Suggested Verification Commands

Use targeted tests first:

```bash
node --test tests/engine/work-unit-submit.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs
node --test tests/integration/cli/operate-queue.test.mjs
node --test tests/integration/cli/advance-status.test.mjs
node --test tests/integration/cli/handoff-witnessing-lifecycle.test.mjs
node --test tests/integration/md/phase-wave0-queue-loop.test.mjs
node --test tests/integration/md/phase-wave2-md-structure.test.mjs
node --test tests/integration/cli/instantiate-run-bundle.test.mjs
```

Then run broader framework checks:

```bash
npm test
```

If `npm test` is too broad or slow in the moment, run the relevant `node --test` slices and the framework validators touched by the change.

## 10. Final Recommendation

Proceed with exactly 3 changes:

1. **Runtime first**: make submit and handoff reliable.
2. **Phase behavior second**: make delegated work actually run like a multi-agent system and materialize references in the right layer.
3. **Entry/navigation last**: make future starts and reloads less misleading.

This gives a good balance: few enough changes to keep coordination light, but not so few that runtime authority, Agent behavior, and UX cleanup get tangled together.
