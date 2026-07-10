## Context

三个 backlog 计划最初都被归为 UX，但当前状态不同：安装 plan 的目标文件已经落地；权限 plan 仍缺 human-facing 指引；中文 plan 明确是 nice-to-have，并要求任何可能改变 phase/gate/silent 逻辑的做法都应放弃。

当前 root `README.md` 只有安装命令，没有解释 Coding Agent 在进入 DPT_FRAMEWORK 前需要哪些权限。`.claude/settings.local.json` 是个人本地配置且包含大量历史规则，不能成为可提交模板；`.codex/config.toml` 已提交 `approval_policy = "on-request"` 与 `sandbox_mode = "danger-full-access"`，但这既不能保证所有命令无提示，也不应被文档描述为无风险默认值。

`DPT_FRAMEWORK/command_playbook/` 已由 `workflow-directory-contract` 和 `agent-command-surface` 定义为 Agent-facing command surface。权限选择发生在人类触发 Agent 之前，且 Agent 通常不能给自己提权，因此不能把 human setup 手册放进该目录。

语言方面，`hitl-ux` 已要求所有用户可见 HITL 交互使用中文，但需要明确动态填入内容也受约束。Final 只直接加载 silent guidance，不加载 HITL UX shared node，所以单改 `shared-agent-ux-guidance.md` 无法覆盖 terminal delivery。非终端 `stop: no` 又禁止用户可见状态回复，语言偏好不能制造新的例外。

## Goals / Non-Goals

**Goals:**

- 形成一条可发现的 human preflight：安装依赖、选择并配置 Coding Agent 权限、验证配置、触发框架。
- 明确 Claude Code 与 Codex 的安全边界、最小权限思路和无人值守 opt-in 风险。
- 保持 human setup 与 Agent-run command surface、HITL 和 `stop: no` autonomous lifecycle 的受众分离。
- 让 HITL 动态内容和合法 Final 交付在用户未指定其他语言时更稳定地采用中文叙述。
- 用静态测试证明文档可达、边界文案存在、安装 baseline 未回退；不 overclaim 真实 Agent 或宿主权限行为。

**Non-Goals:**

- 不实现 permission manager、setup script、bootstrap CLI、gate `--non-interactive`、hook、daemon 或 session controller。
- 不自动修改用户全局 Claude Code/Codex 配置，不复制 `.claude/settings.local.json`。
- 不把 `danger-full-access`、免审批或 unrestricted network 设为未告警的默认选择。
- 不新增 locale/profile/schema 字段，不检测或阻断非中文输出。
- 不翻译内部 phase instructions、enum、命令、路径、字段名或来源标题。
- 不允许 non-terminal `stop: no` 状态回复、进度回复或用户插话因中文提示而变成合法。
- 不修改 Engine、CLI contract、gate、routing、trace、bundle state 或 work-unit 行为。

## Decisions

### 1. Root `SETUP.md` 是 human preflight 的 Source of Record

新增 root `SETUP.md`，按顺序覆盖：Node/npm 安装 baseline、Coding Agent 权限准备、配置验证、触发 `DPT_FRAMEWORK/RUN.md`。Root README 的 `Setup` 段提供短路径并链接该文件；README 仍保留现有三行安装命令，避免让最小安装步骤变得难找。

`DPT_FRAMEWORK/RUN.md` 只增加一句启动前置与指向 root setup 的链接/路径。该句必须说明权限应在 trigger 前完成；读取 RUN 后仍由 Agent 继续，不得向用户发起 mid-pipeline permission setup 会话。

不采用 `DPT_FRAMEWORK/command_playbook/setup-agent-permissions.md`，因为那会把 human preflight 放进 Agent command audience。也不把说明放进 `guidelines/`，因为权限步骤是当前可执行 setup，不是机制指导。

### 2. 文档是权限选择 authority，仓库不提交新的宽泛 allowlist

本 change 不把本机 `.claude/settings.local.json` 提升为 `.claude/settings.json`，也不为了“无提示”静默扩大 `.codex/config.toml`。`SETUP.md` 提供两种清楚区分的姿态：

- reviewed/interactive：保留宿主批准，适合开发和首次验证，但不保证长程 `stop: no` 无弹窗；
- autonomous research opt-in：用户在理解风险后，为所选 Coding Agent 显式允许 DPT 所需的本地 Node/文件写入/网络或 page-fetch surface，并在触发前验证。

示例必须保持 least-privilege 导向，列出能力类别和受影响路径，不从当前 local allowlist 批量复制命令。Codex 部分必须如实说明 committed project config 的当前值与局限；Claude Code 部分必须区分 committed settings 与 ignored local settings。任何版本相关键名都应在 apply 时对照当前宿主工具支持面核实，文档不得杜撰 gate flag 或把 `dry-submit` 写成权限授予工具。

`dry-submit` 只作为 work-unit submit 前的契约预检被提及；它不能验证网络、Bash、文件写入或宿主 approval policy。

Apply 时如果写入具体 Claude Code 或 Codex 配置键名，必须基于当前官方文档或本仓库已提交配置核实；若无法稳定核实，文档应降级为能力类别与风险边界，不猜测键名。当前 explore 核实到的稳定事实是：Claude Code 有 allow/ask/deny permission rules、项目/本地 settings 层级和 bypass/auto 等高风险模式；Codex 有 project `.codex/config.toml` 层、`approval_policy` 与 `sandbox_mode`，且 full access 语义不是本 repo 当前 `on-request + danger-full-access` 配置能单独保证的。

### 3. 安装 plan 作为 baseline lock，不制造重复 diff

