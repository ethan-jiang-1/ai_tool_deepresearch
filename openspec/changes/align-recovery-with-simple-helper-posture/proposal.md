## Why

`dpt_rb_ai-era-bpm-process-disruption` 暴露的不是一个 post-final reentry 小缺口，而是一条完整的系统性失败链：框架把 autonomous Agent 与明确在场的人类指令按同一套刚性规则处理，Agent 没有合法的 helper 路径去执行用户已授权的修正；工作被迫绕出 gate 后，用户意图、topic 身份、进度、trace 与 canonical artifacts 又没有在开工前物化；一旦中断，恢复只能依赖 chat 记忆和跨多个 surface 的人工归一化。

这条链同时贯穿 `_backlog/plans/human-override-and-state-mutability.md`、`_backlog/plans/breakpoint-recovery-persistence-model.md` 与 `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md`。如果继续按单点 bug 增加 reentry condition、override flag、addendum namespace、progress state 或新 validator，系统会更难理解。现在需要先建立一个能罩住三份来源的统一演进契约，再按依赖逐步落地，而不是继续补丁式扩张。

## Problem Model

当前根因链可以压缩成五步：

```text
human-directed correction is treated as autonomous mutation
  -> no sanctioned helper path
  -> Agent either blocks or creates out-of-gate work
  -> intent/progress/artifacts miss canonical materialization
  -> crash recovery depends on chat memory and manual cross-surface repair
```

因此必须同时坚持四个结果义务：

1. **两种 authority context 必须分清**：Agent 自驱的 `autonomous` 与人明确下达指令的 `human-directed` 不是同一个语义；human-directed 可以发生在既有 HITL，也可以发生在 out-of-band maintenance/debug。
2. **Agent 应是 helper**：已有用户意图、权限和合法路径足够时，Agent 自己完成机械工作，不把命令重新交给用户；需要人决定的风险边界得到明确授权后，后续合法执行仍回到 Agent。
3. **materialize before work**：重要用户输入、最小 canonical identity 和可恢复进度必须先于对应内容工作落盘；新取得的数据则在 acquisition boundary 立即 crash-safe 持久化，再进入下游加工。
4. **canonical or blocked**：durable intent、identity、progress 和交付产物没有 sanctioned canonical footprint 时不得自建平行成功路径；临时 scratch/cache 可以存在，但不能成为唯一 authority 或绕过 canonical registration。

这里的 `human-directed` 描述决定或授权来自谁，不表示人类重新成为 pipeline command runner；`materialize-before-work` 也不要求在研究开始前猜出全部未来内容，只要求先写下足以恢复目标和进度的最小结构。

## What Changes

本 change 是覆盖上述系统问题的**基础演进契约**。它只包含三层：长期演进方向、一个用于证明方向可落地的现有 HITL2/content-delivery 局部收敛、以及明确 deferred 的 runtime 能力。局部收敛不是第二个 cleanup 项目：只修当前 Agent-facing surface、canonical delivery proof 及其直接重叠的 current consumers 中已经确认的矛盾，并删除重复 proof；其余历史实验漂移不在本轮顺手重写。本 change 不会假称两个 plan 与 BUG-079 的全部 runtime 能力已经实现，但会把它们从“背景材料”提升为后续 change 必须满足的设计义务和依赖顺序。

