---
node_type: shared
id: shared-silent-execution
shared_scope: silent-execution
authority: behavioral-contract
execution_contract:
  surface: shared-guidance
  search_policy: no_search
requires: []
suggested_context:
  - shared/shared-repair-guidance
  - shared/shared-anti-cheating-rules
---

# Shared: Silent Execution（静默阶段行为纪律）

## §0 ABSOLUTE PROHIBITION — READ FIRST

@impl SWE-002

**THIS SECTION IS THE FIRST THING YOU READ IN THIS FILE. IT OVERRIDES EVERYTHING ELSE.**

You are in a **non-terminal `stop: no` phase**. This means:

1. **You SHALL NOT surface to the user. Period.** No messages, no questions, no confirmations, no progress reports, no idle/no-work reports, no "nothing left" / "done so far" summaries, no A/B choices. The user is NOT available for consultation. There is no HITL checkpoint here.

2. **Gate failure is NOT an emergency.** Gate fail means "the current artifact set has gaps" — nothing more. It does NOT mean "stop and ask the user." It means "read the inspect/advice, fix what's broken, rerun the gate." Gate failure is a normal, expected part of autonomous execution.

3. **User-facing surfacing is the prohibited behavior.** You may retry, switch strategies, degrade gracefully, record gaps, inspect queue/status/artifacts, run the gate, or hold in place. You may NOT ask the user for help, confirmation, or direction, and you may NOT send progress, idle, "nothing left", "没事做", "做到这里", or "done so far" updates. If you are about to write a mid-phase user-facing message — STOP. That message is forbidden.

   If you can identify the intent before surfacing, record a diagnostic `surfacing_intent` event and abort the user-facing path:

   ```bash
   node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --surfacing-intent --node phases/<phase>.md --intent-type <ask_user|progress_report|partial_delivery|user_choice|wait_for_input|other> --reason "<why you almost surfaced>"
   ```

   `surfacing_intent` is a would-have-surfaced diagnostic only. It is not permission to surface, not HITL authorization, not gate or handoff evidence, not final delivery evidence, and not status synchronization evidence.

4. **Every silent degradation path stays inside the lifecycle contract:** (a) repair deterministic blockers and pass the gate, (b) switch strategy and rerun, (c) consume a legal gate-produced degraded `check.next`, or (d) hold silently with trace/log diagnostics when no legal route exists. None of these outcomes involves the user.

5. **If you are fatigued (3+ gate failures on the same issue):** Pause. Re-read these §0 rules. Switch strategies — do not repeat the same fix. Use `--attempt N` on the gate CLI so the Engine can give you step-back or degraded-handoff advice. A degraded pass is legal only when the gate returns `passed: true`, `degraded: true`, and normal `check.next`; it is not a clean quality pass.

6. **Gate-pass objective:** This phase is an active autonomous work loop. Local sub-step completion, an empty active window, or repeated gate failure is not a checkpoint. Continue current-node work, repair, degradation, or silent holding until the current gate passes and returns `check.next`.

7. **Gate boundary:** Silent degradation does not bypass the gate. You may not self-load the next phase. The next phase comes ONLY from the gate CLI's `check.next`.

---

## Purpose

定义所有 manifest lifecycle `stop: no` phase 的静默自主执行契约。Agent 在这些阶段 SHALL NOT 浮出水面——不展示内容、不提问、不确认、不报告进度、不报告 idle/no-work 状态、不做“nothing left / 没事做 / 做到这里”中途总结。遇错按降级优先级链自行处理，并持续推进到 gate pass + `check.next` 或合法 silent holding。

此文件是 **行为约定**——所有 manifest lifecycle phase MD 通过 `requires` 加载此文件，Agent 在静默阶段 SHALL 遵守本文中的所有规则。

**冲突解决**：当本文规则与 `shared-repair-guidance.md` 或 `shared-anti-cheating-rules.md` 冲突时，本文的静默纪律优先（详见第 3 节优先级覆盖表）。

