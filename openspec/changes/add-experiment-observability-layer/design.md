## Context

当前 playbook 体系已经具备 disposable bundle、统一 `rb_trace.jsonl`、gate attempt trace、runner 清单和 Heavy/Light 成本区分。`harden-agent-engine-boundary` 把 Agent/Engine 边界进一步收紧后，review 发现质量风险不在单个实验，而在“运行后可观察性”这一横切面：gate 输出里的 `inspect[]` / `advice[]` 没有稳定进入诊断面，旧 trace 残留只被局部覆盖，Heavy 的 ledger/receipt/cache/content_dedup 信号没有被统一检查。

相邻 Source of Record：

- `openspec/specs/experiment-shared-infra/spec.md`: `experiments_env/shared/` 是实验共享工具位置，production code 不得依赖它。
- `openspec/specs/agent-testing/spec.md`: playbook verdict event 使用 `check`，playbook 使用 bundle-local `rb_trace.jsonl`；accepted `weight` 历史合约只列 `light` / `heavy`。
- `openspec/specs/playbook-runner/spec.md`: runner 打开 RUN.md，逐个执行 playbook 并报告 PASS/FAIL；当前仓库实际 runner surface 是 `experiments_playbook/RUN_EXPS.md`，本 change 必须显式处理这个 drift。
- `openspec/specs/trace-writer/spec.md`: `DPT_FRAMEWORK/engine/trace.mjs` 是 production trace writer 的 Source of Record。

## Goals / Non-Goals

**Goals:**

- 给所有 playbook 提供同一套 post-run health contract，覆盖 Light/Standard/Heavy，而不是为每类 case 单独补脚本。
- 捕获 gate CLI 的原始 outcome、`inspect[]` 和 `advice[]`，同时保留原 gate exit code。
- 让诊断事实进入 trace/report，但不污染 verdict `check` 语义。
- Heavy provenance 以 Engine ledger 为 authority，核对 real subagent path 上的 receipt、output files、cache trails 和 dedup 信号。
- 让 runner report 一眼显示 verdict 和 health，两者分离但并列。

**Non-Goals:**

- 不改变 gate PASS/FAIL 判定规则。
- 不把 post-run health 失败自动等同于 playbook verdict FAIL；是否阻断由后续 runner policy 明确决定。
- 不把 experiment helper 引入 production `DPT_FRAMEWORK/` runtime import path。
- 不批量重写所有 playbook 的测试意图；集成以 wrapper/protocol 为主，代表性验证后再全量 rollout。
- 不补造 runtime receipt、ledger 或 trace；观测层只能读取真实执行产物。
- 不把 `standard` profile 写回 accepted `agent-testing` weight 合约，除非实现阶段另开或同步对应 accepted spec delta。

## Decisions

### 1. 新建 `experiment-observability` capability，并对 `playbook-runner` 做协议覆盖

理由：`agent-testing` 关心 playbook 形状、trace verdict、weight 和真实 subagent acceptance；`playbook-runner` 关心 Agent runner 如何执行清单并报告结果。观测层的主要约束对象是“运行后 bundle 事实如何被结构化读取和报告”，跨越 trace、gate、ledger、cache、runner，不属于单一既有 capability。

但 EXO-006 会改变 runner report 字段和 cleanup-preservation policy，因此 proposal 必须把 `playbook-runner` 列为 Modified Capability。这里的修改是协议覆盖，不是替换 Agent-driven runner 模型，也不是把 observability 实现逻辑塞进 RUN 文档。

替代方案：只把 Health 列加到 `playbook-runner`。拒绝原因是这只能覆盖报告面，无法规范 gate wrapper、diagnostic trace、Heavy provenance 的读取 authority。

### 2. `verify-bundle-health.mjs` 使用 profile 驱动的同一 schema

健康报告使用一个 Zod schema，核心字段固定：

