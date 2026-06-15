---
title: "Instantiate From Original Topic Markdown"
role: "guided original-topic Markdown to instantiated run-bundle command"
scope: "create a new deepresearch_<short-slug> run from one Markdown original topic and stop after structural instantiation"
reads:
  - "specs/WORK_DIRECTORY_LAYOUT.md"
  - "command_playbooks/copy-framework-snapshot.md"
  - "command_playbooks/render-root-control-files.md"
  - "command_playbooks/check-instantiation.md"
  - "command_playbooks/repair-framework-snapshot.md"
  - "flows/instantiation-flow.md"
  - "command_playbooks/decompose-seed-topics.md"
writes:
  - "<PROJECT_ROOT>/deepresearch_<short-slug>/"
  - "<RUN_DIR>/_framework"
  - "<RUN_DIR>/original_topic/*"
  - "<RUN_DIR>/original_topic/<english-slug>.normalized.md"
  - "<RUN_DIR>/seed_topics/*"
  - "<PROFILE_PATH>"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
---

# Instantiate From Original Topic Markdown

This public command is the guided UX for the user request: "this Markdown file is the original topic." It creates a new run directory under the current project root, stores the source Markdown under `original_topic/`, derives formal `seed_topics/`, renders the five root control files, and stops after `check-instantiation` passes.

It is a convenience route over the normal instantiation chain. It does not start evidence execution, Wave 0, source intake, reference capture, artifact production, or final output.

## User-Facing Opening

Use plain Chinese-first wording when the user points to the Markdown file:

```text
我会把这个 MD 当作原始大主题（original_topic）来启动一轮新的 Deep Research。
我会先读内容，取一个短目录名，在当前项目根目录创建 deepresearch_<短称呼>，然后生成 original_topic/、seed_topics/ 和五个根控制文件，最后跑实例化检查。
```

After reading enough of the Markdown to understand the topic, propose the directory name and why:

```text
我建议新目录叫 deepresearch_<short-slug>，因为这份 MD 的核心主题是：<用一句中文说明主题>。
```

Then check whether `RUN_DIR` already exists. If it does, auto-increment the suffix (`_2`, `_3`, ...) until finding an available name, and tell the user:

```text
目录 deepresearch_<short-slug> 已经存在，改用 deepresearch_<short-slug>_<N>。
接下来我会把原文保存到 original_topic/，拆出可研究的 seed_topics/，再完成实例化。
```

All user-facing status, blocker, and completion messages in this command must use Chinese-first wording. If an English term is useful, write it in bilingual form, for example `原始大主题（original_topic）`, `种子主题（seed topics）`, or `实例化检查（check-instantiation）`. Keep file paths, command names, and internal enum values in canonical English inside the Markdown files.

## Inputs

- `ORIGINAL_TOPIC_MD`: one readable Markdown file identified by the user.
- `PROJECT_ROOT`: current project root. If the command is invoked from inside the template package, use the parent workspace/project root, not a directory inside `DEEP_RESEARCH_PROGRESSIVE_PLAN_TEMPLATE_V12/`.
- Optional user-provided run title, audience, final deliverable, or preferred research mode.

If `ORIGINAL_TOPIC_MD` is missing, unreadable, not a file, or not Markdown, return `FAIL_BLOCKED` with a short Chinese explanation of what path is needed.

```text
我现在缺少可读取的 Markdown 文件路径，所以不能启动这轮原始大主题（original_topic）实例化。请给我一个存在的 `.md` 文件路径。
```

## Directory Naming

Derive `short-slug` after reading the Markdown title, first headings, summary, and repeated domain terms.

Rules:

- Use a short ASCII filesystem slug, usually 2-5 words.
- Prefer the topic's concrete object, domain, claim, or decision target over generic words like `research`, `notes`, `topic`, `analysis`, or `deepresearch`.
- Use lowercase letters, numbers, and hyphens only.
- Set `RUN_DIR` to an absolute path: `<PROJECT_ROOT>/deepresearch_<short-slug>`.
- **Conflict resolution:** If `RUN_DIR` already exists, try `<PROJECT_ROOT>/deepresearch_<short-slug>_2`, then `_3`, `_4`, ... until finding a directory that does not exist. Never overwrite an existing run directory. Tell the user which name was preferred and which name was selected, using the UX wording in the section above.
- If the Markdown title is vague but the body is clear, name from the body. If both are vague, use `deepresearch_original-topic` plus a suffix and record an intake gap.

Examples:

