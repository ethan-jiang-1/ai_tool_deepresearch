# V12 Template Version Log

> template_family: `DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE`
> current_version_source: `specs/CONSTANTS.md -> Template Package Identity`
> last_updated: `2026-06-13`

## V12.17 (2026-06-12)

Added a pre-Wave0 seed topic shape normalization and CLI check so hand-written seed topics expose stable refill/backfill anchors.

- Added `repair-seed-topic-shape.md` as the write-capable setup repair route for malformed confirmed seed files.
- Added `check-seed-topic-shape` and reusable seed shape diagnostics for `check-seed-intake`, `check-surfaces`, and `check-gate-setup-ready`.
- Required confirmed seed files to expose concrete upper intake fields, stable growth headings, placeholder-free content, and normalized original-topic anchors where applicable.
- Kept semantic uncertainty queue-backed instead of letting shape repair invent missing research intent.
- Tightened follow-up repair semantics so original-topic context must be meaningful in both seed files and PLAN intake rows, and `gap_queue_backed` seed-shape leniency remains setup-only.

## V12.16 (2026-06-12)

Added an original-topic clarity gate so hand-written original topic Markdown is normalized before seed-topic decomposition.

- Required `instantiate-from-original-topic-md.md` to run an Original Topic Clarity Check before deriving seed topics.
- Added exactly one lightweight `original_topic/<english-slug>.normalized.md` artifact as the canonical upstream topic text for original-topic runs, even when the raw topic is clear enough to skip confirmation.
- Required ambiguous original topics to receive Chinese-first user confirmation before ready seed topics can be generated.
- Made seed topic context anchors cite the single `*.normalized.md` file unless the topic remains a queue-backed intake gap.
- Added CLI regression coverage for missing, duplicated, non-ASCII named, thin, placeholder-filled, and bypassed normalized topic artifacts.

## V12.15 (2026-06-12)

Hardened the Wave 1 exploration ledger so `question-list.md` remains a stable exploration/exploitation control artifact.

- Added a minimum four-section `question-list.md` shape to the methodology and Wave 1 artifact repair command.
- Required Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision to keep stable headings and field names.
- Reused topic artifact body checks inside `check-gate-wave1-complete` so Wave 1 gate passage reads artifact contents directly.
- Made Wave 1 gate artifact freshness strict: `produced_at_ref_count` must equal `accepted_topic_ref_count` at gate audit.
- Added STATUS-to-ledger mirror checks for exploration decision, trigger refs, and queue consequence.
- Added regression coverage for legacy target-only question lists and stale Wave 1 artifacts.
- Rejected unresolved curly-brace template placeholders in produced Wave 1 artifacts.

## V12.14 (2026-06-12)

Cleaned current-contract vocabulary so active Markdown exposes one queue trigger model.

- Removed non-current trigger labels from active reference landing, topic fan-in, and artifact steering guidance.
- Standardized artifact steering on producer_rule=`topic_ref_count_changed`.
- Kept boundary work under producer_rule=`boundary_hook` plus explicit `hook_*` ids.
- Added start-boundary gate specs for Wave 0, Wave 1, and Wave 2 starts while keeping `current_gate` limited to durable state gates.
- Removed non-current source-intake provider names from the active provider profile list.
- Removed the unused refill priority from the active Queue contract.
- Pruned non-current version-history material that taught obsolete profiles, paths, or root-file counts.

## V12.13 (2026-06-11)

Separated Queue governance into a noun-level contract and a verb-level agentic loop flow.

- Added `specs/QUEUE_CONTRACT.md` as the Queue work-unit contract and receipt authority.
- Added `flows/queue-agentic-flow.md` for receipt preflight, execution, verification, repair, refill, promotion, projection, and Pre-Response Gate flow.
- Introduced Critical Checkpoint Receipts for setup, wave transitions, Wave 1 artifact steering, HITL2/readiness, and final delivery.
- Made artifact steering surfaces required receipts rather than optional cleanup.
- Added a lightweight Queue receipt check path for active-run preflight.
- Kept `native_search` as the default search route; Exa remains explicit or justified by source-intake requirements.

## V12.12 (2026-06-11)

Added Exa source intake, UX guardrails, seed-topic context, and instantiation/runtime hardening while keeping cache and promotion contracts stable.