```js
{
  schema_version: "experiment_health.v1",
  bundle_path,
  profile: "light" | "standard" | "heavy",
  status: "clean" | "issues",
  trace: { status, required, present, event_count, by_event, parse_errors },
  gate_attempts: { status, required, count, pass, fail, by_gate, diagnostics },
  bundle_schema: { status, required, validate_bundle, inspect_bundle },
  timeline: { status, required, trace_gate_attempts, log_gate_attempts, mismatches },
  legacy_trace: { status, required, paths },
  ledger: { status, required, declarations, schema_errors },
  receipts: { status, required, slots, missing, incomplete },
  cache_trails: { status, required, leaves, missing },
  dedup: { status, required, checks, issues },
  issues: []
}
```

每个 section 的 `status` SHALL 使用同一组语义：`clean`、`issues`、`not_applicable`、`observed_optional`。`required: true` 的 section 只能是 `clean` 或 `issues`；`required: false` 且未发现对应 artifact 时为 `not_applicable`；`required: false` 但发现 artifact 并成功解析时为 `observed_optional`；`required: false` 且 artifact present-but-invalid 时可以是 `issues`，但只作为 section-level signal。顶层 `status` 只由 required section 的 `issues` 决定；顶层 `issues` 只汇总影响顶层 `status` 的 required-section issues；optional section issues 不得进入顶层 `issues`，也不得把 Light health 变成 top-level `issues`。

Light/Standard/Heavy 不分裂脚本，而是 profile 决定 required checks：

| Profile | Required checks |
|---------|-----------------|
| `light` | trace parse/count, legacy trace absence, bundle validate/inspect |
| `standard` | light + gate diagnostics, gate output/trace timeline consistency |
| `heavy` | standard + ledger, runtime receipts, output files, cache trails, content_dedup evidence |

这里的 `standard` 是 observability profile / RUN_EXPS execution tier，含义是”真实 bundle 多步骤、无外部调用、通常含 gate CLI”；它不是 accepted `agent-testing` 历史 `weight` 合约的新枚举。实现阶段若发现 frontmatter `weight: standard` 已在 repo 中存在，EXO 只能消费现状并报告，不借本 change 顺手重定义 AGT-005。

> **Naming disambiguation: `standard` in this project.** Implementation SHALL keep three distinct uses separate:
>
> | Surface | Owner | Meaning |
> |---------|-------|---------|
> | Playbook filename `cost: standard` | `guidelines/command-experiments.md` §Naming | Normal real-bundle multi-step execution (authoring/runner-cost label, maps to `weight: light` in frontmatter) |
> | `--profile standard` | This change (EXO-002) | Observability profile: light checks + gate diagnostics + timeline consistency |
> | Frontmatter `weight: light \| heavy` | Accepted `agent-testing` spec (AGT-005) | Runner cost class; only `light` and `heavy` exist today |
>
> These three meanings overlap in semantics (all describe “not trivial light, not expensive heavy”) but are owned by different sources of record. No artifact in this change SHALL introduce `weight: standard` into frontmatter, and no health profile decision SHALL be driven by reading `weight` from playbook frontmatter. The health profile is selected by the runner via `--profile`, not inferred from frontmatter fields.

替代方案：`verify-bundle-health.mjs --heavy` 内写分支。保留 `--profile heavy` / `--heavy` 兼容入口，但内部必须走 profile table，避免后续继续堆 if/else。

### 3. gate 监控采用 wrapper，不采用 shell pipe

`run-gate-with-monitor.mjs --bundle <B> --gate <name> -- <gate command...>` 负责启动原 gate CLI、捕获 stdout/stderr、解析 gate JSON、保存原始 gate output，并追加诊断 trace。wrapper 的 process exit code 必须等于原 gate CLI exit code。

原始输出 SHALL 写入 bundle-local observability 目录，路径形状为 `<bundle>/_observability/gates/<seq>-<gate>.json`，其中 `<seq>` 是零填充单调递增序号，如 `0001-wave0-complete.json`。内容至少包含 `sequence`, `gate`, `command`, `exit_code`, `stdout`, `stderr`, `parsed_json?`, `inspect[]?`, `advice[]?`, `captured_at`。health verifier 通过 `_observability/gates/*.json` 发现 artifacts，按 `sequence` 和 filename 稳定排序，只读取这些 wrapper artifacts、`rb_trace.jsonl` 和 bundle runtime state，不重新执行 gate。