**Authority boundary**：此文件定义 Agent 行为规则。Engine（gate CLI）保证 gate 推进 + schema 验证，不参与静默行为判断。

---

## 1. 静默阶段核心行为纪律

@impl SWE-001

### 1.1 适用范围

以下 phase 为静默阶段（均为 manifest lifecycle `stop: no`）：

| Phase | 特点 |
|-------|------|
| instantiation | 执行时间短，name collision/illegal name 时自动 hex6 后缀或规范化 |
| setup | 执行时间短，实践中几乎不会触发降级 |
| seed-topics | 执行时间短，实践中几乎不会触发降级 |
| wave0 | 长程，可能触发降级 |
| wave1 | 长程，可能触发降级 |
| wave2 | 长程，可能触发降级 |
| readiness | 程序化 precheck，执行时间极短 |
| rerun | HITL2 rerun 后的增量分析 phase |
| final | **Terminal delivery exception** — `stop:no` + `gate:null`。允许在 `final/` artifact 写入后交付最终报告，但禁止中途提问/确认/A-B 选项/post-delivery feedback loop |

### 1.2 核心禁令

Agent 在静默阶段 SHALL NOT：
- 向用户展示任何内容
- 向用户提问
- 请求用户确认
- 报告执行进度
- 报告 idle/no-work 状态或声称 "nothing left" / "没事做" / "done so far"
- 发送类似 "继续吗？"、"已完成 XX，是否继续？"、"遇到错误，是否重试？" 的消息
- 提供 A/B 选项或要求用户做任何决策

If the Agent catches itself preparing any prohibited surfacing, it SHALL log `surfacing_intent` through `log-event.mjs --surfacing-intent`, then abort the user-facing message and continue repair, strategy change, degradation, or silent holding. If no trace/log tool is available, the Agent still SHALL NOT surface; lack of logging never creates permission to ask the user.

### 1.3 Active Work Loop

非终端 `stop: no` phase 不是对话 checkpoint。Agent 的当前目标始终是完成当前 node：检查 queue/status/artifacts，drain active queue，修复 gate fail，执行降级链，重新运行 gate，并只按 gate CLI `check.next` 进入下一 phase。

当本地工作看似完成、queue 暂时为空、active window 为空、质量缺口尚未补齐、或同一 gate 多次失败时，Agent SHALL 将这些状态视为继续工作的信号，而不是中途汇报理由。下一步必须是 node-specific work/repair/degradation、gate rerun，或 §6.3 定义的 silent holding。

### 1.3.1 Delegated Work Polling

For delegated work-unit phases, autonomous continuation includes an active poll-submit-repair-terminalize loop. After background Sub-agent spawn, notifications are hints only; absence of a task notification is not a continuation blocker, and a received notification is not authority without submit/gate validation.

The Phase Agent SHALL reconstruct in-flight work from bundle truth before claiming or gating: queue delegated-in-flight state, `_work_units/waveN/{work_id}/` manifests/status/result surfaces, runtime receipts, output/cache files, and `operate-work-unit inspect <bundle>` output. A scratch list of spawned work IDs may help, but loss of chat memory does not orphan work.

For every reconstructed in-flight attempt, poll readiness by inspecting result, receipt, output, cache, status, and deadline signals. When ready, run `operate-work-unit submit` without waiting for user continuation. If submit rejects, repair the same attempt when possible; otherwise close it explicitly with `fail`, `timeout`, or `abandon` before claiming replacement work. Do not run a phase gate while delegated queue demand or reconstructed in-flight work remains.

### 1.4 降级优先级链（Degradation Priority Chain）

遇错时 Agent SHALL 按以下顺序自行处理，不浮出水面：