- Added Exa runner output under `_cache/intake/<batch-id>/`.
- Kept `native_search` as default and fail-soft fallback.
- Added advanced-search intent triggers.
- Sanitized unsupported `people` / `company` Exa filters.
- Made Exa fail-soft exits return `0`.
- Kept parse/input errors as hard failures.
- Treated partial Exa success with usable candidates as `success`.
- Preserved Exa excerpts, highlights, grounding, and failed-pass notes.
- Added Exa dry-run, key-gate, preflight, and live-smoke regression coverage.
- Added Chinese-first user-facing interaction guidance.
- Preserved original-topic context in seed-topic `boundary` and `evidence_anchors`.
- Blocked unconstrained seed topics from `intake-ready`.
- Moved canonical run-bundle layout to `specs/WORK_DIRECTORY_LAYOUT.md`.
- Split README spec authorities from output-template render skeletons.
- Made instantiation create the `_artifacts` scaffold and README.
- Kept per-topic Wave 1 artifacts owned by active queue tasks.
- Reinforced run-local `_framework/` as read-only pre-work.

## V12.11 (2026-06-11)

Made run-root agent instructions and optional HITL1 search preferences part of the instantiated bundle contract.

- Renamed template skeleton directory from `outputs/` to `output_templates/`; `outputs/` paths are invalid under current template checks.
- Added generated run-root `AGENTS.md` and `CLAUDE.md` templates so agents entering `RUN_DIR` see the active-run execution contract without reading `_framework/`.
- Made run-root agent files part of instantiation/runtime bundle validation.
- Added optional HITL1 Search Preference Intake for preferred source types/families, date window, geography, language, must-include sources, and exclusions, with `not_specified_use_profile_defaults` defaults when the user does not care.
- Projected search preferences into PLAN/source-intake guidance so retrieval batches use user guidance when available and profile defaults otherwise.
- Hardened the silent autonomous execution path by making run-root instructions, checks, and stop-guard behavior agree on authorized stop states.

## V12.10 (2026-06-11)

Made middle-wave stop control a durable Markdown runtime contract.

- Added User-Visible Stop Authorization fields: `stop_authorization_state` and `unauthorized_stop_next_action`.
- Made `unauthorized_continue_required` the normal middle-run state with `safe_to_interrupt=no`.
- Added Post-Gate Continuation rules so Wave 0, Wave 1, and Wave 2 gate passage must continue into the next non-chat action or the HITL2 recorded/resume path.
- Rejected routine stop prompts such as "continue?", "continue or adjust direction?", and "await user review" while executable queue work exists.
- Kept MJS/helper behavior as guardrails for the Markdown contract rather than a separate execution framework.

## V12.9 (2026-06-10)

Moved run-specific profile state into a fifth root file and tightened human decision flow.

- Added `<PLAN_BASENAME>.profile.md` for selected profile, root must-answer set, configured parameters, overrides, and HITL1/HITL2 decisions.
- Added `command_playbooks/instantiate-from-original-topic-md.md` as a guided UX entry for "this MD is original_topic": derive `deepresearch_<short-slug>`, create `original_topic/` and `seed_topics/`, render the five root control files, and stop after instantiation passes.
- Reduced PLAN toward an execution blueprint by projecting profile data instead of owning changing user intent.
- Defined HITL2 after Wave 2 and before Readiness: answerability classification, final report view, or concrete repair/rerun recommendation.
- Slimmed README into a short entrypoint and added reusable `AGENT-GUIDE.md`, `AGENTS.md`, and `CLAUDE.md` pointers.

## V12.8 (2026-06-10)

Split gate authority into smaller, directly checkable units and tightened the Markdown runtime rules.

- Split detailed gate definitions into `specs/gates/*.md`, added a shared gate registry, and introduced focused `check-gate-*` entries while keeping `check-runtime` as the full orchestration check.
- Moved research profile presets into `specs/RESEARCH_PROFILES.md`; generated plans now store only the selected run-local configuration, authority pointers, and cost expectation.
- Hardened local evidence authority: counted evidence must be accepted local references with usable body content, structured exceptions, inventory-backed floors, and local backing refs for synthesis/readiness.
- Clarified run-flow edge cases: placeholder classes, setup-only `gap_queue_backed`, zero-topic decomposition routing, `quick_factual` cost expectations, single-topic Wave 2 synthesis, `0 / 0` topic coverage as non-passing, and readiness closeout state sync.
- Slimmed generated PLAN/check surfaces by replacing duplicated framework prose with authority pointers.

