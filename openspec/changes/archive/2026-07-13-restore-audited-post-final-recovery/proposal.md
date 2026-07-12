## Why

`_backlog/bugs/BUG-078-post-final-hitl2-rerun-reentry-blocked.md` 已证明：Final 交付后即使用户明确要求 rerun，现有 latest-handoff ratchet 也没有 sanctioned reentry path；`_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md` 又证明，无路可走会诱发 Engine-invisible addendum、手写状态与 provenance 漂移。C1/C2/C3 已分别提供只读 recovery root、crash-safe content persistence 与 canonical topic intent/layout，因此现在可以用一个狭窄例外恢复 post-final rerun，而不建设通用 override/state-jump 平台。

## What Changes

- 新增一个窄的 post-final recovery operation family，复用现有 handoff、topic-state 与 reentry owners，只提供 `inspect|apply|recover`：
  - `inspect` 从 terminal Final lineage或已接受C5 lineage、status/current node、pending workspace、canonical topic state 与现有 integrity facts生成一个 eligibility/stage verdict和至多一个最近动作；
  - `apply` 接受一个显式 post-final rerun request，建立 hash-bound prepared workspace，只原子更新现有 HITL2 profile projection，并在terminal status仍未改变时追加一个 Engine-written、lineage-bound reentry handoff；
  - `recover` 只完成一个已 prepared operation 的 exact bytes/event，不接受新语义、目标或任意 patch。
- Eligibility SHALL 复用现有 `rerun-ready` gate definition 的 `rerun_count_limit` 作为唯一上限来源，并按 rerun phase 会先递增一次的真实顺序判断；若下一次计数必然触发 gate failure，C5 在 workspace 前阻断并只返回“由用户决定是否新建 bundle”的最近边界，不重置或绕过计数。
- 任意 pending C2 artifact-persistence workspace（尤其目标在 `final/`）或 accepted C3 topic-state workspace先归还给现有 owner：分别只建议 quiescent `sweep` 或 exact topic-state `recover`。C5 不在不稳定 final inventory 上建立 lineage，也不吞并 C2/C3 recovery。
- 将 post-final 用户 rerun 决定规范化为现有 HITL2 `rerun` outcome，通过 `transitions.chain.json`/manifest解析既有rerun target与status window，再生成新的合法 recovery handoff；随后由 Agent 复用正常顺序执行 `enter-phase phase-rerun`、`advance-status --to hitl2_recorded`、topic-state apply/recover、style、queue/work-unit、wave gate 与 Final 流程。C5不直接写status，Final不新增outgoing edge，不要求用户逐条运行命令，也不再进入 Final-owned 交互循环。
- Final 继续是 terminal delivery history。Recovery event记录 operation id、request digest、reason、previous Final handoff/load/status/profile摘要、new rerun target与lineage；既有 final files、evidence、receipt、ledger、gate attempts和历史路径全部原位保留，不被改写成“从未交付”。
- `human-directed` 不成为 persisted mode、CLI flag或权限 token。Change 明确威胁模型：Engine 能拒绝 autonomous lifecycle、非 terminal、stale/replayed、wrong-lineage 和 partial-operation 形状，但不能在同一 OS principal 内证明一句自然语言由谁输入；host permission/approval 仍是外部边界。Request只承载用户已决定的 rerun semantics，不能扩大 host permission，也不能授权 generic state mutation。
- Recovery 只开放 action `post_final_rerun`。Generic `state-seed`、任意 status/trace/file mutation、post-final repair-in-place与 developer state-jump继续保持 unavailable，留给后续独立 change。C5 本身不 adopt 历史 addendum；成功进入现有 rerun window 后，C3 已有的显式 `migrate_legacy` 才可按其 contract 处理 registry-external topic。因此 `_backlog/plans/human-override-and-state-mutability.md` 的通用 maintenance/debug 部分仍为 Partial。
- 每次 apply/recover 复用现有 direct validators，按accepted workspace→accepted C2/C3 owner→accepted C5 replay→fresh Final eligibility短路；发布 reentry handoff 前检查 terminal lineage、rerun limit、quiescence、canonical footprint与目标 status/profile shape。完成event→enter→advance后使用现有 source-window checkpoint `check-reentry --at hitl2_recorded`，并由recovery summary/current_node/event+load+phase_transition证明rerun entry；later normal handoff沿existing lifecycle证明descendant owner，不重新要求terminal Final，也不新增第二套 recovery controller。
- Net simplification：用一个显式 exceptional handoff替代 impossible predecessor-gate advice、手写 trace/status与 `_cache/addendum/` / `final/addendum/` 平行成功路径；routing复用existing HITL2 `rerun` chain lookup，topic mutation复用existing C3 transaction/reentry readers，不增加second transition table、Final outgoing edge、lifecycle mode、second Final loop、generic override shell、watcher、daemon、session manager、retry tree或新的 mutable progress truth。
- 本 change 修改 framework runtime behavior，需要 version bump，目标 `v0.27`。

