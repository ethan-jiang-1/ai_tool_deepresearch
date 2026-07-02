## 1. Layer 1: Universal silent execution coverage (WNC-009)

- [x] 1.1 `phase-instantiation.md`: `requires:` 加入 `shared/shared-silent-execution`
- [x] 1.2 `phase-setup.md`: `requires:` 加入 `shared/shared-silent-execution`
- [x] 1.3 `phase-seed-topics.md`: `requires:` 加入 `shared/shared-silent-execution`
- [x] 1.4 `phase-readiness.md`: `requires:` 加入 `shared/shared-silent-execution`
- [x] 1.5 `phase-rerun.md`: `requires:` 加入 `shared/shared-silent-execution`
- [x] 1.6 `phase-final.md`: `requires:` 加入 `shared/shared-silent-execution`
- [x] 1.7 静态确认所有 manifest lifecycle `stop:no` phase nodes（含 wave0/wave1/wave2 已有 requires）均包含 `shared/shared-silent-execution`
- [x] 1.8 静态确认 relay/sub-agent task surfaces（例如 `phase-wave2-subagent.md`）不被 WNC-009 或 autonomous header injection 误纳入 lifecycle phase coverage

## 2. Layer 2: Phase body contradiction fixes (SWE-001)

- [x] 2.1 `phase-instantiation.md` §7: name collision → 自动生成 hex6 后缀替代名，通过 accepted trace/log surface 记录 `silent_degradation`，不询问用户
- [x] 2.2 `phase-instantiation.md` §7: illegal name → 自动规范化（替换非法字符为 `-`），通过 accepted trace/log surface 记录 normalization，不询问用户
- [x] 2.3 `phase-instantiation.md` §7: 已创建的 illegal bundle 不得 rename 或 patch `rb_plan.md` / `rb_profile.yaml` 伪装为合法；恢复必须走 fresh legal instantiation path
- [x] 2.4 `phase-setup.md` §7: 3x fail escalation → 通过 accepted trace/log surface 写 `silent_degradation`（`gap_impact: partial`），不写 `state: blocked`
- [x] 2.5 `phase-rerun.md` §3.1: seed_topics 为空 → 默认全量重跑，通过 accepted trace/log surface 记录 `silent_degradation`，不询问用户确认
- [x] 2.6 全 manifest lifecycle `stop:no` phase body audit: 搜索并清理 "ask user"、"request confirmation"、A/B 选项、"report and stop"、`state: blocked`、`escalation`、"回到 HITL1" 等中途浮出水面路径
- [x] 2.7 `phase-wave0.md`: persistent failure / registry empty / count-floor no-progress 文案改为通过 accepted trace/log surface 记录 `silent_degradation` 或 `silent_gap` + gate-respecting repair/降级，不写 `state: blocked`，不报告并停止
- [x] 2.8 `phase-wave1.md`: count-floor no-progress / placeholder-only / search-space-exhausted 文案改为通过 accepted trace/log surface 记录静默降级，不写 `state: blocked`，不向用户请求决策
- [x] 2.9 `phase-wave2.md`: quality re-fill persistent failure 文案改为通过 accepted trace/log surface 记录静默降级，不写 `state: blocked`，不把 quality gap 作为中途浮出水面理由
- [x] 2.10 `phase-final.md`: Stop Behavior 明确为 terminal delivery，允许写入 `final/` artifact 后交付最终报告；禁止提问、确认、A/B 选项、post-delivery feedback loop
- [x] 2.11 所有 `silent_degradation` / `silent_gap` / `silent_gap_critical` 记录命令必须使用 accepted trace/log surface（如 `log-event.mjs --event` 或 accepted trace writer），不得指示 Agent 手写或直接 append `rb_trace.jsonl`
- [x] 2.12 所有结构性不可通过 gate 的 silent holding 路径必须记录 `silent_unpassable`（accepted trace/log surface），保持 non-blocked/in-progress，不重复同一无效修复，不浮出水面、不加载下一 phase

## 3. Layer 3: shared-silent-execution.md hardening (SWE-002)