拒绝 `gate | monitor-gate-output.mjs` 的原因：pipe 容易隐藏左侧命令 exit status，且不同 shell 对 pipefail 的处理会让 playbook 更脆弱。wrapper 用 `child_process.spawn` 显式保留 outcome，符合 Engine checkpoint 的确定性要求。

gate 被重试时（如 repair loop），每次调用产生独立 artifact（`0001-wave0-complete.json`、`0002-wave0-complete.json`），health verifier 读取全部并按 sequence 排序。最晚一次调用的 outcome 不覆盖更早的 artifact——它们都是可审计的诊断记录。

### 4. 诊断 trace 不使用 verdict `check` 事件

观测层 SHALL 通过 canonical trace writer/contract 可接受的路径写 `event: "diagnostic"` 或等价非 verdict event，并带 `source: "experiment-observability"`、`kind: "gate_output" | "health_report"`、`gate?`、`passed?`、`detail`、`inspect[]?`、`advice[]?`。它可以被 runner summary 读取，但不得被既有 verdict 逻辑当作 playbook PASS/FAIL 的 `check` 事件。

替代方案：把 gate inspect 写成 `check` event。拒绝原因是 accepted `agent-testing` 已规定 playbook verdict event 使用 `check`，观测层若也写 `check` 会把诊断和裁决混在一起，让“健康问题”和“测试失败”难以分辨。

### 5. Heavy provenance 以 ledger 为 authority

Heavy 检查从 `rb_output_declarations.jsonl` 出发，逐条 declaration 验证：

- declaration schema 合法，含 slot/result identity；
- `slot_result_ref` 指向真实 slot result；
- declared `output_files` 存在且路径在 bundle 内；
- declared `cache_trails` leaf 具备 `websearch.json`、`page.md`、`meta.json`；
- runtime receipt 存在且至少证明 start/complete 或等价 terminal event；
- wrapper raw gate output、gate attempt trace 或既有 gate diagnostic 能证明相关 gate 消费 ledger，而不是观测层自己重新运行 gate 或扫目录冒充 truth。

替代方案：扫描 `_subagents/`、`reference/`、`_cache/` 推断输出。拒绝原因是这会绕过 Agent/Engine 边界，重复制造 `harden-agent-engine-boundary` 刚修正的问题。

### 6. RUN 文档定义协议，不承载实现逻辑

RUN 文档只描述 runner 在 verdict 后、cleanup 前调用 health check，并在 report 中记录 `verdict`、`health`、`not_run_reason?`、`bundle_preserved?`。具体读取 trace、gate JSON、ledger 的逻辑留在 JS 工具和 schema 中。

当前仓库实际 runner surface 是 `experiments_playbook/RUN_EXPS.md`，而 accepted `playbook-runner` 仍写 `RUN.md`。本 change 的实现顺序 SHALL 是：先 inventory 并记录实际 source drift；优先更新 RUN_EXPS 的协议；如果实现者选择恢复/同步 RUN.md，必须在 tasks 中作为 runner-source cleanup 显式完成，不能无声创建第二套互相冲突的 runner 指令。

## Stage Strategy

本 change 必须按 contract -> tooling -> representative integration -> rollout -> validation 推进，而不是把所有 playbook 一次性改完。原因是 observability 是横切层：如果 schema、read-only evidence source 或 runner cleanup policy 没先钉住，批量 playbook edits 会把问题扩散到几十个 case，review 时反而看不清事实来源。

Stage 0 先做 boundary 和 inventory。它不实现功能，只回答三件事：当前 runner surface 到底是 RUN_EXPS 还是 RUN.md；哪些 Standard gate-CLI 和 Heavy playbook 是 rollout target；health verifier 能读取哪些既有 gate/trace/ledger/receipt/cache 证据。没有这个 inventory，后续 `rg` 检查和 exception comment 都没有参照物。

Stage 1-2 先把 health contract 和 read-only verifier 做稳。Stage 1 的 unit tests 只证明 JSON contract、profile table、required/optional issue aggregation。Stage 2 才读取 bundle facts，但仍然不碰 gate execution、不接 playbook。这样可以先证明 verifier 不会变成第二套 verdict engine。

