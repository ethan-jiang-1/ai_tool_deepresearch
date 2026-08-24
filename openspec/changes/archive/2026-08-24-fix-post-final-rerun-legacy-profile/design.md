## Context

See proposal.md — Why for the motivation. Current constraints that shape this design:

- `DEEP_RESEARCH_HARNESS/` 是只读分发框架，改动必须走 OpenSpec apply（本 change 即该 gate 的产物）。
- `classifyPostFinalProfile`（`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` L310-343）是唯一需要改的判定点；`inspectPostFinalHandoffStage`（L568-629）调用它并据此分派 stage/owner，调用点本身无需改。
- 事件（`rb_trace.jsonl` 中的 `post_final_reentry`）不可变；`committed_after_profile_semantics` 是 apply 时按契约保留的快照，永远不可能事后获得 `rerun_count` 键。因此修复必须在分类器侧对齐"缺失 = 0"的既有语义，而不是试图改事件。
- 框架内已有两个权威先例把"缺失 `rerun_count`"当作合法 0：`DEEP_RESEARCH_HARNESS/engine/helpers/rerun-availability.mjs` L44-45（`hasCount ? hitl2.rerun_count : 0`，C5 资格检查与 rerun-ready gate 都走它）与 `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-profile.md`（optional、schema default 0、phase-rerun 负责递增）。本修复是让 post-final 阶段分类器与这两者一致。
- 带键（keyed）路径的精确行为必须逐字节不变：fixtures、integration 测试、enterprise bundle 的既有断言都依赖它。

## Goals / Non-Goals

**Goals:**
- 让 `classifyPostFinalProfile` 对 legacy profile（`hitl2.rerun_count` 缺失）返回 `ok: true`，且 count 分类为 `current`，使 `inspectPostFinalHandoffStage` 落到 `synchronized_initial_profile`（topic_state owner）。
- 保持带键事件/ profile 的判定逐字节不变（现有 tests 全绿）。
- 不改变事件 schema、gate definitions、profile schema、stage/action 词汇、下游 owner 分派。

**Non-Goals:**
- 不"修复"或改写任何已提交事件（trace 不可变）。
- 不新增第六个 C5 stage，不回退到 fresh Final 资格。
- 不改 `evaluateRerunAvailability`、phase 指令或 Agent 指导（它们已经是缺失=0 的正确语义，本 change 只是把 Engine 分类器对齐上去）。
- 不做任何超出 rerun 场景的 profile 宽容化。

## Decisions

**D1: 缺失计数按事件 `rerun_guard.current_count` 解释，而不是按 profile schema default 或硬编码 0。**

- 现状：`currentCount = current?.hitl2?.rerun_count`，缺失时是 `undefined`，`![guard.current_count, guard.next_count].includes(undefined)` 直接失败（reason: `rerun_count is outside the event-bound current/next delta`）。
- 修改：`const currentCount = current?.hitl2?.rerun_count ?? guard.current_count`。事件 guard 的 `current_count` 是 C5 资格检查时由 REI-003 产出的权威 inspected 值（对 legacy bundle 就是 0），与 `evaluateRerunAvailability` 的缺失=0 完全一致；且它随事件绑定，不会因为 rule 漂移而改变语义。
- 备选：直接 `?? 0`。否决：硬编码 0 在 guard `current_count` 非 0 的（未来或手工构造）场景会错；用事件绑定值更贴近"event-bound current count"这一既有 spec 措辞。

**D2: comparable JSON 检查只在事件语义带键时写回 `rerun_count`，legacy 事件下则从 comparable 移除该键。**

