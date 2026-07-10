## Context

Wave0/Wave1/Wave2 当前各有一套 formal gate CLI 和一套独立 inspect CLI。两套实现读取相近的 artifact、ledger、reference 和 provenance surface，却分别维护规则与诊断，已经出现三类问题：同一事实判断漂移、前置结构缺失引发大量派生失败、纯 Markdown 表现差异被提升为 blocking。

更隐蔽的问题是 delegated-bypass helper 名义上是 detector，实际会写 `rb_trace.jsonl` 和 `_logs/run.log`；三个 formal gate 又在 rule loop 后重复调用 detector，因此同一诊断可能写两次。若 inspect 直接复用现有 helper，就不可能真正 side-effect-free。

本 change 遵守 `guidelines/simple-reliable-control.md`：质量控制路径保持为 `直接事实 -> 一个 checker -> 最小根因 -> 一个修复动作`。它只做局部收敛，不把现有 gate framework 重写成新的通用 controller。

## Goals / Non-Goals

**Goals:**

- 让每个 Wave 的 inspect 与 formal gate 复用同一份纯 artifact/provenance evaluator。
- 保留 authority、submitted provenance、required semantic structure、consumer navigation contract 和显式 profile floor 的 blocking 强度。
- 对无害 Markdown 表现差异使用宽容解析或 advisory。
- 用局部 prerequisite guard 抑制不可行动的派生失败。
- 保留 formal gate lifecycle、degraded 和 durability 行为，同时保证 inspect 全 bundle 零写入。
- 让 Phase Agent 在 formal gate 前获得自足、bundle-relative、machine-readable 的修复信息。

**Non-Goals:**

- 不建立通用 artifact controller、规则生成器、dependency graph、root-cause inference engine 或 schema-to-doc generator。
- 不给 formal gate CLI 增加 `--inspect`/dry-run 分支，也不让 inspect 调 formal gate wrapper。
- 不把 research quality、novelty 价值或证据语义判断移入 JavaScript。
- 不允许 inspect 写 gate attempt、trace、log、checkpoint、status、routing/handoff witness 或任何 durable diagnostic。
- 不借本 change 重写全部 gate framework、统一所有非 Wave gate，或扩大新的 formal blocker。

## Decisions

### 1. 三层边界：共享 evaluator、formal wrapper、inspect wrapper

每个 Wave 保留一个显式纯 evaluator。调用关系固定为：

```text
formal gate wrapper ─┐
                     ├──> pure per-wave artifact/provenance evaluator
inspect-wave CLI ────┘
```

三层职责：

| Layer | Owns | Does not own |
|---|---|---|
| Pure evaluator | bundle artifact、submitted ledger/provenance、reference/backing、required structured fields、profile floors、纯读取 diagnostics | routing、degraded、attempt、trace/log/checkpoint/status 写入 |
| Formal gate wrapper | CLI/config、node binding、handoff preflight、`trace_event_*`、routing、fatigue/degraded eligibility、gate-attempt durability、checkpoint 与 formal diagnostic emission | 第二份 artifact/provenance 判断 |
| Inspect wrapper | 调 evaluator、保留现有 inspect-only checks、投影 `{ check, inspect, advice }` 与 exit code | routing、degraded pass、formal lifecycle、durable writes |

Inspect-only 的 presentation/maintenance convention 默认 advisory；若 accepted spec 已明确它是当前 inspect command 的 blocking contract（例如 evidence-bearing return-map concrete-reference navigation），则保留现有 blocking 分类，但不得伪装成 formal gate rule。这个例外不用于新增 blocker。

选择三个显式 evaluator，而不是一个高度参数化的规则引擎，是为了让 Wave 差异可见、失败位置容易定位。formal wrapper 与 inspect 都不得再维护同一 formal rule 的独立实现。

### 2. 小型 evaluator result 与兼容 projection

Evaluator 返回一个小而显式的内存结果，最少包含：

```text
passed
checks_run
failed_rule_ids
masked_rule_ids
findings[] = {
  rule_id,
  classification,   // blocking | advisory | diagnostic-only
  surface,
  expected,
  repair,
  detail
}
optional bypass_suspicion
```

约束：

- `failed_rule_ids` 只包含实际评估后失败、会影响该 shared contract result 的 blocking rule；topic/finding scope 可附在 id 上，但 formal 与 inspect 必须一致。
- `masked_rule_ids` 记录因明确 prerequisite 失败而未评估的依赖规则；masked rule 不制造新的 primary failure。
- 每个独立根因最多一个 primary finding 和一个 nearest repair；detail 可包含审计信息，但不建立第二套状态库。
- `checks_run` 只计实际执行的 direct checks；masked checks 不伪装成已执行失败。

