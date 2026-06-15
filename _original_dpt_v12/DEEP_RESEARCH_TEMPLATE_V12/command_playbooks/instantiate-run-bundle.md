---
title: "Instantiate Run Bundle"
role: "one-time run-bundle instantiation orchestrator"
scope: "route the internal steps that instantiate one candidate V12 run bundle"
reads:
  - "command_playbooks/copy-framework-snapshot.md"
  - "command_playbooks/render-root-control-files.md"
  - "command_playbooks/check-instantiation.md"
writes:
  - "<RUN_DIR>/_framework"
  - "<PROFILE_PATH>"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
  - "<TOPIC_ROOT>"
---

# Instantiate Run Bundle

This public command is the user-facing instantiation command: instantiate one V12 run bundle, then stop after structural acceptance passes.

Before rendering the root control files, make the HITL1 user-facing intake explicit in plain Chinese. Do not expose raw enum values as the visible options; map the answer into the internal `research_profile` field afterward.

```text
开始前我需要确认这轮研究的目标。你更想要哪种结果？

A. 快速事实答案（quick factual）：适合低风险、范围很窄的问题。
B. 探索地图（exploratory map）：适合先摸清领域结构、空白和下一步重点。
C. 说法验证（claim verification）：适合判断一个说法是否被证据支持、削弱或需要限定。

另外，请用一句话写下：最终报告必须回答什么问题（final must-answer）？
如果你还不确定，也可以写“我不确定，先帮我拆问题”。我会把这个不确定记录为待澄清缺口，并排入后续澄清或拆解任务。

如果你对搜索材料有偏好，也可以顺手说一句，例如“优先官方/学术来源”“只看 2023 年以后”“重点看中国/美国/欧盟”“排除供应商营销页”。不写也可以，我会按研究模式的默认证据规则执行。
```

Do not hide missing profile or final must-answer input behind defaults. If the user is unsure, record a visible gap and queue consequence rather than inventing a hidden root lens. Search preferences are optional; when absent, record `not_specified_use_profile_defaults` in `PROFILE_PATH -> Search Preference Intake` instead of asking follow-up questions.

It is an orchestrator, not the detailed implementation authority. The playbooks below are internal implementation steps of the single instantiation action:

1. `command_playbooks/copy-framework-snapshot.md`
2. `command_playbooks/render-root-control-files.md`
3. `command_playbooks/check-instantiation.md`

Use `command_playbooks/check-seed-intake.md` only after structural instantiation passes. Runtime checks, local execution/evidence sync checks, reference inventories, artifacts, Wave gates, matrices, and snapshot repair are outside this command. Those later checks may repair execution readiness, but they are not another instantiation step.

## Output Shape

```text
RUN_DIR/
  _framework/
  <PLAN_BASENAME>.profile.md
  <PLAN_BASENAME>.plan.md
  <PLAN_BASENAME>.status.md
  <PLAN_BASENAME>.queue.md
  <PLAN_BASENAME>.trace.md
  AGENTS.md             # run-root agent contract
  CLAUDE.md             # run-root Claude contract
  .claude/
    settings.local.json # run-root Stop hook bound to this RUN_DIR
  original_topic/        # optional upstream material only
  seed_topics/
    _reference/
    _artifacts/
      README.md          # scaffold contract only; not evidence
      wave1_topics/
      wave2/
      shared/
```

## Boundaries

- Copy a complete framework snapshot into `RUN_DIR/_framework/`; this is normal run-bundle instantiation, not snapshot repair.
- Extract only bounded skeleton content from `_framework/output_templates/*.md`:
  - `BEGIN PROFILE OUTPUT` / `END PROFILE OUTPUT`
  - `BEGIN PLAN OUTPUT` / `END PLAN OUTPUT`
  - `BEGIN STATUS OUTPUT` / `END STATUS OUTPUT`
  - `BEGIN QUEUE OUTPUT` / `END QUEUE OUTPUT`
  - `BEGIN TRACE OUTPUT` / `END TRACE OUTPUT`
- Do not copy output frontmatter or boundary comments into root control files.
- Resolve every instantiation placeholder in root `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH`. Runtime metavariables defined in `specs/CONSTANTS.md -> Placeholder Classes` may remain only inside explicit schema/template/pattern guidance, never as active concrete state.
- Do not create topic README files, reference README files, `REFERENCE_DIR/_INDEX.md`, references, produced artifacts, final outputs, Wave 0 evidence, or execution progress during run-bundle instantiation. The only artifact-area writes allowed at instantiation are the minimal scaffold README and empty `wave1_topics/`, `wave2/`, and `shared/` directories.
- Generate run-root `AGENTS.md` and `CLAUDE.md` from `_framework/output_templates/RUN_ROOT_AGENTS.md` and `_framework/output_templates/RUN_ROOT_CLAUDE.md`; they are short active-run instructions for agents entering `RUN_DIR`, not mutable research state.
- Generate `RUN_DIR/.claude/settings.local.json` with a Stop hook command that sets `DEEP_RESEARCH_RUN_ROOT` to the absolute `RUN_DIR` and runs `RUN_DIR/_framework/cli_tools/stop_guard/claude-stop-guard.mjs`. Do not leave placeholder `RUN_DIR`, `<RUN_DIR>`, or a relative hook path in this file.
- Do not write run state into `_framework`.

## Completion Rule

Stop only after run-root `AGENTS.md`, `CLAUDE.md`, `.claude/settings.local.json`, and the five root control files exist, and `command_playbooks/check-instantiation.md` or CLI gate `check-instantiation` returns `PASS`.

After that, the run bundle is structurally instantiated. Do not rerun this command for execution, repair, seed refinement, topology changes, final output, local sync checks, or active-run checks. Continue from the generated root control files and local `RUN_DIR/_framework/COMMANDS.md`.
