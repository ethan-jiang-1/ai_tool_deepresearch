## 0. 计划审查（首次 target edit 前）

- [x] 0.1 polish 阶段完成 whole-change coherence 审查 + 两轮风险导向审查（Pass 1：跨 artifact 引用/术语/路径/期望数字一致；Pass 2：witness 时序移除的伪造检测影响、`ts` 变量无死代码、`trace_integrity` 无其他消费者）；semantic-closure 记录与计划改面一致（family `lifecycle.gate-status-trace-handoff`，resolver/established_by/consumers 均为 bare file coordinate，无 fragment 误用）(openspec-feedback:plan-review)

## 1. Engine 实现修复

- [x] 1.1 修改 `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` 的 `evaluateTraceCompletionIntegrity` witness 检查：删除 `(ts === null || typeof candidate.ts !== 'string' || candidate.ts <= ts)` 时序分支，仅按 gate identity + `passed === true` 匹配（@impl TRW-008）。验证：改动后 `grep -n "candidate.ts <= ts" DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` 无输出，且 TRW-008 相关测试全部通过

- [x] 1.2 在现有 `tests/engine/helpers/phase-status-audit-integrity.test.mjs`（unit truth table）新增 `evaluateTraceCompletionIntegrity` describe 块（复用其 `makeBundle`/`writeTrace` helper，in-process 直测）：正例（completion.ts 早于 passed gate_attempt.ts、bundle canonical → ok 且无 unsupported_completion finding）、反例（无 passed gate_attempt → unsupported_completion；bundle 短名 → unsupported_completion；非单调 ts → non_monotonic_ts）。验证：`node --test tests/engine/helpers/phase-status-audit-integrity.test.mjs` 全绿（含既有用例）

- [x] 1.3 在 `tests/integration/cli/audit-phase-status.test.mjs` 的 TRW-008 describe 块新增正例用例："completion 先写、gate 后过仍合法"（completion.ts 早于 passed gate_attempt.ts，bundle canonical，断言 `trace_integrity.ok === true` 且无 unsupported_completion finding）；保持现有三个反例（无 witness / bundle 短名 / 非单调 ts）原样通过。验证：整个 TRW-008 块 5 个用例全部 green（`node --test tests/integration/cli/audit-phase-status.test.mjs`）

## 2. Spec 同步

- [x] 2.1 将 `openspec/specs/engine/trace-writer/spec.md` 的 TRW-008 Requirement 文本与场景同步为 delta 内容：witness 检查 SHALL 只按 gate identity + passed status 匹配、SHALL NOT 要求时序先后；"Legitimate gate-backed completion passes audit" 场景覆盖 completion 早于 gate 的形态；新增"Completion timestamp older than a later event is flagged"场景。验证：`openspec validate "2026-09-04-fix-audit-completion-witness-timing" --strict` 通过，且 main spec TRW-008 段与 `openspec/changes/2026-09-04-fix-audit-completion-witness-timing/specs/engine/trace-writer/spec.md` 的 MODIFIED 内容一致

## 3. 端到端验证

- [x] 3.1 运行 `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle dpt_rb_glm-5-3-deepseek-v4-domestic-chips`：确认 924/944 两条合法 completion 不再报 `trace_integrity_unsupported_completion`，且 306/576/669 三条 09-02 手插 completion 的 no-witness 项也消失（其对应 gate 有真实 passed 证据）——findings 从 11 降至 6，剩余 6 条均为非时序形态：`final_report_complete`（bundle 短名 + 无 gate identity）、576 `wave1_completion`（bundle 短名）、669 `wave2_completion`（bundle 短名 + 非单调 ts）、`diagnostic`@14:54:07（非单调 ts）。验证：stdout `trace_integrity.findings.length === 6`，且 findings 不含 ts=2026-09-04T13:38:47 / 13:58:00 的事件

- [x] 3.2 对照回归：运行 `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle dpt_rb_chinese-ai-inference-chips-vs-nvidia` 与 `dpt_rb_ai-coding-evolution`，确认合法首轮 completion 不再被误报。验证：两个 bundle 的 `trace_integrity.ok` 均变为 `true`（findings 从 3 降至 0，两 bundle 无 bundle mismatch / 非单调 / final_report_complete 形态）

## 4. 收尾检查（归档前硬性 done condition）

- [x] 4.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-04-fix-audit-completion-witness-timing` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。验证：命令退出码 0 且输出无 failure

- [x] 4.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。验证：命令退出码 0 且输出无 failure

## 5. 归档前 closeout review

- [x] 5.1 对本 change 的实际 diff 做 closeout review：diff 严格限于 4 个文件（`phase-status-audit.mjs` witness 分支 -1 行、`openspec/specs/engine/trace-writer/spec.md` TRW-008 同步、两个测试文件新增正例），无工作树外改动混入；delta 与 main spec 的 TRW-008 段逐字节一致（3067 chars identical）；semantic-closure 的 resolver/established_by/consumers 与实改文件一致，无 fragment；验证证据（单测 15/15、集成 15/15、目标 bundle findings 11→6、对照 bundle 3→0）与 verification-plan claims 对应，无 open finding (openspec-feedback:closeout-review)
