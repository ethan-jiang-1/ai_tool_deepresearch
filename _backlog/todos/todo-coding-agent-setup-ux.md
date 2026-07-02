# TODO: Coding Agent 设置与权限 UX 手册

> 状态: 待设计 | 优先级: 中（launch/交付前抬起） | 创建: 2026-06-26
>
> 直接依赖: 无（纯文档 + 可能补一份 committed allowlist；不动框架代码/不动 schema/不动 gate）
> 被依赖: 无硬依赖；是所有"真跑一次完整 research"的前置 UX 条件

## Why

### 核心矛盾：框架假设"自主连续推进"，但没人告诉用户怎么让 agent 真的能自主

DPT_FRAMEWORK 的运行模型里，人类介入点只有两个——`hitl1`（定方向/profile/topics）和 `hitl2`（审 synthesis）。其余 8 个 phase 全是 `stop: no`，Agent 自己一路推到 `phase-final`：

- `phase-wave0.md:161` / `phase-wave1.md:240` / `phase-wave2.md:268` — `stop: no`
- `phase-setup.md:71` / `phase-readiness.md:84` / `phase-seed-topics.md:282` — `stop: no`
- `phase-rerun.md:134` / `phase-final.md:62` — `stop: no`
- 入口文档明说：`RUN.md:19`、`start-research.md:73`、`DPT_FRAMEWORK/CLAUDE.md`

**但"自主"的前提是 coding agent 不会在每一步停下来问用户"允许吗？"** —— 而 Claude Code / Codex 的默认模式恰恰会问。结果就是：用户以为点一下"开跑"就行，实际跑到一半被几十个权限弹窗卡住，体验崩。

**目前代码库里几乎没有任何文档告诉用户怎么配置 agent 才能不卡。** 这是 launch 前必须抬起的 UX 缺口。

### 真实的卡点（默认 Claude Code / Codex 模式下，每一项都会弹批准）

| 工具调用 | 出现位置 | 为什么卡 |
|---------|---------|---------|
| `Bash(node …)` 跑 gate CLI | 每个 phase 的 "Gate Command"（`phase-setup.md:47`、`phase-hitl1.md:67` 等，10 个 gate） | Claude Code 已部分 allow（`.claude/settings.local.json:18` `Bash(node *)`）；**Codex 无等价 allowlist** |
| `Bash(node … instantiate-run-bundle.mjs)` | `start-research.md:29` | 建目录树 + 写文件 |
| `WebSearch` | `phase-wave0.md:33`、`phase-wave1.md:33`、`phase-wave2-subagent.md:28` | 网络工具，未广泛 allow，每次问 |
| `WebFetch` | `shared-subagent-protocol.md:130,134`；`phase-wave2-subagent.md:29` | 只 allow 了 `github.com`（`settings.local.json:15`）；研究需要**任意域名**，每个新域名弹一次 |
| `curl` / `python3` / `node -e`（Tier-2 fetch fallback） | `shared-subagent-protocol.md:139-143`、`phase-wave0-subagent.md:84`、`phase-wave2-subagent.md:30` | Codex **没有内置 fetch 工具**（`:131`），被迫走 Bash fallback；`Bash(curl *)` / `Bash(python3 *)` 都未 allow |
| `Write` / `Edit` 到 `dpt_rb_*` | 所有 phase 的 Allowed Actions（`phase-hitl1.md:36-48` 等） | 写 `rb_plan.md`/`rb_profile.yaml`/`rb_status.json`/`rb_queue.json`/`rb_trace.jsonl`/`artifacts/**`；default 模式弹 |
| `setup-real-subagents.md:51-65` | 一次性 setup | 写 12 个 agent 文件进 `.claude/agents/` + `.codex/agents/`；弹（且 `:18-19` 要求 `DPT managed:` 标记，不能盲自动应用） |
| subagent spawn（Task / Codex agents） | `shared-subagent-protocol.md`；`subagent-relay.mjs:38,429` | 子 agent 的工具调用各自弹，除非父 run 在 permissive 模式 |

**一句话：自主循环持续碰 Bash(node+curl+python3)、Write、Edit、WebSearch、WebFetch、subagent spawn。默认模式下，一次 run 会卡几十次。**

### 现有文档 vs 缺口