Stage 3 单独落 gate wrapper。wrapper 是最容易引入行为回归的部分，因为它包住原 gate CLI。它必须先用 fake gate command 证明 exit code preservation、raw artifact persistence、diagnostic trace、stable `_observability/gates/<seq>-<gate>.json` discovery，再接真实 playbook。

Stage 4 单独落 Heavy provenance。Heavy health 的 authority 是 `rb_output_declarations.jsonl`，不是 `_subagents/`、`reference/` 或 `_cache/` 扫描结果。这个 stage 用 fixtures 证明完整 provenance 和缺失 provenance 的差异，避免把真实 subagent 边界重新糊掉。

Stage 5 先更新 runner protocol，再进入 playbook rollout。runner 必须先知道 verdict/health 分列、PASS+CLEAN cleanup、FAIL/HEALTH ISSUES preserve bundle，否则 playbook 里加 health step 后，runner report 仍然可能丢掉最重要的诊断证据。

Stage 6 做 representative integration，Stage 7 才 full rollout。representative Standard/Heavy 证明真实 disposable bundle 路径可行；full rollout 只是按 Stage 0 inventory 做机械扩展。任何 Human/manual 或 Heavy NOT RUN 都必须显式记录，不能算 PASS。

Stage 8 收口验证。此 stage 同时需要 regression 和 command experiments：regression 证明 JS/helper contracts，command experiments 证明 agent-facing playbook path 和 runner policy。

### Test Asset Embedding Points

测试资产不是到最后才一次性补齐，而是随 stage 逐层埋进去：每做一段，就同步落下能证明这一段的测试或实验资产。

| Stage | Test assets embedded | What they prove |
|-------|------------------------|-----------------|
| Stage 0 | No executable tests; inventory selects fixture families and representative playbooks | Later tests target the right surfaces |
| Stage 1 | Schema/unit fixtures for health reports and profile table | Contract semantics are stable before readers exist |
| Stage 2 | Synthetic disposable-bundle fixtures | Verifier reads bundle facts and handles required/optional issues without running gates |
| Stage 3 | Fake gate command fixtures | Wrapper preserves exit status and persists diagnostics deterministically |
| Stage 4 | Heavy provenance fixtures | Ledger-driven provenance rejects files-without-ledger and missing receipt/cache/gate evidence |
| Stage 5 | Runner/report examples or fixtures | Verdict/health report fields and cleanup policy are unambiguous |
| Stage 6 | First real representative command experiments | Standard/Heavy paths work in real disposable bundles before full rollout |
| Stage 7 | Expanded rollout checks using existing assets | Inventory targets are covered or explicitly excepted |
| Stage 8 | Final regression, validators, and recorded experiment evidence | Change can be archived with both deterministic and command-experiment proof |

This staging matters because unit fixtures can prove schema/tooling but cannot prove Agent-facing playbook behavior. Each stage owns the test assets that prove its own contract; implementation SHALL NOT defer those tests to Stage 8. Stage 8 is for running the accumulated regression and experiment evidence end to end, not for first creating the tests. Command experiments arrive only after the wrapper, verifier, and runner protocol are stable enough that a failed representative run produces useful evidence instead of ambiguous harness noise.

## Experiment Validation Strategy

`guidelines/command-experiments.md` 要求 command experiment 证明真实 runtime path（参见 §Experiment-Production Convergence Contract 和 §Quality Gate），而不是脚本自说自话。本 change 的实验资产遵守该 guideline 的 Layer Contract（观测工具在 `experiments_env/shared/`，playbook 在 `experiments_playbook/`），并在 Reality Distance Ledger 中区分 fixture 证据和真实 Agent/subagent 证据。实验验证分三层：

1. Contract fixtures prove tooling only. Unit/integration fixtures can prove health schema, profile semantics, wrapper fake-gate behavior, and ledger-driven fixture inspection. They do not prove playbook runner behavior, Agent/subagent execution, or cleanup policy in real command experiments.
2. Representative command experiments prove real playbook paths. At least one Standard gate-CLI playbook must run with the wrapper inside a real disposable bundle, with the existing verdict preserved and diagnostics captured into raw artifact plus non-verdict trace.
3. Heavy representative experiments prove provenance on the expensive path. At least one Heavy playbook should run when the user explicitly permits real external/agent cost. It must prove health starts from `rb_output_declarations.jsonl`, then checks runtime receipt, declared cache trails, output files, and gate-consumption evidence. If Heavy is not permitted, record NOT RUN and do not count it as PASS.

