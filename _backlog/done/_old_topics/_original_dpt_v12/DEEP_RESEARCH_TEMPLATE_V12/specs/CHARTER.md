---
title: "Shared Charter"
role: "production and qualification authority"
scope: "valid generated-file contract, source-of-record model, canonical terms, copy boundary, shared spec set"
reads:
  - "specs/CONSTANTS.md"
writes: []
---

# Shared Charter

This file is part of the shared authority for both production and qualification. Production uses the shared spec set to create a valid run bundle and the five root control files: `PROFILE`, `PLAN`, `STATUS`, `QUEUE`, and `TRACE`. Qualification uses the same shared spec set independently to judge whether that bundle is valid after production.

The charter defines the output boundary, file authority model, canonical terms, and structural invariants. It does not prescribe the private reasoning or step-by-step process used to produce the files.

## Normative Authority Set

The shared correctness authority for both production and qualification has two layers:

- specs define object contracts, source-of-record boundaries, invariants, and gate criteria
- named flows define action sequencing, provider routing, cache/fan-in policy, and backfill flow only where the Projection Map names them

The normative spec set is:

- `specs/CONSTANTS.md`: package identity, current version, canonical enum values, placeholders, and reusable field names
- `specs/CHARTER.md`: generated-file boundary, Source of Record model, canonical terms, and copy boundary
- `specs/WORK_DIRECTORY_LAYOUT.md`: canonical run-bundle directory layout, path roles, hard directory boundaries, and canonical instance paths
- `specs/GATES.md`: gate index and shared gate principles
- `specs/gates/*.md`: per-gate pass/fail specifications
- `specs/RESEARCH_PROFILES.md`: research profile presets and configured floor formulas
- `specs/QUEUE_CONTRACT.md`: Queue authority boundary, Queue work-unit schema, producer rules, receipts, and projection constraints
- `specs/METHODOLOGY.md`: Deep Research evidence method, backfill discipline, exploration/exploitation, trace discipline, and source-intake delegation constraints

Named flow policy authorities are correctness authorities only for the rule families that cite them in the Projection Map. For example, `flows/queue-agentic-flow.md` owns Queue loop action order, while `specs/QUEUE_CONTRACT.md` owns the Queue object contract.

Boundary hook invocation is owned by `flows/execution-flow.md`; Boundary hook execution, repair routing, and Queue promotion/refill behavior are owned by `flows/queue-agentic-flow.md`. `specs/QUEUE_CONTRACT.md` owns the receipt vocabulary those hooks verify, not the hook action sequence.

`command_playbooks/instantiate-run-bundle.md` may read flows and output skeletons to create the run bundle once. `command_playbooks/check-instantiation.md` judges only the core generated run bundle and its five mutable control files. Seed-topic readiness is checked separately by `command_playbooks/check-seed-intake.md`. Output skeletons are projections and copyable runtime-file templates, not independent correctness authorities. A flow file is never a generated control file and must not be copied wholesale into a run file.

## Markdown Governance Anchors

This package is intentionally usable as Markdown-only. Quality control therefore depends on stable rule anchors, explicit projections, and adversarial review patterns inside the Markdown contract. Future external validators may assist, but they must not replace the shared spec set as the correctness authority.

Use invariant ids when referencing hard rules across files. The ids are navigation anchors, not a second rule source. If an invariant is copied into an output skeleton, keep the id stable and preserve the rule meaning even when wording is shortened for runtime use.

### Invariant Index

