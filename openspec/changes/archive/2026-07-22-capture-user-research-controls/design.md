## Context

`rb_plan.md` 已经是人和 Agent 可读的 host file；`rb_profile.yaml`、ledger、receipt、Gate 和 lifecycle 仍是结构化直接 authority。现状缺少用户对研究语义的持久输入，且三个 body-sensitive 操作以整个 Markdown 文件为搜索范围：Topic Registry 刷新、Progress 写入、setup-ready 的 required-fill 检查。用户捕获的普通 Markdown 因而可能伪装成这些 template-owned 结构。

setup-ready 还有一个独立的完整性问题：现有 `writeGateAttempt()` 先追加可路由 trace 和 checkpoint，调用者再改 Progress。checkpoint 不能证明最终 host-file bytes；若 checkpoint 写入失败，已有 trace 仍可能被 `enter-phase` 消费。`rb_trace.jsonl` 是 append-only，不能用随后写入的失败事件撤销已暴露的 route。

本设计 paired-read 了 `evolution-simple-reliable-control.md` 与 `evolution-helper-oriented-agent.md`：新语义由用户一次决定，Agent 在既有合法面内完成捕获和研究，Engine 只保护直接、确定性的文件边界与 handoff 事实。

## Goals / Non-Goals

**Goals:**

- 在 HITL1 建立一份可选、一次性、稳定且可读的用户研究控制快照。
- 让相同坐标被 Seed、Wave、Final 与必要时的既有 work-unit task brief 使用，不复制成新 authority。
- 用一个小型 canonical host-section locator 保护 template-owned 更新与 marker 检查。
- 使 setup-ready 的审计、实际 Progress bytes、checkpoint 与可消费 handoff 有单一且可验证的顺序。

**Non-Goals:**

- 不解析、评分或将用户自由文本转换成 schema/profile/Gate truth。
- 不增加 HITL、生命周期节点、控制器、通用 Markdown parser、数据库、同步或 memory。
- 不提供 live local-file/RAG input、复制外部文件、per-role secrecy、队列/manifest/result 新字段或 user-control override。
- 不因严格来源约束降低 provenance、receipt 或现有 evidence floor。

## Decisions

### 1. 一个 host-file 快照是唯一叙事 authority

新模板在 `## Constraints` 的既有五条展示项之后加入固定 `### User Research Controls`。它只表达三种兼容状态：

1. 新 run 无额外控制：固定的明确 no-controls 语句；
2. 新 run 有控制：固定说明行和一个 literal snapshot；
3. 旧 run 没有该 subsection：视为 no-controls，既不迁移也不阻塞。

无额外控制的 template form 固定为 `未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。`。有控制时，Agent 必须先写固定标签 `用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）：`，再把用户直接给出的内容，或用户明确授权在 HITL1 读取的本地文件中与本 run 有关的内容，写成一个 Markdown code fence 内的 literal snapshot。fence 长度由输入中最长的 backtick run 加一确定，因此输入内的任意 backtick run 都不能提前关闭该 region；原文字节保持可见，标题、checkbox 和 marker 不再成为 Markdown structure。实现的 host-section locator 只需识别这个确定的单一区域和 template 的固定 top-level order，不需要通用 Markdown parser。

该捕获并非文件导入协议：不保留外部路径、不递归读取链接、不复制文件、不在后续 phase 重读。不能读取、无法分辨意图，或 material conflict 时，Agent 在既有 HITL1 只问最小澄清；用户作出决定后由 Agent 继续执行合法机械工作。

HITL1 在形成已解决的 user decision 后，先把 exact no-controls 或 supplied-controls form durably 写入 `rb_plan.md`，再生成 canonical topic-state input 并执行现有 `operate-topic-state apply`。Topic-state 的 existing staged replacement 从这份当前 plan bytes 计算，并在后续 registry/seed mutation 中保留 controls snapshot。若 apply 返回 workspace/recovery 或失败，snapshot 已是 active host-file 的 durable narrative input；Agent 恢复既有 operation，不重新从聊天或外部路径重建控制。该顺序不是跨文件 transaction，也不让 controls 变成 topic-state schema input。

替代方案是把 brief 写到 `rb_profile.yaml`、新 `.md` 文件或 per-work-unit manifest。它们分别把语义文本伪装为 machine state、制造第二 authority，或扩大复制和隐私面，故不采用。

### 2. 共享的 bounded locator 收敛现有 host-file 写/查路径

新增一个专用、纯 deterministic helper，只负责识别 URC-001 的 opaque literal region，并提供对某个消费者的 canonical target section 做 bounded locate/replace 的小函数。它不是解析或返回完整 Markdown section tree 的全局 layout parser：Topic Registry、Progress 和 required-fill scan 各自只请求其已有 target，并以模板顶层顺序排除 opaque region。保留现有“缺失或 non-standard Topic Registry presentation 仅 advisory”的兼容性；无法定位某个 writer 的 canonical target 时该 writer 返回明确 advisory/no-change，checker 只对实际 template-owned required-fill positions 报错，不猜测用户文本。