- 将 `guidelines/simple-reliable-control.md` 的 canonical 内容重命名为 `guidelines/evolution-simple-reliable-control.md`，只负责 simplicity、net simplification、短控制链与渐进收敛。
- 新建并列的 `guidelines/evolution-helper-oriented-agent.md`，只负责 agency 方向：autonomous/human-directed authority、HITL/out-of-band placement、用户决定与 Agent 执行的责任分配，以及 tool-to-helper 的渐进演进。
- 两个 `evolution-*` 文件使用共同文件名前缀和 `Evolution Direction:` title prefix，均定位为 Project Charter 之下的宪章级 companion guidance：对新 proposal/design 提供稳定、规范性的演进约束，对历史实现只要求渐进收敛；它们不互相包含，也不接管领域 workflow spec、当前 runtime terminology 或 accepted behavior authority。现有 frontmatter 字段已经足够表达其地位，本 change 不新增无人消费的 `family` / `axis` 分类字段。
- 文件改名不改变 simplicity 原则的概念身份：新的 canonical 文件继续使用 `guideline_id: simple-reliable-control`。旧路径只保留普通 Markdown compatibility notice，不分配第三个 guideline ID，也不伪装成第三份 guidance。
- 将现有重复的 complexity budget、burden of proof、New Work 与 design-review checklist 收束为 simplicity 文件中的 focused admission test；helper 文件拥有独立的 responsibility review questions。详细 fail-closed、state ownership、testability 和真实性纪律继续保留。
- 最小更新 `guidelines/project-charter.md` 与 `guidelines/README.md`，在 Charter 之后建立并列 `Evolution Directions` 层；Charter 只保留 authority/layer-specific checklist，并分别路由 complexity 与 agency 问题。
- 更新所有 active guideline/backlog navigation references、canonical links 与 sibling lists 指向新的 canonical 文件名；本 change 只在解释 rename/redirect contract 时保留旧路径文字。旧 `guidelines/simple-reliable-control.md` 保留为短小的普通 Markdown compatibility notice，使 closed plan 与 archived OpenSpec 中不改写的历史链接继续可达；README/reading order 不把 notice 当第三份指导。
- 修改 ACS-001，使 `Agent-facing` 明确包含 Agent 执行普通已授权命令与可逆机械修复，并区分 autonomous execution、既有 HITL 内的 human-directed decision 与 out-of-band maintenance/debug collaboration。
- 修改 ACS-003，使现有 command-surface static regression 只增加少量稳定的 helper audience markers；详细责任语义仍由 ACS-001 与 design review 承担，不把 guidance 复制成脆弱的 prose validator。
- 修改 CDP-001，删除已经落后于现行 schema/phase/chain 的旧 `repair_and_rerun` / restart-from-instantiation 描述，恢复当前五枚举与 `repair` 就地修复、`rerun` 经 `phase-rerun` 的 accepted contract。
- 修改 CDG-001 与 CDG-003，使 HITL2 gate rule set/CLI 与现行 implementation 一致：接受 `repair` 与 `rerun`，不再要求已经移除的 `hitl2_recorded` blocking rule，并明确只有 `proceed_to_readiness` / `rerun` 产生 deterministic handoff。
- 修改 SCO-007，使 `HITL2UserDecision` 的 accepted spec 明确区分 1 个 pre-decision sentinel 与 5 个 recorded action values，修正“5 values”与实际六枚举不一致；不修改 schema runtime。
- 修改 SHC-001 与 SHC-002，使 shared profile/gate summary 与现行 five-enum、HITL2 gate rule set 和 deterministic rerun handoff 一致；`hitl2_recorded` 仍是 Phase Agent 可写的 diagnostic event，但不再被 generated summary 描述为 blocking gate rule。
- 修改 CDE-001 至 CDE-005，把 content-delivery experiment contracts 指向现有 `exp_wff_delivery/case-131` 至 `case-135`，只拥有 delivery 场景与业务断言；通用 runner、fixture、health、cleanup 和 report 纪律继续由 AGT/PLR 与 `command-experiments` 拥有。
- 退役重复的 G14 `case-140` 至 `case-142`：它们的 decision/rerun/readiness proof 分别由 G13 `case-132`/`case-133`/`case-131` 与 G24 rerun mechanism cases 覆盖，`RUN_EXPS.md` 保留 migration map，不再维护第二套 HITL2 branch family。
- 在不修改 REI/CPT/WNC/AGT/PLR requirements 的前提下，只修直接受影响的 active consumers：G5 `case-51`/`case-52` 继续作为 AGT-010 canonical standard handoff proof；G24 只对实际调用 HITL2/rerun gate 的 cases 补足其证明边界所需的合法 fixture/handoff，纯 chain case 不升级成 full-chain E2E。
- 最小对齐 `DPT_FRAMEWORK/COMMANDS.md` 的 audience contract；修正 `phase-hitl2.md` 的 stale rerun/trace-failure wording、`shared-profile.md` 的 rerun route 和 `shared-gate-rules.md` 的 stale gate summary；不新增命令、状态、checkpoint 或 runtime mutation path。
- 明确后续落地顺序：先建立 canonical/integrity 可见性与 crash-safe persistence，再物化 intent/progress，最后在安全网和 canonical truth 已存在后设计 audited authorized repair/state movement。

