## Why

真实 run 暴露出一个 fail-late 缺口：多个并发 `wave0_source_intake` work unit 可以被分配到同一 canonical `source.yaml`，各自提交时却只能声明当时的完整数组快照，最终形成无法证明 ordinal ownership 的非单调 submitted contribution 链并永久阻塞 Wave0。原始问题见 `_backlog/bugs/BUG-237-multiple-concurrent-wave0-intake-units-break-monotonic-source-projection.md`。

当前 accepted contract 已将同一 target 的 Wave0 source contribution 定义为 ledger-ordered、严格递增的单 writer 前缀链；本 change 不把 cache trails、URL 集合或 mutable current file 猜测提升为历史归属 authority，而是在不可恢复提交发生前，明确并强制同一 canonical Wave0 source target 的非终态排他性。

## What Changes

- 将 Wave0 的 `eligible_independent_demand` 收紧为 assignment-resolved direct output target 互不冲突的 demand；不同 Topic/target 仍可按现有 profile cap 并发。
- 扩展现有 shared delegated queue-demand admission，使其从 canonical Topic binding 和 assignment contract 得出 Wave0 `source_yaml` target，并对 queue、delegated in-flight 与 planned claim batch 中的同 target 非终态冲突给出一个直接、结构化、无副作用的拒绝结果。
- 让 enqueue/check/claim 复用同一 target-conflict evaluator；enqueue 拒绝新增冲突 card，check 报告已持久化的冲突，claim 在任何 work ID、batch counter、queue/index/envelope mutation 前原子拒绝含冲突的 planned batch。
- 更新 Wave0 Phase guidance：一个新 Topic 正常只产生一个 standard source-intake demand；同 Topic 的补充工作只能在前一同-target demand 已 terminal/submitted 后进入现有 append/submit 链，不得把业务维度拆成多个共享 `source.yaml` writer。
- 增加 unit 与 CLI integration 回归，覆盖跨 Topic 可并发、同 target enqueue 拒绝、历史/已持久化冲突的 check/claim fail-closed、字节不变，以及合法串行 supplement 仍形成严格递增 contribution chain。
- 保留现有 `source_contribution { validated_length, semantic_digest }`、ledger append order、projection identity、Gate 和 `submitted_source_contribution_non_monotonic` fail-closed 行为；不增加 fragment merge、URL/cache-trail ownership 推断、scheduler、lock state、recovery command 或 runtime migration。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md` AGQ-022、`source_intake_fan_in` requirement | Modify | 已拥有 delegated batch 的 independent-demand 选择；需明确 Wave0 independence 包含 assignment-resolved target disjointness。 |
| `agent/queue-input-validation` | `openspec/specs/agent/queue-input-validation/spec.md` QIV-001 | Modify | 已拥有 enqueue/check/claim 共用的 delegated admission evaluator，适合加入 current target-conflict fact，而不是建立第二 validator。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` DEW-003 | Modify | 已拥有 claim planned-prefix admission 和 batch atomicity；需规定同-target candidate 在分配前原子拒绝。 |
| `research/research-wave-phase-content` | `openspec/specs/research/research-wave-phase-content/spec.md` RWP-001、batch-poll-submit requirement | Modify | 已拥有新 Topic 一条 standard Wave0 demand 和 Phase drain guidance；需明确同 target 串行、跨 target 才可 fan-out。 |
| `research/research-return-map` | `openspec/specs/research/research-return-map/spec.md` RRM-007 | Verify-only | 已正确规定 ledger-ordered strict-prefix ownership 和 non-monotonic fail-closed；本 change 防止产生非法历史，不重定义投影语义。 |
| `agent/agent-output-declaration` | `openspec/specs/agent/agent-output-declaration/spec.md` AGO-003、AGO-005 | Verify-only | ledger 仍记录 Engine-derived full-prefix `source_contribution`，schema 与 recovery ownership 不变。 |
| `agent/work-unit-provenance-gate` | `openspec/specs/agent/work-unit-provenance-gate/spec.md` | Excluded | Gate 继续消费既有 submitted contribution projection；没有新 Gate、通过条件或恢复能力。 |
| `agent/wave0-concurrent-source-merge` | `openspec/specs/README.md` 与上述 main specs | Excluded | 不引入新 capability；本 change 明确当前单 writer 模型，不设计同-target fragment merge。 |

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent/agentic-queue`: Wave0 bounded batch 中的 independent demand 必须解析到互不相同的 canonical direct output target。
- `agent/queue-input-validation`: shared delegated admission 必须在 enqueue/check/claim 边界检测同一 Wave0 source target 的非终态冲突并返回单一直接反馈。
- `agent/delegated-work-units`: claim 必须在 mutation 前对 planned batch 与 existing in-flight 的 target exclusivity 做原子校验。
- `research/research-wave-phase-content`: Wave0 guidance 必须把并发限定在不同 source targets，并将同 Topic supplement 排在前一同-target attempt terminal/submitted 之后。

## Responsibility And Control Boundary

- **Direct Source of Record**：未 claim 的 `wave0_source_intake` demand 由 current canonical Topic binding 加上 assignment resolver 决定 exact `source_yaml` target；已 claim attempt 则由 current-profile-valid index/in-flight binding 与 claim 时写定的 manifest output contract 决定 immutable target。schema-valid `rb_queue.json` 和 work-unit index/manifest facts 决定哪些 demand/attempt 当前非终态。Phase prose、queue ID 和 task action 不能另行声明 target identity。
- **最短合法闭环**：Agent 准备 queue card -> existing shared admission 解析 exact target 并接受或拒绝 -> Engine claim 在锁内对 fresh current facts 重检 -> 不同 target 正常并发；同 target 等待已有 demand terminal/submitted 后再 enqueue/claim。无需等到 submit 后由 projection 发现不可恢复历史。
- **Net simplification**：把一个 Gate 末端 `missing_contract` 事故前移为既有 admission path 的单一 conflict fact；避免 fragment schema、merge transaction、per-source ownership ledger、target lock state、恢复命令和 reader-side归属推断。
- **责任分配**：用户仅决定研究目标和是否需要补充研究；Agent 负责形成合法的单 writer demand、等待或串行补充并重跑现有 checkpoint；Engine 负责 exact target resolution、conflict verdict、batch atomicity 和 submit/projection truth。`human-directed` 不创造并发写权限。

## Semantic-Precision Reflection

本 change 不新增持久 state、projection 或 status。它实质收紧既有 “independent Wave0 demand” 概念，回答 Phase Agent 与 Engine 的有界问题：“这些 planned demand 是否可同时拥有互不冲突的 exact direct-output targets？”必须保留 demand identity、Topic identity、assignment target、queue lifecycle 与 submitted contribution ownership 的区别；推理在返回 one conflict/no-conflict verdict 后停止，不判断研究维度是否语义独立，也不推断 source entry ownership。

## Impact

- 预期实现面：shared queue-demand admission/current-facts adapter、work-unit claim planned-prefix validation、Wave0 Phase/shared batch guidance；`work-unit-projection.mjs` 只需回归验证，不应为本修复改变 ownership 算法。
- 预期测试面：`tests/engine/helpers/queue-demand-admission.test.mjs`、`tests/integration/cli/operate-queue-demand-admission.test.mjs`、`tests/engine/work-unit-claim.test.mjs`、`tests/engine/work-unit-projection.test.mjs`，必要时补充一个现有 CLI integration 文件内的串行 supplement case。
- 兼容性：已形成的非单调 ledger 历史仍诚实返回 `missing_contract`，本 change 不追认或迁移它；合法历史、单行 legacy compatibility 与不同 target 并发保持不变。
- 依赖与运行时：不新增 npm dependency、CLI command、profile field、persistent lock/state 或 Agent-flow experiment。
