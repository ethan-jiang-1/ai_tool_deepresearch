## Why

当前 work-unit candidate 在 `dry-submit` / formal submit 已验证 identity、receipt、声明路径、role、cache 与 queue binding，但 Wave0 `source.yaml` 的直接 schema、Wave1 `evidence-summary.md` / `question-list.md` 的必要 semantic sections 直到后续 Wave inspect/Gate 才暴露。这样会先接受一个确定性不合格的 delegated output、冻结 actor provenance，再把本可在 candidate 决策点指出的根因留给 Phase Agent 猜测修复或另开 attempt；本 change 依据 `_backlog/plans/agent-output-linter.md` 的打磨结论，把同一 direct contract 提前复用，而不是新增第二套 linter。

## What Changes

- 由 Engine 根据 hash-bound queue-item snapshot、canonical Topic identity、work-unit kind 与 canonical `file:` required receipts，解析一个 closed/versioned exact-output contract；`writes_to` 仍只表示允许写入面，queue/Markdown/actor 均不能填写或选择 contract ID。
- 将 exact required path、canonical role 与 direct contract binding 投影到 manifest、beacon、generated task/checklist 和 result schema；claim 后的 submit owner 重建 expected contract，并对 manifest/beacon drift、unknown contract、unsafe/duplicate path 与 wrong role fail closed。
- 抽取一个 neutral direct-output evaluator 和 bounded byte-snapshot reader，由 work-unit candidate validation 与 Wave inspect/Gate 两个真实 adapter 复用。第一版 blocker 仅覆盖 Wave0 顶层 YAML array + `ReferenceMetadataArraySchema`、Wave1 non-empty `Key Findings`、Wave1 question-list 四个 non-empty semantic sections；不前移 count floor、submitted provenance、cross-artifact、phase completeness 或 `source_url_present`。
- `dry-submit`、claimed timeout preflight、首次 normal submit 与 eligible first late-submit 各自读取 fresh bounded snapshot；formal submit 仍是唯一首次 acceptance authority。duplicate replay、late-submit replay 与 `recover-declaration` 不依据当前可变文件重新决定历史 acceptance，且本 change 不新增 artifact-byte hash authority。
- 新 contract 下 required output 必须以 exact canonical role 声明；收窄 Wave1 required path 的 `other -> canonical role` normalization，使其只服务明确识别的 legacy attempt，并为退役提供可测试边界。supplementary Wave1 attempt 可只提交新的 source/cache facts并引用既有 submitted `evidence_summary`，不会被迫重写 paired artifacts。
- 将 candidate rejection 投影为最小 root failure 与同一 checkpoint 的一个最近动作。可逆的序列化、等价 heading presentation、声明 role/path 等 mechanical failure 可在同一 candidate 修复；actor 已记录 `work_done` 后缺失真实 findings/questions/source facts 的 semantic failure 不得由 Phase Agent 代写并沿用原 provenance，必须 terminalize 后走 replacement attempt。
- 版本从 `v0.37` bump 到 `v0.38`；apply 时同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` banner。

本 change 不产出通用 linter CLI、插件 registry、新 capability、自动修复/重试 controller、动态 contract selector、artifact-byte hash、legacy ledger migration，也不把 phase-wide Gate authority搬进 submit。

最短合法闭环为：attempt-bound assignment facts -> 一个 Engine-resolved exact contract -> 一个 shared direct evaluator -> candidate root feedback -> 同一 candidate repair 或显式 replacement -> 重跑同一 checkpoint。direct Source of Record 分别是 hash-bound queue snapshot/canonical Topic binding、candidate checkpoint 读取的单一 byte snapshot，以及历史 acceptance 的 submitted index/ledger binding；generated Markdown/schema 只是 projection。净简化来自删除 Wave adapter 内联的重复 direct-fact interpretation、退役新 attempt 的 role normalization 特例，并避免新增 linter、registry、state stack 或第二套成功 authority。

责任边界保持不变：用户只决定本次 accepted semantics 与风险边界；Agent/actor 生产真实研究内容并执行获准的 mechanical repair；Engine 解析 contract、读取受限文件、裁决 candidate/submit/Gate verdict 并返回 repair coordinates。human-directed 不创造写权限、acceptance override 或缺失 capability。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `delegated-work-units`: 修改 DEW-004、DEW-005、DEW-009、DEW-013、DEW-014、DEW-015，使 assignment-derived direct contract、fresh candidate snapshot、repair/replacement 与 lifecycle checkpoint 语义闭合。
- `agentic-queue`: 修改 AGQ-013，区分首次/paired `topic_deepening` 与显式 supplementary demand 的 canonical `file:` receipts；queue 只声明 assignment facts，不拥有 direct contract ID 或解释权。
- `agent-output-declaration`: 修改 AGO-007，将 required Wave1 path 的 role normalization 限制为 legacy attempt；新 contract 使用 exact role acceptance。
- `subagent-node-contract`: 修改 SNC-006，使 manifest/task/beacon/result schema、dry-submit 与 formal submit 投影并执行同一个 exact direct-output contract。
- `research-wave-gate-implementation`: 修改 RWG-018，使 candidate adapter 与 Wave inspect/Gate adapter 复用同一个 neutral direct evaluator，同时保留 phase-wide authority 在 Wave checkpoint。

既有 canonical `file:` `required_receipts` 仅作为 delegated-work-unit resolver 的已绑定输入；本 change 不给 queue 增加 direct contract ID、required-output interpretation 或新字段，也不从 queue ID 后缀推断 supplementary 语义。

## Impact

- 预计修改 `DPT_FRAMEWORK/engine/` 的 work-unit contract/envelope/submit/timeout 与 shared Wave evaluator 模块、相关 Zod contracts、`operate-work-unit` diagnostics，以及 Wave0/Wave1 producer/actor Markdown guidance。
- focused unit tests覆盖 resolver、bounded reader、neutral evaluator 与 root projection；integration tests覆盖 claim projection、dry/normal/late/timeout parity、role compatibility、supplementary reuse、manifest/beacon drift 和 Wave adapter parity。真实 actor 的 semantic-failure replacement 理解通过 registered `agent_flow_e2e` 观测，不以 fixture 或手写结果冒充。
- 不新增依赖；继续使用 Node.js >=20、纯 ESM、`zod`、`yaml` 与 Node built-ins。
- OpenSpec propose 阶段只写本 change artifacts；framework、tests 与 experiment assets 等到 `/opsx:apply` 且通过 pre-target evidence gates 后才修改。
