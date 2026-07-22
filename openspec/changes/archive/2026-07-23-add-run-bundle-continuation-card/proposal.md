## Why

研究完成或中断后，用户（尤其非专业用户）再次打开 run bundle 目录时，面对
`BUNDLE_MAP.md`、`rb_status.json`、`rb_queue.json` 等一堆文件，完全不知道从哪
下手。`BUNDLE_MAP.md` 虽然信息完整但密度太高——research map、control map、
diagnostics map、reentry pointers——对"我想继续这个研究"这个最简单需求来说，
它是过度设计。

本 change 第一次尝试（v0.43 已 archive）把 `BUNDLE_MAP.md` 扩展为 continuation
card + playbook 体系，但没达到目的：card 信息过载，playbook 只处理 clean bundle
的 happy path，对老版本、中断过、有累积问题的 bundle 缺乏修复路径。

**这次重做只做一件事：在 bundle 根目录放一个极简的 `RUN_BUNDLE.md`，让任何人
打开 bundle 第一眼就知道"我是谁、framework 在哪、有事找谁"。**

## What Changes

- 在 bundle 根目录新增 `RUN_BUNDLE.md`——极简入口文件，只包含：
  bundle 名称、到 framework root 的相对路径、指向本目录下 `BUNDLE_MAP.md`
  （详细布局）、指向 `DPT_FRAMEWORK/COMMANDS.md`（操作命令）。
- `RUN_BUNDLE.md` 不复制命令、不写状态、不选路线、不授权。它是门铃：告诉你是谁、
  framework 在哪；然后 `BUNDLE_MAP.md` 是户型图（目录布局），`COMMANDS.md`
  是对讲机（操作命令）。三者各司其职，`RUN_BUNDLE.md` 只做入口和转接。
- `BUNDLE_MAP.md` 保持不动——它仍是 passive map，记录 research content /
  runtime control / diagnostics 完整布局，给 Agent 深度 inspect 时使用。
- 两个 bundle creator（production + disposable）在 instantiation 时渲染
  `RUN_BUNDLE.md`，把实际的 framework 相对路径写进去。
- `BUNDLE_MAP.md.tmpl` 回退：移除 v0.43 添加的 "Continue This Bundle"
  continuation section，回到纯 passive map。保留 v0.43 的 creator-rendered
  坐标和边界声明。
- 旧 bundle 兼容：没有 `RUN_BUNDLE.md` 的老 bundle，Agent 退回到读
  `BUNDLE_MAP.md` 的既有路径。不会批量改写任何 production bundle。

需要 framework version bump 到 **v0.44**。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bundle-map`: `BUNDLE_MAP.md` **不再**被扩展为 continuation card；它保持原有
  passive map 角色。`RUN_BUNDLE.md` 承担 entry point 职责。
- `cmd-bundle-instantiation`: production creator 新增 `RUN_BUNDLE.md.tmpl` 渲染，
  写入 framework 相对路径（repo command root 是 `BUNDLE_MAP.md` 的职责）。
- `experiment-shared-infra`: disposable creator 同样渲染 `RUN_BUNDLE.md`。
- `agent-command-surface`: `RUN_BUNDLE.md` 将所有操作委托给
  `BUNDLE_MAP.md`（布局）和 `DPT_FRAMEWORK/COMMANDS.md`（命令）——card 本身
  不复制任何内容。现有的 `continue-run-bundle.md` playbook 简化为：读
  `RUN_BUNDLE.md` → 解析坐标 → 读 `BUNDLE_MAP.md` → 读 `COMMANDS.md` →
  执行。
- `run-entry`: root/framework Agent routing 在用户打开一个 bundle 目录时，优先读
  `RUN_BUNDLE.md`；不存在时 fallback 到 `BUNDLE_MAP.md`。

## Impact

- 预期影响 `DPT_FRAMEWORK/rb_templates/`（新增 `RUN_BUNDLE.md.tmpl`）、两个
  bundle creator、`DPT_FRAMEWORK/command_playbook/continue-run-bundle.md`（简化）、
  root/framework `AGENTS.md`/`CLAUDE.md`/`RUN.md` 的相关路由描述。
- `BUNDLE_MAP.md.tmpl` 不再需要 continuation card 段落——回退到 pure passive map。
- Direct Source of Record 不变：仍是 `rb_status.json`、`rb_queue.json`、
  `rb_profile.yaml`、`rb_trace.jsonl` 和 Engine check/inspect/advice。
- 小白用户体验：打开 bundle 目录 → 看到 `RUN_BUNDLE.md` → "哦，我叫这个名，
  framework 在那边，我要继续就带这个文件找 Agent"。
