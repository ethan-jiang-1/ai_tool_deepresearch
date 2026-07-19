## Context

Accepted `RRM-007` 已定义 current-round per-row/per-finding seed projection 验证，但当前实现只完成 `RRM-006` 的 per-wave token filter。`inspectSeedTopicReturnMaps()` 在 token 不存在时把整个 seed Markdown 交给 `validateReturnMapContent()`；五字段、concrete refs 和 Wave1/Wave2 refs 因而按全文件聚合。一个完整 Wave0 entry 可以让 Wave1 的 prose-only section 被误判为合格。

Current-round submitted authority 已有两个相关 surface：

- `inspectWorkUnits()` 校验 index、ledger、manifest、result、receipt、output/cache binding；
- `collectEligibleRows()` 按 phase 与 profile `rerun_count` 过滤 submitted index records，供 `operate-work-unit inspect --eligible-rows` 使用。

但 `collectEligibleRows()` 当前把 profile/index 解析失败降为 warning + empty rows，且 topic filter 只读 manifest slug，没有返回 canonical UID/current-or-previous layout binding。若 return-map checker 直接复制读取逻辑，会产生第二套 round/topic authority；若直接把 warning 当 empty rows，则会 fail open。

Wave2 finding parent 已由 `wave-depth-contracts.mjs` 的 finding-index reader/evaluator解析。Seed projection 是 Agent-readable navigation projection；submitted work-unit authority 与 finding-index 才是 direct Source of Record。

本 design 已 paired-read `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`。结论是：复用现有 inspect/check 入口、收敛 authority reader、短路 prerequisite、给一个 seed section 修复坐标；不新增 CLI、状态、自动修复或用户动作。

## Goals / Non-Goals

**Goals:**

- 完整落实 `RRM-007` 的 section-scoped current-round row/finding projection contract。
- 一个 wave/section 的合法字段不得满足另一个 wave/section 的 shape 或 ref requirement。
- Wave0/Wave1 current-round rows 使用同一个 fail-closed eligible-row authority interpretation。
- Wave2 current/legacy findings 复用现有 finding-index parse/contract，保持 blocking/advisory compatibility。
- Inspect 返回最早 direct root、exact seed/section/work-or-finding id、一个合法 Agent 修复动作和 same-check rerun。
- 保持 inspect no-write/non-routing；不改变 evidence authority、workflow routing 或 runtime schema。

**Non-Goals:**

- 不修 BUG-093/094 的 shared template、header UX 或 rerun direction shape。
- 不重命名 seed sections，不迁移历史 bundle。
- 不重新注入 backfill token，不增加 token family。
- 不创建通用 Markdown/output linter、template engine、repair controller 或新 gate family。
- 不让 Engine 生成/改写 return-map semantic content。
- 不改变 work-unit claim/submit、queue、status、trace、receipt 或 finding-index schema。

## Decisions

### Decision 1: 一个集中 target-section map，shape validation 按 section 独立执行

在 `return-map.mjs` 集中定义 wave 到 accepted section 的映射。Section extractor 接受 harmless heading whitespace 和现有 base heading 的 presentation suffix，但不接受任意别名或新 header family。每个 section 以命中的 H2 到下一个 H2 为边界。

处理顺序：

1. 读取 seed file；
2. 运行既有 target-wave token filter；
3. 提取当前 wave 的 required sections；
4. 对每个 section 独立运行现有 `validateReturnMapContent()`；
5. 对这些 sections 的 parsed entries/refs union 运行 per-row/per-finding check。

Wave1 mechanism、trend 和 pending-question sections 各自做 shape validation，避免它们互相掩盖；一条 submitted row 只需在 Wave1 target-section union 中被引用/处置一次，不要求复制到每个 section。Wave2 同理使用 current-judgment 与 accepted pending-question projection union。

缺失或重复 target header 是 prerequisite root。依赖该 section 的 missing-field/ref/row symptoms 被 mask，不从全文件寻找替代内容。

**Alternatives considered:**

- 继续全文件 validator，再额外 grep work_id：仍允许跨 section masking，拒绝。
- 为每个 wave 写独立 parser：产生三套相似 truth path，拒绝。
- 立即重命名 header 为 Wave0/Wave1/Wave2：属于 Change B/兼容性范围，拒绝。

