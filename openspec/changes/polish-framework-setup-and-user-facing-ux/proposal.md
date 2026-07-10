## Why

来源：`_backlog/plans/ux-onboarding-install-setup.md`、`_backlog/plans/ux-coding-agent-permissions-setup.md`、`_backlog/plans/ux-user-facing-chinese-first-outside-waves.md`。安装地基已经落地，但仓库仍缺少一条完整、面向人的“安装依赖 -> 配置 Coding Agent 权限 -> 触发 DPT_FRAMEWORK”启动路径；默认 Claude Code / Codex 权限策略可能在 `stop: no` 生命周期中反复请求批准，使静默自主执行在真实环境不可用。

同时，HITL 已有中文硬约定，Final 交付和少量合法用户可见动态内容仍可能漏出英文。该问题只值得用可达表面的软提示降低发生率，不能为语言偏好修改 gate、phase、routing、silent authority 或内部英文 instruction。

## What Changes

- 把现有安装成果锁定为本 change 的 baseline：`package.json` 已声明 `zod`/`yaml`、`package-lock.json` 已提交、`.nvmrc` 已指定 Node 20、README 与 bundle/start playbook 已写明 `npm install`；不重复实现或回滚这些已完成事项。
- 在 Agent-facing `DPT_FRAMEWORK/command_playbook/` 之外提供面向人的启动/权限说明，串起 Node/npm 安装、Claude Code 与 Codex 权限配置、权限风险、配置验证、`dry-submit` 预检和 DPT_FRAMEWORK 触发入口。
- README 在触发框架前给出这条 setup 路径；`RUN.md` 只声明启动前权限前置条件及诊断入口，不把人类重新引入 `stop: no` 的 pipeline，也不声称存在 gate `--non-interactive`。
- 权限文档区分仓库可提交的最小默认配置与用户显式选择的无人值守配置；不复制 `.claude/settings.local.json`，不静默扩大 `.codex/config.toml`，不把 `danger-full-access` 或免审批伪装成无风险默认值。
- 扩充现有中文 UX contract：HITL 动态填入的用户可见内容继续中文优先；Final 报告叙述与 terminal delivery summary 在用户未指定其他语言时尽量中文；enum、路径、命令、字段名和来源标题保持 canonical form。
- 在 silent guidance 明确：中文软提示不是 surfacing permission；它不得授权进度回复、状态回复、acknowledgement、提问或任何现有 `stop: no` 禁止行为，并清理既有 shared silent 文档中允许用户插话后单轮状态回复的旧表述。
- 只做文档、Agent guidance 和静态回归检查；不新增 locale/profile 字段，不做语言检测，不翻译 wave/setup/seed/readiness/rerun instruction body，不修改 Engine、schema、gate、phase transition、work-unit 或 runtime state。
- 本 change 修改 `DPT_FRAMEWORK/` 的 Agent guidance，版本需要提升；target version: `v0.20`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent-command-surface`: 启动入口在把控制权交给 Agent 前，应把安装与 Coding Agent 权限前置条件指向一个面向人的 setup surface，并保持 setup 与 autonomous pipeline command audience 分离。
- `hitl-ux`: 中文优先约定明确覆盖 HITL prompt 中的动态填入内容，同时保留 canonical English token。
- `silent-wave-execution`: 中文软提示不得成为 `stop: no` 用户可见回复或 surfacing 的新许可。
- `content-delivery-phase-content`: Final terminal delivery 在用户未指定其他语言时对报告叙述和 delivery summary 采用中文软偏好，不改变 terminal/non-interactive 边界。

## Impact

- 预计影响 root README、新增的人类 setup 文档、`DPT_FRAMEWORK/RUN.md`、HITL UX shared guidance、silent guidance、Final phase guidance，以及相应的文档/static regression tests。
- 现有安装文件是已满足的 baseline，不作为待实现行为重复修改；apply 时只验证它们仍然成立。
- 不新增依赖，不修改 CLI 参数、exit code、gate verdict、状态转换、bundle schema、trace authority 或 runtime 文件。
- Claude Code/Codex 的权限配置属于宿主工具安全边界；文档必须显式说明风险和 opt-in 性质，不能承诺所有版本或组织策略下都能无提示运行。
