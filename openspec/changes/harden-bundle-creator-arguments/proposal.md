## Why

BUG-095（`_backlog/bugs/BUG-095-new-disposable-bundle-help-creates-junk-bundle.md`）确认 `new-disposable-bundle.mjs --help` 会把 flag 当作位置名称并在 repo root 写出完整 `dpt_disp_--help_<hex>/` bundle。生产 `instantiate-run-bundle.mjs` 采用同一 `args[0]` 解析，存在同类的 `dpt_rb_--help/` 写盘风险；两者都在现有 gate 之前创建目录，因此后置命名检查无法避免污染。

这是 BUG-059 已修过的同一类“flag 被当作 bundle 输入并产生副作用”问题，但现在的两个 bundle creator 没有采用该早期拒绝边界。应在创建入口而非新增 gate、清理器或恢复流程中关闭它。

## What Changes

- 为 disposable 与 production bundle creator 建立共同的外部行为：在任何 `mkdir`、模板/控制文件写入、trace/log 写入或 bundle validation 前，先解析完整 argv 并决定 `--help`、缺参、未知 option、缺少 option 值及名称是否合法。
- `--help`（以及若当前接口接受的简写帮助）必须打印 usage、以 0 退出且没有文件系统副作用；flag 不能成为位置名称。
- 两个 creator 只接受其各自已声明的 option 与合法名称 suffix。非法名称（flag、路径分隔/遍历、空白、错误首字符或不符合对应 production/disposable 命名字符集）必须在 target directory 创建前失败，并给出一个最近的可执行修复动作。
- 保持合法的名称、`--target-dir`、disposable 的 `--case`/`--nodes`/`--force` 及 production 的不覆盖边界；成功创建仍只能是显式 target root 的直接子目录。
- 增加 Node integration 证明，覆盖无副作用 help/拒绝路径与合法创建兼容性；不以 Agent-flow 或 Gate 作为此确定性 CLI 边界的替代证据。
- **BREAKING（仅对无效调用）**：此前被误当作名称的 `--help`、未知 flag、非法名称或缺少 option 值不再创建 bundle，而是立即失败或显示帮助。

不自动删除历史 `dpt_disp_--help_*` 目录，不新增通用 CLI parser、命名 registry、Gate、trace 事件、持久状态、后台扫描或 cleanup controller。

## Capabilities

### New Capabilities

无。两个受影响入口已有明确 capability owner；本 change 只补足其创建前的参数边界。

### Modified Capabilities

- `cmd-bundle-instantiation`: 新增 CMI-008，生产 instantiator 在任何副作用前验证 argv 与 production bundle 名称，并将 help/拒绝结果清楚返回给调用 Agent。
- `experiment-shared-infra`: 新增 EXS-003，disposable creator 在任何副作用前验证 argv、实验选项与 disposable bundle 名称，同时保留已有 case/target 的合法调用。

## Impact

- 目标实现：`DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs`、`experiments_env/shared/new-disposable-bundle.mjs`。
- 目标测试：现有 `tests/integration/cli/instantiate-run-bundle.test.mjs` 与新的 `tests/integration/experiments_env/` creator integration test；不在 `DPT_FRAMEWORK/` 放测试。
- 规格/治理：两个现有 capability 的 delta spec 与 change-root `verification-plan.yaml`；进入 apply 后首先在 `req-registry.yaml` 登记 CMI-008/EXS-003，再进行 target edits。
- 版本：修改 `DPT_FRAMEWORK/` 的 production creator，目标版本为 **v0.37**；apply 时更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 横幅。

Direct Source of Record 是传入 argv、显式 target directory 与 creator 自己构造的最终 basename；最短合法闭环为“解析/验证一次 → 有效时创建一次，或无效时零写入并返回 usage/错误”。用户只提供或授权调用输入；Agent 负责修正可机械判定的命令形状；Engine/CLI 仅裁决结构合法性，不推断名称意图或取得额外 mutation authority。

净简化是把两个散落的裸位置解析收敛为各 creator 的单一早期边界，并让测试直接断言零副作用；它避免继续依赖后置 gate、历史人工清理或每个调用点记住“不要把 flag 放第一个”的隐含规则。
