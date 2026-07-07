## Why

`_backlog/bugs/BUG-033` 和 `BUG-037` 至 `BUG-043` 暴露的是同一条自主执行链路的失稳：work-unit 已经取代旧 relay/slot，但真实 run `dpt_rb_aidlc-investigation/` 中 sub-agent 仍会把输出写错位置、不写文件、自创 nonce，随后 gate 在 ledger/cache/source schema 上反复失败，Phase Agent 又尝试手动改状态、跳过 wave1/wave2，甚至在非 HITL `stop: no` 阶段浮出水面。

现在需要把这些 bug 作为 contract-class probe 来修，而不是只修一个报错点：producer 路径、bundle 边界、ledger/hash authority、phase handoff 审计、Agent-facing schema、gate 诊断、silent surfacing 观测必须一起收紧，才能让 coding agent 在长程 autonomous run 中不再被旧习惯和模糊反馈带偏。

同一个真实 run 还暴露出另一半问题：`dpt_rb_aidlc-investigation/seed_topics/01_aidlc-origin-provenance.md` 已经回填了重要结论（例如 AIDLC 起源假设被推翻，证据指向 AWS/Raja SP），但后续 Agent 需要的不只是“有证据”或“有结论”，还需要一张能按图索骥的 return map：这条证据说了什么、支撑/反驳哪个 must-answer 或 finding、对应哪些 `reference/`、`source.yaml`、cache/work-unit/finding 路径，以及下一步该读哪里。

`dpt_rb_aidlc-investigation/_cache/wave0/` 还暴露出 cache trail 的内容问题：目录结构和 `websearch.json`/`page.md`/`meta.json` 文件存在，但一些 `page.md` 只是占位标题或空文件，不是可重读的 fetched page capture。后续 Agent 追到 cache 时必须能看到当时实际拉下来的内容，或看到明确的 access-failure/degraded-capture 记录；空壳 cache 不能支撑 reference。

## Bug Coverage

这个 change 目标覆盖 `_backlog/bugs/BUG-033` 和 `BUG-037` 至 `BUG-043` 的 production 修复面：

- `BUG-033` phase isolation 破坏、wave0 fail 后跳 final：通过 phase status drift audit、gate repair diagnostics、silent surfacing contract 共同覆盖；gate fail 不授权 handoff、status sync、final delivery。
- `BUG-037` sub-agent 写入 repo root：通过 active bundle root containment、beacon-first absolute path resolution、repo-root leak diagnostics 覆盖。
- `BUG-038` `source.yaml` 格式未文档化：通过 parser-aligned `source.yaml` / reference metadata guidance 和 shape-specific gate diagnostics 覆盖。
- `BUG-039` sub-agent 不写输出文件：通过 work-unit task absolute paths、write-before-return verification、chat-only return rejection 覆盖。
- `BUG-040` sub-agent 自创 receipt nonce：通过 exact identity inline、beacon-first read、nonce preservation checks 覆盖。
- `BUG-041` shared refs 文件存在但 ledger 不计数：通过 ledger-only diagnostic 和合法 work-unit submit path 覆盖；不引入 filesystem/hybrid fallback。
- `BUG-042` 手改 `rb_status.json` 跳过 wave1/wave2：通过 impossible status window 和 manual bypass suspicion audit 覆盖。
- `BUG-043` 非 HITL phase 浮出水面：通过 `stop: no` `surfacing_intent` trace observability 和 silent execution wording 覆盖。

不纳入本 change 的是历史 run bundle 的手工修复，以及会削弱当前 authority 的兼容捷径，例如 filesystem/hybrid reference count fallback、hand-written delegated ledger rows、或由 Agent 主观判断“实质完成”后绕过 deterministic chain。

## What Changes