Experiment cases must keep the Agent/Engine boundary visible. Light/Standard fixture cases are Engine evidence unless a real Agent actor did the semantic work. Heavy cases with real subagent/WebSearch/WebFetch are the only evidence for real Agent/subagent provenance. No experiment may hand-write fake receipts, fake trace events, fake output declarations, or fake gate results to satisfy health.

The minimum experiment closeout for this change is:

- Light observability-focused run: real disposable bundle, minimal light health CLEAN, Heavy-only missing artifacts `not_applicable`, optional invalid artifact section-level only.
- Standard representative run: wrapped gate CLI preserves exit/verdict and captures `inspect[]` / `advice[]`.
- Heavy representative run: ledger/receipt/cache/gate-consumption checked from real artifacts, or explicit NOT RUN if cost is not approved.
- Runner protocol run/report: `verdict` and `health` remain separate, FAIL or HEALTH ISSUES preserve bundle, PASS+CLEAN may cleanup.

## Risks / Trade-offs

- [Risk] Health `issues` 被误解为 verdict FAIL → Mitigation: spec 明确 verdict 与 diagnostics 分离，report 分列展示，playbook verdict 不读取 diagnostic event 当作 `check`。
- [Risk] wrapper 让 playbook 命令变长 → Mitigation: 提供一个稳定 wrapper 命令形状，避免每个 playbook 手写 pipe/parse 逻辑。
- [Risk] Heavy 检查过早要求所有历史 Heavy playbook 完美 → Mitigation: tasks 先落工具和代表性集成，再做全量 rollout；健康报告可报告 `issues`，不隐式改 verdict。
- [Risk] 诊断 trace event 未被 production trace schema 接受 → Mitigation: 观测层作为 experiment helper 追加前必须用现有 trace writer/schema 可接受的字段形状；若需要 schema 扩展，必须在本 change 的实现任务中同步测试。
- [Risk] content_dedup 检查入口在不同 gate CLI 中不一致 → Mitigation: health report 先记录“dedup evidence present/missing/failed”三态，具体 gate 命令入口由实现阶段从现有 CLI 查证后接入。
- [Risk] 全量 rollout 范围不清导致盲改 playbook → Mitigation: tasks 先生成 targeted inventory，明确 Standard gate-CLI playbook、Heavy playbook、例外和代表性样本，再进入批量替换。
- [Risk] RUN.md / RUN_EXPS.md 两套 source 互相覆盖 → Mitigation: tasks 要求先确认当前实际入口，更新 first target，并把任何同步 RUN.md 的行为写成显式 cleanup。
- [Risk] 只跑 regression 导致 agent-facing path 未证明 → Mitigation: Stage 8 requires command experiments on Light and Standard paths, plus Heavy when explicitly approved.
- [Risk] Heavy experiment cost or external dependency blocks validation → Mitigation: Heavy representative may be recorded as NOT RUN only when user has not approved the cost; NOT RUN is never counted as PASS.

## Migration Plan

0. Stage 0: inventory runner surfaces, rollout targets, cleanup patterns, and read-only evidence sources.
1. Stage 1: implement health report schema/helper and profile table with unit tests for required/optional issue semantics.
2. Stage 2: implement `verify-bundle-health.mjs` as a read-only bundle fact reader.
3. Stage 3: implement `run-gate-with-monitor.mjs` with fake-gate tests for exit code preservation, raw artifacts, and diagnostics.
4. Stage 4: implement Heavy provenance checks from ledger, receipts, cache trails, output files, and existing gate-consumption evidence.
5. Stage 5: update active runner protocol for verdict/health report fields and cleanup preservation.
6. Stage 6: integrate one representative Standard gate-CLI playbook and one representative Heavy playbook.
7. Stage 7: roll out to all targeted Standard/Heavy playbooks from the inventory.
8. Stage 8: run regression, validators, OpenSpec/governance checks, and command experiments; Heavy command experiment requires explicit user approval for real external/agent cost.