1. **Repair deterministic blockers**：先修 schema、queue、status、trace、work-unit submit、declaration ledger、provenance/hash、cache coverage/content、route-bound handoff 这类 Engine 能确定的 blocker。按 gate inspect/advice 的 root cause 修，不手改 authority files。
2. **Change strategy**：如果同一修复不收敛，换 queue demand、搜索角度、delegate timeout、work-unit role/kind、retry/replacement submit 路径，或关闭失败 `work_id` 后重新 claim。替代方法 MUST 保持在 work-unit pipeline 内；直接 WebSearch/WebFetch 并手工写 artifact 不是合法替代方法。
3. **Consume legal degraded handoff**：只有当 gate CLI 自己返回 `check.passed: true`、`check.degraded: true`、`check.next`、`degraded_reason` 和 `degraded_rules` 时，才可把它当 handoff witness。它只证明可以进入下一 Markdown control surface，不证明 clean quality pass，也不证明目标 phase work completion。
4. **Continue through the legal chain**：当 clean 或 degraded `check.next` 可用时，运行 `enter-phase --node <check.next>`；只有 `enter-phase` / `load_complete` 负责加载下一 Markdown control surface。随后按 phase 指令运行 source-gate `advance-status --to <source_gate_enum>`，该命令只同步 source-gate status window。继续执行新加载的 phase Markdown。不可跳过 Wave1/Wave2/HITL2/readiness，不能提前写 `final/`。
5. **Silent hold**：如果 runtime-truth blockers 仍在、trace 不可持久化、route binding 不成立，或 gate 没有返回 legal `check.next`，记录 accepted trace/log diagnostics 后保持当前 phase silent hold。不要浮出、不要自造 pass、不要手改 status。

Agent SHALL 在每个降级步骤记录到 accepted trace/log surface：原问题、已尝试的恢复步骤、最终决策、影响评估。记录 gap/silent diagnostics 不是 handoff authority。

### 1.5 终端恢复

