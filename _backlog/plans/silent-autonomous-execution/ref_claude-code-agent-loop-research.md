---
title: Claude Code 2026+ first-party evidence reference
status: source_reference_only
scope: Claude Code agent loop, task list, post-turn continuation, context, sessions, hooks, subagents, permissions, and plan mode
retrieved: 2026-07-23
official_release_snapshot: v2.1.218
official_release_published: 2026-07-22T21:24:56Z
official_public_repo_main: 2982f951552e94f38cd972764ae94c1d90c41da3
parent_context:
  - ../silent-autonomous-execution.md
  - candidate-direct-phase-entry-root-cause.md
---

# Claude Code 2026+ First-Party Evidence

This is a factual source reference, not a DPT design decision, causal diagnosis, or implementation proposal. It records only what the cited current sources say and separates official evidence from locally available, non-authoritative material.

## Snapshot And Source Quality

- **Documentation retrieval:** all `code.claude.com` pages below were fetched on **2026-07-23**.
- **Official release snapshot:** Anthropic's public `anthropics/claude-code` repository lists [v2.1.218](https://github.com/anthropics/claude-code/releases/tag/v2.1.218), published **2026-07-22T21:24:56Z**. Its `main` branch resolved to [`2982f951552e94f38cd972764ae94c1d90c41da3`](https://github.com/anthropics/claude-code/commit/2982f951552e94f38cd972764ae94c1d90c41da3) on retrieval.
- **Scope of the GitHub snapshot:** this records public release provenance. Product-behavior claims below cite Anthropic's current official documentation rather than inferring behavior from the public repository.

## Official Evidence

