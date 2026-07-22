## Context

v0.43 尝试把 `BUNDLE_MAP.md` 扩展为 continuation card + playbook 体系，但实际
使用中暴露了根本问题：card 信息过载（research map / control map / diagnostics
map / reentry pointers 全塞在一个文件里），playbook 假设 clean bundle 的 happy
path，对老版本、中断过、有问题的 bundle 缺乏可操作的修复路径。

用户（尤其是非专业用户）打开一个 run bundle 目录时的真实需求极其简单：
"这是什么？怎么继续？找谁？"

本 redesign 把入口降到最简：一个 `RUN_BUNDLE.md`，两个事实加一句委托——
Agent 先读同目录的 `BUNDLE_MAP.md`（布局），再读 `DPT_FRAMEWORK/COMMANDS.md`
（命令）。`RUN_BUNDLE.md` 本身不取代任何一个。

## Goals / Non-Goals

**Goals:**

- 让任何人打开 bundle 目录第一眼就看到 `RUN_BUNDLE.md`，立刻知道 bundle 名和
  framework 在哪。
- `RUN_BUNDLE.md` 的内容不需要任何专业知识就能读懂。
- Agent 打开 `RUN_BUNDLE.md` 后能机械地解析坐标、找到 framework、
  读 `BUNDLE_MAP.md` 了解布局、进入 `COMMANDS.md` 的命令体系。
- 与旧 bundle 兼容：没有 `RUN_BUNDLE.md` 时 agent fallback 到 `BUNDLE_MAP.md`。

**Non-Goals:**

- 不在 `RUN_BUNDLE.md` 里写状态、gate、phase、route selector、命令副本。
- 不取代 `BUNDLE_MAP.md`——它仍是 passive map，给深度 inspect/debug 用。
- 不创建 run-local `AGENTS.md`/`CLAUDE.md` bridge。
- 不新增 lifecycle phase、gate、CLI validator。
- 不批量改写已有 production bundle。

## Decisions

### 1. 新文件 `RUN_BUNDLE.md` 作为极简入口

`RUN_BUNDLE.md` 的内容结构：

```markdown
# <bundle-name>

Framework: `<relative-path-to-DPT_FRAMEWORK/>`

要操作这个 run bundle，请带我（本文件或所在目录）找 Agent。
Agent 请先读本目录下的 `BUNDLE_MAP.md`（完整目录布局），
再读 `DPT_FRAMEWORK/COMMANDS.md`（操作命令），然后根据用户意图执行。
```

只有三样东西，指向两个权威来源：
1. **Bundle 名**——`# <bundle-name>`，第一行，一眼识别
2. **Framework 坐标**——creation-time 渲染的相对路径，Agent 用它定位 framework
3. **委托语句**——Agent 先读 `BUNDLE_MAP.md`（户型图）了解布局，再读
   `COMMANDS.md`（对讲机）找操作命令。`RUN_BUNDLE.md` 本身不复制任何信息

**为什么是独立文件而不是在 `BUNDLE_MAP.md` 里做减法？**

`BUNDLE_MAP.md` 已经是一个有明确语义的文件——passive map，记录 research content
map / runtime control map / diagnostics map / reentry pointers。把这些信息删掉会让
深度 inspect/debug 流程失去信息来源。`RUN_BUNDLE.md` 是**新增**入口，不取代
`BUNDLE_MAP.md`，两者各司其职：

| 文件 | 读者 | 角色 |
|------|------|------|
| `RUN_BUNDLE.md` | 用户（尤其小白）第一眼 | 门铃：我是谁、framework 在哪、Agent 先读 BUNDLE_MAP.md 再读 COMMANDS.md |
| `BUNDLE_MAP.md` | Agent + 专业用户 | 户型图：完整目录布局、control files、diagnostics、reentry pointers |
| `COMMANDS.md`（framework） | Agent | 对讲机：所有可执行操作 |

**文件名选择：**

- `RUN.md` → 和 framework 自身的 `DPT_FRAMEWORK/RUN.md` 重名，容易混淆
- `README.md` → GitHub/文件管理器自动渲染，但语意太泛，不像操作入口
- `START_HERE.md` → 语义对，但和已废弃的 legacy `START_FROM_HERE.md` 太像
- **`RUN_BUNDLE.md`** → 明确：这是 run bundle 的操作入口，和 framework `RUN.md` 不重名

### 2. `RUN_BUNDLE.md` 不保存状态、不复制命令

