---
title: "Adjust Profile Parameters"
role: "runtime research profile parameter and filter adjustment command"
scope: "controlled mutation for profile changes, derived evidence parameters, floors, verification posture, or filters after instantiation"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/RESEARCH_PROFILES.md"
  - "specs/METHODOLOGY.md"
  - "flows/execution-flow.md"
writes:
  - "<PROFILE_PATH>"
  - "<PLAN_PATH>"
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
---

# Adjust Profile Parameters

Use this command after a run already has generated `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH`, when the user asks to switch the public research profile, tune derived evidence parameters, change evidence intensity or verification posture, or filter by source/date/type/family.

This is a runtime controlled mutation. Do not rerun `command_playbooks/instantiate-run-bundle.md`, do not re-instantiate the run bundle, do not overwrite active run files from skeletons, and do not write into `_framework/`.

This command changes run policy and queues consequences. It does not directly accept, reject, recount, or rewrite existing reference conclusions. Existing references count under the new policy only after the affected audit or recount work is performed.

## User-Facing Parameter Adjustability

HITL1 阶段输入的参数在运行时**任何时候都可以调整**，不需要重新经过 HITL1 checkpoint。用户可以在研究进行中随时说"改一下"。

可直接调整的项目包括：

| 调整类别 | 用户可能说的话 | 对应 delta |
| --- | --- | --- |
| 研究模式 | "换成说法验证模式""不用快速模式了，改成探索地图" | `profile_switch` |
| 源类型/源家族偏好 | "优先学术论文""只看官方来源""加上社区讨论" | `filter_update` |
| 日期窗口 | "只看 2024 年以后的""把时间范围放宽到 2020-2026" | `filter_update` |
| 地理/语言 | "重点看中国和美国的来源""只要英文和中文" | `filter_update` |
| 排除规则 | "排除供应商博客""不要 SEO 内容" | `filter_update` |
| 证据强度 | "多找一些来源""每个主题至少 12 个参考""快一点，降低要求" | `parameter_tighten` / `parameter_relax` |
| must-answer 强度 | "这个问题也必须回答""那个问题不重要，可以降级" | `parameter_tighten` / `parameter_relax` |
| 关键声明检查力度 | "这个声明需要更强的独立验证""不需要那么严格" | `parameter_tighten` / `parameter_relax` |

Agent 应将用户的中文表述映射到内部 delta 分类，并在执行调整前向用户说明即将发生的变化。本命令只适用于用户已经主动要求调整 profile、参数、来源偏好或过滤规则的场景；不得把这里的确认步骤用于例行进度汇报、wave 之间的继续确认，或已有可执行 Queue 工作时的"是否继续"停顿。

## Derived Parameter Transparency

当用户的调整触发**内部派生参数自动联动变化**时，agent 必须在执行写入前向用户列出具体的"联动清单"。

**强制格式**：逐项列出 `旧值 → 新值`，使用用户可理解的中文标签。

**示例**：用户要求从 quick_factual 切换到 claim_verification 模式时：

```text
切换到说法验证（claim verification）模式。以下参数将自动调整：

| 参数 | 原值 (quick_factual) | 新值 (claim_verification) |
| --- | --- | --- |
| Wave 0 共享文档底限 | 6 | 10（按公式重新计算） |
| 每个主题 Wave 1 文档底限 | 5 | 10 |
| 主要来源底限 | 2 | 4 |
| 次要来源底限 | 1 | 2 |
| 限制/反例来源底限 | 1 | 2 |
| 关键声明检查 | targeted P0/P1 | expanded P0/P1 + 独立验证 + 显式反例搜索 |

这些调整将导致以下队列工作：
- 重新审计 Wave 0 和 Wave 1 门禁（更高底限可能使已通过的 gate 失效）
- 可能需要为受影响的主题补充额外参考来源
- Wave 2 综合判断标准从"事实结论"变为"声明判断"

是否继续？
```

