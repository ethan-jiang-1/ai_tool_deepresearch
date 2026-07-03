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

4. **Every silent degradation path leads to one of two outcomes:** (a) you fix the issue and pass the gate, or (b) you record the gap via accepted trace/log surface and continue. Neither outcome involves the user.

5. **If you are fatigued (3+ gate failures on the same issue):** Pause. Re-read these §0 rules. Switch strategies — do not repeat the same fix. Use `--attempt N` on the gate CLI so the Engine can give you step-back advice. Read that advice. Degradation is not failure — it is the expected behavior when a non-terminal `stop:no` phase cannot achieve perfection.

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

### 1.3 Active Work Loop

非终端 `stop: no` phase 不是对话 checkpoint。Agent 的当前目标始终是完成当前 node：检查 queue/status/artifacts，drain active queue，修复 gate fail，执行降级链，重新运行 gate，并只按 gate CLI `check.next` 进入下一 phase。

当本地工作看似完成、queue 暂时为空、active window 为空、质量缺口尚未补齐、或同一 gate 多次失败时，Agent SHALL 将这些状态视为继续工作的信号，而不是中途汇报理由。下一步必须是 node-specific work/repair/degradation、gate rerun，或 §6.3 定义的 silent holding。

### 1.4 降级优先级链（Degradation Priority Chain）

遇错时 Agent SHALL 按以下顺序自行处理，不浮出水面：

1. **重试（Retry）**：网络波动、临时不可用 → 等待后重试（遵循 `shared-repair-guidance.md` 已有修复策略），阻塞消除后自动恢复
2. **换源（Alternative Source）**：特定 URL 不可访问、爬取被拒 → 搜索替代源（更换 domain、更换搜索策略），不降低 evidence quality tier 要求
3. **降级方法（Method Degradation）**：当前方法路径全部失败 → 切换到替代方法（如 WebFetch 不可用 → curl → node fetch → python3），记录方法切换链。**替代方法 MUST 保持在 relay pipeline 内**：直接执行 WebSearch/WebFetch 并手工写入 artifact（绕过 relay pipeline）不是合法的替代方法。合法的替代方法包括：更换 queue slot、切换 relay role key、调整 delegate timeout、或使用不同的 search provider 但仍通过 relay task card 委托。如果 relay pipeline 中的 queue/spawn/commit 路径全部失败，Agent SHALL 进入 mark gap（第四步）而非绕过 relay。
4. **标记 gap（Mark Gap）**：所有替代方案（包括 relay pipeline 内合法替代方法）已穷尽 → 在 `rb_trace.jsonl` 中标记为 `silent_gap`，记录 `gap_impact: none|partial|blocks_must_answer`，继续到下一个 task
   - `gap_impact: blocks_must_answer` 时 Agent SHALL 在周围 topic 中搜索替代覆盖路径，但不浮出水面

Agent SHALL 在每个降级步骤记录到 `rb_trace.jsonl`：原问题、已尝试的恢复步骤（按优先级链顺序）、最终降级决策、影响评估（`gap_impact`）。

### 1.5 终端恢复

用户可以在静默阶段关闭终端。系统 SHALL 能从 durable state（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`）恢复。Agent 恢复时 SHALL 通过 `rb_status.json` 定位当前 phase 继续执行，SHALL NOT 重新开始已完成的工作。

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
| "遇到阻塞→切换方法→自己解决，不要浮出水面" | `shared-silent-execution.md` §1.1 (method switch guidance) | → 方法切换的合法范围限定在 relay pipeline 内。直接 WebSearch + 手工写 artifact 不在合法替代方法集合中。若 relay pipeline 全部失败，进入 mark gap（降级链第四步） |

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

**Important:** `--attempt` is an Agent-reported retry hint. The Engine does not track or verify consecutive failure counts. The Engine returns diagnostics based on what you report — be honest with your attempt count.

### 5.3 Degradation Is Not Failure

Silent degradation (`silent_degradation`, `silent_gap`, `silent_gap_critical`, `silent_unpassable`) is the CORRECT behavior for a non-terminal `stop:no` phase that cannot achieve perfection. Every degradation event recorded via accepted trace/log surface is a successful execution of the contract — the phase is doing exactly what it was designed to do.

When you record a degradation event, you are NOT failing. You are following the contract. Surface to the user would be a contract violation.

---

## 6. Gate Boundary

@impl SWE-002

### 6.1 Silent Degradation Does Not Bypass the Gate

Recording a degradation event (`silent_degradation`, `silent_gap`, etc.) does NOT constitute gate passage. You may NOT:
- Skip the gate because you recorded a degradation
- Self-load the next phase because "the gap is documented"
- Advance `rb_status.json` to the downstream gate without `check.next` from the gate CLI
- Bypass the gate and directly invoke `advance-status.mjs`

### 6.2 Next Phase Comes ONLY from Gate CLI

The ONLY authority for phase transition is the gate CLI's `check.next` field. When the gate passes, `check.next` contains the next node fileRef. Load that fileRef. Do NOT load any other phase.

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

The `silent_unpassable` event is an audit trail for later review or operator inspection. It is NOT a phase transition authority.