`RUN_BUNDLE.md` 是纯静态 creation-time artifact。它不包含：
- `rb_status.json` 的任何字段（phase/gate/state）
- 任何 CLI 命令或参数
- 任何 route selector 或 decision tree
- 任何 mutable field

状态和命令的权威来源分别是 bundle control files 和 `DPT_FRAMEWORK/COMMANDS.md`。
`RUN_BUNDLE.md` 只负责把读者送到正确的地方。

**核心洞察**：入口文件的价值在于"被发现"和"指向正确方向"，不在于"包含所有
信息"。信息已经在 control files 和 `COMMANDS.md` 里了，入口文件的唯一职责是
消除"从哪开始"的困惑。

### 3. `continue-run-bundle.md` playbook 大幅简化

v0.43 的 playbook 有 7 步 reload procedure（resolve coordinates → read controls →
run validate/inspect → branch on current_node → target-specific reentry → ...）。

新版本简化为：

1. 读 `RUN_BUNDLE.md`（不存在时 fallback 到 `BUNDLE_MAP.md`）
2. 解析 framework 相对路径，确认在当前 workspace 内可达
3. 读本目录下的 `BUNDLE_MAP.md`，了解 bundle 完整目录布局
4. 读 `DPT_FRAMEWORK/COMMANDS.md`
5. 根据用户意图，从 `COMMANDS.md` 选择对应命令执行

生命周期分支、reentry diagnostics、post-final recovery 这些逻辑本身就在
`COMMANDS.md` 和各 CLI 工具里——playbook 不需要重复它们。Agent 只需要知道
"RUN_BUNDLE.md → BUNDLE_MAP.md → COMMANDS.md" 这一个顺序。

### 4. 旧 bundle 兼容

没有 `RUN_BUNDLE.md` 的老 bundle：
- Agent 检测到 `BUNDLE_MAP.md` 存在但 `RUN_BUNDLE.md` 不存在 → fallback 到读
  `BUNDLE_MAP.md` 的既有路径
- `BUNDLE_MAP.md` 里已有 framework_root 坐标（v0.43 加的），可直接用于导航
- 不需要任何 migration、rewrite 或 schema marker

### 5. `BUNDLE_MAP.md.tmpl` 回退

v0.43 在 `BUNDLE_MAP.md.tmpl` 顶部加了 "Continue This Bundle" continuation
section。这个段落移除，`BUNDLE_MAP.md` 回到纯 passive map 角色。

保留 v0.43 的两个正确改进：
- creator-rendered `framework_root` / `repo_command_root` 坐标（去掉硬编码
  `../DPT_FRAMEWORK/`）
- "本文件不是 lifecycle phase node / gate authority / queue authority"的边界声明

### 6. Routing 保持 v0.43 逻辑，target 改为 `RUN_BUNDLE.md`

v0.43 的 routing 逻辑方向是对的：用户明确提供可达 existing bundle → 走
continuation playbook。只需把 target 从 `BUNDLE_MAP.md` 改为优先检测
`RUN_BUNDLE.md`。

## Risks / Trade-offs

- [两个 MD 文件会不会让用户困惑] → `RUN_BUNDLE.md` 文件名明显是入口；
  `BUNDLE_MAP.md` 文件名明显是地图。小白用户只需读 `RUN_BUNDLE.md`。
- [和 framework 自己的 RUN.md 会不会搞混] → framework 的是 `RUN.md`，bundle 的
  是 `RUN_BUNDLE.md`，名字不同，Agent 不会混淆。
- [旧 bundle 没有 RUN_BUNDLE.md] → Agent fallback 到 `BUNDLE_MAP.md`。
- [信息太少了不够用] → 入口不需要信息多，入口需要指向对的地方。信息在
  `COMMANDS.md` 和 control files 里，不缺失。
- [v0.43 已 sync 的 main spec delta header 需要处理] → 重做后的 spec 会在 apply
  时重新 sync，覆盖 v0.43 的残留。

## Migration Plan

1. 新增 `rb_templates/RUN_BUNDLE.md.tmpl`
2. 两个 creator 渲染 `RUN_BUNDLE.md`（复用已有的 framework 坐标计算逻辑，repo
   command root 坐标只写进 `BUNDLE_MAP.md`）
3. 回退 `BUNDLE_MAP.md.tmpl` 的 "Continue This Bundle" continuation section
4. 简化 `continue-run-bundle.md` playbook
5. 更新 `COMMANDS.md` / `README.md` / `AGENTS.md` / `CLAUDE.md` 的相关引用
6. Framework version bump → v0.44
7. 不批量改写任何 production bundle

## Open Questions

None.