Inspect 保留现有输出：

```text
check.passed
check.wave
check.checks_run
check.checks_failed
check.return_map_classification
inspect[]
advice[]
```

并 additive 增加：

```text
check.failed_rule_ids
check.finding_classification = {
  blocking: [...ids],
  advisory: [...ids],
  diagnostic_only: [...ids]
}
```

`checks_failed` 与 `check.passed` 只由当前命令的 blocking findings 决定；advisory/diagnostic-only 不得使命令失败。`return_map_classification` 保持现有含义。Formal Wave0/Wave1/Wave2 gate 结果都 SHALL 暴露 `check.failed_rule_ids` 与 `check.masked_rule_ids`；Wave2 当前缺失这两个字段，需要补齐。

Inspect 输出永远是 raw evaluator/inspect result。即使同一 bundle 在 formal gate 因 fatigue 获得 degraded handoff，inspect 仍保持 `check.passed: false`，不输出 degraded routing 或 witness。

### 3. prerequisite 用局部 guard，不用依赖图

依赖关系只写在直接消费 parent structure 的 checker 附近：

- Wave0：某 topic 的 `source.yaml` 缺失、不可解析或 schema invalid 时，不再为同一 topic运行/报告 entry count floor；将 count rule 记入 `masked_rule_ids`。
- Wave1：`depth-review.yaml` 缺失或不可解析时只报告 parent；缺少 `source_claims` 时不运行 cache mapping/novelty，缺少 `new_source_floor` 时不运行 floor comparison，缺少 `decision` 时不运行 decision implications。其他独立字段仍可检查。
- Wave2：`finding-index.yaml` 缺失、不可解析或不是 object 时只报告 parent；`findings` 不是 array 时不运行 per-finding 与 derived count checks；单个 finding 缺字段时只屏蔽依赖该字段的 enum/eligibility/handoff/backing implication，其他独立字段继续检查。

不建立通用 dependency graph、递归 suppression engine 或自动 root-cause inference。实现使用短的 guard clause 和显式 masked id。

### 4. delegated-bypass 扫描纯化，formal 只写一次

现有 `detectDelegatedBypassSuspicion()` 同时扫描与写 trace/log，必须拆成：

```text
scanDelegatedBypassSuspicion(bundle, phase) -> pure result
emitDelegatedBypassDiagnostic(bundle, gate, result) -> formal-only side effect
```

Pure evaluator 只调用 scanner，并把 raw suspicion 放进结果。Formal wrapper 使用同一结果决定 rule pass/fail；若 suspected，再通过 emitter 写一次 durable trace/log。Inspect 只读取结果，不 import/call emitter。

三个 formal gate 当前 rule loop 内调用 `checkDelegatedBypassSuspected()`，loop 后又调用 detector；实现 SHALL 删除 post-loop 重复扫描/输出，保证每次 formal invocation 最多一次 bypass durable emission。Emitter 属于 formal diagnostic 路径；它不得改变 inspect raw verdict，本 change 也不新增 emitter-failure blocker。

### 5. exact rule treatment

本 change 不新增 formal blocker。按当前 gate definition 逐项处理：

**Wave0**

- Shared blocking：`reference/`、`_INDEX.md`、`README.md` existence，shared ref count floor，placeholder URL，per-topic `source.yaml` existence/schema/count，cache coverage，submitted ledger/output/submission presence，delegated-bypass provenance。
- Inspect-only advisory：flat-directory maintenance、`00-shared-*` naming、非 formal-required metadata/section presentation、`_INDEX.md` ideal columns/data-row presentation、README non-empty preference。
- Existing return-map consumer-navigation checks 保持 accepted classification；它们不是 formal gate rule，不进入 formal degraded eligibility。

**Wave1**

- Shared blocking：per-topic artifacts/references、depth-review authority、reference parseable `source_url`、required semantic sections、index/backing/provenance、submitted output/cache checks、explicit new-source/ref/key-facts floors、backfill tokens、delegated-bypass provenance。
- `question_list_has_four_sections` 改为 semantic heading availability parser：保留四个必要语义区块，不因等价 heading whitespace/case/list-marker 或单纯排列样式失败。
- `source_url_present` 接受 Markdown link 或可解析 bare `http(s)` URL；submitted source/backing 与 URL parseability 仍 blocking。
- `key_findings_non_empty` 接受 Key Findings 区块中的常见 bullet、numbered 或非空段落，不再要求特定 `**`/数字 regex。
- `key_facts_min_lines` 是 accepted explicit floor，继续 blocking；只放宽等价 list marker/spacing，不把 floor 降为 presentation advice。

