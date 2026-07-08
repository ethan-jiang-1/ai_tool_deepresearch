## Context

FOSE Europe Engelberg 2026 run bundle 的问题不是单点 bug，而是运行时信任链里的三个相邻接缝同时松动：

1. sub-agent 真实执行后写出了可理解但不完全符合 schema 的文件，例如单层 `result` wrapper、receipt JSONL 只写变化字段、cache leaf 里用了 `page-content.md`、prompt 里残留 stale nonce。
2. `operate-queue` / `operate-work-unit` 对 `--help` 或疑似 flag 的 bundle positional 没有足够早地拦截，导致误把 `--help` 当 bundle path 并创建目录。
3. gate 失败后，人工或 Agent 手改 `rb_status.json` 可以制造看似下游的 status window，掩盖缺失的 source-gate pass、route-bound `load_complete`、`phase_transition`，从而跳过 Wave2 或过早接近 final。

本项目的 trust root 仍然是 JS/CLI/schema/trace。这个 change 不把 Engine 变成“宽容的内容判断器”，只让 Engine 在 submit 边界识别少量高频、低歧义、可诊断的 LLM-shaped drift；一旦 identity、路径、nonce、cache authority 或 handoff truth 不安全，仍然 fail closed。

当前已经存在的 specs 覆盖了 work-unit lifecycle、source-gate handoff、degraded pass、status drift audit、gate preflight 等大框架。本 change 的设计重点是：

- 把 `operate-work-unit submit` 的兼容层放在 strict validation 之前，并且只做 canonicalization，不创造新的 authority。
- 把 CLI 参数 guard 放在任何 runtime side effect 之前。
- 把 gate failure cascade 的缺口用 explicit tests/diagnostics 锁住，禁止把 artifact/status presence 当 handoff proof。

## Goals / Non-Goals

**Goals:**

- 实现 `DEW-012`: submit 前做窄范围 canonicalization，覆盖 result wrapper、receipt identity autofill、cache leaf file normalization、constrained nonce normalization。
- 实现 `QIV-005`: `operate-queue.mjs` 和 `operate-work-unit.mjs` 在 help/可疑 bundle 参数上无副作用退出。
- 实现 `CPT-008`: `advance-status` 和 status audit 对 failed/missing source handoff fail closed，不提供 broad force bypass。
- 实现 `GSK-010`: lifecycle gates、readiness、final 前置检查不接受 status-only/artifact-only 的下游授权。
- 保持 accepted ledger rows canonical；所有 normalization 都可从 trace/log/submit diagnostics 看到。
- 给 review 和 apply 阶段留下清晰测试矩阵，优先覆盖真实 FOSE failure pattern。

**Non-Goals:**

- 不新增 `advance-status --force`、`--repair-status` 或任何绕过 trace/handoff 的手动通道。
- 不放松 work-unit identity、bundle-root containment、cache trail、source_claims、output declaration 的 strict validation。
- 不把 `source_claims` 的 fetched-source 与 derived/synthesis reference 语义在本 change 里展开；Change 2 处理 Phase-owned reference materialization。
- 不修改 Wave0/Wave1 delegated batching、active polling、Phase Agent reference 写作责任。
- 不新增依赖，不使用 Python，不把测试放入 `DPT_FRAMEWORK/`。

## Decisions

### Decision 1: submit normalization 是 pre-parse canonicalizer，不是 schema weakening

`operate-work-unit submit` 应在读取 candidate result/receipt/cache 后，调用一个小的 canonicalization pipeline，再把 canonical shape 交给现有 strict schema 和 submit transaction。

建议结构：

- `normalizeResultEnvelope(candidate, record)`:
  - candidate 恰好只有一个 top-level key `result` 且值是 object 时，返回 inner object。
  - wrapper 有任何 sibling key 时拒绝。
  - wrapper 不是 object、inner 不是 object 时拒绝。
- `normalizeReceiptEvents(lines, record)`:
  - 每行必须是 parseable JSON；invalid JSONL 不修。
  - 对每个 event 可补齐缺失的 `schema_version`、`work_id`、`queue_item_id`、`kind`、`receipt_nonce`。
  - 字段存在但与 record 冲突时拒绝。
  - 空 receipt 文件仍然拒绝。
- `normalizeCacheLeaf(leafDir)`:
  - `page.md` 缺失而 `page-content.md` 存在时，将同 leaf 的内容规范化为 `page.md`。
  - 两者都存在且内容一致时可以视为 canonical；两者 divergent 时拒绝。
  - `websearch.json`、`page.md`、`meta.json` 仍必须齐全，placeholder/empty page 仍需既有 degraded/fetch-failure 证据。
- `normalizeNonce(candidate, record, assignedDir)`:
  - 只有 `work_id`、`queue_item_id`、`kind` 全部匹配，且 result path resolve 后在 assigned work-unit dir 内，才允许把 stale `receipt_nonce` 归一到 record nonce。
  - 任一 identity mismatch 或 path escape 都拒绝。

这样做的好处是后面的 schema、hash、ledger、queue postcondition 仍然面对 canonical data；不会让每个消费方都背一套兼容逻辑。

Alternative considered: 直接放宽 Zod schema，让 `result` wrapper、receipt identity optional、`page-content.md` 都成为合法形状。拒绝这个方案，因为它会把兼容形状固化为新 authority，并让 ledger/cache/gate 消费面长期分叉。

### Decision 2: normalization diagnostics 是 submit 结果的一部分