**已存在：**
- `.claude/settings.local.json` — **唯一的 settings 文件**，是个通用 dev allowlist（`Bash(node *)`、`Bash(git …)`、`WebFetch(domain:github.com)`、一些 `Read`）。**缺** `Bash(curl *)`、`Bash(python3 *)`、广域 `WebFetch`、`WebSearch`、`dpt_rb_*` 的 Write/Edit。**不是** 为 research run 准备的。
- `.claude/agents/*.md` + `.codex/agents/*.toml` — 6 个角色 subagent 定义，**不配置 permission mode**。
- `shared-subagent-protocol.md:124-146` — **唯一**坦诚记录 Claude vs Codex 工具差异（WebFetch 有/无）+ fallback 链的地方。
- `guidelines/framework-runtime-boundary.md:222-231` — "禁止 env var 传配置"铁律，把 `export DPT_NON_INTERACTIVE=1` 当反例。

**缺口（本 TODO 要填的）：**
1. **没有"怎么把 coding agent 配成无人值守跑 DPT"的文档。** 不提 `acceptEdits`/`bypassPermissions`/`plan`（Claude Code）、Codex 的 `--full-auto`/approval-policy/sandbox、headless 调用（`claude -p`、`codex exec`）。
2. **没有 committed 的 research-run allowlist**（应是共享 `.claude/settings.json`，不只是 `.local.json`）。
3. **没有 hooks 配置说明**（`PreToolUse`/`PostToolUse`）——且要澄清它和 `_backlog/todo-hooks-deferral.md` 的 engine Boundary Hooks 是两回事。
4. **没有 Codex 专项 setup**（`.codex/` 有 agents/prompts/skills，但无 `config.toml`、无 approval-mode 指引）。
5. **没有"别卡住 / 自主契约"写给用户**——尽管每个非 HITL phase 都是 `stop: no`。
6. **`--non-interactive` flag 被文档当成预定机制，但 gate CLI 里根本没实现**（只解析 `--bundle`/`--current-node`/`--transitions`）。grep `DPT_FRAMEWORK/cli/`+`engine/` 找 `non-interactive`/`approval`/`bypass`/`sandbox` → 零命中。

## 核心设计

### 目标产物：一份用户手册（Agent-agnostic）

按 phase 给出"该用什么 permission mode"，覆盖 **Claude Code 和 Codex 两边**：

1. **每 phase 的 permission mode**：HITL1↔HITL2 之间用 permissive/auto 模式；HITL 两个 stop 点怎么回落到交互模式让用户介入。
2. **一份 committed allowlist**：`.claude/settings.json`（共享、入库），覆盖 `Bash(node *)`、`Bash(curl *)`、`Bash(python3 *)`、`WebSearch`、广域 `WebFetch`、`dpt_rb_*` 的 Write/Edit；外加 Codex 等价物（`config.toml` 的 approval-policy / sandbox network）。
3. **WebFetch/WebSearch 不对称**：Codex 无内置 fetch → 走 Tier-2 Bash fallback 的卡点风险。
4. **subagent harness setup**（`setup-real-subagents.md`）与子 agent 如何继承权限。
5. **headless / non-interactive 调用**（`claude -p --permission-mode …`、`codex exec …`）用于真·无人值守；并注明 `--non-interactive` flag **未实现**，别让用户去找它。
6. **hooks**：澄清 DPT "Boundary Hooks"（`todo-hooks-deferral.md`）是 engine 内部，区别于 coding-agent 的 `PreToolUse`/`PostToolUse` hooks。

### 设计原则

- **Agent-agnostic 是既定设计主张**（`RUN.md:4,7,26`、`DPT_FRAMEWORK/CLAUDE.md` / `AGENTS.md` 同步、`setup-real-subagents.md:65` "Codex and Claude Code use the same DPT role-agent taxonomy"）。手册两边都覆盖，差异处明确标注。
- **手册不是框架代码变更**——只补文档 +（可选）一份 committed allowlist。不改 gate、不改 schema、不改 phase node 行为。
- **以"跑通一次完整 research 不被卡住"为验收标准**：用户照手册配完，从 `RUN.md` 触发到 `phase-final`，中间只在 hitl1/hitl2 停。

## 开放问题

### 1. 要不要 ship 一份 committed `.claude/settings.json`？