- **加强 active bundle root 边界**：runtime 输出路径必须落在当前 `dpt_rb_*` / `dpt_disp_*` bundle 下；repo root 泄漏的 `_work_units/`、`artifacts/`、`_cache/` 等目录作为诊断和隔离违规暴露。
- **加强 work-unit task / spawn contract**：生成的 work-unit task 和 Phase Agent spawn prompt 必须给出 active bundle 绝对路径、exact identity fields、beacon-first 路径解析、写入前后检查，并明确 sub-agent 在 return 前必须把声明文件写到磁盘。
- **保持 ledger-only authority，但修正合法生产路径**：不引入 filesystem / hybrid fallback；shared reference、source YAML、cache trail 等仍必须通过 `operate-work-unit submit` 进入 ledger 才能成为 gate coverage。
- **要求 cache trail 保存真实内容**：`page.md` 不能只是空文件或占位标题；accepted reference 的 cache leaf 必须保存 fetched content capture，或明确记录 fetch failure / degraded capture，不得用空壳 cache 满足 coverage。
- **检测 post-submit drift**：gate 或提交后审计必须核对 ledger row、index、manifest、result、receipt、beacon、output/cache/hash，发现 `result.json` 提交后被改写时 fail closed 并给出修复方向。
- **补齐 Agent-facing reference/source 格式**：明确 `artifacts/waveN/{topic}/source.yaml` 顶层数组、required fields、YAML stringify 要点，以及 `reference/*.md` bullet metadata 非 YAML frontmatter。
- **新增 research return map 契约**：wave0、wave1、wave2 的回填和返回物必须把 evidence-to-claim 关系写成 Agent-readable 地图；每条重要证据/判断要有简短含义、问题/假设/finding 关联、可追踪路径和下一跳阅读线索。
- **强化 wave gate repair diagnostics**：针对 YAML object-vs-array、missing fields、ledger-only counting、cache trail 映射、hash drift 给出可修复诊断，减少 Agent 用手工状态跳跃“绕过”摩擦。
- **新增 phase status drift audit**：从 trace、manifest、transition chain、`rb_status.json` 识别 impossible current_gate/next_gate window 和手动 bypass 嫌疑；审计只诊断，不替 Agent 推进状态。
- **记录 stop:no surfacing intent**：当 Agent 识别到自己将要在非 HITL `stop: no` 阶段向用户发问、汇报、展示进度或等待输入时，必须写入 trace/log 级 `surfacing_intent` 作为 would-have-surfaced 诊断，然后中止用户可见浮出并继续修复、换策略、降级或静默 hold；若无法可靠拦截模型输出，则 contract 明确这是 Agent-facing observability，不声称能魔法拦截所有 chat。
- **BREAKING**：不保留旧 relay/slot 或 hand-written delegated ledger fallback；也不接受为了兼容历史 run 而弱化 work-unit/ledger/gate authority。

## Capabilities

### New Capabilities

- `research-return-map`: 定义 wave0/wave1/wave2 research return 和 seed-topic backfill 的 evidence-to-claim map 契约，让未来 Agent 能从回填内容追到 reference/source/cache/work-unit/finding，并读懂证据含义。

### Modified Capabilities

- `bundle-data-isolation`: 增加 repo-root runtime leak 诊断和 active bundle root containment 要求。
- `delegated-work-units`: 增加 work-unit task 的 bundle-root absolute path、write-before-return verification，以及 submitted result / ledger hash drift 检查。
- `cache-raw-web-content`: 增加 cache content capture 完整性要求，避免只有目录/文件结构而没有 fetched page 内容。
- `subagent-node-contract`: 增加 sub-agent role / spawn prompt 的 beacon-first path resolution、exact identity inline、file existence verification 要求。
- `reference-flat-format`: 增加 Agent-facing `source.yaml` 和 reference metadata 的 parser-aligned 格式说明。
- `research-return-map`: 新增 Agent-facing return map structure，要求回填内容包含证据含义、claim/finding 关联、bundle-relative refs、source/cache/work-unit pointers 和后续探索线索。
- `research-wave-gate-implementation`: 增加 wave gate 针对 YAML、ledger counting、cache coverage、hash drift 的 repair-targeted diagnostics。
- `cli-phase-transition`: 增加 phase status drift audit，识别 impossible status window 与手动 bypass 嫌疑。
- `silent-wave-execution`: 增加 `stop: no` surfacing intent trace 观测契约。
- `content-delivery-phase-content`: 收紧 Final delivery 证据边界，提前写入 `final/` 只能作为 phase-boundary violation 诊断，不能证明 delivery。

## Impact

- Affected OpenSpec/governance: `openspec/governance/req-registry.yaml`，本 change 的 delta specs 和 tasks；新增并注册 `research-return-map` requirement IDs。
- Affected framework implementation during apply: `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `DPT_FRAMEWORK/cli/advance-status.mjs`, `DPT_FRAMEWORK/cli/enter-phase.mjs`, gate helper / wave/readiness gate CLIs, reference/cache helpers, trace/log CLIs, workflow shared/phase Markdown, and seed-topic/wave return-map guidance.
- Affected tests: root `tests/` regression coverage for work-unit task generation, submit/gate hash drift, bundle leak diagnostics, source/reference format diagnostics, research return-map/backfill structure, phase status drift audit, silent surfacing wording/trace contract.
- Affected controlled playbooks only after apply review: update or add focused playbook coverage where it can provide real trace-backed PASS without turning into mock execution.
- Dependencies: no new npm dependencies; Node.js built-ins plus existing `zod` / `yaml` only.
- Versioning: DPT_FRAMEWORK behavior and Agent-facing contracts change; target framework version `v0.5`, with `DPT_FRAMEWORK/CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` banner updated during apply.