## Source Coverage

| Source | 本 change 接住的系统义务 | 本轮 apply | 后续独立行为 change |
|---|---|---|---|
| `_backlog/plans/human-override-and-state-mutability.md` | 区分 autonomous 与 human-directed authority context；human-directed 可位于 HITL 或 out-of-band debug；人做决定、Agent 执行、Engine 审计；topic identity 有单一真相源，rename/renumber/repair 不再跨 N 个 surface 手工同步 | 写入演进指导与 Agent-facing 边界；同步 CDP/CDG/SHC/CDE 的现行 HITL2 repair/rerun contract 与 proof surfaces；不伪造“human 已被机器认证” | 选择可审计 authorization signal、允许的 mutation 范围、single-source topic identity、atomic rename/renumber、state-seed/reentry contract 与一致性复核 |
| `_backlog/plans/breakpoint-recovery-persistence-model.md` | P1 数据过手即存、P2 状态即意图要存、P3 重要用户输入当刻物化；统一遵循 `materialize-before-work` | 将三条义务固定为后续设计准入条件 | crash-safe write/sweep；canonical topic progress；input materialization |
| `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md` | 不允许 Engine-invisible parallel namespace；新增 scope 必须有 canonical identity、progress、trace 和 audit visibility；diagnostic advice 不得指向已知不可达的循环路径 | 固定 `canonical or blocked` 与 nearest-legal-action 原则，并禁止文档暗示 ad-hoc addendum 是合法路径 | 优先恢复 gated rerun；若确需 addendum，必须另证其一等 canonical contract；扩展既有 integrity audit；修正 impossible gate advice |
| `_backlog/todos/todo-helper-not-tool.md` | Agent 从只报错/给命令逐步转向协作执行者 | 仅吸收 posture 与 escalation boundary | 不实现 persona、memory 或 generic helper subsystem |

## Capabilities

### New Capabilities

无。本 change 不用新 capability 包装新的治理层或 helper 子系统。

### Modified Capabilities

- `agent-command-surface`: 修改 ACS-001 与 ACS-003，完整化 Agent-facing execution responsibility、autonomous/human-directed authority distinction、HITL/out-of-band placement distinction，并让现有 static regression 与新增 audience markers 保持一致。
- `content-delivery-phase-content`: 修改 CDP-001，把 HITL2 decision enum、repair 行为和 rerun routing 与现行 `hitl-ux`、`phase-hitl2.md`、schema 和 transition chain 对齐。CDP-004 的 post-final feedback route 本轮不修改，也不据此声称 reentry 已可用。
- `content-delivery-gate-implementation`: 修改 CDG-001 与 CDG-003，把 gate rule set/CLI 与现行 implementation 对齐，删除 stale blocking trace requirement，并明确 deterministic handoff decisions。
- `schema-core`: 修改 SCO-007，明确 `HITL2UserDecision` 是 `not_started` sentinel 加五个可记录决定，并让现有 enum regression 的描述与实际值集一致。
- `shared-node-content`: 修改 SHC-001 与 SHC-002，把 shared profile enum/route 和 generated gate summary 与现行 executable contract 对齐。
- `content-delivery-experiments`: 修改 CDE-001 至 CDE-005，使现有 delivery playbook 路径、delivery-specific scenarios 和 tested-gate assertions 与现行 gate/handoff behavior 一致；通用实验机制继续复用 AGT/PLR。

### Reviewed But Not Modified