- [x] 3.1 新增 §0 "ABSOLUTE PROHIBITION — READ FIRST"：用最强烈的 SHALL NOT 语言声明非终端 `stop:no` phase 绝对禁止浮出水面，gate failure 不是紧急情况，并禁止消息、提问、确认、进度汇报和 A/B 选项
- [x] 3.2 新增 §5 "Fatigue Resistance"：self-check protocol（3 次 fail 后暂停、重新阅读 phase instructions §0、换策略）、structural vs fixable failure 区分、gate CLI Agent-reported `--attempt N` 使用指导、降级不是失败的声明
- [x] 3.3 更新静默阶段适用范围：从 "wave0/1/2" 扩展到所有 manifest lifecycle `stop: no` phase（instantiation, setup, seed-topics, wave0, wave1, wave2, readiness, rerun, final），并明确 Final 是 terminal delivery exception
- [x] 3.4 增加 gate boundary 段：silent degradation 不能绕过 gate，不能自行加载下一 phase；下一 phase 只能来自 gate CLI `check.next`

## 4. Layer 4: Attempt-aware fatigue diagnostics (GSK-006)

- [x] 4.1 `parseGateCliArgs()` in `gate-helpers.mjs`: 新增 `--attempt` option（type: string），解析为 base-10 非负整数，默认 0；缺失、裸 flag、缺值后接其它 option、不可解析、负数、非整数均回退 0，且缺值时不得吞掉后续 option，包含在返回 args 中
- [x] 4.2 `buildGateResult()` in `gate-helpers.mjs`: 接受 `attemptNumber` 和 `fatigueThreshold` 参数（默认 3）。当 `!passed && attemptNumber >= fatigueThreshold` 时注入 `fatigue_warning: true` + `step_back: true` + 3 条 fatigue advice 消息；文案必须称 `attemptNumber` 为 Agent-reported retry hint，不得声称 Engine verified consecutive failures；advice 必须 stop-mode-safe，不得固定声明当前 gate invocation 是 `stop:no`
- [x] 4.3 10 个 gate CLI（`DPT_FRAMEWORK/cli/gates/check-gate-*.mjs`）: `buildGateResult({...})` 调用加入 `attemptNumber: args.attempt || 0`
- [x] 4.4 所有 manifest lifecycle `stop: no` phase body 的 gate 命令段（§5）和 gate fail 段（§7）: 更新指导 Agent 在 retry 时传 Agent-reported `--attempt N`，并在 `step_back: true` 时重新阅读 phase instructions

## 5. Layer 5: Autonomous contract header injection (WNC-008)

- [x] 5.1 `assessNode()` in `workflow-chain.mjs`: 在 `executeLoadPlan` 成功后检查 entry frontmatter 的 `phase`、`stop` 和 `gate` 字段。若为普通 `stop:no`（`gate != null`），在 `entry.md` 的 frontmatter 之后、body 之前注入 AUTONOMOUS MODE 契约头
- [x] 5.2 AUTONOMOUS MODE 契约头内容：声明 + 非终端 `stop:no` 绝对禁令 + gate failure 处理指导 + shared-silent-execution 引用 + `---` 水平线分隔
- [x] 5.3 Final (`phase: final + stop:no + gate:null`) 注入 TERMINAL DELIVERY MODE 契约头：禁止提问/确认/进度汇报/A-B 选项/post-delivery feedback loop；允许写入 `final/` artifact 后交付最终报告
- [x] 5.4 `assessNode()` lifecycle coverage 必须只由 `manifest.phases[].node` 精确匹配决定；frontmatter/filename 不得单独触发注入；无 manifest 的 test/runtime fixture 不注入

## 6. Governance and validation

- [x] 6.1 `req-registry.yaml`: 登记或确认登记 WNC-008, WNC-009, SWE-002, GSK-006
- [x] 6.2 `openspec validate harden-stop-contract --strict`
- [x] 6.3 `node openspec/governance/check-project-reqs.mjs`
- [x] 6.4 `node openspec/governance/check-project-specs.mjs`
- [x] 6.5 若 6.3 因无关 main-spec duplicate 失败，记录为归档阻塞或另开 governance cleanup

## 7. Tests

