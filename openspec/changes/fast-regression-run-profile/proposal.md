## Why

刚归档的 progressive run strategy 已把 filename tier 从选择权威中移除，并提供了可重算的 calibration/discovery/diagnostic/assurance profile，以及可比较的 `agent-experiment-batch-report/v2` execution-surface observation。它没有定义一个真正可高频运行的 regression surface；当前保留的 `203` 份报告仍都是 v1，不能直接形成当前成员。当前快的历史 case 与慢的完整 Agent/多阶段 case 混在同一 discovery 目标中，导致“广覆盖”和“必须在几分钟内结束”没有可执行的共同边界。

本 change 只建立一条小而严格的 fast regression loop：它以当前可比实测事实决定虚拟成员，以 author frontmatter 的建议排序，不移动或重分类 case。慢 case 仍是有价值的实验资产，但只在 calibration、diagnostic 或明确 assurance scope 下按需运行。

## What Changes

- 在 Experiment Run Strategy 中新增显式 `regression` run profile。它只选择 Headless-eligible、`deterministic_contract`，且最近一条完整可比较 v2 retained result 为 native PASS + health CLEAN、单 case duration 不超过 `120000` ms、cost 不超过 `$0.60` 的 case；所有准入事实必须来自同一条 result，不能从多次历史运行拼接。任何不满足或当前 execution surface 不可比的 case 都明确留在 pool 外。
- 将 regression batch 固定为快速广覆盖目标：调用方只能收紧而不能放宽 `8` 分钟预测时长、`$3` 总预算、`$0.60` 单 case 预算、`120000` ms Agent timeout 和每个 health target 的 `60000` ms timeout。非 dry-run 必须显式给出不超过 `120000` ms 的 Agent timeout，避免沿用现有十分钟默认值；selection 在合格 `experiment` group 间轮转，每批至多一例/group，并把不可覆盖的 group 显式报告为 unavailable。`8` 分钟是 selection forecast，不引入 batch scheduler 或新的 wall-clock controller。
- 在 V2 playbook frontmatter 增加可选 author recommendation，默认 neutral；它只影响同等合格 case 的排序，不能绕过实测 SLO、native outcome、health 或 execution-surface 比较。
- 将 `verdict_mode: all` 的 retry-误报风险列为 regression admission quality gate：仅审查当前快候选，保留 `all` 的 case 必须有可复核的 case-level safety 结论；不能证明的 case 不进入初始 qualification。不会无差别改写全库的 `all` case。
- 增加清晰的 breach 处理：任一 native FAIL、lifecycle ERROR、health ISSUES、SLO 违约或 execution-surface drift 立即使 case 退出 virtual regression pool；它进入显式 diagnostic/qualification 路径，不自动 retry 或被慢 case 静默替代。
- 设计一次真实的初始 qualification：从审查通过的候选中按 group 选择，受同一 fast envelope 约束；仅新写入的 matching v2 PASS+CLEAN result 才能让 case 成为正式 regression 成员。历史 v1 的单条 source-matching PASS+CLEAN result 可用于挑选 qualification，却不能直接晋升成员。

**BREAKING**：`--run-profile regression` 是受固定 fast SLO 约束的 profile；它不能像 discovery 一样用更宽的时长或预算声明为 regression。现有 calibration/discovery/diagnostic/assurance 语义保持不变。

## Capabilities

### New Capabilities

<!-- None. Fast regression is a bounded profile within existing Autorun/run-strategy contracts. -->

### Modified Capabilities

- `experiment-run-strategy`: 增加虚拟 fast regression membership、硬 SLO、group coverage 和 breach/qualification projection。
- `experiment-agent-autorun`: 接受并 fail-close 执行受 fast SLO 约束的 regression profile，保持既有 Supervisor lifecycle 与预算 authority。
- `experiment-observability`: 保留 regression selection、eligibility、coverage、breach 和 qualification 的可审计事实，且不改变 native outcome/health authority。
- `playbook-runner`: 将正常操作说明扩展为 fast regression 的明确入口、author recommendation 边界和慢 case 的按需路径。

## Impact

- 预计修改 `DPT_FRAMEWORK/host_tools/lib/experiment-run-strategy.mjs`、`agent-experiment-contract.mjs`、`run-agent-experiment.mjs`、`DPT_FRAMEWORK/schema/contracts/playbook.mjs`、关联 README/playbook guidance、manifest/frontmatter validation 与 JS-led tests；不会移动或重命名 `experiments_playbook/` 中的 case。
- 已有 outer `batch-report/v2` 和 execution-surface contract 继续复用；当前 v1 retained report 只作为 source-marked qualification forecast。initial qualification 必须由真实 Headless Playbook Agent 写出完整 v2 runtime evidence，不能由 fixture 或人工回填代替。
- 直接事实仍各自归属：manifest/path/order 与 frontmatter 是当前 case policy；保留 report/audit 是历史观察；native completion 与 health 分别裁决本次 outcome/diagnosis；run strategy 只产生可解释选择，不成为第二 verdict、scheduler、daemon 或 repair controller。
- 最短闭环为：审查候选 `all` retry 语义 -> 有界真实 qualification -> matching v2 result -> virtual regression selection -> 既有 Supervisor run -> breach 进入显式 diagnostic/qualification。它替代手写 Wave A-D 速度名单、filename-Light 默认和永久 case 分类，而不引入 cursor、registry、batch deadline 或后台任务。
- 用户已决定 regression SLO、覆盖单位和成本边界；Agent 负责在已授权 envelope 内执行实际 qualification/diagnostic；Engine 负责 schema、selection、budget、report 和 lifecycle verdict。该 change 不创造自动运行权限。
- 此 change 修改 `DPT_FRAMEWORK/` 的 host-tool behavior，目标发布版本为 `v0.67`，apply 时更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。
