# Active Deep Research Run

This directory is an instantiated V12 Deep Research run. Work from this run directory, not from the source template package.

## First Move

Before acting, locate and read these five root control files:

- `*.plan.md` — execution blueprint: topic design, gate targets, and local authority pointers
- `*.profile.md` — user intent, must-answer set, and human decisions
- `*.status.md` — current state, audits, gaps, counters
- `*.queue.md` — executable work queue
- `*.trace.md` — append-only diagnostic checkpoints

Read all five root control files before acting. Use `*.profile.md` for user intent and human decisions, `*.plan.md` for topic design and gate targets, `*.status.md` for current run state and audits, `*.queue.md` for the next executable action, and `*.trace.md` for diagnostic checkpoints.

If the user says "execute this plan" or "continue this plan", treat `plan` as a colloquial pointer to the instantiated run bundle containing these five root control files. Do not execute `*.plan.md` alone or treat it as the center of runtime authority.

`_framework/` is a read-only pre-work policy snapshot. Treat it as immutable after instantiation: read specs/commands and run read-only CLI checks from it, but do not edit, regenerate, normalize, or write run state into `_framework/`. If snapshot files are missing, use the explicit same-version `<RUN_DIR>/_framework/command_playbooks/repair-framework-snapshot.md` path; never hand-edit the instantiated snapshot. Do not execute from `_framework/output_templates/*.md`; those files are skeletons only.

## User-Facing Language

When speaking to the user, use Chinese-first wording for startup guidance, HITL prompts, decision blockers, parameter-change confirmations, completion notes, and final delivery. Keep file paths, command names, provider ids, and internal enum values in canonical English; explain user-facing English terms in bilingual form such as `人工确认（human-in-the-loop / HITL）`.

## Credentials

`EXA_API_KEY` lives in the project root `.env` file, outside this run directory and outside the template package. The `.env` file is untracked and must never be committed.

Only when the selected source-intake `provider_profile` is `exa_search`, the bundled `exa-source-intake.mjs` runner loads the key automatically by searching upward at most four directory levels from launch roots. If the runner can't find it, or if this run directory is deeply nested, pass `--project-root <PROJECT_ROOT>` or `--env-file <PROJECT_ROOT>/.env` explicitly.

From this run root, execute the Exa runner through `_framework/flows/source-intake-profiles/scripts/exa-source-intake.mjs`; use the shorter `flows/source-intake-profiles/scripts/exa-source-intake.mjs` path only after changing directory into `_framework/`.

Source-intake state is recorded in cache Markdown fields such as `runner_result`. A fail-soft runner can exit zero after writing fallback cache files so queue execution can continue into `native_search`.

Never write the API key into this run directory, `_cache`, `seed_topics/_reference`, control files, logs, or chat output.

## Execution Rule

`QUEUE_PATH -> Active Queue` is the executable action ledger. If `stop_authorization_state=unauthorized_continue_required`, do not summarize progress, do not ask "continue?", and do not ask "continue or adjust direction?". Execute `unauthorized_stop_next_action`.

User-visible stopping is allowed only for `final_delivery`, a concrete `decision_blocker`, or documented `empty_queue_after_refill`.

## HITL2 Rule

Wave 0, Wave 1, and Wave 2 completion are not user checkpoints. HITL2 may stop only after `human-decision-brief.md` exists, PROFILE/STATUS/QUEUE are synced to `pending_user`, `queue_health=blocked`, `stop_authorization_state=decision_blocker`, and `safe_to_interrupt=yes`.

## Claude Stop Hook

This run should have `RUN_DIR/.claude/settings.local.json` with a Stop hook command that sets `DEEP_RESEARCH_RUN_ROOT` to this exact run directory and runs `_framework/cli_tools/stop_guard/claude-stop-guard.mjs`.

If a Claude Stop hook blocks stopping and returns a `Continue: ...` reason, treat that as the next execution action. The hook is not an error and not a reason to ask the user for permission.

## Recovery

If confused, reload the five root control files from disk. Chat context is not state.
