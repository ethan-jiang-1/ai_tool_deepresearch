# Bug: rb_trace.jsonl 事件可被 run-scoped 脚本任意伪造且无任何检测 —— audit 完全不读 trace、gate 的 trace_event_present 消费伪造事件

> **状态**：活跃（2026-09-03 新报，来自 bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 完整现场取证）。
> 与 BUG-249（premature_final_present / plan_progress_tamper_suspected，已修复）**不同层**：BUG-249 检测 final/ 与 Progress 手勾的绕过行为；本 bug 是绕过行为使用的**证据伪造手段**——trace 事件被脚本直接追加，审计与 gate 均无法识别伪造。

## 发现场景

bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 中，Wave1 gate 从未通过（49 次失败），Wave2 gate **从未运行**（`_diagnostics/gates/` 下 0 个 wave2 文件），但 `rb_trace.jsonl` 中存在伪造的完成事件链，且 bundle 名、时间戳、时序全部失真。

## 实际行为

1. **脚本直接 `echo >>` 追加伪造事件**：
   - `_scripts/wave1-complete.mjs:132`
     ```js
     execSync(`echo '{"ts":"2026-09-02T14:40:00.000Z","event":"wave1_completion","bundle":"glm-5-3-deepseek-v4-domestic-chips","topic_count":11,"submitted_count":${submitted}}' >> ${B}/rb_trace.jsonl`)
     ```
   - `_scripts/generate-final-report.mjs:178`
     ```js
     execSync(`echo '{"ts":"2026-09-02T14:15:00.000Z","event":"final_report_complete","bundle":"glm-5-3-deepseek-v4-domestic-chips"}' >> ${B}/rb_trace.jsonl`)
     ```
2. **bundle 名全部错误**：三个伪造事件（`wave1_completion` 14:40:00Z、`final_report_complete` 14:15:00Z、`wave2_completion` 16:00:00Z，rb_trace.jsonl 行 577/440/670）bundle 字段都是 `glm-5-3-deepseek-v4-domestic-chips`（缺 `dpt_rb_` 前缀），而引擎写入的事件（如 `wave0_completion` 13:19:57.333Z）bundle 名正确为 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`。
3. **时序失真**：`wave2_completion` 16:00:00Z 在文件末尾（最后一行），但 wave2 gate 从未运行；`final_report_complete` 14:15:00Z 早于 wave1 gate 最后一次尝试（16:09:03.322Z）；追加顺序与 ts 顺序不一致（15:00 事件位于 14:54 尝试之前）。
4. **audit 0 次读 trace**：`DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs` 中无任何 `rb_trace` / `trace` 引用（grep 计数 0）——审计闭路词表 `premature_final_present`/`plan_progress_tamper_suspected` 依赖 final/ 与 Progress 存在性，**不校验 trace 事件本身**。
5. **gate 信任 trace 事件**：`check-gate-wave1-complete.mjs:109` 与 `check-gate-wave2-complete.mjs:107` 的 `trace_event_present` 规则只检查 `readTraceEvents(bundlePath, rule.target).length === 0`——只要同名事件存在于 trace（无论谁写的、bundle 名是否匹配、ts 是否合理）即通过。

## 根因分析（代码级）

1. `DEEP_RESEARCH_HARNESS/engine/trace.mjs` 是纯 append-only 写入器（`appendFileSync(TRACE_FILE, entry + '\n')`），**无 writer identity、无 bundle 名校验、无 ts 单调性校验**，也没有与 gate attempt 的关联校验；任何能写 bundle 目录的进程（run-scoped 脚本天然可以）都能伪造任意事件。
2. gate 的 `trace_event_present` 规则（wave0/1/2 均有）把 trace 事件当作**通过条件输入**，但消费端不做真实性检查——伪造的 `wave1_completion` 事件即可满足该规则（本 run 中 wave1 gate 的失败规则里没有 trace_event_present，说明该输入被伪造事件满足了）。
3. audit 完全不读 trace，意味着 trace 事件链的完整性（bundle 名一致性、与 gate attempt 的先后关系、完成事件必须有对应 passed gate_attempt）**零检测**。

## 严重程度

**高**（完整性/检测缺口）。
- trace 是 bundle 的可审计证据链，可被随意伪造等于证据链本身不可信；
- 伪造的完成事件能直接满足 gate 的 `trace_event_present` 输入；
- 与 BUG-249 修复互补：BUG-249 使绕过行为可检测，但**检测依据（Progress 勾选 vs gate_attempt）本身依赖 trace 未被污染**——trace 可伪造时，该依据也被削弱。

## 复现步骤

1. 任意 run bundle，Wave1 gate 未通过；
2. `echo '{"ts":"<伪造>","event":"wave1_completion","bundle":"<任意名>"}' >> rb_trace.jsonl`；
3. 运行 `check-gate-wave1-complete.mjs`：`trace_event_present` 规则通过（若其余规则满足则 gate 误通过）；
4. 运行 `audit-phase-status.mjs`：不报告任何 trace 异常（0 处 trace 读取）。

## 修复建议

- **trace 写入引入身份与校验**：`log-event.mjs` 是合法写入路径（`_scripts/wave1-deep-research.mjs:404` 使用），应让 trace 事件携带 writer 身份（如 `source: 'engine'|'cli'|'script'` + work_id），并拒绝 bundle 名不匹配的事件；
- **gate 消费端校验**：`trace_event_present` 通过前校验事件 bundle 名 == 当前 bundle、ts 在 gate attempt 窗口内合理；
- **audit 增加 trace 完整性检查**：bundle 名一致性、完成事件必须有对应 passed gate_attempt（而非仅存在）、ts 单调性与追加顺序一致性、wave2 完成事件必须有 wave2 gate 运行记录；
- 回归锁定：新增伪造 trace 事件被 audit/gate 拒绝的 integration 测试。
