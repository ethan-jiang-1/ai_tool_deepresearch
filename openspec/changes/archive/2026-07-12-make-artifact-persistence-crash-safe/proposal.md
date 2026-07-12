## Why

`_backlog/plans/breakpoint-recovery-persistence-model.md` 的 P1 与 BUG-079 现场证明：内容已经完整取得或生成后，如果进程死在最终 rename 之前，当前 bundle 只会留下无法判定的孤儿临时文件，恢复者不能只凭磁盘确定它是否完整、目标是什么、能否安全提交。现在需要一条短、直接、可重复验证的 crash-safe content persistence path，而不是继续依赖每个 writer 自创临时命名或由人肉猜测。

## What Changes

- 新增一个 Engine-owned crash-safe persistence helper。每次写入只使用 `_diagnostics/artifact-persistence/<operation-id>/` 下的独立 workspace、一个 pending payload 和一个 Zod `preparing|prepared` operation sidecar；不在 `reference/`、`artifacts/`、`final/`、`_cache/` 内散落 pending sibling，也不建立全局 index/journal。
- 新增一个窄 Agent-facing CLI，只有 `persist` 与 `sweep` 两个 operation。`persist` 接收已经完成的 staging file、受支持的 bundle-relative content target 与 compare-and-swap 前置条件；Agent 选择真实内容和目标，Engine只验证路径、hash、device、冲突并完成机械写入。
- `sweep` 只枚举上述 diagnostic workspace，在明确无并发 persist 的 quiescent recovery boundary按直接磁盘事实返回 `finalized`、`cleaned` 或 `blocked`。完整 prepared write可 finalize；target已提交但 workspace未清可 clean；不完整、冲突、无效或不安全现场只 block并指出一个最近动作，不自动删除或猜测修复。
- 支持的目标限于 selected bundle 的 `reference/`、`artifacts/`、`final/` 与 `_cache/` 内容文件。status、queue、trace、ledger、checkpoint、profile、plan、receipt、`_work_units/` 与 work-unit submit/cache-normalization transaction 保持原 owner，本 change不迁移或双包裹。
- `preparing` sidecar完成原子发布是Engine接受该写入的durable boundary；在此之前崩溃不声称已接受，只保证helper不删除staging source。它不声称拦截或恢复persist接受前的任意host filesystem write。
- persist/sweep输出使用 Engine-owned Zod result schema，并复用 `_logs/run.log` 记录 operator-visible结果；不新增 trace event族，不让日志成为 commit authority。
- 更新 Agent-facing artifact/cache/wave/final/subagent guidance、命令索引、来源 backlog与Overall roadmap；增加 focused regression和现有 reentry-debuggability family 内的 controlled crash proof。
- 本 change修改 `DPT_FRAMEWORK/` 公开行为，需要将 framework version从 `v0.22` 提升到 `v0.23`，同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` banner。

Direct Source of Record 是一个 operation workspace内的 operation sidecar + payload bytes + current target bytes。`preparing`保存staging/target/CAS意图，`prepared`再增加payload size/hash；它们是同一个discriminated-union schema。最短闭环是 `write staging -> persist`；中断后是 `quiescent sweep -> finalize/clean 或 one blocker -> Agent执行普通清理/重试 -> rerun sweep`。Net simplification 来自只增加一个workspace contract、一个helper和一个双操作CLI，同时删除先前设计中的content-root pending投影、file-observability改造、quarantine/discard分支、trace事件与writer迁移不确定性。

责任边界保持：用户只决定新的语义、不可逆覆盖风险或权限；Agent执行 staging、persist、普通 workspace清理和重试；Engine给出确定性hash/CAS/durability verdict。`human-directed` 不允许把未知临时文件认证为正式artifact，也不创造control-state mutation、post-final reentry或provenance authority。

## Capabilities

### New Capabilities

- `artifact-persistence-recovery`: 定义 content-bearing bundle file 的 crash-safe persist workspace、两态operation sidecar、compare-and-swap commit、quiescent sweep、结构化反馈与幂等恢复边界。

### Modified Capabilities

无。Pending workspace位于既有 `_diagnostics/` 非权威目录，现有 file-observability已经把该目录视为Engine diagnostic surface；logger/trace、cache、reference、artifact与final capability的业务语义不变。

## Impact

- 新增 `DPT_FRAMEWORK/engine/helpers/artifact-persistence.mjs`、`DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs` 与一个 Agent-facing command playbook。
- 新增 `tests/engine/helpers/`、`tests/integration/cli/` regression，并在现有 reentry-debuggability experiment family增加一个 controlled case；不新增experiment family。
- 更新直接producer guidance，但不迁移现有control/append-only/work-unit transaction writer。
- 不新增dependency、watcher、daemon、lock service、quarantine、global journal/index或第二套artifact authority。
- 来源状态：完成后只标记Breakpoint plan P1的sanctioned persistence path已覆盖；P2/P3、BUG-079 canonical state、post-final recovery与C3/C4/C5保持开放。