| source signal | run directory |
| --- | --- |
| "Agentic Skills in the Wild" | `deepresearch_agentic-skills` |
| "GEPA vs RoboPhD evidence notes" | `deepresearch_gepa-robophd` |
| "AI coding agent taxonomy" | `deepresearch_ai-coding-agents` |

## HITL1 Intake

Before rendering root control files, collect or confirm HITL1 with the same UX as `flows/instantiation-flow.md`. Do not show raw enum values to the user.

```text
开始前我需要确认这轮研究的目标。你更想要哪种结果？

A. 快速事实答案（quick factual）：适合低风险、范围很窄的问题。
B. 探索地图（exploratory map）：适合先摸清领域结构、空白和下一步重点。
C. 说法验证（claim verification）：适合判断一个说法是否被证据支持、削弱或需要限定。

另外，请用一句话写下：最终报告必须回答什么问题（final must-answer）？
如果你还不确定，也可以写“我不确定，先帮我拆问题”。我会把这个不确定记录为待澄清缺口，并排入后续澄清或拆解任务。
```

Map the answer internally:

| visible choice | internal `research_profile` |
| --- | --- |
| 快速事实答案（quick factual） | `quick_factual` |
| 探索地图（exploratory map） | `exploratory_map` |
| 说法验证（claim verification） | `claim_verification` |

If the user is unsure about the final must-answer, record `final_must_answer_intake_status=gap_queue_backed` and create a concrete clarification/decomposition queue route. If the user cannot choose a research mode after the three plain-language options, stop with `FAIL_BLOCKED`; do not silently default.

## Steps

1. Read `ORIGINAL_TOPIC_MD`.
2. Derive `short-slug`, then set `RUN_DIR` to `<PROJECT_ROOT>/deepresearch_<short-slug>`. If `RUN_DIR` already exists, try `_2`, `_3`, ... until finding an available directory. Tell the user about any conflict and which name was selected (per the UX wording above).
3. Derive `PLAN_BASENAME` and the five root control-file paths from the resolved `RUN_DIR`:
   - `<RUN_DIR>/<PLAN_BASENAME>.profile.md`
   - `<RUN_DIR>/<PLAN_BASENAME>.plan.md`
   - `<RUN_DIR>/<PLAN_BASENAME>.status.md`
   - `<RUN_DIR>/<PLAN_BASENAME>.queue.md`
   - `<RUN_DIR>/<PLAN_BASENAME>.trace.md`
   All five root control-file paths and the root binding fields written into those files must be absolute paths.
4. Create `RUN_DIR` without overwriting existing run data.
5. Copy the source Markdown into `RUN_DIR/original_topic/` using its basename. If useful, create `RUN_DIR/original_topic/README.md` that records the source filename, derived topic summary, and any intake gaps.
6. Run the Original Topic Clarity Check below and write exactly one `RUN_DIR/original_topic/<english-slug>.normalized.md`. Do not create confirmed seed topics until the normalized topic text is accurate enough to be the decomposition input.
7. Create `RUN_DIR/seed_topics/`, `RUN_DIR/seed_topics/_reference/`, and the minimal artifact scaffold at `RUN_DIR/seed_topics/_artifacts/`: `README.md`, `wave1_topics/`, `wave2/`, and `shared/`. The README is a layout/content-framework note only; it is not evidence and does not count toward source floors. It must also say that Wave 1 topic `evidence-summary.md` and `question-list.md` are produced later by active `QUEUE_PATH` tasks after `topic_unique_ref_count >= 1`, routed by producer_rule=`topic_ref_count_changed`.
8. Decompose `original_topic/<english-slug>.normalized.md` into confirmed seed topics or explicit pending candidates:
   - If the Markdown already contains a clear topic list, preserve its intent and order where useful.
   - If it is broad, derive a small set of concrete seed topics that can drive evidence search.
   - If it is narrow, a single seed topic is valid, but it still needs a concrete seed `must_answer`.
9. Write confirmed seed topic files under `RUN_DIR/seed_topics/`. Each confirmed seed topic needs title, slug, seed `must_answer`, initial hypothesis/gap, why-now trigger or time window, boundary/out-of-scope, evidence anchors or likely source families, why it matters, and intake status. Keep uncertain candidates in `original_topic/` notes or queue-backed gaps; do not put them in Topic Registry as confirmed topics.
   Each confirmed seed topic must also preserve original context constraints: source anchor, in-scope limits, out-of-scope limits, search guardrails, and evidence route. If those cannot be derived from the original topic, mark the topic as an intake gap instead of treating it as search-ready.