用户可以在静默阶段关闭终端。系统 SHALL 能从 durable state（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`）恢复。Agent 恢复时 SHALL 优先通过非空 `rb_status.json.current_node` 定位当前 phase Markdown 继续执行；若该字段为 `null` 或缺失，SHALL 使用 trace/reentry diagnostics，不得只凭 `current_gate` 猜测当前 phase，且 SHALL NOT 重新开始已完成的工作。

---

## 2. 降级期间 State 规则

@impl SWE-001

Agent 在静默阶段降级时 SHALL NOT 将 `rb_status.json` 的 state 设为 `blocked`：

- 当前 phase 的 run state SHALL 保持 `in_progress`（不写入 `blocked`，不触发 stop）
- 每次降级 SHALL 在 `rb_trace.jsonl` 中写入 `silent_degradation` event，包含：
  - 原 escalation 原因（如 "repair 3 次 fail，源 example.com 不可访问"）
  - 降级决策（按优先级链选择的具体步骤，如 "mark gap，gap_impact=partial"）
  - 影响评估（对 must-answer 问题的影响）
- 如果降级类型为 mark gap 且 `gap_impact: blocks_must_answer`，在 `rb_trace.jsonl` 中额外写入 `silent_gap_critical` event，但不改变 `rb_status.json` state
- Agent SHALL NOT 写入 `rb_status.json` 的 `blocked` state 或以任何方式触发 stop——静默阶段的降级不构成 lifecycle block

到达 HITL2 时，Agent SHALL 将静默期积累的降级汇总报告给用户：
- 降级总数及按 `gap_impact` 严重程度分布
- 每个 `gap_impact: blocks_must_answer` 事件的详细描述
- 用户可在 HITL2 中选择 C (rerun) 或 D (repair) 针对性修复

---

## 3. Repair Escalation 冲突覆盖

@impl SWE-001

在所有 manifest lifecycle `stop: no` phase（instantiation, setup, seed-topics, wave0, wave1, wave2, readiness, rerun, final），以下来自其他 shared 文件的规则被静默纪律显式覆盖：

| 被覆盖的规则 | 来源 | 静默阶段改写 |
|-------------|------|------------|
| "修复需要用户 decision 或权限 → escalation/block" | `shared-repair-guidance.md` Escalation 段 | → 降级处理（按降级优先级链），不 escalation，不 block |
| "连续 repair 达到 retry limit 且无进展 → escalation" | `shared-repair-guidance.md` Retry Limit 段 | → 降级处理（按降级优先级链），不 escalation |
| "不能在 escalation 条件触发后继续假装一切正常" | `shared-anti-cheating-rules.md` 规则 3 | → 在静默阶段，"继续执行"不是"假装正常"——降级 + trace 本身就是静默阶段的正确行为。本规则在静默阶段不适用 |
| "遵守 3 次 retry limit；no-progress 或超限后 escalation→block" | `shared-anti-cheating-rules.md` 规则 3 | → 3 次 retry 后不 escalation/block，改为降级 + trace + 继续，按降级优先级链选择下一步 |
| "遇到阻塞→切换方法→自己解决，不要浮出水面" | `shared-silent-execution.md` §1.1 (method switch guidance) | → 方法切换的合法范围限定在 work-unit pipeline 内。直接 WebSearch + 手工写 artifact 不在合法替代方法集合中。若 work-unit claim/spawn/submit 全部失败，进入 mark gap（降级链第四步） |

Agent SHALL NOT 因 escalation 条件满足而浮出水面。只有在到达下一个合法浮出水面点（HITL2）时，Agent 才将静默期积累的降级和未解决阻塞汇总报告给用户。

---

## 4. 用户主动消息处理

@impl SWE-001

用户在静默阶段主动发送消息时的处理规则：

**允许的响应**：
- Agent MAY 以单轮、陈述式状态回复（如 "正在执行 Wave1 证据采集。完成后会在 HITL2 与你见面。"）
- 回复 SHALL 以句号结尾（不以问号结尾）
- 回复 SHALL NOT 邀请进一步对话
- 回复 SHALL NOT 提供选项

**禁止的行为**：
- Agent SHALL NOT 因用户消息而停止等待——回复后继续执行
- Agent SHALL NOT 将用户消息当作 HITL 交互——不进入环模型，不询问决策
- 即使用户连续发送多条消息，Agent SHALL 仅做单轮状态告知（不展开对话环），重复回复后继续执行

**补充信息处理**：
- 如果用户消息包含研究相关的补充信息（如 "对了，也帮我看看 X"），Agent SHALL 记录到 `rb_trace.jsonl` 但不立即处理
- 在 HITL2 时提醒用户该补充信息尚未纳入当前研究

---

## 5. Fatigue Resistance

@impl SWE-002

Gate failure patterns in long-running silent phases (wave0, wave1, wave2) can induce LLM context fatigue — the model's most natural fallback when uncertain is "ask the user." This section provides a self-check protocol to resist fatigue-induced surfacing.

### 5.1 Self-Check Protocol

After 3 consecutive gate failures on the same phase, PAUSE before taking any action. Execute this protocol:

1. **Re-read §0 of this file.** Read every line. The absolute prohibition is the first thing you read in this file for a reason.

2. **Re-read the current phase instructions' §5 (Gate Command) and §7 (On Gate Fail).** Verify you are running the correct CLI command and interpreting inspect/advice correctly.

3. **Classify the failure:**
   - **Structural (fixable):** Missing file, schema violation, stale token — you know the fix and can apply it directly. Apply it, rerun gate with `--attempt N`.
   - **Structural (unfixable):** Gate rule that fundamentally cannot be satisfied with current bundle state (e.g., `rerun_count >= 3` for rerun-ready) — record `silent_unpassable`, hold non-blocked.
   - **Degradation (retryable):** Count floor not met, search space partial — the normal silent execution scenario. Switch strategy (different keywords, different search angles, different repair tactic) rather than repeating the same action. Rerun gate with `--attempt N`.

4. **Switch strategy — do not repeat.** If your last attempt used strategy A (e.g., supplementary re-fill with one search angle), use strategy B (different search keywords, different sources, different repair method). Degradation is NOT failure — it is the expected behavior when a non-terminal `stop:no` phase cannot achieve perfection.

### 5.2 Gate CLI `--attempt N` Usage

When retrying a gate after failure, pass `--attempt N` where N is your 1-based retry count:

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-<gate-name>.mjs --bundle <path> --current-node phases/<phase>.md --attempt <N>
```

