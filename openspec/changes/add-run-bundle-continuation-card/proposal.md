## Why

研究完成、暂停或换一个 Agent 会话后，用户目前需要先记住 bundle 路径、再理解
`BUNDLE_MAP.md`、`rb_status.json` 与 framework entry 的关系，才能让 Agent 合法地续接
同一次研究。这既不利于把一个 run bundle 作为可携带的研究对象，也容易诱发 Agent
凭聊天记忆或 `current_gate` 猜测下一步。

本 change 借鉴
`/Users/bowhead/ai_tool_bsimulation/openspec/changes/make-run-bundle-continuation-card/proposal.md`
的核心思路：一个静态、可附带的文件应能识别唯一 run 并把读者送回已有的权威控制面；
它本身不保存当前状态、不选择路线，也不取得执行权限。

## What Changes

- 将新 bundle 根目录的 `BUNDLE_MAP.md` 从单纯目录索引扩展为显式的 continuation card：
  它邀请用户在新会话附带此文件或整个 bundle，并用自然语言说明想继续、检查、补充、
  质疑或在 Final 后重跑什么。
- card 只保留静态身份和导航：所在目录是 candidate active bundle root，两个 creator 在
  创建时计算到 framework root 与 repo command root 的相对导航坐标。坐标只帮助已经在
  当前 workspace 选定 DPT source tree 的 Agent 导航，不认证或选择 source tree；当前
  phase、gate、queue、证据、receipt 与 user decision 仍只从 bundle control files、trace
  和 Engine verdict 读取。
- 新增一个 framework-owned、Agent-facing 的 existing-bundle continuation playbook。它定义
  从 card attachment 到现有 bundle reload/reentry/post-final recovery 路径的最短合法闭环，
  并把结构校验、reentry diagnostic 与当前 lifecycle Markdown 的读取顺序写清楚。
- 将 command index、bundle template、production/disposable creator 与 focused verification
  对齐到这一个 card + playbook 路径。不会新增 run-local `AGENTS.md`、`CLAUDE.md`、
  第二份 workflow、状态文件、route selector 或自动重跑逻辑。
- 旧 bundle 仍可读：缺少 continuation-card metadata 或新版文案不会阻止既有
  `BUNDLE_MAP.md` 的诊断、reentry 或历史研究读取；不会批量重写任何 production bundle。

需要 framework version bump，目标版本为 **v0.43**；apply 时更新 `CHANGELOG.md` 与
`DPT_FRAMEWORK/RUN.md` banner。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bundle-map`: `BUNDLE_MAP.md` 成为静态 continuation card，同时保持它不是 runtime 或
  lifecycle authority 的边界，并定义新版与旧 bundle 的兼容方式。
- `agent-command-surface`: 为已存在 run bundle 增加唯一的 Agent reload/continuation
  playbook，使 card handoff 使用既有 reentry 或 post-final recovery，而非创造并行入口。
- `cmd-bundle-instantiation`: production creator 将 framework/repo relative navigation
  坐标渲染进 map，消除 `--target-dir` 下固定 `../DPT_FRAMEWORK/` 的错误假设。
- `experiment-shared-infra`: disposable creator 使用相同的 map-coordinate rendering，
  保证共享 template 不遗留未替换 placeholder。
- `run-entry`: root/framework Agent routing 在用户明确提供一个可达 existing
  `BUNDLE_MAP.md` 时选择 continuation playbook；不存在该输入时，原有 `RUN.md` 新研究
  入口保持不变。

## Impact

- 预期影响 `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`、两个 bundle creator、
  root/framework `AGENTS.md`/`CLAUDE.md`、`DPT_FRAMEWORK/RUN.md`/`COMMANDS.md`/
  `README.md`，以及新的 framework-owned continuation playbook；测试只会放在 repo-root
  `tests/`，不会写入 `DPT_FRAMEWORK/`。
- Direct Source of Record 仍是 active bundle 的 `rb_status.json`、`rb_queue.json`、
  `rb_profile.yaml`、`rb_trace.jsonl`、artifact/ledger 与 Engine check/inspect/advice；
  `BUNDLE_MAP.md` 仅定位它们。Final 后的语义变更仍只走已有 post-final recovery，不能由
  card 或用户一句“继续”授权。
- 最短合法闭环是“在已选定 DPT source tree 的 workspace 提供可解析的 card/bundle -> 用
  creation-time relative 坐标导航 -> 按 node 类型读取直接 runtime facts -> 运行已有
  diagnostics/进入已有合法 owner”。普通 loaded node 使用 target-specific reentry check；
  Final 保持它已有 `readiness_passed` terminal window，material request 才使用既有
  post-final inspection/recovery。若 source tree、card 或 `current_node` 不可用，card 只
  暴露直接边界；它不承诺附件触发、自动路径恢复或新 reentry。
- 用户负责提出新的研究语义、范围或风险决定；Agent 负责解析 card、执行已授权的
  机械检查并遵循现有路线；Engine 继续独占 schema、receipt、gate、transition、trace 与
  reentry verdict。card 不把 human-directed request 变成 permission、override 或缺失的
  runtime capability。