Apply 首先验证以下事实仍成立：Node 20 `.nvmrc`、`zod`/`yaml` dependencies、tracked lockfile、README `npm install`、两个 start/instantiate playbook 的可执行前置条件。如果全部成立，只在测试和 backlog 收尾中记录 baseline，不重新格式化或改写这些文件。

如果 apply 时 baseline 已被其他合法 change 修改，应验证等价结果并与新状态协作；不得还原用户或其他 change 的修改。

### 4. 中文提示按实际加载 surface 放置

语言约束分三处处理：

- `shared-agent-ux-guidance.md`：保留 HIU-004 的 HITL 中文硬约定，并明确 dynamic narrative、topic preview、decision brief summary 等用户可见填入内容同样以中文呈现；canonical token 不翻译。
- `phase-final.md`：在 terminal delivery 相关段落加入极短 soft hint。用户未指定其他输出语言时，报告叙述和 delivery summary prefer Chinese；来源标题、引用、路径、命令和字段保持原样。该提示不得新增 final gate、`final_delivery` trace authority、交互式确认或替代 legal readiness-to-final handoff + `final/` 文件存在的 delivery evidence。
- `shared-silent-execution.md`：增加 non-authorization guard，并移除或改写既有 §4 中允许用户主动消息后单轮状态回复/状态告知的旧表述。任何 prefer-Chinese guidance 都不能授权 non-terminal status reply、progress、acknowledgement、question 或 partial delivery。

不创建新的 global locale shared node。HITL 与 Final 的约束条件不同，复用一个“全局 UX”提示容易遮蔽真实 requires/load path；在各自 authority surface 放最短提示更直接。

### 5. 测试只证明静态 contract，不模拟宿主或 LLM

在 root `tests/` 增加或扩展 Node `node:test` 静态回归，验证：

- 安装 baseline 文件与关键字段仍存在；
- README 可发现 `SETUP.md`，且 setup 在 DPT trigger 前；
- `SETUP.md` 区分 Claude Code/Codex、reviewed/autonomous opt-in、风险与验证，并明确 `dry-submit`/`--non-interactive` 边界；
- human permission setup 没有放进 `DPT_FRAMEWORK/command_playbook/`，也没有把人类写成 autonomous co-runner；
- HITL dynamic、Final soft hint、silent non-authorization marker 位于实际 surface；
- shared silent 文档不再包含允许 non-terminal `stop:no` 用户消息后发送单轮状态回复、acknowledgement 或状态告知的旧许可；
- Final guidance 不把语言提示、log/trace event 或 chat summary 写成 delivery evidence，delivery evidence 仍是 legal handoff 后的 `final/` artifact；
- wave/gate/routing files 不因语言任务被批量改写。

测试优先扩展 `tests/engine/command-contract-docs.test.mjs`、`tests/engine/static-regression.test.mjs` 或现有 `tests/integration/md/` 静态文档套件；如果新增文件，应仍放在 `tests/` 对应层级。测试不得启动真实 Claude Code/Codex、修改用户配置、发起网络请求或用字符串命中声称 LLM 一定会输出中文/不中断。真实 permission prompt 与语言服从度保留为人工/controlled observation，不是本 change 的 deterministic PASS 证明。

## Risks / Trade-offs

- [Risk] 权限示例随 Claude Code/Codex 版本变化 → 文档以能力与风险为稳定 contract，apply 时核实当前键名，并避免承诺组织策略可被项目配置覆盖。
- [Risk] 用户为无人值守体验启用过宽权限 → 默认不提交新的宽泛 allowlist；把 autonomous profile 标为显式 opt-in，并给 reviewed posture 和最小授权范围。
- [Risk] `RUN.md` 的 setup 提示让 Agent 在 pipeline 中重新询问用户 → 文案限定为 pre-trigger prerequisite，静态 command-surface test 拒绝 mid-pipeline co-runner wording。
- [Risk] 中文 hint 被解释为新的 silent reply permission，或既有 shared silent §4 旧许可继续覆盖新 guard → `silent-wave-execution` delta、shared silent 文案和静态测试明确拒绝 non-terminal status/acknowledgement reply。
- [Risk] Final soft hint 被误写成新的 delivery evidence 或 trace requirement → CDP delta、phase-final 文案和静态测试保留 file-existence + legal handoff authority，拒绝新增 Final-owned gate/loop/trace authority。
- [Risk] soft hint 无法保证 LLM 输出语言 → 接受软约束，只验证提示可达，不做语言检测或虚假行为保证。
- [Trade-off] 不提交 turnkey allowlist，首次 setup 多一步人工选择 → 换取不替用户做高风险权限决定，并避免把个人 local history 固化进仓库。

## Migration Plan

1. 锁定安装 baseline，并先补静态 characterization assertions。
2. 新增 root `SETUP.md`，再从 README 和 RUN 建立 pre-trigger discoverability。
3. 更新 HITL、Final、silent 三个实际 guidance surface；其中 silent 先清除旧的单轮状态回复许可，再加入 language-non-authorization guard。
4. 扩展静态 contract tests，覆盖 setup reachability、permission risk posture、silent no-reply、Final evidence authority 和语言提示可达性。
5. 运行 focused/full regression 与治理检查。
6. 更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` version banner 到 `v0.20`。

回滚时删除 root setup 文档与入口链接、撤回三处语言提示和对应测试即可；没有 schema、runtime state 或 bundle migration。

## Open Questions

无。具体宿主配置示例在 apply 时按当前 Claude Code/Codex 可用配置语法核实，但不得改变上述 opt-in 与受众边界。