最短合法闭环：`inspect direct Final lineage → 必要时用户只决定 rerun scope/risk → Agent submit retained request → apply 或 exact recover → enter existing phase-rerun → advance-status --to hitl2_recorded → check-reentry --at hitl2_recorded → existing canonical rerun pipeline`。用户只拥有新的 rerun语义与风险决定；Agent承担其后的合法机械执行；Engine裁决 terminal lineage、transaction、handoff、topic authority与postcondition。

## Capabilities

### New Capabilities

- `post-final-recovery`: terminal Final eligibility、retained rerun request、prepared profile+event transaction、exact recover、Engine-written lineage handoff与closed authority boundary。Requirement prefix 按项目规则预留 `POF`，在 apply 阶段首个 governance task 登记；status继续由existing `advance-status` owner同步，runtime不是第二套 lifecycle 或 generic recovery platform。

### Modified Capabilities

- `cli-phase-transition`: 接受一种 Engine-written、Final-lineage-bound exceptional reentry handoff，并让现有 `enter-phase`/handoff preflight在不伪造 gate attempt 的前提下消费它。
- `runtime-reentry-debuggability`: 识别 terminal Final eligibility、accepted post-final recovery workspace与新 reentry handoff；每个 root只返回 exact apply/recover/continue action，并继续保持 read-only。
- `content-delivery-phase-content`: 同步 Final body 与 delivery contract，把“post-final feedback通过 HITL2 rerun重入”的文档承诺落成一次已记录用户决定到现有 phase-rerun 的合法路径，同时保持 Final 非交互终态历史。
- `canonical-topic-state`: 让有效且未 supersede 的 post-final HITL2→rerun handoff成为现有 topic-state mutation window的第二种合法 witness；其它 post-final或 human-directed请求仍拒绝。
- `rerun-incremental-node`: 保持正常HITL2 chain入口与loop protection，同时把C5 event+route-bound load定义为第二种合法rerun入口；post-final不改写chain、不绕过rerun_count。
- `agent-command-surface`: 将 post-final recovery 的唯一人类边界缩为新的 rerun语义/风险决定；决定后 apply/recover、phase entry、audit和rerun pipeline继续由Agent执行。

## Impact

- 预计影响一个窄 post-final recovery helper/CLI、setup basename normalizer的pure shared提取、existing trace writer的durable exact append primitive、handoff/advance-status helper的 accepted-event解析、profile CAS与append-only trace审计、phase-status/reentry baseline、topic-state rerun authorization adapter、Final/rerun/command guidance、root regression及一个 incident-shaped disposable controlled case。
- Direct Source of Record保持不变：历史交付由现有 readiness→Final gate/load witness、final artifacts与trace证明；当前 rerun intent由 accepted request digest + current HITL2 profile投影承载；reentry authority只来自一个 Engine-written lineage-bound event；topic identity/progress继续由C3 registry/direct facts拥有。
- 不新增依赖，不使用环境变量，不新增通用 transaction service、authorization token store、approval daemon、lifecycle state、queue schema、progress ledger、second registry或parallel addendum authority。