The Engine will use this Agent-reported retry hint to return fatigue diagnostics when `N >= 3`:
- `fatigue_warning: true` — the Engine is signaling that you should step back
- `step_back: true` — you SHOULD pause, re-read phase instructions, and switch strategies
- Additional `advice` messages with stop-mode-safe guidance

**Important:** `--attempt` is a compatibility hint only. The Engine also derives `attempt_count`, `attempt_trend`, and cross-attempt deltas from trace/diagnostic artifacts. Treat Engine-derived diagnostics as stronger than your self-reported counter.

### 5.3 Degradation Is Not Failure

Silent degradation (`silent_degradation`, `silent_gap`, `silent_gap_critical`, `silent_unpassable`) is the CORRECT behavior for a non-terminal `stop:no` phase that cannot achieve perfection, but it is diagnostic unless the gate CLI emits a legal degraded pass with `check.next`. A diagnostic degradation event is not handoff authority and is not permission to skip phases.

When you record a degradation event, you are following the contract. Surface to the user would be a contract violation.

---

## 6. Gate Boundary

@impl SWE-002

### 6.1 Silent Degradation Does Not Bypass the Gate

Recording a degradation event (`silent_degradation`, `silent_gap`, etc.) does NOT constitute gate passage. You may NOT:
- Skip the gate because you recorded a degradation
- Self-load the next phase because "the gap is documented"
- Advance `rb_status.json` to the downstream gate without `check.next` from the gate CLI
- Bypass the gate and directly invoke `advance-status.mjs`

### 6.2 Phase Handoff Comes ONLY from Gate CLI and `enter-phase`

The ONLY routing authority for phase handoff is the gate CLI's `check.next` field. When the gate passes, `check.next` contains the next node fileRef. Consume that fileRef through the accepted loader/check path:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
```

Then synchronize the just-passed source gate with `advance-status --to <source_gate_enum>` exactly as the phase node instructs. Do NOT load any other phase, and do NOT use `advance-status` as a substitute for `enter-phase`. `enter-phase` / route-bound `load_complete` witness entry into the target Markdown control surface; they do not prove target-phase work completion.

### 6.3 Silent Unpassable Holding

When a gate is structurally unpassable (the gate rule fundamentally cannot be satisfied with the current bundle state, and all repair/strategy-change paths are exhausted):

1. Record `silent_unpassable` via accepted trace/log surface:
   ```bash
   node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_unpassable" --detail '{"kind":"silent_unpassable","phase":"<phase>","gate":"<gate>","reason":"<reason>"}'
   ```
2. Keep the current phase in non-blocked/in-progress holding state
3. Do NOT write `state: blocked` to `rb_status.json`
4. Do NOT surface to the user
5. Do NOT self-load the next phase
6. Do NOT repeat the same ineffective repair

The `silent_unpassable` event is an audit trail for later review or operator inspection. It is NOT phase handoff authority, status synchronization authority, or target work completion.

---

## 7. Autonomous Continuation / Why Continue

@impl SWE-003

`stop: no` is the compatibility frontmatter field. The behavior name is autonomous continuation: during a non-terminal lifecycle phase, the Phase Agent does not surface to the user, does not wait for user input, does not self-declare completion, and continues through the Markdown-controlled loop until gate pass and accepted `check.next` handoff.

Final report delivery is guaranteed at `phase-final` after final artifacts are written. Every completed wave improves evidence grounding, source coverage, question reconciliation, and synthesis quality. High gate friction, user waiting time, or local confidence in partial data does not authorize premature chat synthesis.

Early chat delivery during a non-terminal autonomous continuation phase is less helpful than completing the verified pipeline. After a non-terminal gate pass, the correct next action is to consume `check.next` through `enter-phase`, then synchronize the just-passed source gate, then continue from the rendered next phase Markdown. Prose in this section is guidance; deterministic handoff truth still comes from `gate_attempt(passed=true)`, route-bound `load_complete`, and Engine checks.
