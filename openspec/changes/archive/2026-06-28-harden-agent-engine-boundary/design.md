## Context

当前 Agent↔Engine 边界的薄弱点不在“有没有写规则”，而在 Engine 信任了不可验证或可绕过的表面：

- 通过 `glob/readdir` 从目录形状“发现”Agent 产物，导致未声明 reference 也可能影响 gate。
- delegated task 是否真的由 Sub-agent 经 Relay 执行，缺少可验证 provenance。
- 旧方案试图用 `--actor` 字符串和 `targets.controller: "sub-agent"` 解决 Bug #002，但这与当前 queue schema 和 accepted spec 冲突，也把身份问题放在 CLI 参数上。
- `_cache/` trail 只被当作文件形状，没有绑定到 Sub-agent result 和 runtime receipt。
- trace sink 分散，runtime audit 与实验 verdict 路径仍需统一同步。

本 change 采用的信任根是：Relay committed slot result + runtime receipt + schema-validated Agent output declaration + bundle-level declaration ledger。Engine 从这些结构化事实执法，不从 actor 字符串或目录扫描推断。

## Goals / Non-Goals

**Goals:**

- 保持 `targets.controller: "main-agent"` + `targets.delegates.to: "sub-agent"` 的现有 wire contract。
- 让 delegated task 的 `complete()` 强制校验 relay provenance、runtime receipt、`output_files[]`、`cache_trails[]`、文件存在性与 cache leaf 完整性。
- 新增 bundle-level `rb_output_declarations.jsonl` ledger，由 `complete()` 在成功校验 delegated task 后写入。
- 让 gate `content_dedup` 只从 declaration ledger 读取 reference 声明，不扫描 `reference/` 发现 Agent 产物。
- 明确 `cache_trails[]` 是 leaf source directory，每个 leaf 必须直接包含 `websearch.json`、`page.md`、`meta.json`。
- 统一 trace 到 `rb_trace.jsonl`，并同步更新 accepted specs、playbook schema/tests、README/RUN_EXPS、timeline inspector。
- 建立 case-401~405 的 Engine/runtime 层实验和 case-406 的真实 Sub-agent/WebSearch/WebFetch 实验。

**Non-Goals:**

- 不把 `targets.controller` enum 扩展为 `"sub-agent"`。
- 不把 `claim --actor` 当作安全边界或 provenance 证据。
- 不让 Sub-agent 直接 claim queue、修改 `rb_queue.json`、跑 gate 或推进状态。
- 不判断 `_cache/` 内容语义真实性；Engine 只检查声明路径存在与三文件完整。
- 不把目录扫描用于“发现”可帮助 gate pass 的 Agent 产物。
- 不新增 npm 依赖。

## Core Boundary

生产与实验在 declaration 处汇聚，但 declaration 需要两层：

1. **Slot result declaration**：Sub-agent 返回的 `result.json` 包含 `output_files[]` 和 `cache_trails[]`，由 `commitSlotResult()` schema 验证并写入 slot。
2. **Bundle declaration ledger**：`complete()` 确认 delegated task 的 committed slot result、runtime receipt、输出文件、cache leaf 后，向 bundle 根 `rb_output_declarations.jsonl` 追加一条记录。gate 只读取该 ledger。

```
Sub-agent / fixture result
        │
        ▼
commitSlotResult() validates SlotResult schema
        │
        ▼
complete() validates relay provenance + receipt + output files + cache leaf
        │
        ▼
append rb_output_declarations.jsonl
        │
        ▼
gate content_dedup reads ledger only
```

这比只让 gate 读 slot result 更硬：只有 queue completion 成功的声明才进入 gate 输入面；未完成、失败、手写 orphan reference、旧文件残留都不能帮助 gate pass。

## Decisions

### D1: TargetSpec 不改 controller，delegation 由 delegates 表达

**选择**：保留 accepted spec 和当前 Zod schema：

```json
{
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-source-intake",
      "timeout_ms": 600000
    }
  }
}
```

`controller` 表示 Phase Agent workflow authority 的 wire value；`delegates.to` 表示该 work unit 必须通过 Sub-agent Relay 执行。`validate-phase-templates.mjs` SHALL 检查 wave0/wave1 搜索类 task 模板保持该组合。

