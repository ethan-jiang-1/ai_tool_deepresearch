## Context

The active workflow foundation shell already has phase/shared node metadata, manifest entries, gate definition files, gate CLI wrappers, transition routing, bundle templates, and bundle validation. The missing piece is the real pre-research content and deterministic checks for:

```
instantiation -> hitl1 -> setup -> wave0
```

Current accepted contracts matter:

- `instantiate-run-bundle.mjs` is invoked as `node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>`.
- production bundle name collision fails; it does not auto-append `-2` / `-3`.
- disposable experiments are created through `experiments/shared/new-disposable-bundle.mjs`; the directory basename is `dpt_disp_<name>_<hex>`, while `rb_plan.md` and `rb_profile.yaml` keep `plan_basename: <name>`.
- `rb_profile.yaml` HITL1 fields live under `human_decision_checkpoints.hitl1.*`.
- `rb_status.json` has `current_mode`, `state`, `current_gate`, `next_gate`; it does not have a `phases.*` tree. Template initial value is `current_gate: setup_ready` — the `instantiation_complete` state in `GATE_MACHINE_STATES` is not currently used as a `current_gate` value; this change does not alter status semantics, leaving that for a future schema cleanup change.
- workflow-foundation controlled E2E belongs under `experiments_playbook/exp_workflow-foundation/`.
- runtime audit trace lives in each active bundle's `rb_trace.jsonl`; experiment verdict trace lives in the disposable bundle's `_trace.jsonl`.
- new experiment verdicts are backed by `_trace.jsonl` `check` events written by the playbook thin driver through `DPT_FRAMEWORK/engine/trace.mjs`; gate CLI stdout alone is not experiment verdict authority.

## Goals / Non-Goals

**Goals:**
- Fill 5 shared nodes with complete Agent-readable guidance while preserving authority boundaries.
- Fill `phase-instantiation.md`, `phase-hitl1.md`, and `phase-setup.md` with complete 9-section bodies.
- Implement real deterministic rule sets for `instantiation-complete`, `hitl1-recorded`, and `setup-ready`.
- Implement real rule evaluation in all three pre-research gate CLIs.
- Add workflow-foundation pre-research playbooks that make HITL questions, profile diffs, gate feedback, repair, and manual review visible to humans and replayable by AI.
- Define the exact basename normalization rule used by setup gate so production and disposable bundles both pass the same contract.
- Keep runtime audit trace and experiment verdict trace distinct but both real: gate CLIs write runtime audit entries to `rb_trace.jsonl`; experiment drivers write verdict `check` entries to `_trace.jsonl`.

**Non-Goals:**
- Do not change workflow node frontmatter contracts.
- Do not change `ProfileSchema`, `StatusSchema`, or bundle template schema shape.
- Do not change `instantiate-run-bundle.mjs` public interface or collision behavior.
- Do not implement wave0/1/2, HITL2, readiness, or final content.
- Do not make gate logic judge research quality, evidence quality, or synthesis quality.
- Do not introduce a new gate engine/helper framework; reuse current gate helper pattern.
- Do not make gate CLIs own experiment verdict trace writing; experiments may wrap CLI results in thin drivers that append `_trace.jsonl` `check` events.

## Decisions

### D1: Gate CLIs keep the existing helper pattern

All three pre-research gate CLIs use:

`parseGateCliArgs()` -> `loadGateDefinition()` -> `validateNodeGateBinding()` -> iterate rules -> `resolveRouting()` -> `buildGateResult()` -> `emitGateResult()`.

This preserves GSK-004 and avoids a new generic gate runner.

### D2: Gate rules stay deterministic

Allowed check types for this change are:

- `file_exists`
- `dir_exists`
- `pattern_match`
- `schema_valid`
- `field_non_empty`
- `field_value`
- `status_value`
- `cross_field`

No check may inspect semantic research quality or content adequacy.

### D3: HITL1 gate checks bundle state, not chat memory

`hitl1-recorded` checks `rb_profile.yaml` only:

- YAML parseable
- `research_profile` is filled and not `not_selected`
- `root_must_answer_set` is non-empty
- `human_decision_checkpoints.hitl1.status == recorded`
- `human_decision_checkpoints.hitl1.recorded_at` is non-empty

Whether the Agent asked good questions is surfaced in experiments and phase guidance, not decided by gate CLI.

### D4: Setup gate checks structural readiness, not readiness quality

`setup-ready` confirms:

- canonical control files exist and parse
- scaffold dirs exist
- HITL1 is recorded in profile
- `rb_status.json` still points from setup to wave0 (`current_gate: setup_ready`, `next_gate: wave0_complete`)
- normalized bundle dir basename, `rb_plan.md` frontmatter `plan_basename`, and `rb_profile.yaml` `plan_basename` agree