- 现状：`comparable.hitl2.rerun_count = acceptedCount` 无条件写键；而 legacy 事件的 `accepted` 没有该键 → `JSON.stringify(comparable) !== JSON.stringify(accepted)` 恒真 → 恒 fail。
- 修改：当 `Object.hasOwn(accepted.hitl2, 'rerun_count')` 为 true（keyed 事件）时，把 `rerun_count` 写回 comparable（保持原行为）；当为 false（legacy 事件）时，`delete comparable.hitl2.rerun_count`——这同时覆盖两种合法状态：
  - **current 态**（phase-rerun 尚未写 count）：profile 本就缺键，comparable 保持与 accepted 相同的键集合；
  - **next 态**（phase-rerun Stage 3.2 已把 `rerun_count` 递增写入 profile）：profile 带键而事件语义不带，必须从 comparable 移除该键，否则合法递增会被误判为 unrelated drift。
- 关键理由：`accepted` 来自不可变事件，comparison 的参考集合是"事件实际携带的字段"。legacy 事件从未声明该键，profile 侧的 count（无论缺失还是由 sanctioned increment 写入）都不应参与全等比较；count 的合法性仍由计数窗口检查（`[guard.current_count, guard.next_count].includes(currentCount)`）与 rerun-ready gate 的 `rerun_count_limit` 规则独立把关。
- 备选：把 accepted 也补上键再比较。否决：accepted 来自不可变事件，任何"归一化 accepted"都等于在判定层伪造事件语义；正确做法是让 comparable 匹配事件实际携带的键集合。

**D3: 修复只落在 `classifyPostFinalProfile` 一个函数内。**

- `inspectPostFinalHandoffStage` 的所有调用点（stage 分派、owner 选择、`profileClass.count/style/projectionDiffers`）在 `profileClass.ok` 为 true 后自然工作：legacy profile 会得到 `count: 'current'`、`style: 'event_bound'`（当前 profile 与事件 style 一致）→ 落到 `synchronized_initial_profile` + `POST_FINAL_OWNERS.synchronized_initial_profile`（topic_state）。
- `checkPhaseHandoffPreflight`、`lifecycleAuthorization`（canonical-topic-state.mjs L1468-1494）无需改动——它们只是消费 `handoff.ok`。
- 备选：在 `inspectPostFinalHandoffStage` 里加 legacy 特判分支。否决：会把 stage 逻辑分叉成两套，违反"closed stage predicates"的单一职责；分类器内部对齐是最小、最可测的改动面。

## Risks / Trade-offs

- [误放宽非 legacy 路径] → D2 用 `Object.hasOwn(accepted.hitl2, 'rerun_count')` 精确区分：带键事件走原路径（逐字节相同）；只有事件语义缺键时才走 absence 容忍。现有 integration/e2e 测试（`post-final-recovery.test.mjs`、`post-final-lineage-consumers.test.mjs`、`post-final-rerun-lineage-continuity.test.mjs`）作为回归护栏。
- [JSON 键序影响全等比较] → 现状已依赖 `JSON.stringify` 的键序（comparable 是 `structuredClone(current)` 再改键，顺序与 current 相同）。legacy 路径下 comparable 不改键，顺序与 current 完全一致；若事件语义键序与 current 不同，那是既有行为，不是本 change 引入。
- [guard.current_count 与 profile 实际值不一致的掩盖风险] → 本修复只在 profile 缺键时启用 guard 值；若 profile 带键且值 ≠ guard，原检查照常失败（`![guard.current_count, guard.next_count].includes(currentCount)`），不会把"带键但错误"静默放过。
- [新测试需构造 legacy fixture] → integration fixture `createTerminalFinalBundle` 恒写 `rerun_count: 0`；legacy 用例需在 fixture 基础上删除该键后再走 apply（apply 会保留缺失），或直接构造缺键 profile。engine 层单测可直接用合成 profile/事件对象调用 `classifyPostFinalProfile`，无需完整 bundle。

## Migration Plan

- 无数据迁移：不改事件、profile、gate definition 或 schema。
- 部署即代码合入：apply 修改 `handoff-helpers.mjs` + 新增测试后，跑相关测试套件验证带键路径全绿、新增 legacy 用例通过。
- 回滚：`handoff-helpers.mjs` 单文件 revert 即可；事件/状态不变，legacy bundle 会回到当前的 blocked 状态（无数据损坏）。

## Open Questions

无。