**拒绝方案**：把 delegated task 的 `targets.controller` 改成 `"sub-agent"`。当前 schema 明确拒绝该值；更重要的是，这会误导实现者让 Sub-agent 直接成为 queue actor。Sub-agent 的权限边界是 Relay slot 内执行，不是 queue owner。

### D2: `--actor` 只用于 trace/advice，不作为身份执法

**选择**：不新增 `claim()` actor/controller 匹配作为本 change 的 enforcement。`claim --actor` 可以保留为审计/可观测字段，但不能证明实际执行者，也不能替代 Relay provenance。

真正的执法点是 delegated `complete()`：

- task 必须有 `targets.delegates.to === "sub-agent"` 才进入 delegated completion path。
- `complete()` 必须收到或能解析到 committed slot result reference（例如 bundle-relative `_subagents/.../result.json`）。
- slot result 必须通过 SlotResult schema，并含 `output_files[]` 与 `cache_trails[]`。
- slot 同目录 runtime receipt 必须通过一个 pure validation helper 校验，至少包含 `agent_runtime_started` 与 `agent_result_ready`，且与 slot/result/receiptNonce 绑定；`complete()` 不应依赖需要 runtimeAgentId 或写 trace 的 `ingestAgentReceipt()` 副作用路径来重新证明 receipt。
- 声明的输出文件和 cache leaf 必须在 bundle 中存在且完整。

这避免了“Phase Agent 用不同 `--actor` 字符串重新 claim”这种伪隔离。

### D3: SlotResult declaration 是输入，ledger 是 gate 的读取面

**选择**：在 `subagent-relay.mjs` 的 SlotResult schema 和 generated `result.schema.json` 中同步加入：

```js
output_files: [{
  path: string,       // bundle-relative
  role: 'reference' | 'evidence_summary' | 'question_list' | 'source_yaml' | 'index' | 'other',
  source_url?: string,   // role=reference 时必填
  source_slug?: string
}],
cache_trails: [string]   // bundle-relative leaf directories
```

`commitSlotResult()` 只负责验证并提交 slot result；`complete()` 才负责把成功完成的 delegated declaration 写入 bundle-level ledger。

推荐 ledger 记录：

```json
{
  "declared_at": "2026-06-28T00:00:00.000Z",
  "work_id": "wave0-source-topic",
  "producer_rule": "source_intake_fan_in",
  "slot_result_ref": "_subagents/wave_00/slot_01/result.json",
  "runtime_receipt_ref": "_subagents/wave_00/slot_01/runtime-receipt.jsonl",
  "output_files": [],
  "cache_trails": []
}
```

ledger 由 Engine append-only 写入。Agent 不直接写 ledger。

### D4: `cache_trails[]` 指向 leaf source directory

**选择**：每个 `cache_trails[]` 项都是 leaf source directory，例如：

```text
_cache/wave0/primary/01_topic/s01_source/
```

`complete()` 对每个 leaf 直接检查：

- leaf directory exists
- `websearch.json` exists
- `page.md` exists
- `meta.json` exists

不再要求 leaf 下面还有 `sNN_*/` 子目录。旧说法“目录下至少有一个 `sNN_*/` 子目录”会把 parent directory 和 leaf directory 混在一起，应删除。

Relay task prompt 仍 MAY 给 Sub-agent 一个 parent cache directory（例如 `_cache/wave0/primary/01_topic/`），并要求 Sub-agent 在其中创建 `sNN_*` leaf。关键是 returned SlotResult 的 `cache_trails[]` MUST 声明实际 leaf paths，而不是 parent path。

### D5: delegated complete() 是边界执法点

`complete()` 对 delegated task SHALL 执行以下顺序：

1. 读取当前 queue item，确认 `targets.delegates.to === "sub-agent"`。
2. 解析 `--result` 或 equivalent result payload，定位 committed slot result。
3. 校验 slot result schema，拒绝缺失 `output_files[]` 或 `cache_trails[]`。
4. 用 pure helper 校验 runtime receipt 与 slot result：receipt 文件存在，事件完整，slotKey/roleAgentKey/receiptNonce 指向同一 slot。
5. 校验 `output_files[].path` 是 bundle-relative，文件存在，不越界。
6. 校验 `cache_trails[]` 是 bundle-relative `_cache/` leaf，且每个 leaf 直接含三文件。
7. 校验标准 completion receipt / writes 与声明一致。
8. promotion 成功后 append `rb_output_declarations.jsonl`。