`setup-ready` is not `readiness-passed`.

Normalization is exact and deterministic:

- Production `<name>` must match `[a-z0-9][a-z0-9-]*` and is used as `dpt_rb_<name>`.
- Disposable experiment `<name>` must match `[a-z0-9][a-z0-9_-]*` and is used as `dpt_disp_<name>_<hex>`.
- If bundle dir basename matches `dpt_rb_<name>`, normalized bundle basename is `<name>`.
- If bundle dir basename matches `dpt_disp_<name>_<hex>`, where `<hex>` is one lowercase hex character `[0-9a-f]`, normalized bundle basename is `<name>`.
- Any other bundle dir basename fails the bundle-name rule.
- The normalized bundle basename, plan `plan_basename`, and profile `plan_basename` must be byte-for-byte equal. No case folding, slug rewriting, or whitespace trimming is allowed during comparison.

### D5: Instantiation phase references the real CLI shape

The phase body tells the Agent to call:

```bash
node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>
```

It does not describe unsupported `--bundle` flags or auto-collision suffixes.

### D6: Experiments are part of acceptance

This change adds `experiments_playbook/exp_workflow-foundation/` with:

- `test-simple-pre-research-happy-path.md`: fixed HITL payload is visible, profile diff is visible, all three gates pass.
- `test-medium-pre-research-repair-loop.md`: gate fail -> inspect/advice -> visible repair diff -> rerun -> pass.
- `test-complex-pre-research-review-surface.md`: fixed AI-interpretation sample, human-readable HITL question surface, review artifact/checklist, and trace-backed checks; still light and repeatable.
- `test-heavy-hitl1-manual-review.md`: manual HITL payload path for human-in-the-loop review, not default light regression; heavy means human-interactive/manual, not subagent-dependent.

All playbooks use real disposable bundles, `DPT_FRAMEWORK/cli/validate-bundle.mjs`, `DPT_FRAMEWORK/cli/inspect-bundle.mjs`, real framework CLIs, trace-backed verdicts, and cleanup. Gate CLI stdout is treated as machine feedback; gate CLI appends runtime audit entries to `rb_trace.jsonl`; the playbook thin driver records verdict `check` events to `_trace.jsonl` by calling `createTrace()`. Multi-step Agent Flow remains visible in Markdown and is not hidden inside the driver.

### D7: Invalid bundle names fail-stop instead of in-place repair

If instantiation creates or receives a bundle basename that fails the accepted naming pattern, Agent SHALL stop and create a fresh correctly named bundle through the approved instantiation path. Agent SHALL NOT rename an existing bundle directory or patch `plan_basename` / `rb_profile.yaml` / `rb_plan.md` to make an invalid name appear valid.

### D8: HITL1 includes topic rewrite for vague user input

用户输入可能是详细的 research brief，也可能只有一句话（"帮我研究 AI 安全"）。HITL1 phase 的 Agent 步骤中增加 **topic rewrite**：

- Agent 先判断用户输入的详细程度
- 一句话场景 → Agent 展开为 structured original topic：背景、研究范围、关键维度、已知前提、不确定项
- Original topic 写入 `rb_plan.md` 正文（Markdown body，非 frontmatter）
- 从 original topic 推导初始 seed topics → 写入 `rb_plan.md` frontmatter 的 `topic_registry`
- Agent 将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户审查
- Gate 只做 structural 校验（`PlanSchema` 可解析、`topic_registry` 非空），**不判断 rewrite 质量**——那是人的事

这本质是 query rewrite：把模糊方向变成可操作的 research plan outline。之所以放在 HITL1 而非 instantiation，是因为 rewrite 结果需要用户确认——它是 human-in-the-loop 的一环。

## Risks / Trade-offs

- **R1: Shared guidance becomes hidden authority** -> every shared node includes an Authority Boundary and gate CLIs never read shared nodes as rule source.
- **R2: Setup gate drifts into readiness** -> setup rules explicitly stay structural; readiness remains later.
- **R3: Human review cannot be fully automated** -> light playbooks expose review surfaces with fixed payloads for repeatability; heavy/manual playbook exposes the real human review path.
- **R4: Existing `exp_wff_validation` assumes placeholder pass** -> new active workflow-foundation playbooks target pre-research behavior; runner manifest is updated accordingly.
- **R5: Trace authority gets confused with CLI stdout** -> gate CLIs return JSON and write runtime audit trace; experiment drivers alone convert those real results into experiment verdict `check` events.
- **R6: Light review-surface accidentally depends on live AI behavior** -> complex playbook uses a fixed AI-interpretation sample; manual HITL remains the human-interactive path.