## V12.7 (2026-06-09)

Added source cache and replaceable source intake for long horizontal runs.

- Added `RUN_DIR/_cache/` as non-evidence staging for retrieval batches, candidate cards, exclusions, and promotion logs.
- Made source intake the default context-hygiene route: retrieval/fetch/search lands in `_cache`; only main-agent fan-in can promote accepted material into `seed_topics/_reference/*.md`.
- Added provider-neutral source-intake flow/profile docs and clarified foreground delegation semantics.
- Removed the standalone optional execution policy from the current control surface.

## V12.6 (2026-06-09)

Added rolling native task projection for long-running silent execution.

- Kept `QUEUE_PATH` as the Source of Record while projecting only the short executable window into native todo/task/plan surfaces.
- Defined cross-platform projection semantics: one in-progress executable task, pending executable tasks, and no chat/report tasks.
- Treated slash commands such as `/goal` as optional user-side aids, not framework-controlled queue actions.

## V12.5 (2026-06-09)

Added a strict Pre-Response Gate for silent autonomous execution.

- Separated No-Empty-Queue from user-visible output authorization.
- Added Pre-Response Gate fields so routine milestones, passed gates, refreshed artifacts, synced status, completed batches, and known next tasks do not authorize chat output.
- Limited user-visible output to final delivery, concrete decision blockers, or documented empty-queue-after-refill states.

## V12.4 (2026-06-09)

Hardened framework snapshot recovery and long-running command entrypoint continuity.

- Added `Runtime Command Entrypoint` so agents entering a run can find local framework commands, local CLI checks, and the five root control files.
- Made the snapshot/control-file boundary explicit: `_framework/output_templates/*.md` are skeletons; root control files are instantiated runtime state.
- Added same-version framework snapshot repair and split seed-topic intake readiness out of core instantiation.
- Kept public instantiation short while moving framework copy/render details into internal playbooks.

## V12.3 (2026-06-08)

Added SSOT hardening for template package constants and high-risk projected definitions.

- Added `specs/CONSTANTS.md` as the low-level authority for package identity, current version, placeholder classes, enum values, and reusable field names.
- Replaced hard-coded source-template version values with `<TEMPLATE_VERSION>` while keeping generated runs resolved at instantiation.
- Reduced duplicated preset/schema prose so constants, gate specs, and methodology own their respective definitions.
- Strengthened template checks for version drift and high-risk projection ownership.

## V12.2 (2026-06-08)

Locked V12 to the run-bundled read-only framework model.

- Changed instantiation to a full run bundle with `RUN_DIR/_framework/` plus mutable root control files.
- Made `_framework/` the run-local read-only snapshot; mutable execution data lives outside it under `seed_topics/`, optional `original_topic/`, and final output directories.
- Replaced active `topics/` with `seed_topics/` and fixed `_reference` / `_artifacts` under that topic root.
- Added work-directory, decomposition, final-output, surface-check, and rigor-adjustment playbooks for the bundled runtime model.
- Strengthened evidence/artifact surface rules so summary-only captures, misplaced artifacts, and gate evidence inside `_framework/` cannot qualify a run.

## V12.1 (2026-06-08)

Added runtime topic delta protocol for incremental deep research after evidence digging changes the topic topology.

- Added `formalize-topology-delta` for topic additions, splits, merges, archives, suspends, and redirects discovered during execution.
- Made topic topology changes controlled runtime mutations of generated control files and topic seeds, never a rerun of instantiation.
- Required append-only topic ids, synchronized registry/intake/status/queue/trace updates, and concrete repair work for affected gates.
- Removed non-current example and policy residue from the required template structure.

## V12.0 (2026-06-08)

Created the V12 baseline.

- Moved production commands and qualification playbooks into `command_playbooks/`, with `COMMANDS.md` as the command entry shell.
- Established the V12 execution contract: instantiate once, then run from generated root control files.
- Added the read-only Node verifier with `check-template`, `check-instantiation`, and `check-runtime`.