| Area | Observed current documentation fact | Source |
| --- | --- | --- |
| Agent loop | The Agent SDK documentation says it runs the same execution loop that powers Claude Code: Claude evaluates, may request tool calls, receives results, and repeats. It states that the loop ends when Claude produces a response with no tool calls. | [Agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop) |
| General loop description | Claude Code describes its loop as gathering context, taking action, and verifying results; the model decides what each next step requires. Claude Code is described as the harness that supplies tools, context management, and execution environment. | [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works#the-agentic-loop) |
| Task-list representation | The interactive-mode documentation calls the task list Claude's to-do checklist, with pending, in-progress, and complete items; it says it is separate from the background-task view. | [Interactive mode: Task list](https://code.claude.com/docs/en/interactive-mode#task-list) |
| Task-list persistence | The same documentation says task-list items persist across context compactions and documents `CLAUDE_CODE_TASK_LIST_ID` for sharing a named list across sessions. | [Interactive mode: Task list](https://code.claude.com/docs/en/interactive-mode#task-list) |
| Current task tools | The SDK documentation says that, from Claude Code v2.1.142, sessions use `TaskCreate`, `TaskUpdate`, `TaskGet`, and `TaskList` in place of `TodoWrite`; it describes their item/status operations. | [Todo lists](https://code.claude.com/docs/en/agent-sdk/todo-tracking) |
| `/goal` availability | The `/goal` documentation states that the command requires Claude Code v2.1.139 or later. Anthropic's Week 20, 2026 release note associates `/goal` with v2.1.139. | [Goal](https://code.claude.com/docs/en/goal) and [Week 20, 2026](https://code.claude.com/docs/en/whats-new/2026-w20) |
| `/goal` post-turn behavior | The `/goal` documentation says a small fast model checks the completion condition after every turn; a `no` starts another turn and supplies a reason, while a `yes` clears the goal. It says one goal can be active per session. | [Goal](https://code.claude.com/docs/en/goal#how-evaluation-works) |
| Autonomy versus next-turn start | The `/goal` documentation says Auto mode approves tool calls within a turn but does not itself start a new turn; it describes `/goal` as the separate evaluator for per-turn continuation. | [Goal: compare ways to keep a session running](https://code.claude.com/docs/en/goal#compare-ways-to-keep-a-session-running) |
| Goal resume | The `/goal` documentation says an active goal is restored by `--resume` or `--continue`; its turn count, timer, and token-spend baseline reset on resume. | [Goal: resume](https://code.claude.com/docs/en/goal#resume-with-an-active-goal) |
| Stop hook event | The hooks reference says `Stop` runs after the main agent has finished responding, except after a user interrupt; API errors use `StopFailure`. | [Hooks: Stop](https://code.claude.com/docs/en/hooks#stop) |
| Stop-hook continuation | A Stop hook may return `decision: "block"` with a reason, or `additionalContext`; the documentation says either keeps the conversation going so Claude can act on the feedback. It also says Claude Code ends the turn after eight consecutive stop-hook continuations. | [Hooks: Stop decision control](https://code.claude.com/docs/en/hooks#stop-decision-control) |
| Scheduled loop | `/loop` schedules repeat prompts. With no interval, the documentation says Claude chooses an interval from one minute to one hour; fixed intervals use cron. Session-scoped schedules only fire while Claude Code is running and idle. | [Scheduled tasks: `/loop`](https://code.claude.com/docs/en/scheduled-tasks#run-a-prompt-repeatedly-with-%2Floop) and [limitations](https://code.claude.com/docs/en/scheduled-tasks#limitations) |
| Context compaction | The SDK documentation says automatic compaction replaces older history with a summary; it warns that specific early instructions may not be preserved. It says project `CLAUDE.md` content is re-injected on every request when loaded through settings sources. | [Agent loop: automatic compaction](https://code.claude.com/docs/en/agent-sdk/agent-loop#automatic-compaction) |
| Context cost | The current context-window documentation states that large file reads and tool outputs consume context, and its interactive example recommends moving reference content to skills or path-scoped rules so it loads only when needed. | [Context window](https://code.claude.com/docs/en/context-window) |
| Subagent context | The SDK documentation says each subagent has a fresh conversation; intermediate tool calls/results remain in that subagent, and its final message returns to the parent. | [SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents#context-isolation) |
| Session continuity | The SDK documentation says a session records prompts, tool calls, results, and responses; `continue`/`resume` add to an existing session, while `fork` starts a copy of its history. | [SDK sessions](https://code.claude.com/docs/en/agent-sdk/sessions) |
| Plan mode | The documentation says Plan mode permits research and proposals but blocks source edits until a plan is approved; approval exits Plan mode into the selected execution permission mode. | [Permission modes: Plan mode](https://code.claude.com/docs/en/permission-modes#analyze-before-you-edit-with-plan-mode) |

## Local Mirror Corroboration (2026-07-23)

The local mirror `/Users/bowhead/claude-code-src` (HEAD `c322df65`, 2026-06-28; README: third-party source-map exposure noted 2026-03-31, unminified TypeScript, ~1,900 files) is **non-authoritative for version/provenance** and remains excluded as primary product evidence. It was inspected as **corroborating** evidence for the core loop/task claims, which it confirms at source level.

| Claim | Mirror source (file:line) | Verdict |
| --- | --- | --- |
| Loop ends when an assistant response has no `tool_use` block | `src/query.ts` (`needsFollowUp` set true only on a tool_use block, L832-834; termination gate L1062; `return { reason: 'completed' }` L1357) | CONFIRM |
| Task tools (`TaskCreate`/`Update`/`Get`/`List`) are tracking only; no scheduling side effect; the exit branch never reads task status | `src/tools/TaskCreateTool/TaskCreateTool.ts` (L80-137); exit branch `src/query.ts:1062` does not consult task status | CONFIRM |
| `/loop` is cron/timer, not completion-driven | bundled skill `src/skills/bundled/loop.ts` → `CronCreateTool` (L62-66) | CONFIRM |
| Auto mode is within-turn tool approval, not a new-turn starter | `src/types/permissions.ts` (L16-36, L346) | CONFIRM |
| Compaction re-reads CLAUDE.md from disk and re-prepends it | `src/context.ts`; `src/services/compact/postCompactCleanup.ts` (L59-60); `src/query.ts:660` | CONFIRM |

The two load-bearing claims — **the loop ends on an assistant-only response**, and **the task list is a tracking surface the loop never consults when deciding to exit** — are therefore source-corroborated, not solely documented.

### Claims the mirror does not contain

The mirror does **not** contain `/goal`, the Stop-hook `additionalContext` continuation path, or any eight-consecutive-continuation cap. Stop-hook continuation in this snapshot is block-only (`decision:"block"` → `stop_hook_blocking`, `src/query.ts:1282-1305`); the only guard is the boolean `stop_hook_active` passed to the hook (`src/query/stopHooks.ts`, `src/utils/hooks.ts:3674`). The mirror already contains the v2 `TaskCreate` family, so its snapshot is neither cleanly pre- nor post-`/goal` by the documented version numbers; the reason `/goal` is absent is **unresolved** (version gap, out-of-band shipping, or an intermediate build). This does not affect the boundary: `/goal` is a host continuation mechanism whose presence or absence in one snapshot cannot change "the task list is not a scheduler." The official `/goal` and Stop-hook-cap documentation above remains the authority for those behaviors.

### Additional host continuation lever found

The mirror contains a **token-budget continuation** mechanism: when `feature('TOKEN_BUDGET')` is enabled with a budget set, a would-be-terminal response with usage below budget and not diminishing injects a nudge and continues the loop (`src/query/tokenBudget.ts`; `src/query.ts:1308-1341`), bounded by a diminishing-returns guard (stop when `continuationCount >= 3` and token deltas fall below ~500). It is budget-driven, not task- or completion-driven, and feature-gated — a further example that host continuation is operator/feature-gated/bounded and is never supplied by the task list.

## Local-Material Provenance Audit

The following local materials were inspected only to establish provenance. Neither is used for any Claude Code platform-behavior claim above.

| Local material | Provenance/date found | Decision for this reference |
| --- | --- | --- |
| [`/Users/bowhead/claude-code-src/README.md`](/Users/bowhead/claude-code-src/README.md) | Its README identifies it as a third-party educational/security-research mirror of a source-map exposure dated 2026-03-31, explicitly not an official Anthropic repository. Its local Git `HEAD` is `c322df657da0fa736fd04ab4c95d54c44e337194` dated 2026-06-28, with no Claude Code product-version tag found at `HEAD`. | Still excluded as authoritative product evidence (no official provenance, no verified match to v2.1.218). Used as corroborating evidence only for the core loop/task claims, which it confirms at source level; see *Local Mirror Corroboration* above. |
| [`/Users/bowhead/analysis_claude_code/README.md`](/Users/bowhead/analysis_claude_code/README.md) | Its README calls itself a reverse-engineering study of Claude Code **v1.0.33**, says it is not 100% accurate, and its local Git `HEAD` is dated 2025-07-19. | Excluded: it is pre-2026/version-stale and self-described as analysis rather than official product documentation. |

## Source Boundaries

- These sources describe Claude Code host behavior. They do not establish behavior for another coding-agent host.
- This file does not assert that any particular task-list, hook, goal, or scheduling mechanism should be implemented in DPT.
- The source records do not substitute for a real Agent-flow observation in the target framework.

## Source Index

1. [Official Claude Code documentation index](https://code.claude.com/docs/llms.txt), retrieved 2026-07-23.
2. [Official Claude Code release v2.1.218](https://github.com/anthropics/claude-code/releases/tag/v2.1.218), published 2026-07-22.
3. [Official public repository `main` commit](https://github.com/anthropics/claude-code/commit/2982f951552e94f38cd972764ae94c1d90c41da3), resolved 2026-07-23.