- [x] 7.1 `tests/engine/workflow-chain.test.mjs`: assessNode 对普通 manifest lifecycle `stop:no + gate!=null` phase 注入 AUTONOMOUS MODE；对 Final `phase: final + stop:no + gate:null` 注入 TERMINAL DELIVERY MODE；对 `stop: yes` phase 不注入；对无 `stop` 字段 phase 不注入；对 relay/sub-agent task surfaces（如 `phase-wave2-subagent.md`）不注入；注入内容在 frontmatter 之后、body 之前且 idempotent
- [x] 7.2 `tests/engine/helpers/gate-helpers.test.mjs`: buildGateResult fatigue diagnostics — high Agent-reported attemptNumber + fail → fatigue_warning + step_back；low attemptNumber + fail → 无 fatigue；pass + high attemptNumber → 无 fatigue；advice 包含 fatigue 消息且不声称 Engine verified consecutive failures；advice 不固定宣称当前 invocation 是 `stop:no`
- [x] 7.3 `tests/engine/helpers/gate-helpers.test.mjs`: parseGateCliArgs --attempt 解析 — 正常整数、省略（默认 0）、裸 flag（回退 0）、缺值后接其它 option（回退 0 且不吞 option）、无效值（回退 0）、负数（回退 0）、非整数（回退 0）
- [x] 7.4 新增静态 regression check：所有 manifest lifecycle `stop:no` phase requires 覆盖 `shared/shared-silent-execution`；relay/sub-agent surfaces 不被要求；phase bodies 不残留 stop:no 泄露词（user-facing stop / `state: blocked` / escalation 指令）
- [x] 7.5 全量回归 `node --test tests/`

## 8. Experiment

- [x] 8.1 创建 case-78 `exp_system-logging/case-78-standard-fatigue-detection.md`：验证 gate CLI 在 Agent-reported `--attempt 3` + gate fail 时返回 `fatigue_warning: true` + `step_back: true`；`--attempt 1` 时不返回；pass 时不返回；verdict 不声称 Engine verified consecutive failures

## 9. Gate-pass / no-idle contract polish

- [x] 9.1 Apply 前置边界检查：确认 `openspec/changes/harden-stop-contract/` 之外没有残留实现/测试/governance/experiment 改动；若有，先 revert 外部改动再继续
- [x] 9.2 `shared-silent-execution.md`: 将非终端 `stop:no` 明确为 active autonomous work loop；禁止阶段性进度汇报、idle 汇报、"nothing left" / "没事做" / "做到这里" 中途总结
- [x] 9.3 全 manifest lifecycle 非 HITL `stop:no` phase §8 审计：逐个写入 node-specific Stop Behavior，不强制统一模板，但必须保留 gate-pass objective、no progress/idle surfacing、`check.next` boundary
- [x] 9.4 `phase-instantiation.md` / `phase-setup.md` / `phase-readiness.md`: 短 phase 完成本地小步骤后必须 reload/check/run gate，不得汇报 "created/validated/done so far"
- [x] 9.5 `phase-seed-topics.md` / `phase-wave0.md` / `phase-wave1.md` / `phase-wave2.md`: queue/thin queue/count-floor/quality gap 都是继续灌料、drain、re-fill、Quality Self-Check 或换策略的信号，不是停下汇报的理由；wave0/1/2 尤其强调证据质量优先
- [x] 9.6 `phase-rerun.md`: rerun prep 不形成进度汇报点；本地准备完成后跑 `rerun-ready` gate，gate fail 则修复或 silent holding，不自行路由
- [x] 9.7 `assessNode()` AUTONOMOUS MODE header: 加入 no progress/idle surfacing 与 gate-pass objective 文案，同时说明 header 是原则 guardrail，不替代 node-specific phase body
- [x] 9.8 静态 regression: 扫描 manifest lifecycle `stop:no` phase body 和 injected header，防止残留/新增 "progress report"、"阶段性汇报"、"nothing left"、"没事做"、"done so far"、"report and stop"、"ask user"、`state: blocked` 等泄露语义
- [x] 9.9 更新相关 unit/integration tests 与 case-78 experiment，覆盖 `--attempt`、header injection、lifecycle membership、no-idle/no-progress wording 和 boundary checks
- [x] 9.10 运行 `openspec validate harden-stop-contract --strict`、governance checks、targeted tests、`node --test tests/`，并保持所有完成项只在验证通过后逐项勾选

Validation note (2026-07-02):
- PASS: `openspec validate harden-stop-contract --strict`
- PASS: `node openspec/governance/check-project-reqs.mjs`
- PASS: `node openspec/governance/check-project-specs.mjs`
- PASS: targeted tests (`workflow-chain`, `static-regression`, `gate-helpers`)
- PASS: `node --test tests/`
