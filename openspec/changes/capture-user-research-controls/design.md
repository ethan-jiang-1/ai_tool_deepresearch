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

有控制时，Agent 把用户直接给出的内容，或用户明确授权在 HITL1 读取的本地文件中与本 run 有关的内容，写成一个 Markdown code fence 内的 literal snapshot。fence 长度由输入中最长的 backtick run 加一确定，因此输入内的任意 backtick run 都不能提前关闭该 region；原文字节保持可见，标题、checkbox 和 marker 不再成为 Markdown structure。实现的 host-section locator 只需识别这个确定的单一区域和 template 的固定 top-level order，不需要通用 Markdown parser。

该捕获并非文件导入协议：不保留外部路径、不递归读取链接、不复制文件、不在后续 phase 重读。不能读取、无法分辨意图，或 material conflict 时，Agent 在既有 HITL1 只问最小澄清；用户作出决定后由 Agent 继续执行合法机械工作。

替代方案是把 brief 写到 `rb_profile.yaml`、新 `.md` 文件或 per-work-unit manifest。它们分别把语义文本伪装为 machine state、制造第二 authority，或扩大复制和隐私面，故不采用。

### 2. 共享的 bounded locator 收敛现有 host-file 写/查路径

新增一个专用、纯 deterministic helper，负责在 frontmatter 之后定位 canonical `## Goal`、`## Topic Registry`、`## Constraints`、`## Progress`、`## Decisions`，并把 `User Research Controls` literal region 当作 opaque content。它只接受模板定义的顺序与固定 subsection 形状；若 canonical layout 无法可靠定位，writer 返回明确 advisory/no-change，checker 只对实际 template-owned required-fill positions 报错，不猜测用户文本。

`refreshTopicRegistryTable()`、`writePlanProgress()` 和 setup-ready required-fill scan 都复用该 locator/region interpretation。Progress 仅在 canonical Progress section 操作指定 gate line；Topic Registry 仅替换 canonical table；required-fill scan 跳过 opaque snapshot，但保留原有 whole-body minimum check。`## Decisions` 仍无 writer，locator 只保证 snapshot 中的同名 heading 不能在未来被误认。

该 helper 删除三份“扫描整篇文件、找到相似文字即操作”的隐含逻辑；不创建第二个 Markdown truth 或语义 validator。对于旧模板，helper 走已知旧 canonical layout，缺少新 subsection 不改变正常行为。

### 3. Agent 解释控制，Engine 保护不可协商边界

HITL1 把 controls 与 profile、must-answer、style 的 material conflict 在同一个既有用户决策点澄清。之后 Seed 将原控制投影为 topic-local `search_guardrails` / `evidence_route`，但这只是 Agent authored guidance，不能取代或改写原坐标。Wave/Final 阅读原坐标加上 topic-local 指引；Final 将未满足的控制或证据限制显式呈现。

若有 work unit，Phase Agent 仅在 controls present 时在已有 `task_brief` 增加一条指向 `rb_plan.md## Constraints > User Research Controls` 的 beacon-rooted、bundle-relative、read-only coordinate。它不赋予 assignment、file write、route、Gate 或 lifecycle authority，也不会把 brief 拷贝到 manifest/result/queue。无 controls 不增加空 payload 或额外读要求。

“only/不得使用”等强排除保留其强度；可行性、相关性和证据判断由 Agent 基于真实材料作出。Engine 继续只检查 schema、provenance、receipt、source floor、host policy 和 state transition。严格限制不可满足时遵循已被接受的 limitation/degraded/HITL2/held-checkpoint 路径，绝不加例外 pass path。

### 4. setup-ready 采用一个 ordered commit/consumption boundary

`check-gate-setup-ready.mjs` 不再将普通 `writeGateAttempt()` 的可路由 trace 写在 Progress 之前。由同一既有 gate-attempt owner 的 setup-specific commit path 顺序完成：

1. 持久化 pass/fail diagnostic 与 run log audit；这不是 route authority；
2. 对通过的候选结果调用 bounded Progress writer。writer 返回 `committed`、`unchanged` 或 `failed` 的直接结果；失败保留完整旧文件并在输出/diagnostic 中声明没有 checked Progress claim；
3. 严格写入唯一 checkpoint，hash 的是步骤 2 实际留下的 `rb_plan.md` bytes，并返回 checkpoint path；checkpoint 无法 durable 写入时不产生可消费 handoff；
4. 仅在步骤 3 成功后追加唯一可路由 `gate_attempt` trace，带 checkpoint reference/binding；随后才输出带 `check.next` 的 pass。

`enter-phase` / handoff helper 对 setup-ready 的 route 除既有 gate/next/topology binding 外，必须验证 referenced checkpoint 存在、绑定该 trace attempt，且记录的 plan hash 与当前 bytes 一致。任何缺失、坏绑定或 drift 拒绝进入；正常的后续外部编辑仍由既有 reentry drift 诊断发现。其他 Gate 的既有 path 不被这个 change 重新定义。

这不是第二 checkpoint 或 rollback tree：route trace 是唯一 handoff authority，checkpoint 是它已存在的必须 evidence，audit diagnostic/log 是不可路由的前置事实。进度展示保持 tolerant presentation，失败不会改变实际 Gate contract evaluation；只有无法建立 required checkpoint/route evidence 才阻止 consumption，并给出重跑同一 setup-ready checkpoint 的最近动作。

## Risks / Trade-offs

- [literal snapshot 不渲染为富 Markdown] -> 输入仍逐字可读，且换来不会伪装 host structure 的确定边界；语义解释由 Agent 而非 renderer 承担。
- [旧手工改坏的 host layout 无法定位] -> writer no-change、checker 只报告直接 layout/contract 事实；不猜测或做破坏性 rewrite。
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
