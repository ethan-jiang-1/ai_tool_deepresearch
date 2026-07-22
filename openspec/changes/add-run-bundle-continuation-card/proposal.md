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
- card 只保留静态身份和导航：所在目录是唯一 active bundle root，模板写入 bundle name
  与创建时 framework version，并指向共享 framework 的 canonical entry/command surface。
  当前 phase、gate、queue、证据、receipt 与 user decision 仍只从 bundle control files、
  trace 和 Engine verdict 读取。
- 新增一个 framework-owned、Agent-facing 的 existing-bundle continuation playbook。它定义
  从 card attachment 到现有 bundle reload/reentry/post-final recovery 路径的最短合法闭环，
  并把结构校验、reentry diagnostic 与当前 lifecycle Markdown 的读取顺序写清楚。
- 将 command index、framework entry guidance、bundle template/instantiator 与 focused
  verification 对齐到这一个 card + playbook 路径。不会新增 run-local `AGENTS.md`、
  `CLAUDE.md`、第二份 workflow、状态文件、route selector 或自动重跑逻辑。
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
  playbook，使 card attachment 进入既有 reentry 或 post-final recovery，而非创造并行入口。
- `run-entry`: 使 framework entry guidance 区分“开始新研究”的 `RUN.md` 前门与“恢复已识别
  bundle”的 card 路径，二者共用既有 Agent/Engine authority 边界。

## Impact

- 预期影响 `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`、bundle instantiator、
  `DPT_FRAMEWORK/COMMANDS.md`、`DPT_FRAMEWORK/RUN.md`/`README.md`，以及新的
  framework-owned continuation playbook；测试只会放在 repo-root `tests/` 与必要的
  `experiments_playbook/`，不会写入 `DPT_FRAMEWORK/`。
- Direct Source of Record 仍是 active bundle 的 `rb_status.json`、`rb_queue.json`、
  `rb_profile.yaml`、`rb_trace.jsonl`、artifact/ledger 与 Engine check/inspect/advice；
  `BUNDLE_MAP.md` 仅定位它们。Final 后的语义变更仍只走已有 post-final recovery，不能由
  card 或用户一句“继续”授权。
- 最短合法闭环是“附带 card -> 定位其所在 bundle 与共享 framework -> 读取直接 runtime
  facts -> 运行已有 diagnostics/进入已有合法 owner”。它用一个静态入口和一个现有-owner
  playbook 取代用户口头传递路径、Agent 猜测和散落说明，避免新增状态、validator、
  bridge 文件、controller、同步循环或自动恢复树。
- 用户负责提出新的研究语义、范围或风险决定；Agent 负责解析 card、执行已授权的
  机械检查并遵循现有路线；Engine 继续独占 schema、receipt、gate、transition、trace 与
  reentry verdict。card 不把 human-directed request 变成 permission、override 或缺失的
  runtime capability。