| Capability | Why no delta in this change |
|---|---|
| `hitl-ux` | 已经规定用户做 HITL 决定、Agent 写入 profile 并执行 repair/rerun；本轮不复制 action-responsibility requirement |
| `silent-wave-execution` | 已经禁止 `stop:no` 中把用户当 co-runner；helper posture 不得弱化 autonomous lane |
| `check-inspect-feedback` | 已经要求最小根因、一个最近 repair target、避免 manual authority edit、修复后回同一 Check；command executor 由 ACS 拥有 |
| `rerun-incremental-node`、`transition-table` | 已经拥有 `rerun -> phase-rerun`、incoming rerun status window 与 max-rerun behavior；本轮不改 requirements，G24 仅修实际受影响的 mechanism consumers |
| `gate-skeleton`、`cli-phase-transition`、`workflow-node-contract` | 已经规定 branch-sensitive gate output、route-bound handoff witness 与 source-gate status synchronization；本轮只让 content-delivery projections/experiments 追上这些现行 contract |
| `agent-testing`、`playbook-runner` | 已经要求 standard E2E 使用 real HITL2 gate output，并要求 active runner manifest 与 case truth 一致；本轮修正 G5、必要的 G24 consumers，按 PLR-003 退役重复 G14，并更新 `RUN_EXPS.md` migration map，不复制其 requirements |
| `repair-loop` | 只拥有 deterministic checkpoint transform，不拥有 Agent semantic repair strategy；本轮不扩成 helper controller |
| `version-management` | 不修改 VEM requirements；直接应用现有 VEM-002/003/004，将 framework bump 到 `v0.21` |

### Reviewed And Deferred

| Capability | Deferred behavior owner |
|---|---|
| `runtime-reentry-debuggability` | Visibility change 修 impossible advice；Authorized Repair change 再定义 state-seed/mutation authority |
| `rerun-topic-integration`、`seed-topic-materialization` | Canonical Materialization changes 再实现 P2/P3、single-source identity、post-final intent/progress materialization |
| `content-delivery-phase-content` CDP-004 runtime gap | 后续 post-final reentry/materialization change 证明 feedback 如何进入可达 HITL2 path；本轮 CDP-001 reconciliation 不修 BUG-078 |

这些 reviewed rows 是边界证明，不是 prose 影响：未来若改变对应 accepted behavior，仍必须新增该 capability 的 delta spec。

## Impact

- 指导层：新增 `guidelines/evolution-helper-oriented-agent.md`；将 canonical simplicity guidance 迁移到 `guidelines/evolution-simple-reliable-control.md`；`guidelines/simple-reliable-control.md` 降为普通 Markdown compatibility notice；同步 `guidelines/project-charter.md`、`guidelines/README.md` 和所有 active sibling/reference surfaces。
- 路径影响面：当前有 16 个非 archive 文件出现旧 basename，另有 2 个 archived OpenSpec design 保留历史链接。11 个 active navigation/sibling/design-principle surfaces 迁移到 canonical 新路径；closed plan、archive 和本 change 的 migration-contract mentions 保留历史文字，通过旧路径 compatibility notice 保持可达。
- Accepted behavior：修改现有 ACS-001、ACS-003、CDP-001、CDG-001、CDG-003、SCO-007、SHC-001、SHC-002、CDE-001、CDE-002、CDE-003、CDE-004、CDE-005，不分配新 requirement ID；同步更新 registry 中这 13 个 ID 的稳定描述。
- Agent-facing framework：最小更新 `DPT_FRAMEWORK/COMMANDS.md`、`phase-hitl2.md`、`shared-profile.md` 与 `shared-gate-rules.md`，使 command responsibility、HITL2 enum/route、gate summary 与 executable truth 一致。
- Regression 与 controlled E2E：扩展现有 `tests/engine/command-contract-docs.test.mjs` 与 `tests/integration/cli/check-gate-hitl2-recorded.test.mjs` 的 focused assertions，修正 `tests/schema/enums.test.mjs` 的 enum coverage 描述并复跑 enum/profile/routing tests；更新并逐个执行受影响的 G5/G13/G24 cases，删除重复 G14 current cases 并记录 replacement map，不新增测试框架、validator、runner 或 experiment family。
- Engine runtime、schema、state machine、gate definition/CLI logic、trace event、receipt 与 bundle data：本轮无行为变化；两个 plan 与 BUG-079 不会因本 change 归档而被标记为 runtime-fixed。
- Dependencies：无新增依赖。
- Framework version：本 change 修改 Agent-facing framework contract，按 VEM-002/003/004 需要 version bump；target version 为 `v0.21`。