### Decision 2: 收敛 `collectEligibleRows()` 为 fail-closed shared authority result

在现有 work-unit inspect owner 内提取/增强一个纯 helper（最终函数名由 apply 决定），返回：

```text
{
  passed,
  rows: [{ work_id, rerun_count, kind, result_path, topic_uid, topic_slug, accepted_slugs }],
  root_findings,
  warnings
}
```

该 helper：

- 先复用 `inspectWorkUnits(..., emitDiagnostics:false, requireExistingAuthority:true)` 或等价共享 pure integrity result；
- profile/index/ledger/manifest authority 不可读时 `passed:false`，不把它投影为空 rows；
- 按既有 Engine-owned index `rerun_count == profile.rerun_count` 过滤；
- 通过 canonical topic layout resolver 把 UID、current slug 和 previous slugs 绑定到同一个 current topic；
- legacy row 保持既有 excluded + warning 语义；
- 一次加载后按 topic 分组，避免每个 seed 重读整个 work-unit tree。

`operate-work-unit inspect --eligible-rows` 改为消费同一 result；return-map checker 也消费同一 result。这样新增的是一个共享 interpretation，不是第二 validator。

**Alternatives considered:**

- 在 `return-map.mjs` 读取 `_index.json`/ledger/manifest：重复 authority logic，拒绝。
- 直接调用当前 `collectEligibleRows()` 并忽略 warnings：authority parse failure 会 false pass，拒绝。
- 让 Agent 先运行 CLI、再把 JSON 传给 inspect：跨 tool-call projection 不是 direct authority，拒绝。

### Decision 3: Per-row coverage 使用目标 sections 的 parsed refs/entry identity union

对 Wave0/Wave1，每个 current-round row 的 canonical topic binding 决定目标 seed。Checker 只在对应 wave target-section parsed entries 中寻找：

- `work_id` 出现在 `refs` 或 accepted explicit entry identity；或
- 同一 `work_id` 有合法 no-projection disposition。

No-projection disposition 复用 accepted predicate：defers/deferred、limitation reason、以及 work-id traceability 或 empty/none refs。普通 prose 中出现 work_id 不算 projection。

每个遗漏 row 产生一个 stable finding instance，但 primary feedback 按 seed/section 聚合为最小可执行 root set；不会把同一个 row 扩张成 field/ref/coverage 三个独立修复任务。

**Alternatives considered:**

- At-least-one row coverage：多 row 只投影一条仍可过，拒绝。
- 要求每个 row 出现在每个 Wave1 section：制造重复内容，拒绝。
- 自动从 result 写 seed：Engine 越过 Agent semantic ownership，拒绝。

### Decision 4: Wave2 复用 finding-index parent parse 和 current/legacy classification

将现有 finding-index reader 的 parse result 作为共享 direct parent；必要时只导出纯 reader/result，不复制 YAML parsing。

- `created_in_rerun_count == profile`：current，缺 projection 是 blocking。
- marker 缺失或小于 profile：legacy，缺 projection 是 advisory。
- pure synthesis finding 与 targeted finding 都进入 projection scope；targeted backing 继续由现有 Wave2 evaluator裁决，return-map checker 不复制 backing validator。
- finding-index parent/shape 失败时，return-map per-finding symptoms mask，existing finding-index root 保持唯一最近动作。

### Decision 5: 复用现有 finding projection 与 CLI aggregate contract

Section/row/finding issues 使用 `makeContractFinding()` / `returnMapFinding()` 的现有结构，并由 `projectInspectContract()` 聚合。新增/稳定的 rule ids 应区分：

- target section missing/ambiguous；
- target section shape/ref failure（继续复用现有 return-map rule ids）；
- current-row projection omission；
- current finding omission；
- legacy finding advisory。

Blocking root 必须包含 `repair_kind: agent_action`、section-qualified `missing_fact`、seed file `write_to` 和当前 inspect CLI exact rerun。Inspect 不写 trace/status/cache；formal gate 若消费相同 shared evaluator，只增加其既有 lifecycle side effects。

### Decision 6: Strict authority, tolerant presentation