| invariant_id | rule anchor | fail condition |
| --- | --- | --- |
| `INV-BOUNDARY-001` | Instantiation produces one run bundle: `RUN_DIR/_framework/`, `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, and the mutable `RUN_DIR/seed_topics/` directory contract. | Run state, references, artifacts, final outputs, or Wave 0 evidence are created inside `_framework/` or during production qualification. |
| `INV-BUNDLE-001` | `RUN_DIR/_framework/` is the read-only framework snapshot by contract. | Run control files, topic registry state, `original_topic/`, `seed_topics/`, `_reference`, `_artifacts`, or any HITL2-mapped final output directory appears inside `_framework/`. |
| `INV-CMD-001` | Runtime commands are resolved through the instantiated `PLAN_PATH -> Runtime Command Entrypoint`, then local `RUN_DIR/_framework/COMMANDS.md`, while binding to the five root control files. | A command is run from source-template memory, points at `_framework/output_templates/*.md`, or cannot recover local command paths from `PLAN_PATH`. |
| `INV-SNAPSHOT-001` | `_framework/output_templates/*.md` are placeholder skeletons; the five root `profile/plan/status/queue/trace` files are instantiated control files and must have instantiation placeholders cleared while retaining runtime metavariables only in explicit schema/template/pattern guidance. | Runtime execution reads or overwrites root control files from `_framework/output_templates/*.md`, root control files retain unresolved instantiation placeholders, or runtime metavariables appear as active concrete values. |
| `INV-SOR-001` | Each information class has exactly one Source of Record. | A generated file mirrors another file's full authority surface or creates a competing registry/state surface. |
| `INV-GATE-001` | A gate passes only through the matching explicit audit surface in `STATUS_PATH`. | Prose confidence, chat memory, artifact count, or a loose summary is used as the pass basis. |
| `INV-GATE-002` | Later waves cannot start before the prior gate audit has `overall_result=pass` and the matching entry flag is `yes`. | Wave 1, Wave 2, or Readiness work starts while the required prior audit is still failed, missing, or partial. |
| `INV-REF-001` | Counted evidence requires accepted local reference inventory rows with required auditable fields. | Numeric counts lack local paths, acceptance status, source type, trust level, source family, tier, evidence role, source date scope, supported claims, webpage diagnostic fields, content retention decision, or seed-backfill status. |
| `INV-REF-002` | Artifacts, chat notes, and multi-source summaries never count as additional references. | A synthesis artifact, chat note, or multi-source file is counted as reference breadth. |
| `INV-REF-003` | Counted reference filenames preserve provenance: Wave 0 shared references use `00-shared-*`; Wave 1 topic references use `<topic-id>-*`. | Opaque global `ref-NNN-*` names make it impossible to see whether evidence came from shared foundation or a topic wave. |
| `INV-WEB-001` | Counted webpage evidence must pass the Webpage Material Diagnostic Gate and retain only qualified content. | A thin, marketing-only, verification-pending, or unpruned webpage is counted as accepted evidence or left as reusable reference body. |
| `INV-SEED-000` | A seed topic's upper section must meet the Seed Topic Intake Standard or expose queue-backed intake gaps before the topic is treated as ready. `gap_queue_backed` may pass setup only; it cannot pass Wave 0 topic-start rows or authorize Wave 1 deepening. | Placeholder growth-tail headings hide missing `must_answer`, why-now, boundary, evidence-anchor, or why-it-matters substance, or unresolved intake gaps are treated as Wave 1-ready. |
| `INV-SEED-001` | A topic-affecting accepted reference is not complete until topic seed backfill is current or explicitly queue-deferred. | A reference is counted for a topic while `seed_backfill_status` is missing, stale, or unqueued. |
| `INV-ROOT-001` | `RUN_DIR/seed_topics/` is the only formal Topic Root and owns `_reference` and `_artifacts`. | Active topics use `topics/`, references or artifacts point outside `seed_topics/`, or active evidence file sets are split across multiple roots. |
| `INV-ORIGINAL-001` | `RUN_DIR/original_topic/` is optional upstream decomposition material, not a formal seed topic root. | Original large-topic drafts are counted as Wave 1 seed topics or used as a competing topic registry. |
| `INV-ART-001` | Topic artifacts use the canonical per-topic directory layout under `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/`. | Topic artifacts are inconsistently flat, renamed per run, or stored in ad hoc directories that cannot be inferred from topic id and slug. |
| `INV-ART-002` | Topic artifacts are progressive execution products, not closeout cleanup. After a topic reaches its first topic-unique accepted reference and seed backfill is active, `evidence-summary.md` and `question-list.md` are produced or a concrete queue deferral is recorded. | Topic artifacts remain empty, stale, or absent until Wave 1 closeout even though topic evidence has landed, or hard questions live only in a question list. |
| `INV-QUESTION-001` | The per-topic `question-list.md` is the exploration ledger: it records reconciliation states, emergent-question protocol result, exploration/exploitation decision, trigger refs, and queue consequence. | The question list is blank, a copied seed list, or a generic question dump that does not grow or converge with evidence. |
| `INV-FINAL-001` | Final interpretation outputs live outside `_framework/` under the deterministic HITL2 mapping: `profile_default -> final/`, `executive_brief -> final_executive_brief/`, `evidence_map -> final_evidence_map/`, `claim_judgment -> final_claim_judgment/`, `technical_deep_dive -> final_technical_deep_dive/`, and `custom -> final_custom_{custom_final_report_view_slug}/`. | Final output is treated as gate evidence, stored inside `_framework/`, counted as references, uses an unmapped directory name, or bypasses unresolved gate gaps. |
| `INV-SYNTH-001` | Wave 2 requires a substantive `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`, coverage of confirmed `answer_phase=wave2_synthesis` must-answer entries, tagged high-leverage judgments, a populated Cross-Topic Conclusion Matrix, conflict/tension reconciliation, and local backing references. Single-topic runs may use `not_applicable_single_topic` only for comparison, not to skip synthesis. | Wave 2 passes from a fast status update, topic-note summarization, empty matrix, thin artifact, uncovered synthesis-phase must-answer entries, short ids, single-topic not-applicable without a locally backed synthesis row, or judgments that lack `claim_type`, `confidence`, and local `backing_refs`. |
| `INV-QUEUE-001` | Execution keeps a non-empty five-slot active queue unless `readiness_passed` or a real blocker is recorded; after `readiness_passed`, the queue keeps the `## Active Queue` anchor and records closure with `queue_health=closed`. | Queue work closes without refilling `slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail` or recording a valid blocker, or the stable Active Queue anchor is renamed during closeout. |
| `INV-QUEUE-002` | Queue tasks are derived from `PLAN` targets, `STATUS` gaps, gate gaps, or explicit triggers, and each active task records what it writes and which status fields it syncs. | `QUEUE` contains generic "continue research" actions, jumps waves, or omits artifact/backfill/trace work because task provenance and writeback are implicit. |
| `INV-TASK-001` | Native todo/task/plan surfaces are projections of `QUEUE_PATH`, not authorities. When available, mirror the active executable window: `slot_1_current / slot_2_next / slot_3_pending / slot_4_pending / slot_5_tail`. | Native tasks become chat/report tasks, `/goal` is treated as a framework-controlled action, the native projection diverges from `QUEUE_PATH`, or task completion skips queue promotion/refill before the Pre-Response Gate. |
| `INV-RESP-001` | User-Visible Stop Authorization is a persisted runtime state, not a chat judgment. `STATUS_PATH -> Operator View` and `QUEUE_PATH -> Active Queue` record `stop_authorization_state`. The default during execution is `unauthorized_continue_required`, which requires `unauthorized_stop_next_action` naming the next concrete tool/file/search/check/refill/promotion action and `safe_to_interrupt=no`. User-visible output is authorized only for `final_delivery`, `decision_blocker`, or `empty_queue_after_refill`. The planned HITL2 stop is a `decision_blocker` only after the human-decision brief exists and PROFILE/STATUS/QUEUE are synced to the HITL2 `pending_user` state. `final_delivery` requires `STATUS.state=completed`, `current_gate=readiness_passed`, `next_gate=none`, `Readiness Check.closeout_phase=closed`, and the Active Queue closed with `closure_reason=readiness_passed`; a completed batch, passed gate, refreshed artifact, synced status, milestone, or known next task is not terminal. | The agent reports routine progress, recaps a milestone, asks for encouragement/continuation, claims final delivery from a half-closed readiness state, waits for user review while executable queue work exists, sets `safe_to_interrupt=yes` under `unauthorized_continue_required`, asks HITL2 before the brief and pending-user fields exist, or omits the concrete next action. |
| `INV-RESP-002` | Post-Gate Continuation is part of gate closeout. Wave 0 closeout is not complete until Wave 1 continuation work is queued and the first non-chat Wave 1 action has started, or a real blocker is recorded. Wave 1 closeout is not complete until Wave 2 synthesis/action is queued and started, or a real blocker is recorded. Wave 2 closeout cannot produce a routine progress summary; it must continue into HITL2 brief preparation and then either activate the explicit HITL2 `pending_user` decision blocker or record the decision and resume toward Readiness. | A Wave 0/Wave 1/Wave 2 gate pass is followed by a recap, "continue?", "adjust direction?", "await user review", or a safe interrupt while queue-ready continuation work exists. |
| `INV-INTAKE-001` | Source intake delegation is foreground queue work. Delegated runners write assigned `_cache` staging paths only; the main agent owns fan-in, promotion, shared files, topic seed backfill, evidence counting, gate passage, and final citation. | Source intake runs as detached background work, raw retrieval bypasses `_cache`, delegated runners write shared files, `_cache` is counted as evidence, or counts advance before main-agent fan-in review. |
| `INV-TRACE-001` | Trace is append-only diagnostic memory, not routine progress. | Trace records ordinary quota progress, routine reference capture, or mutable worklog state. |
| `INV-TRACE-002` | Wave 0, Wave 1, Wave 2, and Readiness transitions require distinct trace checkpoints in the same closeout with exact `gate_transition` values `wave0_complete`, `wave1_complete`, `wave2_complete`, and `readiness_passed`; `STATUS.Trace Pointer.last_trace_entry` must point to the latest trace entry. | A gate appears to pass while trace is dormant, a final correction is used as a substitute for missing Wave checkpoints, or trace entries are bulk-backfilled later after the user asks why progress stalled. |
| `INV-READY-001` | Readiness is final; failures refill Wave 2 or earlier work and post-readiness maintenance is bounded. | A Wave 3, hidden completion stage, new source discovery, new claims, or gate repair is introduced after Readiness. |
| `INV-TOPO-001` | Runtime topic topology changes are controlled mutations of the generated run files, not re-instantiation. | New topic candidates rerun `instantiate-run-bundle`, replace the run files from skeletons, or create a competing topic registry outside `PLAN_PATH`. |
| `INV-TOPO-002` | Formalized new topics use append-only stable ids and must sync plan, status, queue, topic seed, trace, and affected gates. | Existing topic ids are renumbered, a formalized topic appears only in one file, pending candidates lack disposition, or a passed affected gate is not reopened with queue repair work. |

### Projection Map

Rules may be repeated because generated files must be self-contained. Treat repeated rules as projections of the shared spec set, not as independent authorities.

Projection copies may be complete enough for a generated run to execute without rereading the source template package, but they must not become a second definition. When a projected copy needs to be changed, update the canonical authority first, then update only the necessary projection targets and verifier checks.

This map is for maintainers. Production may use projection targets while creating the run bundle, but qualification still reads only the shared spec set plus the generated run bundle and its mutable control files.

| canonical rule family | canonical authority | projected into | qualification surface |
| --- | --- | --- | --- |
| Template package identity, current version, placeholder classes, enum values, and reusable field names | `specs/CONSTANTS.md` | `README.md`; `VERSION-LOG.md`; `output_templates/PLAN.md`; frontmatter `template_version` placeholders; CLI helper diagnostics | version placeholder consistency; instantiation placeholder cleanup; runtime metavariable placement; enum consistency; schema field consistency |
| Run bundle boundary, directory layout, and copy boundary | `specs/CHARTER.md`; `specs/WORK_DIRECTORY_LAYOUT.md` | `command_playbooks/instantiate-run-bundle.md`; `flows/instantiation-flow.md`; `output_templates/*` | bundle boundary; directory layout; control-file boundary; placeholder residue |
| Source of Record and structural spine | `specs/CHARTER.md` | `output_templates/PROFILE.md`; `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `output_templates/TRACE.md` | source-of-record boundaries |
| Gate invariants and quantitative floors | `specs/GATES.md`; `specs/gates/*.md` | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md` | quantitative gate audits; count integrity; synthesis integrity |
| Research profile presets and configured floor formulas | `specs/RESEARCH_PROFILES.md` | `output_templates/PROFILE.md` run-local configured copy; `output_templates/PLAN.md` projection; `flows/instantiation-flow.md` creation instructions; `command_playbooks/adjust-profile-parameters.md` controlled mutation guidance | research profile; configured floor consistency |
| Local reference schema, accepted/excluded inventory fields, webpage diagnostic gate, and evidence ladder | `specs/METHODOLOGY.md -> Reference Quality / Local Reference Schema / Webpage Material Diagnostic Gate` | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `flows/reference-artifact-backfill.md`; `flows/execution-flow.md`; source-intake delegated runner contract | count integrity; runtime evidence inventory |
| Source intake cache, provider profiles, and foreground runner fan-in | `flows/source-intake-flow.md`; `flows/source-intake-profiles/`; `specs/METHODOLOGY.md -> Source Intake Delegation` | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `flows/execution-flow.md`; `flows/reference-artifact-backfill.md` | cache boundary; source-intake runner state; promote-only evidence counting |
| Topic seed backfill, artifact lifecycle, canonical artifact layout, and question-list ledger | `specs/METHODOLOGY.md -> Topic Seed Backfill / Artifacts / Artifact Lifecycle / Question List As Exploration Ledger` | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `flows/reference-artifact-backfill.md`; `command_playbooks/check-runtime.md` | count integrity; artifact layout and freshness; queue continuity |
| Exploration, stop conditions, anti-stall, and question-list convergence | `specs/METHODOLOGY.md`; `specs/GATES.md` | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `flows/execution-flow.md`; `command_playbooks/check-runtime.md` | count integrity; queue continuity; exploration ledger integrity |
| Queue object contract, work-unit fields, producer rules, and Critical Checkpoint Receipts | `specs/QUEUE_CONTRACT.md` | `output_templates/QUEUE.md`; `output_templates/PLAN.md`; `output_templates/STATUS.md`; `command_playbooks/check-runtime.md`; `command_playbooks/check-queue-receipts.md` | queue work-unit contract; receipt preflight; artifact steering receipts; producer/lineage/writeback completeness |
| PROFILE -> PLAN -> STATUS -> QUEUE execution dependency and Queue-driven agentic loop | `specs/QUEUE_CONTRACT.md`; `flows/queue-agentic-flow.md`; `flows/execution-flow.md` | `output_templates/PROFILE.md`; `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `command_playbooks/check-runtime.md` | queue task lineage; gate progression; receipt and writeback completeness |
| Silent autonomous execution, Rolling Task Projection, User-Visible Stop Authorization, and Post-Gate Continuation | `specs/QUEUE_CONTRACT.md`; `flows/queue-agentic-flow.md`; `flows/execution-flow.md` | `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `output_templates/TRACE.md`; `command_playbooks/check-runtime.md` | queue continuity; task projection consistency; user-visible output authorization; post-gate continuation state |
| Runtime topic topology delta field contract and protocol | `specs/CHARTER.md` for Source-of-Record and field ownership; `specs/METHODOLOGY.md -> Runtime Topic Delta Protocol` for runtime method | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `output_templates/TRACE.md`; `flows/execution-flow.md`; `command_playbooks/formalize-topology-delta.md` | topology delta integrity; queue continuity; gate reopen integrity |
| Readiness and post-readiness maintenance | `specs/CHARTER.md`; `specs/GATES.md`; `specs/METHODOLOGY.md` | `output_templates/PLAN.md`; `output_templates/STATUS.md`; `output_templates/QUEUE.md`; `flows/reference-artifact-backfill.md` | synthesis integrity; retrieval continuity |

## Template Package Boundary

This template package has one invocation path: create a run bundle under `RUN_DIR`.

| package invocation | output | must not do |
| --- | --- | --- |
| Generate, repair, review, or complete a candidate run bundle before execution begins | create `RUN_DIR/_framework/`, five mutable control files directly under `RUN_DIR`, and the `RUN_DIR/seed_topics/` directory contract | write run state inside `_framework/`, create references, create artifacts, create final output, enter Wave 0, or relaunch an already qualified run |

After the bundle passes instantiation qualification, the source template package's job is complete. Later execution must be driven by the generated run files and local `RUN_DIR/_framework/`; do not use the source template directory or `command_playbooks/instantiate-run-bundle.md` as the runtime launcher.

## Frontmatter Read Graph

Frontmatter `reads` is a machine-load dependency graph, not a navigation backlink list.

- paths in `reads` are package-root relative
- `README.md` is a package map and should normally have `reads: []`
- `command_playbooks/instantiate-run-bundle.md` is the one-time creator for the run bundle
- `command_playbooks/check-instantiation.md` is the core post-creation verifier and must read the shared spec set, not the creator playbook or output skeletons
- `command_playbooks/check-seed-intake.md` is the seed readiness verifier after core instantiation passes
- the creation graph must remain acyclic
- do not add reverse reads just because two files mention each other

## Canonical Terms

- `Source of Record`: the single authoritative location for a class of information.
- `Run Bundle`: one runnable V12 work directory containing `RUN_DIR/_framework/`, five mutable control files, `seed_topics/`, optional `original_topic/`, and optional `final` outputs.
- `Read-Only Framework`: `RUN_DIR/_framework/`, the run-local framework snapshot. It is read-only by contract and may contain `cli_tools`, but it must not contain run-specific state.
- `Runtime Command Entrypoint`: the generated `PLAN_PATH` section that minimally points long-running agents to local `RUN_DIR/_framework/COMMANDS.md`, local read-only CLI helpers, and the five instantiated root control files.
- `Output Templates`: `RUN_DIR/_framework/output_templates/PROFILE.md`, `PLAN.md`, `STATUS.md`, `QUEUE.md`, and `TRACE.md`. They are template skeletons and may contain instantiation placeholders and runtime metavariables.
- `Instantiated Control Files`: the five mutable root files under `RUN_DIR`: `<PLAN_BASENAME>.profile.md`, `<PLAN_BASENAME>.plan.md`, `<PLAN_BASENAME>.status.md`, `<PLAN_BASENAME>.queue.md`, and `<PLAN_BASENAME>.trace.md`. Instantiation placeholders must be resolved; runtime metavariables may remain only in explicit schema/template/pattern guidance.
- `original_topic`: optional mutable upstream directory for a broad original topic, source prompt, background material, and decomposition drafts. It is not a formal topic root and is never counted in Wave 1.
- `seed_topics`: the only formal topic execution root for V12 runs. `REFERENCE_DIR` and `ARTIFACT_DIR` are fixed under this directory.
- `final_*` directories: deterministic final interpretation directories from the HITL2 mapping. `profile_default` uses `final`; built-in named HITL2 views use `final_executive_brief`, `final_evidence_map`, `final_claim_judgment`, or `final_technical_deep_dive`; `custom` uses `final_custom_{custom_final_report_view_slug}`.
- `design-time`: static intent, parameters, topology, wave design, acceptance criteria.
- `run-time`: current state, blocker, gate, worklog, branch disposition, resume point.
- `controlled mutation`: allowed design-time updates to generated run files. Profile and configured-parameter changes update `PROFILE_PATH` first and then mirror only the execution-readable projection into `PLAN_PATH`; topology formalization, instance path correction, and main task changes mutate the smallest owning generated surface.
- `Authoritative Copy`: a local reference document that captures a source well enough to be reused without relying on chat memory.
- `topic registry`: the design-time registry of topic id, slug, seed files, current hypothesis, why it matters, and must-answer.
- `Execution Queue`: the active execution action ledger in `QUEUE_PATH`.
- `Queue Work Unit Contract`: the `specs/QUEUE_CONTRACT.md` rule that every active Queue slot and Refill Pool candidate is executable, auditable, and repairable through producer, lineage, meaning, impact, receipts, done condition, verification, writeback, status sync, completion receipt, and failure route fields.
- `Queue Task Lineage`: the rule that every active queue task names the `STATUS` gap, gate gap, `PLAN` target, source gap, or trigger that produced it. Queue tasks execute missing work; they do not invent new authority.
- `Critical Checkpoint Receipts`: durable local receipts checked at phase and steering boundaries, such as setup-to-Wave-0, Wave 0-to-Wave-1, Wave 1 topic fan-in steering, Wave 1-to-Wave-2, Wave 2-to-HITL2/readiness, and Readiness-to-final-delivery.
- `Boundary Hooks`: named call points in `flows/execution-flow.md` that force the matching Critical Checkpoint Receipt through `flows/queue-agentic-flow.md` before the next lifecycle edge may start. They are Queue-visible foreground work, not a separate flow or hidden background event handler.
- `No-Empty-Queue`: the queue-continuity rule that keeps executable work available; it is necessary but insufficient because it does not decide whether the agent is allowed to speak to the user.
- `Rolling Task Projection`: the platform-visible task-window rule. `QUEUE_PATH` remains the Source of Record; when a native todo, task, or plan surface is available, mirror the active executable window: `slot_1_current`, `slot_2_next`, `slot_3_pending`, `slot_4_pending`, and `slot_5_tail`. If no native surface exists, continue from `QUEUE_PATH` only. Urgent work still enters through `QUEUE_PATH`; a displaced tail task is returned to Refill Pool with restore priority rather than hidden in a second queue.
- `User-Visible Stop Authorization`: the persisted runtime contract that decides whether the agent may stop and speak to the user. It is recorded as `stop_authorization_state` in `QUEUE_PATH -> Active Queue` and mirrored in `STATUS_PATH -> Operator View`. The default is `unauthorized_continue_required`, which requires `safe_to_interrupt=no` and `unauthorized_stop_next_action` naming the next concrete tool/file/search/check/refill/promotion action. Authorized stop states are only `final_delivery`, `decision_blocker`, and `empty_queue_after_refill`. HITL2 uses `decision_blocker` only after its brief and `pending_user` projections are written.
- `Pre-Response Gate`: the check of User-Visible Stop Authorization before any assistant message. Before any user-visible assistant message, the agent must be in `final_delivery`, `decision_blocker`, or `empty_queue_after_refill`; `final_delivery` requires `STATUS.state=completed`, `current_gate=readiness_passed`, `next_gate=none`, `Readiness Check.closeout_phase=closed`, and the Active Queue closed with `closure_reason=readiness_passed`. Otherwise the next assistant action must be another tool, file, search, verification, queue-promotion, or artifact action.
- `Post-Gate Continuation`: the rule that a Wave 0, Wave 1, or Wave 2 gate pass is not a user-visible stopping point. Wave 0 closeout must continue into a concrete Wave 1 non-chat action; Wave 1 closeout must continue into a concrete Wave 2 synthesis/action; Wave 2 closeout must continue into HITL2 brief preparation and the explicit `pending_user` decision state or into the recorded/resume path. If continuation is impossible, record a real `decision_blocker`; do not ask the user to continue or adjust direction during the middle waves.
- `Diagnostic Trace`: append-only diagnostic record in `TRACE_PATH`.
- `Trace Checkpoint`: a required trace entry for Wave 0, Wave 1, Wave 2, and Readiness transitions. The checkpoint records the transition, evidence bundle, remaining gaps or reopen triggers, queue consequence, and status pointer sync.
- `navigation pointer`: cross-file pointer used only for finding the authority, never as a second authority.
- `30-Second Local Evidence Retrieval`: a navigation standard: a new agent can locate the profile, plan, status, queue, trace, reference index, and key evidence paths in 30 seconds from local files.
- `setup_ready`: a non-research transition gate after instantiation and before Wave 0. It confirms the execution workspace, navigation stubs, reference/artifact directories, seed growth sections, and seed intake assessment are ready or queue-backed. `seed_topic_intake_ready=yes` requires `derived_topic_count > 0` and all confirmed topics intake-ready; `derived_topic_count=0` must use `gap_queue_backed` with concrete decomposition/intake queue work. It is not a fifth research wave and cannot satisfy any evidence floor.
- `Foundation Sufficiency Check`: a qualitative sub-check inside the `Wave 0 Foundation Gate Audit` that confirms shared terms, core objects, evidence buckets, and topic starting points are usable. It is not an independent gate and cannot authorize Wave 1 by itself.
- `Wave 0 Foundation Gate Audit`: the required pre-Wave-1 checklist that verifies shared reference floors, source mix, retrieval, and per-topic starting points.
- `Wave 1 Source Floor Audit`: the required pre-Wave-2 audit that compares each topic's accepted, topic-relevant references against the Wave 1 floors and records any justified exception.
- `Wave 2 Synthesis Gate Audit`: the required pre-readiness audit that verifies synthesis coverage, judgment tagging, local backing references, and unresolved conflict handling. For a single-topic run, cross-topic comparison may be `not_applicable_single_topic`, but the synthesis artifact and matrix still need locally backed conclusions.
- `Anti-Stall Degradation Rule`: after bounded attempts on a single detail, record the limitation, downgrade confidence if needed, and continue the queue.
- `Wave 2 judgment tagging`: minimal labels for important synthesis judgments: claim type, confidence, and backing local references.
- `Accepted Reference Inventory`: the evidence-path-level list of counted references for a topic or gate, including local path, acceptance status, source type, trust level, source family, source tier, evidence role, source date scope, supported claims, topic-unique status where applicable, seed-backfill status, webpage diagnostic fields, cross-verification status, and content retention decision.
- `Excluded Reference Inventory`: the evidence-path-level list of reviewed but uncounted sources, with exclusion reason.
- `Webpage Material Diagnostic Gate`: the hard pre-count check for webpage or webpage-derived sources. It records substance, commercial intent, marketing risk, cross-verification need/status, and content retention decision before a web source can count as evidence.
- `Cross-Topic Conclusion Matrix`: the Wave 2 audit surface listing topic, covered `must_answer_ids` where applicable, conclusion, compared-with topic or object, claim type, severity, confidence, backing references, independent reference count, scarcity exception, and conflict status. In single-topic runs, `compared_with=not_applicable_single_topic` is allowed only on concrete locally backed synthesis rows.
- `Critical Claim Checks`: additional high-risk claim checks; they never disable or replace Wave 0, Wave 1, Wave 2, or Readiness gate audits.
- `Gate Reopen`: when later evidence invalidates a previously passed gate, restore `current_gate` to the last still-valid prior gate, set `current_wave` to the work that must be redone, record `reopened_from_gate / reopen_reason / invalidated_claims`, and refill same-wave queue work.
- `operator`: the human or downstream team applying the research deliverable. `operator_notes` are optional practical runtime implications for that human; they are not evidence and never replace local backing references.
- `Runtime Qualification`: an execution-phase drift audit that checks generated run files, reference inventories, topic seed backfill, artifacts, gate state, and retrieval continuity after execution has begun.
- `Readiness Check`: the final completion check after Wave 2 passes; failures refill Wave 2 or earlier queue work rather than creating a later wave. After `readiness_passed`, only bounded maintenance such as URL repair of already accepted references is allowed; it must not create a new research stage, new source discovery, or new gate.
- `Closed Active Queue`: the post-`readiness_passed` queue shape. The section heading remains `## Active Queue` for stable Markdown governance, while fields record `queue_health=closed` and `closure_reason=readiness_passed`; it is final-delivery-valid only when `STATUS.state=completed`, `next_gate=none`, and `Readiness Check.closeout_phase=closed`.
- `Markdown Governance Anchors`: stable invariant ids, projection map rows, and anti-pattern review prompts used to make Markdown-only governance less drift-prone.
- `Operator View`: a compact navigation and recovery summary inside generated run-time control files. It is not a new authority surface and cannot override the Source of Record matrix.
- `File Role Snapshot`: a static role reminder inside design-time or append-only files. It must not contain live progress.
- `Gate Rationale Note`: the short narrative companion to a gate audit explaining what changed the gate state, what remains unresolved, why unresolved items do or do not block the gate, and what would reopen the gate. It is not gate-authoritative.
- `Question Reconciliation`: the revision step applied to a topic seed's `待验证问题` after evidence backfill and before new `[涌现]` questions are generated. It removes resolved questions, marks partial progress, keeps open questions, and marks internal-data-only questions.
- `Question List As Exploration Ledger`: the artifact-level record of how a topic's uncertainty changed. It must show reconciled question states, emergent-question protocol result, exploration/exploitation decision, trigger refs, and queue consequence.
- `Reference Filename Provenance`: counted reference filenames expose their scope: `00-shared-*` for Wave 0 shared foundation and `<topic-id>-*` for Wave 1 topic evidence. Opaque `ref-NNN-*` names are migration residue, not the counted-reference convention for this template.
- `Topology Delta`: a runtime change to topic structure discovered after execution begins. It starts as a candidate in `STATUS_PATH`, is triaged as `merge_existing / formalize_new_topic / suspend / archive / redirect`, and becomes authoritative only when `PLAN_PATH -> Topic Registry` is updated for formalized topics.
- `Topology Formalization Gate`: the controlled mutation checkpoint for adding a new topic, merging a candidate into an existing topic, or redirecting topology after evidence digging. It writes generated run files only and never reruns template creation.
- `Run Profile File`: the root control file at `PROFILE_PATH`, normally `RUN_DIR/<PLAN_BASENAME>.profile.md`. It owns run-specific user intent that can change during the run: selected profile, root must-answer set, configured profile parameters, manual overrides, and HITL1/HITL2 human decisions.
- `Final Must-Answer Intake`: the user-facing startup surface collected with the mandatory profile choice and stored in `PROFILE_PATH -> Root Must-Answer Set`, with any plan/status projection treated as a mirror. It records the questions or claims the final Deep Research result must answer, or a visible queue-backed gap when the user is unsure. These entries form the root lens for mapping topic-level investigation targets and synthesis-level coverage rows.
- `Human Decision Checkpoints`: the two allowed 人工确认（human-in-the-loop / HITL）decision points recorded in `PROFILE_PATH` and mirrored in `STATUS_PATH`. HITL1 captures the public research profile and root must-answer set before execution. HITL2 occurs after Wave 2 synthesis assessment and before Readiness closeout; `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision` is the HITL2 Source of Record, while `STATUS_PATH -> Human Decision Checkpoints`, `STATUS_PATH -> Wave 2`, and `STATUS_PATH -> Wave 2 Human Decision Brief` are projections. Readiness requires `PROFILE.hitl2_checkpoint_status=recorded`, `STATUS.hitl2_wave2_readiness_decision_status=recorded`, and the PROFILE `HITL2_wave2_readiness_decision` row `status=recorded`.
- `Answerability Class`: the HITL2 classification of whether the run can responsibly answer the root lens. `ready_substantive` and `ready_insufficient_judgment` may proceed to Readiness only after the HITL2 recorded-state contract is satisfied and the human decision is recorded as `user_decision=proceed_to_readiness` with a concrete final report view and deterministic `final_output_dir`; `request_view_revision`, `repair_and_rerun`, `stop_blocked`, and `blocked_repair_required` keep Readiness blocked. `request_view_revision` queues concrete view clarification and must later be replaced by `proceed_to_readiness` before Readiness.
- `Seed Topic Intake Standard`: the minimum upper-section shape required before a seed topic can be treated as ready for Deep Research. It defines the topic's identity, seed must-answer, boundaries, timing, evidence route, and initial gap. Missing growth-tail sections may be inserted during setup; missing intake substance is an intake gap that must be made explicit in the plan/status/queue. `seed_topic_intake_ready=gap_queue_backed` may pass setup only when concrete repair work exists; it does not make the topic Wave 1-ready.
- `Topic Root`: `RUN_DIR/seed_topics`, the only directory that contains active seed topic files. `topics/` is not a V12 active topic root. `REFERENCE_DIR` must be `RUN_DIR/seed_topics/_reference` and `ARTIFACT_DIR` must be `RUN_DIR/seed_topics/_artifacts`.
- `Topic Investigation Targets`: the per-topic hard-question target section inside `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/question-list.md`. It records target ids, target questions, origin, status, profile relevance, evidence refs, next action, and last updated ref count. It is topic-local and distinct from `PROFILE_PATH -> Root Must-Answer Set`, and it is the first section of the four-section Wave 1 exploration ledger.
- `Topic Target Coverage`: the per-topic evidence coverage section inside `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`. It records target ids, coverage status, backing refs or queue consequence, and last updated ref count.
- `Canonical Artifact Layout`: topic artifacts live at `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md` and `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/question-list.md`; Wave 2 synthesis lives at `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`; `ARTIFACT_DIR/README.md` indexes them.

## Canonical Retrieval Names

Use these labels for local search, handoff, and file navigation.

- `Template Package Boundary`
- `Instantiation Mode`
- `Run Execution State`
- `Autonomous Execution Protocol`
- `Anti-Stall Degradation Rule`
- `Topology Formalization Gate`
- `Foundation Sufficiency Check`
- `Wave 0 Foundation Gate Audit`
- `Wave 1 Source Floor Audit`
- `Wave 2 Synthesis Gate Audit`
- `Human Decision Checkpoints`
- `Accepted Reference Inventory`
- `Excluded Reference Inventory`
- `Cross-Topic Conclusion Matrix`
- `Critical Claim Checks`
- `Runtime Qualification`
- `Early Saturation Protocol`
- `Operator-Complete Capture Checklist`
- `Structural Spine`
- `Minimal Runtime Bindings`
- `Canonical Field Role Notes`
- `Canonical Runtime Authority`
- `Write Ownership`
- `Fan-In Protocol`
- `Race Condition Rules`
- `No-Empty-Queue Rule`
- `Rolling Task Projection`
- `Pre-Response Gate`
- `User-Visible Stop Authorization`
- `Post-Gate Continuation`
- `Silent Autonomous Execution`
- `Suspended Branch Protocol`
- `Execution Queue`
- `QUEUE_PATH`
- `TRACE_PATH`
- `Trace Recording Protocol`
- `30-Second Local Evidence Retrieval`
- `Queue Work Unit Contract`
- `Critical Checkpoint Receipts`
- `human-in-the-loop`
- `Markdown Governance Anchors`
- `Invariant Index`
- `Projection Map`
- `Maintainer Change Checklist`
- `Operator View`
- `File Role Snapshot`
- `Mandatory Failure Hunt`
- `Formally Valid But Actually Failing`
- `Gate Rationale Note`

## Source of Record Matrix

| information class | authority | allowed duplication | mutation rule |
| --- | --- | --- | --- |
| instance parameters | `PLAN_PATH -> Instance Config` | path pointers only | controlled mutation in plan |
| run-specific profile configuration and human decisions | `PROFILE_PATH -> Profile Binding`, `Configured Profile Parameters`, `Root Must-Answer Set`, `Search Preference Intake`, and `Human Decision Checkpoints` | execution-readable projection in `PLAN_PATH`; compact checkpoint mirrors in `STATUS_PATH` | update PROFILE first through HITL capture or `adjust-profile-parameters`; then sync only the necessary PLAN/STATUS/QUEUE projections |
| runtime command entrypoint | `PLAN_PATH -> Runtime Command Entrypoint` | short pointers in status/queue | controlled mutation in plan; command playbooks remain under local `_framework` |
| framework rules | `RUN_DIR/_framework/` | short pointers in run files | read-only by contract; update only by creating a new run bundle or explicit framework migration |
| work directory layout | `specs/WORK_DIRECTORY_LAYOUT.md` | projected path summaries in command playbooks, output templates, and CLI diagnostics | update the spec first; projections must not invent alternate roots or layouts |
| original large topic material | `RUN_DIR/original_topic/` when present | summary only | optional upstream decomposition surface; not counted as seed topics |
| topic registry | `PLAN_PATH -> topic registry` | ids/slugs/counts only | topic changes update plan first; new topic ids are append-only and existing ids are never renumbered |
| topology delta | `STATUS_PATH -> Topology Delta` | summary only | run-time delta only; formalized deltas must sync plan, status, queue, topic seed, trace, and affected gate consequence |
| gate model | `shared spec set + PLAN_PATH -> Control Map` | status records current gate | plan records execution-readable gate target projections from PROFILE-backed configured parameters; `specs/GATES.md` indexes pass criteria and `specs/gates/*.md` defines each gate |
| gate state | `STATUS_PATH -> Gate State` | no duplication in plan | status updates during execution |
| execution queue | `QUEUE_PATH` | status has queue pointer only | queue updates continuously; active tasks must cite a source gap/trigger and write back to local files plus status |
| native todo/task/plan projection | `QUEUE_PATH -> Active Queue` rolling task projection fields | native platform task lists may mirror only the active executable window; status may show compact projection state | projection must be recreated from `QUEUE_PATH`; slash commands such as `/goal` are optional user-side aids, not framework-controlled queue actions |
| user-visible output authorization | `QUEUE_PATH -> Active Queue` User-Visible Stop Authorization fields; `STATUS_PATH -> Operator View` mirrors the compact authorization pointer; `TRACE_PATH` records post-gate continuation checkpoints | compact status pointer only | during execution, output is unauthorized unless final delivery (`STATUS.state=completed`, `current_gate=readiness_passed`, `next_gate=none`, `Readiness Check.closeout_phase=closed`, closed queue), a concrete decision blocker, or empty queue after documented refill/suspend/archive/redirect attempts is recorded; `unauthorized_continue_required` requires `safe_to_interrupt=no` and a concrete `unauthorized_stop_next_action` |
| source intake cache | `RUN_DIR/_cache/` | status/queue may cite compact candidate-card paths and main-agent promote-log paths only | staging only; cache material must be promoted to `REFERENCE_DIR/*.md` by main-agent fan-in before it can count as evidence |
| diagnostic trace | `TRACE_PATH` | status carries the trace pointer plus per-transition trace checkpoint pointers | append-only; distinct wave/readiness transition checkpoints update `STATUS.Trace Pointer.last_trace_entry` and the matching transition pointer |
| wave progress | `STATUS_PATH -> Wave sections` | plan defines wave design and configured targets only | status updates during execution |
| wave gate audits | `STATUS_PATH -> Wave 0 Foundation Gate Audit` / `Wave 1 Source Floor Audit` / `Wave 2 Synthesis Gate Audit` | plan projects PROFILE-backed configured floors and defines gate targets only; `specs/gates/*.md` defines criteria | relevant audit must pass before next wave or readiness |
| accepted and excluded reference inventories | `STATUS_PATH -> Wave 0 Foundation Gate Audit` / `Wave 1 Source Floor Audit` and relevant reference files | short paths only in queue/status; evidence body remains in references | update before any source-floor gate passes |
| cross-topic conclusion matrix | `STATUS_PATH -> Wave 2 Synthesis Gate Audit` plus synthesis artifact | artifacts may elaborate; status remains the gate audit surface | update before Wave 2 or Readiness can pass |
| operator view | generated run-time control file | compact navigation summary only | must remain consistent with the owning file's Source of Record |
| file role snapshot | design-time or append-only generated control file | static role reminder only; no live progress | update only if file role changes |
| gate rationale note | `STATUS_PATH` gate audit section | short narrative only; audit rows and inventories remain authoritative | update with the matching gate audit |
| 30-second retrieval | `REFERENCE_DIR/_INDEX.md` + run README pointers | short pointers in README/status | navigation only, no evidence body |
| evidence body | `REFERENCE_DIR/*.md` | seed/artifact/readme cite it | references hold evidence |
| derived synthesis | `ARTIFACT_DIR` | can be cited by seed | artifacts do not replace evidence |
| final interpretation output | HITL2-recorded `RUN_DIR/final/`, `RUN_DIR/final_executive_brief/`, `RUN_DIR/final_evidence_map/`, `RUN_DIR/final_claim_judgment/`, `RUN_DIR/final_technical_deep_dive/`, or `RUN_DIR/final_custom_{custom_final_report_view_slug}/` | may cite local references and artifacts | final output does not authorize gate passage or replace evidence |
| navigation | README / `_INDEX.md` | short pointers only | navigation only |

## Structural Spine

| object | role | write boundary |
| --- | --- | --- |
| `RUN_DIR/_framework` | read-only framework snapshot | no run state, references, artifacts, original topic, seed topics, or final outputs |
| `RUN_DIR/_framework/output_templates/*.md` | placeholder output skeletons | creation source only; not runtime control files |
| `PLAN_PATH` | design-time blueprint | no live progress, no worklog, no active queue |
| `STATUS_PATH` | run-time state | no complete blueprint, no active queue copy |
| `QUEUE_PATH` | execution actions | no full status mirror, no evidence body |
| `TRACE_PATH` | diagnostic decisions | no routine worklog, no full status |
| `RUN_DIR/_cache` | source intake staging | runner-owned retrieval batches, raw-ish captures, candidate cards, excluded-source notes, plus main-agent fan-in promote log only; no gate authority and no evidence counting |
| `RUN_DIR/original_topic` | optional large-topic decomposition surface | upstream drafts only; not a formal seed topic root |
| `TOPIC_ROOT` | formal seed topic surface | must be `RUN_DIR/seed_topics` |
| `REFERENCE_DIR` | evidence | each important source as its own file; must be `RUN_DIR/seed_topics/_reference` |
| `ARTIFACT_DIR` | derived synthesis | summaries, question lists, Wave 2 synthesis; must be `RUN_DIR/seed_topics/_artifacts` |
| HITL2-mapped `RUN_DIR/final*` directory | final interpretation output | no gate authority and no evidence counting |
| README / `_INDEX.md` | navigation | no long-form evidence or live state |

## Canonical Enums

Canonical enum values live in `specs/CONSTANTS.md -> Run State Enums`, `Research And Evidence Enums`, and `Topic And Topology Enums`. CHARTER owns where these fields are allowed to act as Source-of-Record surfaces; it does not redefine their allowed values.

| enum family | primary surfaces | authority note |
| --- | --- | --- |
| run state and gate progression | `STATUS_PATH`, `QUEUE_PATH`, gate audits | field values come from `specs/CONSTANTS.md`; pass/fail authority still comes only from the matching audit surface |
| research profile parameters and evidence diagnostics | `PROFILE_PATH`, `PLAN_PATH` projection, accepted/excluded inventories, reference files | field values come from `specs/CONSTANTS.md`; profile formulas live in `specs/RESEARCH_PROFILES.md`; run-specific configured parameters live in `PROFILE_PATH`; gate floors are checked through `specs/gates/*.md` |
| topic stop, branch, and topology decisions | `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, controlled `PLAN_PATH` mutations | field values come from `specs/CONSTANTS.md`; mutation protocol remains in `specs/METHODOLOGY.md` and `command_playbooks/formalize-topology-delta.md` |
| synthesis judgment tags | `STATUS_PATH`, Wave 2 synthesis artifacts | field values come from `specs/CONSTANTS.md`; evidence and confidence semantics remain in `specs/METHODOLOGY.md` |

`partial` is diagnostic only. For gate passage it is treated as `fail` until repaired or converted to `pass` by a recorded queue-backed fix.

## Copy Boundary

- Only files under `output_templates/` contain copyable control-file skeletons.
- `output_templates/PLAN.md` is the only copyable source for `PLAN_PATH`.
- `output_templates/STATUS.md` is the only copyable source for `STATUS_PATH`.
- `output_templates/QUEUE.md` is the only copyable source for `QUEUE_PATH`.
- `output_templates/TRACE.md` is the only copyable source for `TRACE_PATH`.
- Flow files under `flows/` define invocation or policy; they are not control-file skeletons.
- `flows/reference-artifact-backfill.md` may contain capture templates for reference and artifact content; those are not control-file skeletons.
- Do not copy flow prose into instantiated outputs unless an `output_templates/*.md` skeleton explicitly includes the minimum run-local rule.
- Instantiated files must be self-contained enough for handoff, but must not contain template meta-instructions.