`refreshTopicRegistryTable()`、`writePlanProgress()` 和 setup-ready required-fill scan 都复用该 locator/region interpretation。Progress 仅在 canonical Progress section 操作指定 gate line；Topic Registry 仅替换 canonical table；required-fill scan 跳过 opaque snapshot，但保留原有 whole-body minimum check。`## Decisions` 仍无 writer，locator 只保证 snapshot 中的同名 heading不能在未来被误认。只有新 subsection 的固定 label 加计算得到的完整 literal fence 表示 controls present；legacy 中同名但不符合该形状的文字保持普通 Constraints presentation，不被 Engine 解释成新的 control state。

该 helper 删除三份“扫描整篇文件、找到相似文字即操作”的隐含逻辑；不创建第二个 Markdown truth、完整文档 AST 或语义 validator。对于旧模板，opaque-region normalizer 返回空 region，消费者保留其已知的 canonical target behavior，缺少新 subsection 不改变正常行为。

### 3. Agent 解释控制，Engine 保护不可协商边界

HITL1 把 controls 与 profile、must-answer、style 的 material conflict 在同一个既有用户决策点澄清。之后 Seed 将原控制投影为 topic-local `search_guardrails` / `evidence_route`，但这只是 Agent authored guidance，不能取代或改写原坐标。Wave/Final 阅读原坐标加上 topic-local 指引；Final 将未满足的控制或证据限制显式呈现。

若有 work unit，Phase Agent 仅在 controls present 时在已有 queue-item `task_brief` 增加一条指向 `rb_plan.md## Constraints > User Research Controls` 的 beacon-rooted、bundle-relative、read-only coordinate；Engine 只原样传递该已有 brief，不解释或生成 controls。它不赋予 assignment、file write、route、Gate 或 lifecycle authority，也不会把 controls 拷贝到 manifest/result/queue。无 controls 不增加空 payload 或额外读要求。

“only/不得使用”等强排除保留其强度；可行性、相关性和证据判断由 Agent 基于真实材料作出。Engine 继续只检查 schema、provenance、receipt、source floor、host policy 和 state transition。严格限制不可满足时遵循已被接受的 limitation/degraded/HITL2/held-checkpoint 路径，绝不加例外 pass path。

### 4. setup-ready 采用一个 ordered commit/consumption boundary

`check-gate-setup-ready.mjs` 不再在普通 `writeGateAttempt()` 已暴露 route 后再写 Progress。它仍只调用既有 shared `writeGateAttempt()`；该 helper 为 setup-ready 提供一个 staged route mode，而不是另建 writer/finalizer。该 mode 返回一个 structured `route_outcome`，不在 checkpoint/trace failure 后抛出并要求 caller 再调用普通 audit helper。`GSK-005` 原有的 audit-failure-tolerant behavior 保留给没有额外 route evidence 的失败诊断与其他既有 Gate；仅 setup-ready 的 non-null route 被要求持有 checkpoint evidence，故 checkpoint/route persistence 失败必须改为标准 failed envelope。此模式预生成一个仅用于 audit binding 的 `gate_attempt_id`，并按以下顺序完成：

1. 持久化 content-evaluation diagnostic 与 run log audit；对 content-passed candidate 它明确是 `route_pending`，不是 passed `gate_attempt` 或 route authority；
2. 对通过的候选结果调用 bounded Progress writer。writer 返回 `committed`、`unchanged` 或 `failed` 的直接结果；失败保留完整旧文件并在输出/diagnostic 中声明没有 checked Progress claim；
3. 严格写入唯一 route-pending checkpoint，hash 的是步骤 2 实际留下的 `rb_plan.md` bytes，并写入同一个 `gate_attempt_id`、`trigger: setup_route_pending`、`content_evaluation_ref` 和 `route_state: pending` 后返回 checkpoint path；它不伪装成已发生的 `gate_attempt` 或已通过的 `gate_result_ref`。checkpoint 无法 durable 写入时不产生可消费 handoff；
4. 仅在步骤 3 成功后由同一 helper 追加唯一可路由 `gate_attempt` trace，写入相同 `gate_attempt_id`、`checkpoint_ref` 和 `plan_sha256`；随后才输出带 `check.next` 的 pass。