非 delegated task 不走 relay provenance/cache trail 检查，只保留现有 receipt 行为。

### D6: content_dedup 只读 declaration ledger

**选择**：`checkContentDedup(bundlePath, options)` 从 `rb_output_declarations.jsonl` 中读取已完成声明，过滤 `output_files[].role === "reference"` 的条目，然后：

- 按声明的 `source_url` 做 normalize-then-compare URL 去重。
- 按声明的 `path` 读取 reference content 做 Key Facts / section extraction。
- 执行 homepage URL 检测、自指语言检测、Jaccard clone 检测。

它 SHALL NOT 扫描 `reference/` 来发现输入文件。磁盘上存在但 ledger 未声明的 reference 不能计入 pass 条件。实现可以在单独的 contamination diagnostic 中扫描 orphan files 并报告/失败，但扫描结果不得被加入 reference 输入集。

`rb_output_declarations.jsonl` missing or empty SHALL fail closed for wave gates. No ledger means no completed Agent output declaration reached the Engine boundary.

### D7: Trace 只有一个当前合同

trace sink SHALL be bundle-root `rb_trace.jsonl` only. No trace JSONL outside the bundle root is part of the current contract.

trace 统一时，必须同步：

- accepted specs 中 runtime audit trace 与 experiment verdict trace 的分离说明，统一为一个 `rb_trace.jsonl` truth。
- `experiments_playbook/README.md` 的 trace 路径和 `RUN_EXPS.md` 名称。
- playbook schema/tests 中所有非 `rb_trace.jsonl` 的 trace path 断言。
- `wff-playbook-utils.mjs` 默认路径/JSDoc。
- `inspect-bundle.mjs --timeline` sink 读取逻辑；timeline MAY still read `_logs/run.log` as process log context, but trace truth comes only from `rb_trace.jsonl`。

如果只改 70+ playbook 文本而不改 accepted specs/tests，后续 apply 会形成“代码新事实 vs spec 旧事实”的冲突。Stage 4 的退出条件是 updated code/spec/docs/tests/playbooks 不再写入、读取、期待或描述任何非 `rb_trace.jsonl` 的 trace JSONL。

### D8: 实验分层

实验位于 `experiments_playbook/exp_engine-boundary/`。401-405 是 fixture-backed / Engine-runtime proof，走真实 Engine CLI 路径（`commitSlotResult()` → `operate-queue complete` → `validate-bundle` / `check-gate-wave0-complete`）；406 是 heavy real-agent proof，要求真实 Sub-agent/WebSearch/WebFetch。

| Case | Weight | 验证内容 | 防哪个 Bug |
|------|--------|---------|-----------|
| 401 | light | 正向全链路：fixture → delegated complete → ledger → validate-bundle → gate → trace | #001 + #002 |
| 402 | light | complete() reject 场景：缺 ref、缺 receipt、缺 output_files、缺 cache file、nonce mismatch | #002 |
| 403 | light | content_dedup gate：fixture SlotResult 经 delegated complete 生成 ledger；URL dup/clone/homepage/self-ref fail；clean pass；missing ledger/orphan fail closed | #001 |
| 404 | standard | Queue 边界：non-delegated 不受影响；controller:"sub-agent" 被拒；delegated 强制 provenance；已有 ledger 不能替代当前 provenance | #002 |
| 405 | light | trace 单 sink：bundle 内只有根 `rb_trace.jsonl` 作为 trace JSONL | trace regression |
| 406 | heavy | 真实 Sub-agent/WebSearch/WebFetch：声明 → delegated complete → ledger → gate | #001 + #002 |

这组实验覆盖从 Relay 声明→complete 执法→ledger→gate 裁决的完整边界，并额外锁住 trace 单 sink。每个实验创建独立 disposable bundle，verdict 来自 `rb_trace.jsonl` + gate JSON；406 的 Reality Distance Ledger 必须明确真实 Agent actor、真实外部调用和真实 cache 写入。

## Implementation Rhythm / Stage Gates

本 change SHALL 按 stage-gated rhythm apply。每一段先建立一个可执法边界，再立刻跑该边界的局部验证；不得把 schema、queue、gate、trace、experiment 全部堆到最后才发现系统性问题。

每个 stage SHALL contain:

- implementation edits：只改该 stage 拥有的合同、代码、模板或文档。
- local regression tests：马上运行该 stage 对应的 unit/integration/schema tests。
- fixture/playbook proof：适用时立即用 light playbook 或 disposable bundle 证明 production path 可走通。
- explicit exit criteria：列明哪些缺失/伪造场景必须 fail、哪些完整链路必须 pass。

Later stages MUST NOT start until the current stage verification passes. 如果当前 stage 的 verification 暴露设计问题，应先回到本 change 的 design/spec/tasks 修正，而不是继续叠加下游实现。

Stage order:

1. **Stage 0: Governance Preflight** - 确认 change 自身、req registry、OpenSpec/governance checks 都站住，再开始实现。
2. **Stage 1: Relay Declaration Contract** - 建立 `AgentOutputDeclarationSchema`、SlotResult Zod/JSON Schema sync、`commitSlotResult()` validation、pure runtime receipt validation，退出条件是 relay result validation 可信。
3. **Stage 2: Delegated Queue Completion + Ledger** - 在 delegated `complete()` 执法 relay provenance、output files、cache leaf，并只在成功后 append `rb_output_declarations.jsonl`；同时更新 queue/phase template guardrails，退出条件是所有 missing-provenance cases fail、完整链路 pass。
4. **Stage 3: Ledger-Driven `content_dedup` Gate** - 让 gate 只读取 ledger，fail closed missing/empty ledger，并把 orphan reference 降为 contamination/reporting surface，退出条件是 orphan reference 不能帮助 pass、clean declared references 能 pass。
5. **Stage 4: Trace Unification + Documentation Sync** - 统一 queue/relay/playbook verdict trace 到 `rb_trace.jsonl`，同步 accepted specs、playbook schema/tests、README/RUN_EXPS、shared docs 和 bundle log template，退出条件是 updated path 不再写入、读取、期待或描述任何非 `rb_trace.jsonl` 的 trace JSONL。
6. **Stage 5: Full Integration Experiments** - 跑既有 Engine/runtime experiments 和 regression，用来验证前四段合成后没有跨层破裂。
7. **Stage 6: Spec/Experiment Tightening Addendum** - planning-only correction stage；统一 proposal/design/specs 到 `exp_engine-boundary` case-401~406，并建立 trace/verdict current contract cleanup requirements。Stage 6 完成 review 前不得进入新的实现清理。
8. **Stage 7: Implementation Cleanup + Experiment Completion** - 只按 Stage 6 批准的窄文件范围清理实现面、补 case-405/406、同步 RUN_EXPS，并运行静态检查、playbook validation、full regression 和 case execution。

## Risks / Trade-offs

- **[R1] actor string 不是身份**：放弃 claim actor 执法后，Bug #002 必须由 `complete()` 的 relay provenance 拦截。若 Phase Agent 自己搜索并伪造普通 files，没有 committed slot result/runtime receipt/declaration ledger，则 delegated `complete()` reject。
- **[R2] ledger 可能与 slot result 双写漂移**：缓解方式是只允许 `complete()` 从已校验 slot result 生成 ledger；Agent 和 playbook 不直接写 production ledger。
- **[R3] orphan reference 的处理策略需要明确**：gate pass 输入必须只来自 ledger；orphan 可以 report 或 fail as contamination，但不能帮助 pass。
- **[R4] content_dedup 阈值可能误报/漏报**：阈值留在 gate definition 中；case-403 覆盖 URL duplicate、clone、homepage、自指、正常放行。
- **[R5] trace 统一影响 accepted specs/tests**：必须把 accepted specs、playbook schema/tests、README/RUN_EXPS 一并纳入任务，不然会留下规范冲突。
- **[R6] SlotResult Zod 和 generated JSON Schema 双维护**：新增 schema sync 测试，确保 `output_files[]` 和 `cache_trails[]` 在两边 required/validated 一致。

## Open Questions

1. contamination diagnostic 默认是 warn 还是 fail？最低要求是 orphan reference 不参与 pass 条件；本 change 建议 gate definition 可配置 strict orphan fail。
2. `meta.json` 是否只检查存在，还是校验字段 schema？当前范围只做存在性检查；语义真实性和字段完整度留给后续 change。
3. ledger record 是否需要 task attempt id 或 declaration id？当前最小可用字段是 `work_id + slot_result_ref + declared_at`；实现时可加稳定 id 方便幂等。