**规则**：
- 只列实际会变化的参数，不变的不列
- 队列后果用简洁的中文概述，不列完整 queue task 清单
- 用户在这个显式调整对话中确认后才能写入 PROFILE/PLAN/STATUS/QUEUE/TRACE；如果等待确认，必须把运行状态记录为具体 `decision_blocker`，不得保持 `unauthorized_continue_required` 后停下来等用户
- 用户拒绝或要求修改时，回到调整对话，不写入任何文件

## Inputs

Required:

- `PLAN_PATH`
- `PROFILE_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`
- user adjustment request or explicit policy delta
- current `research_profile`, configured floors, gate state, and active queue state

If any generated control file is missing, stop and recover the active run files rather than using the template creator again.

## Adjustment Classification

Classify the request as one or more of these deltas:

| delta | meaning | default handling |
| --- | --- | --- |
| `profile_switch` | user explicitly changes the public research mode among 快速事实答案（quick factual）, 探索地图（exploratory map）, or 说法验证（claim verification） | update profile contracts and derived parameters from `specs/RESEARCH_PROFILES.md`, then queue affected gate/audit work |
| `parameter_tighten` | user asks for more sources, stronger verification, narrower acceptance, stronger independence, more conservative claims, or more numerous must-answer entries without changing profile | raise only the named derived floors, filters, must-answer policy, or critical-claim posture; keep the public profile unchanged |
| `parameter_relax` | user asks for faster, lower-intensity, narrower, fewer must-answer entries, or lower floor work without changing profile | lower only explicit derived parameters when safe; never let lowered values bypass audits already required by the profile |
| `filter_update` | user changes allowed sources, date window, geography, source families, trust/tier preference, exclusion rules, or webpage posture | update the relevant plan evidence anchors or filter assumptions, then queue re-audit/recount work |
| `manual_parameter_override` | user gives exact floor values, source-type thresholds, or filter values | write the exact values and rationale; do not infer hidden parameter changes |

When the user gives only a vague direction, keep the public profile unchanged and adjust the smallest derived parameter set that satisfies the request. Ask for clarification only when the request would change the public profile or weaken high-risk evidence posture ambiguously.

## Guardrails

- Profile switches and parameter overrides do not create alternate gate logic.
- No adjustment may bypass accepted-reference inventory fields, webpage diagnostic requirements, cross-verification, local reference paths, artifact production, seed backfill, source-family duplicate review, gate audits, or Readiness checks.
- A lower-intensity profile or lower floor does not automatically pass a gate. The affected audit must be rerun with the new configured values.
- A tighter parameter set, profile switch, higher floor, or narrower filter can invalidate passed gates. Reopen the affected gate when prior evidence no longer satisfies the new policy.
- If `quick_factual` is selected for management, decision-shaping, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced work, require `research_profile_user_choice=explicit_override`, risk rationale, confidence consequence, and gate consequence.
- After `readiness_passed`, substantive profile, parameter, or filter changes are not bounded maintenance. Reopen the affected earlier wave or return `FAIL_BLOCKED` if the user is asking to change final research scope under a closed queue.

## Writeback Rules

### PROFILE

Update the run-specific profile source first:

- `Profile Binding.research_profile`
- `Profile Binding.research_profile_user_choice`
- `Profile Contract` fields affected by the profile
- `Root Must-Answer Set` when must-answer intensity, phase, or root lens changes
- `Configured Profile Parameters` floors, critical-claim checks, must-answer policy, cost expectation, and manual overrides
- `Human Decision Checkpoints` when the change affects HITL2 answerability or final report view

### PLAN

Update only the projection surfaces needed to keep execution targets readable:

- `Instance Config.research_profile`
- configured floor fields: `wave0_shared_doc_floor`, `wave1_doc_floor_per_topic`, `primary_source_floor`, `secondary_source_floor`, `recent_source_floor`, `limitation_source_floor`
- `must_answer_policy`
- `critical_claim_checks`
- `Research Profile Projection` values mirrored from `PROFILE_PATH`