Blocking 保护的是 accepted section availability、machine-parseable entry fields、concrete navigation、round/provenance binding，不保护 bullet、bold、空行等 presentation preference。现有 balanced-bold 与 harmless heading tolerance 保持。Canonical field misspelling、缺 target section、跨 section substitution 和 unbound current row 仍 blocking。

### Decision 7: Verification 只证明 deterministic contract

选择 `unit`、`integration`、`deterministic_e2e`：

- unit 证明 section boundary、独立 shape validation、disposition 和 prerequisite masking；
- integration 证明真实 inspect CLI 的 pass/fail/classification/repair coordinate；
- deterministic e2e 证明 production rerun chain 中 current-round submitted authority 不能被 prior/other-section projection替代。

不选择 `agent_flow_e2e`，因为 change 不声称 Agent 会更聪明或改变 Markdown flow；proof subject 全是 deterministic contract。

### Apply Target Manifest

| Surface | Add / modify | Remove / avoid |
|---|---|---|
| `DPT_FRAMEWORK/engine/helpers/return-map.mjs` | target-section map/extractor、section-local validation、per-row/per-finding findings | 删除 whole-seed validation path；避免 wave-specific duplicate parsers |
| `DPT_FRAMEWORK/engine/work-unit-inspect.mjs` | fail-closed shared eligible-row authority result、canonical topic binding | 删除 warning-as-empty ambiguity；避免 return-map 自读 index/ledger |
| `DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs` | 仅在需要时导出 existing pure finding-index parse result | 避免第二 YAML/finding parser与第二 backing validator |
| `DPT_FRAMEWORK/cli/operate-work-unit.mjs` | 消费 shared eligible-row result，保持 CLI shape/exit semantics | 避免 CLI 与 checker 不同 round filter |
| `DPT_FRAMEWORK/cli/inspect-wave{0,1,2}-output.mjs` | 最小 context wiring（如 shared result） | 不新增 CLI 或 routing |
| focused tests | section isolation、rows/findings、root-first、CLI/e2e proof | 删除/改写声称 RRM-007 已覆盖但只测 eligible-row query 的弱断言 |
| release docs | `v0.35` CHANGELOG/RUN banner | 不改 runtime bundle data |

## Risks / Trade-offs

- **[Existing bundles have missing or presentation-variant sections]** -> 保留 harmless suffix/spacing tolerance；只有无法唯一定位 accepted semantic section 才 blocking，不自动迁移。
- **[Authority loading becomes expensive]** -> 每个 inspect invocation 只加载/验证一次，按 topic 分组传入 seed loop；不按 file 重跑 full work-unit inspect。
- **[Circular imports between return-map and work-unit helpers]** -> shared authority helper 保持在 Engine owner 且不依赖 return-map；若现有 module graph阻止直接 import，提取一个窄 pure helper module而不是复制逻辑。
- **[Wave1 target-section requirements over-block legitimate pending-question formatting]** -> section shape tests使用 accepted phase output和既有 field parser；presentation differences保持 tolerant，语义内容不裁决。
- **[Multiple missing rows create noisy feedback]** -> stable instance findings保留审计细节，primary inspect按 seed/section聚合并给一个修复动作。
- **[Wave2 parent and projection findings cascade]** -> finding-index parse/shape root优先，per-finding projection checks mask。
- **[Historical RRM-007 claims are over-trusted]** -> apply evidence必须逐 scenario列出真实 test command/result，不引用旧 checkbox或 CHANGELOG作为 proof。

## Migration Plan

1. Apply 前运行 verification routing plan check，并先提交能复现 cross-section false pass 的 failing tests。
2. 实现 shared authority result 和 target-section parser/checker。
3. 运行 unit、integration、deterministic e2e 与适用 regression。
4. Bump `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 到 `v0.35`。
5. 不修改现有 runtime bundles；它们在下次 inspect 时按新 checker读取，合法 presentation继续兼容。
6. Rollback 为回退 framework code/release docs；没有 schema/data migration需要反向处理。

## Open Questions

无需要用户决定的开放语义。Apply 时的模块拆分函数名和 exact rule id 可由现有 import graph/test conventions决定，但不得改变上述唯一 authority、classification 和 repair边界。
