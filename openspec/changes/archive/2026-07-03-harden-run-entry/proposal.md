## Why

用户通过 `RUN.md` 拖入对话触发 DPT_FRAMEWORK 时，Claude Code 内置的 `deep-research` skill 可能与框架入口产生歧义——一旦 `RUN.md` 内容进入上下文，入口文件需要在最早位置给出明确的"不要调用内置研究捷径"指令，避免 agent 继续走一次性内置 research workflow。同时项目缺乏版本标识，无法追踪框架演进。

## What Changes

- **RUN.md 新增"禁用内置捷径"指令块**（Section 0，版本横幅之后、原 Section 1 之前）：以条件-动作指令显式告诉 agent，若工具列表中存在 `deep-research` skill 或等价 research shortcut，**不要调用它**——本文件已接管 Deep Research 入口职责
- **RUN.md 新增版本横幅**：文件顶部显示 `DPT_FRAMEWORK v0.1`
- **同步强化 CLAUDE.md / AGENTS.md / README.md**：将"默认走框架"的偏好性语言改为明确的"不要调用内置研究捷径，走框架入口"指令
- **新建项目根 `CHANGELOG.md`**：以简洁格式记录版本历史（给人看的，版本号 + 一两句说清改了什么），不枚举文件/requirement ID/实现细节
- **更新 OpenSpec 项目规则提示**：让后续修改 `DPT_FRAMEWORK/` 行为的 change 在 proposal 阶段声明版本决策，并在 tasks 中包含 CHANGELOG/RUN.md banner 同步步骤

## Capabilities

### New Capabilities

- `run-entry`: RUN.md 入口行为规范——版本横幅显示、内置 research shortcut 覆盖指令、入口文档同步
- `version-management`: 版本管理规范——CHANGELOG 格式与位置、版本号决定时机、每次行为变更强制更新 CHANGELOG、RUN.md banner 与 CHANGELOG 版本一致性

### Modified Capabilities

（无——现有 capability 的 spec 级行为不变）

## Versioning

- Version bump required: yes
- Target version: `v0.1`
- Reason: 本 change 是 DPT_FRAMEWORK 首个显式入口版本，同时改变入口行为指令和版本可见性。

## Impact

- `DPT_FRAMEWORK/RUN.md`：新增 Section 0 + 版本横幅
- `DPT_FRAMEWORK/CLAUDE.md`：强化 skill 禁用措辞
- `DPT_FRAMEWORK/AGENTS.md`：与 CLAUDE.md 同步
- `DPT_FRAMEWORK/README.md`：触发规则部分同步强化
- 新建 `CHANGELOG.md`（项目根）
- `openspec/config.yaml`：补充 version-management 对 proposal/tasks 的流程提示
