# help - Deep Research Progressive Plan Template

**V12 深度研究渐进式计划模板**是一个 Markdown 治理的研究框架。它把宽泛的研究需求——一个话题、一组问题、或需要验证的说法——转化为可审计的本地证据、主题分析和最终交付物。

## 它能做什么

- **种子主题分解**：把一个大的研究需求拆成可独立研究的具体主题（seed topics）
- **三层 Wave 证据递进**：Wave 0 共享基础 → Wave 1 主题证据 → Wave 2 跨主题综合
- **可审计的本地证据**：所有来源都落地为本地 reference 文件，不依赖链接或聊天记忆
- **人工确认 checkpoint**：HITL1（开始前确认研究模式和核心问题）+ HITL2（综合评估后确认最终报告方向）
- **多输出视角**：最终报告可以是事实结论、证据地图、声明判断或技术深挖

## 整体流程

```text
HITL1 选研究模式 + 写核心问题
  → 实例化 Run Bundle
  → 分解种子主题
  → Wave 0 共享基础证据
  → Wave 1 各主题独立证据
  → Wave 2 跨主题综合
  → HITL2 人工决策（证据够了？补还是出报告？什么视角？）
  → Readiness 检查
  → 最终输出
```

关键文件：`PROFILE`（意图和决策记录）、`PLAN`（执行蓝图）、`STATUS`（当前状态和审计）、`QUEUE`（可执行任务）、`TRACE`（诊断记录）。

## 不知道怎么开始？

- 想了解这个模板包的完整说明，看 `README.md`
- 想看所有可用命令，看 `COMMANDS.md`
- 告诉 agent 你的研究问题——agent 会引导你走 HITL1 选择研究模式

If you are unsure how to start, identify which situation you are in:

| situation | open |
| --- | --- |
| I need to understand the work directory | `specs/WORK_DIRECTORY_LAYOUT.md` |
| I have one Markdown file and want to treat it as `original_topic` | `command_playbooks/instantiate-from-original-topic-md.md` |
| I need to instantiate a new run bundle | `command_playbooks/instantiate-run-bundle.md` |
| I have a large topic that still needs to be split into seed topics | `command_playbooks/decompose-seed-topics.md` |
| I generated a run bundle and need to verify core structure | `command_playbooks/check-instantiation.md` |
| I need to verify confirmed seed topics before evidence work | `command_playbooks/check-seed-intake.md` |
| I need to normalize hand-written seed topic files before Wave 0 | `command_playbooks/repair-seed-topic-shape.md` |
| I need to check post-instantiation seed/reference/artifact/control-file sync | `command_playbooks/check-surfaces.md` |
| I need to change evidence intensity, verification posture, speed, or source filters | `command_playbooks/adjust-profile-parameters.md` |
| I am inside an active run and discovered a new topic candidate, split, merge, or redirect | `command_playbooks/formalize-topology-delta.md` |
| I am inside Wave 1 and topic references landed but `wave1_topics/` artifacts are missing or stale | `command_playbooks/repair-wave1-artifact-steering.md` |
| I am inside an active run and need to audit drift or Readiness | `command_playbooks/check-runtime.md` |
| I finished the research and need final interpretation output | `command_playbooks/create-final.md` |
| I know I need a check but not which one | `command_playbooks/check.md` |

## Run Directory Shape

V12 uses a run bundle:

```text
RUN_DIR/
  _framework/
  <PLAN_BASENAME>.profile.md
  <PLAN_BASENAME>.plan.md
  <PLAN_BASENAME>.status.md
  <PLAN_BASENAME>.queue.md
  <PLAN_BASENAME>.trace.md
  original_topic/        # optional
  seed_topics/
    _reference/
    _artifacts/
      README.md          # scaffold only; not evidence
      wave1_topics/
      wave2/
      shared/
  final/ or one deterministic HITL2 final_* directory
```

`_framework/` is the read-only rule snapshot. Mutable run data lives outside it. `seed_topics/` is the only formal topic execution root. `original_topic/` is optional and exists only when a broad topic still needs local decomposition.

## First Run Shape

Run-bundle instantiation creates a local `_framework/` snapshot and five mutable control files outside it:

```text
RUN_DIR/_framework/
<PLAN_BASENAME>.profile.md
<PLAN_BASENAME>.plan.md
<PLAN_BASENAME>.status.md
<PLAN_BASENAME>.queue.md
<PLAN_BASENAME>.trace.md
seed_topics/
  _reference/
  _artifacts/
    README.md
    wave1_topics/
    wave2/
    shared/
```

After the bundle passes `check-instantiation`, use `check-seed-intake` when confirmed seed topics are present or need readiness review. Execution proceeds from the generated files and local `_framework/`, not from the source template package or the creation playbook.

## Active Run Shape

For active execution, the generated queue is the action authority, status is the run-state authority, trace is append-only diagnostics, references are evidence, and artifacts are derived synthesis.

Use `check-runtime` when the run already has execution history, accepted references, artifacts, seed backfill, repaired gates, or trace entries.

Use `check-seed-intake` before evidence execution to verify confirmed seed topic shape, registry, intake, status, and queue alignment. If seed files are hand-written or missing refill anchors, run `repair-seed-topic-shape` first.

Use `check-surfaces` after structural instantiation when the immediate concern is whether seed topics, `_reference`, `_artifacts`, and generated control files are mutually synchronized after setup or evidence work. It is narrower than runtime qualification and is not part of instantiation.

Use `adjust-profile-parameters` after instantiation when the user changes evidence intensity, verification posture, configured floors, must-answer intensity or phase, source date windows, source families, trust/tier posture, or exclusion filters. This updates `PROFILE_PATH` first, then syncs only the necessary generated `PLAN`, `STATUS`, `QUEUE`, and `TRACE` projections; it does not rerun the template creator and has no CLI gate.

Use `formalize-topology-delta` when evidence digging changes the topic topology. This is a runtime mutation of the generated files; do not rerun the template creator.

Use `create-final` when the research is ready to produce a final interpretation. The final directory must be the HITL2-recorded `final_output_dir`: `profile_default -> final/`, `executive_brief -> final_executive_brief/`, `evidence_map -> final_evidence_map/`, `claim_judgment -> final_claim_judgment/`, `technical_deep_dive -> final_technical_deep_dive/`, and `custom -> final_custom_{custom_final_report_view_slug}/`.

## CLI Note

`_framework/cli_tools/check_framework.mjs` checks are read-only helpers. They catch mechanical issues quickly, but the command playbooks remain the human-readable gate procedures. Use the playbook checklist to inspect semantic failures such as dormant trace, empty topic artifacts, stale Topic Target Coverage, stale question lists, pathless Wave 2 synthesis, and generic queue tasks. CLI helpers may run from inside `_framework`; they must not write run state or evidence, and they do not authorize gate passage by themselves.