这里的 binding 是刻意小而精确的。最终 route 的 `checkpoint_ref` 必须是非空、normalized 的 bundle-relative `_checkpoints/<filename>.json` 路径，直接命名 `_checkpoints/` 下一个文件，不得含 `..`、额外目录段或 symlink；目标必须是存在的普通 JSON 文件。route trace 的 `gate_attempt_id` 与 `plan_sha256` 均为必填；checkpoint 的 `content_evaluation_ref` 精确包含 `gate`、`passed`、`currentNodeRef`、`candidate_next`。对 setup-ready route，`enter-phase` / handoff helper 除既有 gate/next/topology binding 外，必须读取该 exact checkpoint 并验证：`trigger` 为 `setup_route_pending`、`route_state` 为 `pending`、没有 `gate_result_ref`；两边的 `gate_attempt_id` 相同；`content_evaluation_ref` 与 trace 的 `gate`、`passed`、`currentNodeRef`、`next` 一致；checkpoint 的 `hashes["rb_plan.md"].sha256`、trace 的 `plan_sha256` 与当前 `rb_plan.md` bytes 的 SHA-256 一致。任何缺失、坏路径、坏绑定或 drift 拒绝进入；正常的后续外部编辑仍由既有 reentry drift 诊断发现。其他 Gate 的既有 path 不被这个 change 重新定义。

`check-reentry` 的 checkpoint selection 不得把 `route_state: pending` setup-ready checkpoint 作为 matching 或 global fallback baseline。它可在 durable diagnostics 中报告此 pending evidence 和其 `gate_attempt_id`，并可单独报告 matching bound route trace 作为 handoff fact，但无论 trace 是否存在都报告缺少 passed checkpoint baseline；route trace 不能改变 pending checkpoint 的 baseline 身份。它不能把 pending content evaluation 解释为已完成 setup handoff 或用它压制 drift。

这不是第二 checkpoint 或 rollback tree：route trace 是唯一 handoff authority，checkpoint 是它已存在的 route-pending evidence，audit diagnostic/log 是不可路由的前置事实。`TraceEntrySchema` 允许 additive trace fields，因此这三个 route-specific 字段不需要扩张通用 trace schema 或另立 trace writer contract。Progress write failure 保留旧 plan 并不逆转既有 Gate content evaluation；若该旧 bytes 仍能被同一 `gate_attempt_id` 的 checkpoint 与 route 严格绑定，原 pass 仍可消费，只是没有 checked Progress claim。若 trace append 随后失败，该唯一 checkpoint 仍真实表达“content evaluation 已完成、route 未建立”，而非虚称已通过。checkpoint/route binding 失败时，helper 返回一次 `route_outcome`，CLI 据此输出标准 failed Gate envelope：`check.passed: false`、`check.next: null`，并以一个 authority-integrity persistence finding 保留“content rules 已通过但 legal handoff 未建立”的直接事实和同一 Gate rerun；CLI 不得再调用普通 `writeGateAttempt(failedResult)`，从而不产生第二个 checkpoint、第二条 audit route 或互相矛盾的 attempt record。只有无法建立 required checkpoint/route evidence 才这样阻止 consumption。

## Risks / Trade-offs

- [literal snapshot 不渲染为富 Markdown] -> 输入仍逐字可读，且换来不会伪装 host structure 的确定边界；语义解释由 Agent 而非 renderer 承担。
- [旧手工改坏的 host layout 无法定位] -> 相关 presentation writer no-change、checker 只报告直接 layout/contract 事实；不猜测或做破坏性 rewrite，既有 non-standard Topic Registry 的 advisory compatibility 保留。
- [Progress 写入失败] -> 保留旧文件，记录 no checked claim，checkpoint/route 只证明实际 bytes；不虚报展示成功。
- [checkpoint 写入失败] -> 不追加可消费 route，`enter-phase` 的唯一修复方向是重跑同一 Gate；不能手写 trace/checkpoint。
- [严格用户控制使研究不足] -> 保留限制并走既有合法 limitation/degraded/HITL2/held-checkpoint；不静默采用禁用材料。

## Migration Plan

1. 新 bundle 使用新 Constraints subsection；旧 bundle 缺失它时正常继续。
2. 在 apply 前创建并校验 focused test assets；实现共享 locator 后依次迁移三个现有消费者，再迁移 HITL1/phase guidance 和 setup commit path。
3. 通过真实 temporary-bundle CLI 边界验证后，将 framework 升至 `v0.41` 并更新根目录 CHANGELOG/RUN banner。
4. 回滚仅回退 framework release；已存在的 host-file snapshot 是 narrative content，不要求 migration。若新代码遇到旧 bundle，兼容路径保持无 controls。

## Open Questions

无开放语义问题。apply 前仅需以直接现有 code 路径确认 setup commit helper 最小落点和所有实际 `rb_plan.md` body scanner；若发现额外 scanner，只有在其会把 opaque region 当 template structure 时才接入同一 locator。