每次 canonicalization 都应形成结构化 diagnostic item，至少包含：

- `kind`: 例如 `result_wrapper_unwrapped`、`receipt_identity_autofilled`、`cache_page_content_canonicalized`、`nonce_normalized_from_record`
- `work_id`、`queue_item_id`、`field` 或 `fields`
- receipt line number 或 cache leaf path 等定位信息
- `from`/`to` 摘要只记录非敏感、非大文本字段

这些 diagnostics 应进入 submit stdout、trace/log 或既有 submit diagnostic surface。ledger row 必须保存 canonical result，不保存 wrapper 或 stale nonce。

Alternative considered: 只在本地 console warning。拒绝这个方案，因为 Agent 需要把 JS/CLI feedback 带回 conversation context，后续 audit/review 也需要知道 submit 曾经被修正过。

### Decision 3: help/suspicious bundle guard 必须在 runtime load 前执行

`operate-queue.mjs` 和 `operate-work-unit.mjs` 应共享或复用同形态的 argument guard，但不要求强行抽象成新模块。关键是解析顺序：

1. 先识别 top-level `--help` / `-h`，输出 usage，exit 0。
2. 对 subcommand help，如 `enqueue --help`、`claim --help`，输出 usage 或明确 argument error，但不得把 `--help` 当 bundle。
3. 在调用任何 `loadQueue`、`ensureBundleDirs`、logger、trace writer、work-unit index reader 之前，拒绝以 `-` 开头的 bundle positional 或 `--bundle` value。

Alternative considered: 在 bundle load 失败后补 cleanup。拒绝这个方案，因为误创建目录本身就是副作用，且 cleanup 容易误删用户路径。

### Decision 4: handoff cascade 用 source-gate evidence 修，不用 force

BUG-063 的修复方向不是给 `advance-status` 添加“我知道自己在干什么”的开关，而是让所有下游入口继续依赖同一条证据链：

`gate_attempt(passed=true,next=<target>)` -> `enter-phase --node <target>` -> route-bound `load_complete` -> `advance-status --to <source_gate_enum>` -> source-gate status window

对于 degraded pass，沿用 accepted spec：它是 legal handoff，但必须有 `passed: true`、`degraded: true`、non-null `next`、durable trace、runtime-truth preconditions all satisfied。它不是 clean quality pass。

对于 failed gate 或 missing handoff：

- `advance-status` 不改 status，不写 `phase_transition`。
- downstream gate preflight/readiness/final 不因 artifact presence 或 `rb_status.json.current_node` 放行。
- `audit-phase-status` 报 drift/manual bypass/failed-gate downstream status，但不修状态。

Alternative considered: 添加 broad `advance-status --force`，由 Agent 在高摩擦时继续推进。拒绝这个方案，因为它把最关键的 lifecycle authority 从 trace 退回人工/LLM 自律，会重复 FOSE 的跳相位问题。

## Risks / Trade-offs

- **Risk: normalization 太宽导致真实错绑被吞掉** -> Mitigation: 每个 normalization 都要满足固定白名单条件；identity/path/cache conflict 一律 fail closed；测试覆盖 rejection boundary。
- **Risk: nonce repair 被误解为 nonce 不重要** -> Mitigation: spec 明确 record/beacon nonce 仍是 canonical authority；repair 只在其他 identity 全匹配且路径在 assigned dir 内发生。
- **Risk: receipt autofill 掩盖 sub-agent task guidance 不清楚** -> Mitigation: autofill 必须可诊断；后续仍可通过 docs/task prompt 改善源头，但运行时先减少可预期摩擦。
- **Risk: handoff hardening 与现有 degraded pass 冲突** -> Mitigation: 允许 accepted degraded handoff；只拒绝缺 trace、缺 route-bound load、runtime-truth blocker、manual status/status-only continuation。
- **Risk: help guard 行为在两个 CLI 中分叉** -> Mitigation: tests 同时覆盖 `operate-queue` 和 `operate-work-unit` 的 top-level/subcommand help 与 suspicious bundle path。

## Migration Plan

1. 在 apply 阶段先加 tests，复现 FOSE failure patterns：submit wrapper、receipt autofill、page-content cache、stale nonce、help 创建目录、failed gate downstream status。
2. 实现 submit canonicalization pipeline，并让现有 strict validation/queue postcondition/hash/ledger 继续消费 canonical result。
3. 实现 CLI argument guard，确认 help 调用无 runtime side effect。
4. 补齐/强化 `advance-status`、gate preflight、readiness/final/audit 的失败链测试；只在必要时修改实现。
5. 更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 到 `v0.9`。
6. 运行 targeted node:test、相关 CLI integration tests、OpenSpec governance checks。

Rollback 策略：如果 normalization 引发误接受风险，可以独立关闭对应 normalization 分支并保留 strict validation；help guard 和 handoff fail-closed 逻辑不需要 runtime migration。

## Open Questions

- `page-content.md` canonicalization 在实现上采用 rename 还是 copy/write canonical projection，需要 apply 时根据现有 cache hash/ledger 计算方式决定；无论哪种，accepted ledger/hash 必须基于 canonical `page.md`。
- normalization diagnostics 最终落在 trace event、logger 行、submit JSON response 的哪几个 surface，需要结合现有 submit output shape 做最小改动；spec 只要求可见且结构化。
- receipt `schema_version` 的 autofill 值应来自 work-unit record、manifest 还是当前 schema default；apply 阶段必须选一个 Source of Record 并保持一致。