**Wave2**

- Shared blocking：triple artifacts、finding-index contract、six semantic ledger sections、synthesis/finding/backfill/cross-artifact requirements、reference index/backing、targeted-evidence/submitted provenance、delegated-bypass provenance。
- Ledger parser 对 heading marker、空白和等价大小写宽容，但不放弃六个 semantic sections。
- `reference/00_shared/`、不影响 authority 的 `00-cross` metadata/standard-section presentation 保留可见诊断但降为 advisory；`source_url`、backing refs、index/provenance 等直接 authority 仍 blocking。
- Finding parent/field guard 必须保证缺少 `hitl2_handoff` 时 primary feedback 只给该字段修复，不重复制造 handoff/eligibility/synthesis/backing 症状。

### 6. producer guidance 只教 canonical shape 与同一 inspect

Wave phase/shared Markdown 更新 canonical role、path、ref、field 和 enum 漂移，并在 phase-owned artifact 物化后、completion evidence 与 formal gate 前调用对应 inspect。文档只说明 producer contract 和运行时机；精确失败信息由 evaluator 输出，不复制 validator 代码。

Wave1 guidance 明确 `evidence_summary`、`question_list`、`reviewed_work_unit_refs[]` 与 novelty/backing 来源。Wave2 guidance 通过一个 canonical surface 暴露完整 finding field/enums，并区分 existing-backed projection 与 newly fetched targeted evidence。修复路径固定为：修 inspect 指向的 surface，重跑同一个 inspect，再进入 formal gate。

### 7. verification 使用直接兼容锁与全 bundle no-write snapshot

重构前先锁定 representative fixtures 上现有 formal authority/provenance/floor 结果、degraded eligibility、inspect exit code 和 summary field presence。只允许 design 已列出的 intentional behavior change。

Inspect purity 使用两类 guard：

1. 运行前后递归快照整个 bundle 的文件路径与内容 hash，必须完全一致；显式覆盖 `rb_status.json`、`rb_trace.jsonl`、`_logs/run.log`、`_checkpoints/`、gate-attempt diagnostics/cache、routing/handoff witness 与任何 durable diagnostic 文件。
2. Static/focused test 证明 inspect wrapper/evaluator 不 import 或调用 gate durability helper、bypass emitter、status mutation 或 routing writer。

同一未修改 bundle 的 agreement test 只比较 shared artifact/provenance rule ids；formal gate 可以额外失败于 handoff、routing、trace-event 或 durability。测试不得把 deterministic fixture 结果夸大为真实 Agent behavior，因此本 change 不要求 controlled Agent experiment。

## Risks / Trade-offs

- [Risk] 抽取 evaluator 时改变既有 formal gate authority/provenance pass/fail → 先写 baseline tests，再逐 Wave 迁移；未在 exact rule treatment 中列出的差异视为 regression。
- [Risk] inspect 与 formal gate 因 lifecycle-only checks 看起来不同 → 输出和 tests 只要求 shared rule ids 一致，并明确 formal-only rule partition。
- [Risk] 过度短路隐藏多个独立问题 → 只屏蔽确实依赖失败 parent/field 的 rule；无依赖 root cause 继续并列。
- [Risk] Additive fields 被后续 continuation cue 当成新 verdict → 后续 Change 只能读取，不能覆盖 `check.passed`、routing 或 degraded authority。
- [Trade-off] 三个 evaluator 有少量重复 → 接受可见重复，避免通用规则框架把简单判断变成长链路。

## Migration Plan

1. 锁定现有 formal direct authority/provenance/floor、degraded 与 inspect output compatibility。
2. 先纯化 bypass scanner/emitter，再定义 finding/result projection。
3. 按 Wave0、Wave1、Wave2 抽取 evaluator，并先让 formal wrapper 使用。
4. 将三个 inspect CLI 改为调用 evaluator，保留 inspect-only contract 与全 bundle no-write。
5. 删除 duplicate bypass scan，更新 phase/shared guidance、gate-rule audit、CHANGELOG 和 `DPT_FRAMEWORK/RUN.md`，版本提升到 `v0.17`。

回滚时可逐 Wave 恢复原 gate/inspect evaluation path；不涉及 bundle schema migration或持久状态迁移。Pure scanner/emitter split 可独立保留，因为它修复的是现有重复副作用。

## Open Questions

无。Apply 阶段按本 design 的 rule partition 与 intentional-change 清单执行；若发现新的 formal blocker 或 authority 迁移需求，应返回 Explore/Proposal，而不是在实现中顺手扩 scope。
