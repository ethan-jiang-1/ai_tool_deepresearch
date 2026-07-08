> req: PRP-001

## MODIFIED Requirements

### Requirement: Phase instantiation body completeness

`phase-instantiation.md` SHALL 包含完整的 9-section body，引导 Agent 创建真实 runtime bundle。

Section 内容要求：
- **Stage Goal**: 创建 bundle 和 canonical scaffold，不替代后续 HITL / setup / wave
- **Required Inputs**: 用户原始 research question（用于命名）和 `DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`
- **Allowed Actions**:
  - 生成合适的 bundle 名
  - 调用 `node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs <name>`
  - 读取 CLI 返回的 bundle 路径
  - reload 新建 bundle 的 control files 和目录结构
- **Expected Artifacts**: 新建 bundle 目录、`BUNDLE_MAP.md`、5 个 `rb_*` control files、canonical scaffold dirs
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle <path> --current-node phases/phase-instantiation.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复缺失或漂移的 instantiation surface，rerun same gate（默认最多 3 次）
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止跳过 CLI 直接手搓"看起来像 bundle"的结果；禁止声称 evidence coverage / synthesis

`phase-instantiation.md` SHALL describe `BUNDLE_MAP.md` as a passive bundle map. It SHALL NOT instruct the Agent to treat the bundle map as an action launcher or phase-control surface.

#### Scenario: Agent executes instantiation phase
- **WHEN** Agent 加载 `phase-instantiation.md`
- **THEN** body SHALL 引导 Agent 调用 `instantiate-run-bundle.mjs`
- **AND** body SHALL NOT 指示 Agent 在这个阶段提 HITL 问题或做 research work

#### Scenario: Instantiation expected artifacts use bundle map
- **WHEN** Agent reads the Expected Artifacts section
- **THEN** it SHALL see `BUNDLE_MAP.md`
- **AND** it SHALL NOT see `START_FROM_HERE.md` as the current expected artifact for new bundles
