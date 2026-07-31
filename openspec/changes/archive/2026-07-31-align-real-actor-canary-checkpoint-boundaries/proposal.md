## Why

2026-07-31 的重复真实 Actor 观察表明，case-406、case-604 与 case-221 把两个不同问题放进同一个 native verdict：Subject Actor 是否在其 work-unit 边界完成了授权工作，以及 bundle 是否已经具备由 Phase Agent 语义产出的 canonical projection、因而可以通过 Wave Gate。前者已有真实提交/receipt/output 证据，后者在仅作 actor canary 的 fixture setup 中可以诚实地不成立；把后者拉入 canary 的 required checks 会把正确的 actor handoff 误报为 DPT handoff 失败，并诱导错误的 controller 或 fixture 造数修复。

原始收敛要求来自 `_backlog/plans/framework-contract-remediation-openspec-sequence.md` 的 BUG-170 observation gate 与计划完成定义。本 change 只校正该观察合同，不把一次 host timeout、Phase Gate 失败或静态 prompt 解释为新的 Agent Flow 控制缺陷。

## What Changes

- 将真实 Subject Actor canary 的 native verdict 限定到它声明的 work-unit checkpoint：生成任务/身份绑定、Subject-owned durable result/receipt/output/cache、正式 submit、ledger/trace 与适用的 work-unit inspect。
- 让 case-406、case-604 和 case-221 在 actor checkpoint 完成后停止；同一 shared helper 的 containment consumer case-605 同步停止其未声明的 Wave0 Gate side effect。Phase-owned canonical projection 或 Wave Gate 仅由真正 Phase-ready 的 Wave playbook 证明，不能成为 setup-only actor canary 的隐含 PASS 前提。
- 删除 fixture helper 对真实 actor canary 的无条件 Wave Gate 调用；它不再为了使 Gate 通过而写入或拼装语义 projection。既有 Gate CLI、Phase Agent 和 Phase-ready Wave tests 仍分别拥有 Gate verdict 与 semantic artifact 责任。
- 为三条 canary path 增加 focused regression，证明真实 actor checkpoint 可与未建立的 Phase projection 区分，且未要求的 Phase Gate 不能改变 native actor verdict 或 health 的解释边界。

明确不包含：新的 controller、scheduler、retry/recovery tree、physical writer authentication、新 runtime state、Gate 放宽、Phase projection 生成器、对真实 Agent 行为的 fixture 替代，或 BUG-175/184 的质量政策变更。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent-testing`: 收紧真实 Sub-agent playbook family 的 claim-to-checkpoint 对齐，防止 actor-boundary canary 把尚未由 Phase Agent 建立的 Gate 条件作为自身 verdict 前提。
- `experiment-ref-integrity`: 将 case-406 的 real Sub-agent boundary 证明限定为 work-unit submit/provenance checkpoint，而不是 Wave0 canonical projection/Gate 成功。
- `research-wave-experiments`: 将 case-221 的 real Wave1 actor batch canary 与 Phase-ready Wave1 Gate proof 分离；真正 Wave Gate coverage 保持在具备其完整 Phase-owned inputs 的 playbook。

不新增 requirement ID；上述均为既有 AGT-003、EXR-006 与 RWE-002 语义的收敛。

## Boundary And Impact

**Semantic precision.** 该 change 面向实验审阅者的有界问题是："这个真实 Actor 是否完成了它被授予的 work-unit checkpoint？" 答案必须保留 Actor-owned durable bytes/submit 与 Phase-owned canonical projection/Gate readiness 的差别；前者成立而后者未知或不成立时，结论是 actor canary PASS、Phase readiness unknown，而不是虚假的 handoff FAIL。审阅者可在 native completion、submitted ledger、receipt、exact Subject evidence 与 required-check list 停止推理；它们不能外推为 Phase Gate PASS 或研究质量。

**One truth path and net simplification.** Actor result、receipt、output、submit ledger/index/trace 是 actor canary 的 direct Source of Record；Wave Gate 继续读取自己的 Phase-owned canonical state。实现将删除 helper 的无条件 Gate 调用以及 case-owned Gate required checks，而非增加一个新的 observation state、secondary verdict 或 reconciler。最短合法闭环是：真实 Actor 写入 -> Engine submit/inspect -> actor canary native completion；只有 Phase-ready playbook 才继续到 Wave Gate。

**Responsibility.** Subject/Playbook Agent 保持执行和语义 Phase artifact 的责任；Engine 保持 schema、submit、inspect、Gate 与 native-completion verdict 的确定性裁决。用户无需为此操作提供新的语义或权限决定，且 Engine 不取得选择研究内容、补写 projection 或驱动下一阶段的权限。

**Impact.** 预期修改 `experiments_env/shared/run-fixture-backed-case.mjs`、case-406/case-604/case-605/case-221 现有 playbook、相应 Markdown/helper regression tests，以及上述三个 accepted capability delta specs。`DPT_FRAMEWORK/` 的 production runtime 合同不变，因此不需要版本号、CHANGELOG 或 `RUN.md` banner 更新。