For filter changes, update the smallest existing plan surface that owns the filter, such as `round_focus`, `Seed Topic Intake Matrix.evidence_anchors`, `Topic Goals.evidence_priority`, `source_dedup_note`, or another concrete topic-specific plan field. Do not add a new global config file.

### STATUS

Record the consequence in existing state surfaces:

- current gate/wave if a gate must reopen
- `gate_reopen_state`, `reopened_from_gate`, `reopen_reason`, and `invalidated_claims` when prior gate claims are affected
- affected gate audit gaps or target values when the configured floors changed
- confidence consequence when evidence intensity is reduced, scope is narrowed, quick mode is explicit, or profile intent changes
- plan/status sync note when policy fields were changed

### QUEUE

Refill concrete work before closing the current task. Queue items must name the affected gate, topic, reference inventory, filter, artifact, or audit surface.

Use concrete work such as:

- rerun Wave 0 or Wave 1 audit with new configured floors
- refresh affected Topic Investigation Targets and Topic Target Coverage after root-lens intensity, answer phase, or profile-criticality changes
- land additional references for a higher floor
- re-evaluate counted references against a new date/source/source-family filter
- repair inventory rows whose acceptance no longer satisfies the new filter
- refresh topic artifacts after accepted reference counts change
- rerun synthesis checks when a profile switch, filter, tighter verification posture, or relaxed verification posture affects Wave 2 judgments
- rerun synthesis checks when `answer_phase=wave2_synthesis` entries are added, removed, tightened, or relaxed

Generic wording such as "adjust profile later" or "review filters" is not sufficient.

### TRACE

Append a diagnostic entry with:

- `tags: profile_parameter_adjustment`
- user request or inferred policy delta
- previous profile/contracts/floors/filters
- updated profile/contracts/floors/filters
- rationale and confidence consequence
- affected gates, topics, references, artifacts, or audits
- queue refill summary

## Gate Consequence

Apply this default:

- If execution has not started, update plan policy and queue setup/audit consequences; no gate reopen is needed.
- If a profile switch, tighter parameter, or filter affects an unpassed current gate, keep the current wave open and refill same-wave work.
- If a profile switch, tighter parameter, or filter affects a passed Wave 0 gate, restore `current_gate=instantiation_complete` or the last still-valid prior gate, then refill Wave 0 work.
- If a profile switch, tighter parameter, or filter affects a passed Wave 1 gate, restore `current_gate=wave0_complete`, set `current_wave=Wave 1`, and refill Wave 1 work.
- If a profile switch, tighter parameter, relaxed parameter, or filter affects a passed Wave 2 gate, restore `current_gate=wave1_complete`, set `current_wave=Wave 2`, and refill synthesis work.
- If a relaxed parameter lowers targets, keep the current gate state until the matching audit is rerun and records pass under the new configured values.

## Completion Checklist

Return `PASS` only when all applicable items are true:

| check | requirement |
| --- | --- |
| no re-instantiation | no instruction or action reran `instantiate-run-bundle.md` |
| adjustment classified | request is recorded as `profile_switch`, `parameter_tighten`, `parameter_relax`, `filter_update`, or `manual_parameter_override` |
| profile/plan policy sync | `PROFILE_PATH`, `PLAN_PATH.Instance Config`, and `PLAN_PATH -> Research Profile Projection` agree |
| hard gates preserved | local references, inventories, webpage diagnostics, artifacts, seed backfill, gate audits, and Readiness remain mandatory |
| status consequence | affected gates, confidence consequence, and reopen/migration fields are recorded when needed |
| queue consequence | concrete follow-up work exists for every affected audit, filter, reference, topic, or artifact |
| trace | append-only diagnostic entry records previous policy, updated policy, rationale, and affected surfaces |

Return `FAIL_FIX` when generated files are present but the policy adjustment is only partially written or lacks concrete queue consequences. Return `FAIL_BLOCKED` only when the user request is too ambiguous to classify safely and no conservative one-step adjustment applies.

## CLI Support

There is no CLI gate for this command. It is a write-capable runtime command, while `_framework/cli_tools/check_framework.mjs` remains read-only diagnostic support.