**建议：要。** 现在只有 `.local.json`（dev 导向、不入库）。一份入库的 `.claude/settings.json` research-run allowlist 能让任何用户 clone 即可用。风险：广域 `WebFetch`/`Bash(curl *)` 权限较宽——用注释说明风险，或限定 `WebFetch(domain:*)` + `Write(dpt_rb_*)` 的窄范围。

### 2. Codex 的 approval-mode 怎么文档化？

Codex 的权限模型和 Claude Code 完全不同（`--full-auto` / approval-policy / sandbox）。手册要给 Codex 用户一条清晰路径。需要确认：`_backlog` / 框架是否已有 Codex 真跑过的先例？目前 `.codex/` 有 agents/prompts/skills 但无 config。

### 3. 手册放哪、怎么被触发？

候选位置：`DPT_FRAMEWORK/command_playbook/setup-agent-permissions.md`（和 `start-research.md`、`setup-real-subagents.md` 并列），从 `RUN.md` / `DPT_FRAMEWORK/README.md` 引用。这样"开跑前先 setup"成为自然一步。

### 4. `--non-interactive` 要不要真实现？

**建议：不在本 TODO 实现，只文档化"它不存在"。** 真正的无人值守靠 coding agent 自身的 permission mode / headless 调用（`claude -p`、`codex exec`），不靠 gate CLI 加 flag。gate CLI 保持纯确定性检查器，不该背交互模式职责。

### 5. 要不要加一个"配置自检"步骤？

可选：手册末尾给一个 checklist（allowlist 到位？subagent 装好？HEAD 模式还是交互模式？），让用户开跑前自验。低成本、高 UX。

## Non-Goals

- **不改框架代码 / schema / gate** —— 纯文档 + 可能的 allowlist 配置文件。
- **不是 engine Boundary Hooks** —— `todo-hooks-deferral.md` 的 hooks 是 engine 内部钩子；本 TODO 讲的是 coding-agent 层（`PreToolUse`/`PostToolUse`）的权限/审批配置，两码事，别混。
- **不做 framework 内部的 permission 管理** —— 权限是 coding agent 运行时的职责，框架不重新发明。

## Prior Art / 相关文件

| 文件 | 角色 |
|------|------|
| `DPT_FRAMEWORK/RUN.md:4,16` | 入口；明说 agent-agnostic |
| `DPT_FRAMEWORK/command_playbook/start-research.md:29,69-73` | 开跑流程；stop 点说明 |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md:124-146` | 唯一记 Claude vs Codex 工具差异处 |
| `guidelines/framework-runtime-boundary.md:222-231` | env var 铁律 + `--non-interactive` 反例 |
| `.claude/settings.local.json:3-34` | 唯一现存 allowlist（dev 导向） |
| `.claude/agents/*.md` / `.codex/agents/*.toml` | subagent 定义（不配 permission mode） |
| `DPT_FRAMEWORK/command_playbook/setup-real-subagents.md:12,51-65` | subagent harness 安装 |
| phase `stop:` flags | `phase-hitl1.md:84`、`phase-hitl2.md:100`（唯二 `stop: yes`）；余 8 个 `stop: no` |
| `_backlog/todo-hooks-deferral.md` | engine Boundary Hooks（**区别**于本 TODO 的 coding-agent hooks） |

## 下一步

1. `opsx:explore coding-agent-setup-ux` — 把开放问题（尤其 §1 committed allowlist 的风险边界、§2 Codex approval-mode 真实路径）想清楚
2. `opsx:propose coding-agent-setup-ux` — 出 proposal + 设计 + spec + tasks
3. 实施：
   - 新增 `DPT_FRAMEWORK/command_playbook/setup-agent-permissions.md`（手册主体，Claude Code + Codex 双栏）
   - 可能新增 committed `.claude/settings.json`（research-run allowlist）
   - 可能新增 `.codex/config.toml` 示例 / approval-mode 指引
   - 从 `RUN.md` / `DPT_FRAMEWORK/README.md` 引用新手册（"开跑前先 setup"）
   - **不动** gate CLI / schema / phase node 行为
4. 验收：照手册配完，从 `RUN.md` 触发一次真实 research，确认中间只在 hitl1/hitl2 停，其余不卡
