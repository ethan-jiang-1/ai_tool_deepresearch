## Why

当前通过 Claude Code 使用本地 DeepSeek 依赖个人脚本 `/Users/bowhead/scripts/deepseek_claude.sh`：配置不属于 framework，凭据与模型设置容易重复落入脚本或临时 settings，且继承的 provider 环境可能把一次本地调用悄然导向错误端点。现在需要把这项能力收敛为 repo 内可复用、可检查、默认只连接本机端点的宿主启动工具，让 Agent 能机械执行已获授权的调用，同时不给 Engine 或 research workflow 增加新的控制层。

本 change 以 `guidelines/evolution-helper-oriented-agent.md` 和 `guidelines/evolution-simple-reliable-control.md` 为设计约束：用一个直接入口替代个人脚本、凭据副本和全局配置修改，优先发挥 Claude Code 与模型本身的能力，只保留启动前真正必要的确定性检查。

## What Changes

- 在 `DPT_FRAMEWORK/host_tools/` 增加一个符合仓库 Node.js ESM 约束的 repo-owned Claude Code launcher，读取 repo 根目录被忽略的 `.env`，将明确配置的本地 Anthropic-compatible DeepSeek endpoint、凭据和模型别名投影到单次 `claude` 子进程。
- launcher 启动前清理可能污染路由的继承 provider/Claude model 环境；缺少 `claude`、必需配置缺失、端点格式错误或端点不是 loopback/local 时 fail closed，不静默回退到远端服务或内置凭据。
- 增加不泄露凭据的 `--check` preflight，报告可执行文件、必要变量和本地端点是否就绪；正常调用原样透传 Claude Code 参数并保留其退出码。
- 提供可提交的根目录 `.env.example` 与简短 setup/host-tools 文档。真实 `.env` 和任何真实 token 始终保持 git ignored；launcher 不把凭据写入 Claude settings、日志或诊断输出，也不修改用户的全局 Claude 配置。
- 保持 Claude Code 的正常权限模型：launcher 不默认追加 permission bypass，只执行调用者显式传入且 Claude Code 自身支持的参数。
- 用 test-owned `claude` executable fixture 和临时非敏感配置做 focused integration verification，覆盖环境隔离、local-only 拒绝、redaction、参数/stdio/退出结果透传；测试只证明 launcher boundary，不调用真实模型、不需要真实 token。
- 明确不产出 research workflow node、Engine API、bundle state、command playbook、后台服务、provider fallback、自动重试树或新的 npm 依赖。根目录 `.env` 仅是这个 pre-trigger 宿主进程的输入，不改变 framework 禁止依赖跨 tool-call 环境变量传递 runtime 配置的规则。

## Capabilities

### New Capabilities

- `local-deepseek-claude-launcher`（prefix: `LDC`）：定义 repo-owned Claude Code 宿主启动入口的 local-only 配置、环境隔离、安全 preflight、参数/退出码透传和凭据边界。

### Modified Capabilities

无。该工具位于 framework trigger 之前，不改变现有 Agent command、research workflow、Engine verdict 或 Runtime Bundle requirement。

## Impact

- **需求参考来源**：`/Users/bowhead/scripts/deepseek_claude.sh`。它只作为已验证可用调用形状的参考；其中任何硬编码凭据、credential-bearing settings 或默认权限放宽都不进入 repo 方案。
- **Direct Source of Record**：真实 endpoint/token/model 选择由被 git ignore 的 repo-root `.env` 持有；可提交的变量契约与安全示例由 `.env.example` 持有；launcher 的加载、清理、验证和 exec 行为由 `DPT_FRAMEWORK/host_tools/` 中的单一脚本持有；`SETUP.md`/host-tools 文档只说明使用方式，不复制秘密或形成运行时 authority。
- **最短合法闭环**：`user 配置 root .env -> Agent/用户运行 launcher --check -> launcher 清理并验证单次进程环境 -> spawn claude + 原参数/stdio -> Claude Code 连接本地 DeepSeek -> 传播退出或信号结果`。检查通过后没有额外确认、配置生成、settings 写入或 wrapper orchestration。
- **Net simplification**：用一个 repo-owned launcher 取代个人脚本、硬编码 fallback key、credential-bearing settings JSON 和易受继承环境污染的手工启动方式；避免引入全局配置 mutation、daemon、provider abstraction、state、Gate、receipt、retry/recovery tree 或第二套 CLI controller。新增的 `--check` 复用同一份启动前验证，不形成平行 truth。
- **责任边界**：用户决定使用哪个本地服务、凭据、模型和任何权限相关 Claude flag；Agent 在这些决定和现有权限内执行 `--check`、启动及可逆的配置纠错；launcher 只对可执行文件、配置完整性、local-only endpoint 和进程投影给出确定性结果。research Engine 不参与、不裁决模型选择，也不会因“human-directed”获得额外 permission 或缺失 capability。
- 预计影响 `.env.example`、`SETUP.md`、`DPT_FRAMEWORK/host_tools/`、focused `tests/integration/`、OpenSpec requirement registry 及 release 文档；不新增依赖，不修改 Runtime Bundle schema 或持久化状态。
- 本 change 新增 `DPT_FRAMEWORK/` 的 host-facing 行为，需要 version bump：target version 为 **v0.33**。Apply 阶段应同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` banner/current-release。