10. Run the normal instantiation chain:
   - `command_playbooks/copy-framework-snapshot.md`
   - `command_playbooks/render-root-control-files.md`
   - `command_playbooks/check-instantiation.md`
11. Repair structural instantiation failures locally, then rerun `check-instantiation`.

After rendering, explicitly scan the five root control files for `<...>` residue. No angle-bracket placeholder may remain in generated root files; use concrete values or brace notation for pattern examples before running the final check.

## Original Topic Clarity Check

This command must normalize hand-written original topic Markdown before seed-topic decomposition. Treat this step like query rewrite before RAG: preserve the user's intent, but remove ambiguity that would otherwise make source intake or seed-topic splitting generic.

Inspect the raw Markdown for these clarity signals:

- final must-answer or decision target
- research object, claim, comparison set, or system boundary
- in-scope limits
- out-of-scope limits
- key terms, aliases, and terms that must not be broadened
- time window, geography, user audience, or system context when relevant
- search guardrails
- evidence route or preferred source families

Set one of two routes:

1. When the raw MD has material ambiguity, show the user a concise Chinese-first normalized topic and keep revising it until the user explicitly confirms it. Do not write the final normalized file and do not create confirmed seed topics before confirmation.
2. When the raw MD already contains enough concrete constraints to prevent generic search, do not interrupt the user. Write the normalized topic file directly and continue.

Use this Chinese-first confirmation when rewrite is required:

```text
我读下来，这份原始大主题（original_topic）里有几处可能会让后续检索或 seed topics 跑偏。为了避免误解，我先把题面规整成下面这个版本。

请确认：这个规整版本是否就是你想研究的问题？确认后我再生成种子主题（seed topics）。

规整后的题面：
<一段自然语言题面，写清楚研究对象、边界、排除项、最终必须回答的问题；如果有同名实体，写清楚选中对象和排除对象。>
```

Use this Chinese-first skip wording when the raw topic is already clear:

```text
这份原始大主题（original_topic）的对象、边界、最终问题和证据路线已经足够具体，我会跳过改写确认。
我仍会把规整后的题面写入 `original_topic/<english-slug>.normalized.md`，后续 seed topics 会从这个规整稿派生，方便追溯。
```

Exactly one `RUN_DIR/original_topic/*.normalized.md` is required for every run created by this command. The raw source Markdown is never rewritten in place.

Normalized artifact shape:

```markdown
# Normalized Original Topic

Source: `original_topic/<source-basename>.md`

<confirmed normalized topic text>
```

The normalized file is not a form and must not use a key:value metadata field list. Do not write fields such as `confirmation_state`, `verification_method`, `disambiguation_status`, `final_must_answer`, `search_guardrails`, or `evidence_route`; fold those meanings into the single normalized topic paragraph instead. The confirmation loop is procedural: if the topic is ambiguous, keep asking in Chinese until the user confirms; if the topic is already clear, skip the question and write the normalized text. If the entity or object cannot be identified locally, a single read-only web search may be used for disambiguation only; do not write `_reference`, do not count evidence, and do not start source-intake from this check.

## Framework Completeness Tail Check

Before returning success, actively verify that the copied run-local framework snapshot is complete enough for later commands. This check uses the new run's own `_framework`, not only the source template package.

Required tail checks:

1. Confirm these run-local command/check entrypoints exist:
   - `<RUN_DIR>/_framework/command_playbooks/check-instantiation.md`
   - `<RUN_DIR>/_framework/cli_tools/check_framework.mjs`
2. Run the run-local template snapshot check:

   ```bash
   node "<RUN_DIR>/_framework/cli_tools/check_framework.mjs" --gate check-template "<RUN_DIR>/_framework"
   ```

3. Run the run-local instantiation check:

   ```bash
   node "<RUN_DIR>/_framework/cli_tools/check_framework.mjs" --gate check-instantiation "<RUN_DIR>"
   ```

If either tail check reports missing required framework paths, use `command_playbooks/repair-framework-snapshot.md` only when the source framework package and `<RUN_DIR>/_framework` have the same `template_family` and `current_version`, and existing required framework files have no content drift. When those preconditions are satisfied, perform the same-version repair immediately; do not ask for extra confirmation. The repair may copy missing required framework paths into `<RUN_DIR>/_framework`, but it must not overwrite existing `_framework` files and must not regenerate or edit the five root control files. Same-version existing-file drift is not a repair case; it requires explicit migration.

After any same-version framework repair, rerun both tail checks in this order:

1. `check-template` against `<RUN_DIR>/_framework`
2. `check-instantiation` against `<RUN_DIR>`

If the run-local CLI is missing and cannot run, diagnose with the source framework package only to identify missing snapshot paths, perform same-version repair if allowed, and then rerun the checks with the repaired run-local CLI. Do not mark the command complete based only on a source-template check.

If repair is unsafe or the checks still fail, return `FAIL_BLOCKED`, do not start execution, and explain the blocker in Chinese-first wording:

```text
实例化还不能结束：运行目录里的框架快照（_framework）没有通过框架完整性尾检（Framework Completeness Tail Check）。
我已经按同版本修复（same-version repair）规则检查过；当前问题需要显式迁移或人工确认，不能自动覆盖现有框架文件。
```

## Seed Topic File Shape

Use stable filenames such as:

```text
RUN_DIR/seed_topics/<topic-id>-<topic-slug>.md
```

Each seed file should preserve enough source grounding that a later execution agent can start evidence work without rereading the full original topic first:

- source link back to `original_topic/<source-basename>.md`
- source link back to the single `original_topic/*.normalized.md`; include the raw source path as secondary provenance when useful
- original context constraints: source anchor, in-scope limits, out-of-scope limits, search guardrails, and evidence route
- topic title and slug
- seed `must_answer`
- initial hypothesis, gap, or tension
- why-now trigger or relevant time window
- boundary and out-of-scope notes
- evidence anchors or likely source families
- why it matters to the final deliverable or audience
- intake status and queue consequence when any field is weak

Use this compact shape when the topic came from `original_topic/`:

```markdown
## 原始语境约束（Original Context Constraints）

- source_anchor: `original_topic/<english-slug>.normalized.md` plus raw source heading/snippet when useful
- in_scope: concrete objects, claims, comparison set, time window, geography, user audience, or system boundary inherited from the original topic
- out_of_scope: nearby but wrong expansions that would make external search generic
- search_guardrails: required query terms/entities, allowed synonyms, and forbidden broadening
- evidence_route: preferred source families or first search route, plus known noise sources to avoid
```

The `boundary` and `evidence_anchors` projected into `PLAN_PATH -> Seed Topic Intake Matrix` must carry the same context constraints and cite the single `original_topic/*.normalized.md` in `source_anchor`. If a topic only has a plausible label but lacks these constraints, record `intake_status=gap`, name the missing context in `intake_gap`, and queue clarification/decomposition repair before source intake.

Create only the artifact scaffold at instantiation time. Do not create topic README files, reference README files, `REFERENCE_DIR/_INDEX.md`, per-topic artifact directories, or concrete topic/synthesis artifact files yet; `seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/` is created later only when evidence execution queues artifact production.

## Completion Rule

Return `PASS` only when the new run bundle is structurally instantiated:

- `RUN_DIR/_framework/` exists and is read-only framework snapshot material.
- `RUN_DIR/original_topic/` contains the source Markdown.
- `RUN_DIR/original_topic/` contains exactly one non-empty English-slug `*.normalized.md` file with `# Normalized Original Topic`, a `Source:` line, and no placeholder residue.
- `RUN_DIR/seed_topics/` contains confirmed seed topic files or explicit pending decomposition notes with queue-backed gaps.
- `<PROFILE_PATH>`, `<PLAN_PATH>`, `<STATUS_PATH>`, `<QUEUE_PATH>`, and `<TRACE_PATH>` exist at run root.
- HITL1 is recorded in `PROFILE_PATH`; HITL2 is initialized with the PROFILE `HITL2_wave2_readiness_decision` row `status=not_started`, `PROFILE HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=not_started`, and `STATUS Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=not_started`.
- `check-instantiation` passes.
- The Framework Completeness Tail Check passes from `<RUN_DIR>/_framework`, including `check-template` for the run-local framework snapshot and `check-instantiation` for `<RUN_DIR>`, after any same-version repair.

After completion, do not start execution automatically. The next command is usually `command_playbooks/check-seed-intake.md` or the generated run's local `_framework/COMMANDS.md`.

Tell the user in Chinese when the command is complete:

```text
已完成实例化：新的研究目录是 `<RUN_DIR>`。
我已经保存原始大主题（original_topic）、生成种子主题（seed topics）和五个根控制文件，并通过实例化检查（check-instantiation）和框架完整性尾检（Framework Completeness Tail Check）。
下一步通常是运行种子主题检查（check-seed-intake），确认每个 seed topic 的上下文约束足够具体后再开始外部搜索。
```
