## Why

当前 Final 在首份报告写出后立即结束交互，用户只有看到成品后才暴露出来的读者、结构、篇幅、解释深度和证据呈现偏好，没有合法的原地修订路径；同时所有修改若继续写同一文件会覆盖历史。原始问题、命名诉求和触发案例来自 `_backlog/plans/iterative-final-delivery-versioned-output.md`，本次启动对话进一步澄清：首次进入 Final 必须先直接交付首版，随后保持在同一个 Final node 中等待、修订、再交付，直到用户表示满意；只有需要新增研究证据时才离开 Final。

## What Changes

- **BREAKING — Final interaction semantics**：`phase-final.md` 从 terminal non-interactive delivery 改为 terminal interactive refinement。它仍然 `gate: null`、无 `next`、不进入 transition table，但使用 Final 专用的 `stop: "yes"` 语义：首次进入先产出，不先问；首版提交后邀请并等待用户反馈；每次合法修订后继续留在 Final。
- 引入一条 scope-bounded、无固定轮数的 Final refinement loop。这里的
  `final` 始终指用户在当前交付语境下拿到的主报告，不预先绑定某个
  “烦恼点”、view 或 feature。改读者、view、结构、篇幅、措辞、现有证据
  的解释/显隐和章节属于原地修订；需要新来源、新 Topic、新研究结论或
  变更 research profile 的请求继续走已有 audited post-final rerun。
- 将 primary Final series 规范为：全新 bundle 第一次合法进入 Final 且 primary inventory 为空时写 `final/final.md`；后续 presentation revision，以及 audited rerun 后再次形成的合法 Final delivery，都在同一 bundle 内全局单调追加 `final/final_v<N>.md` 或 `final/final_<feature>_v<N>.md`，`N` 从 1 开始且跨有/无 feature 的文件共享同一序列。`<feature>` 是可选安全 `snake_case` 标签，不是版本 authority。
- 在 `enter-phase` 的 Final entry admission 中建立发布前基线：一个从未合法进入 Final 的 bundle 只有在 canonical primary inventory 为空时才能写首个 route-bound Final `load_complete`；accepted C5 后返回 Final 时，完整安全 Final inventory 必须在新 load 前精确等于该 C5 事件绑定的 prior inventory digest。提前写出的 primary-looking 文件、inventory drift 或缺失/冲突的 C5 witness 均在 entry mutation 前阻断，不按 mtime、文件名顺序或内容猜创建时序；已有已进入 Final 的 legacy bundle 保持只读兼容。
- 在既有 artifact-persistence Module 的 seam 增加一个小接口 `publish-final-report`：调用者只提供 retained staging report 和可选 feature；Engine 从 canonical Final inventory 分配目标、串行化 publication、执行 Evidence Map admission、使用既有 crash-safe atomic writer，并拒绝覆盖或手工指定 reserved primary-series target。publisher 只建立机械 publication 事实；合法 Final delivery 仍由 readiness-to-Final lineage 与 committed primary report 共同建立。
- Primary series inventory 是版本号、latest committed version 和 legacy-base classification 的 direct Source of Record，不新增 profile counter、满意状态、Final Gate、`final_delivery` trace event或第二份 current pointer。用户说“满意”只结束当前交互，不伪装成 Engine verdict。
- 保留历史 bundle：若合法 Final lineage 下没有 `final/final.md` 且恰有一份既有 Markdown 主报告（例如 `final/report.md`），将其只读分类为 legacy v0，第一次修订追加 v1；多个无法区分的 legacy candidates 明确返回 ambiguity，不按时间或目录顺序猜。
- Final view 修订不回写当前 Final lineage 的 HITL2 `final_report_view` / `composition_handoff`，避免把 presentation preference 伪装成该 lineage 的 accepted delivery semantics。Final Agent 以当前 latest report、当前 lineage 的 accepted handoff、verified evidence 和当前用户反馈完成语义修订；audited rerun 后的新 HITL2/Readiness lineage 可通过原有流程建立新的 accepted handoff，但不能重写旧 lineage 或旧报告。Engine 不判断“technical deep dive 是否足够深入”。
- 新会话/中断恢复继续以 `rb_status.json.current_node`、Gate window 和 route-bound handoff/load 为 control-surface coordinates；reentry projection 在没有显式 rerun 请求时返回当前最近 owner，而不是把所有 clean Final 都只投影为 post-final rerun。若较新的合法 Readiness→Final handoff 来自 accepted C5 lineage，则无 load 时先返回 `enter-phase`，有 load 但未同步时先返回 `advance-status`；只有 terminal Final window 成立后，C5 事件绑定的旧 Final inventory digest 才区分 immediate publication 与普通 refinement。
- 增加 deterministic contract coverage 与一个真实 Agent multi-turn `agent_flow_e2e`：用一个无网络、单 Subject session 的五次 supplied turn 证明首次先交付、两轮反馈各追加一个版本、仍停留 Final、满意不产生新状态，以及随后同一 lineage 上的新增证据请求才选择/accept 现有 rerun。fixture/static checks 不冒充用户满意度或报告质量证据。
- 本 Change 不新增第三个 HITL、Final Gate、outgoing transition、硬性修订轮数、report-quality Engine verdict、profile revision counter、自动研究或历史版本覆盖/删除。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md` | Modify | CDP-003/004/005/006 已拥有 Final phase、terminal delivery、post-final routing、delivery evidence 与 Final persistence；每个合法 Final lineage 先完成自己的交付，随后原地修订，属于同一 observable phase behavior。 |
| `workflow/workflow-node-contract` | `openspec/specs/workflow/workflow-node-contract/spec.md` | Modify | WNC-005/008/009 已拥有 Final terminal metadata、header injection 和 stop placement；必须表达 `gate:null + stop:yes` 的先交付后等待组合。 |
| `workflow/silent-wave-execution` | `openspec/specs/workflow/silent-wave-execution/spec.md` | Modify | SWE-004 当前把 HITL1/HITL2 之外的等待与 Final 一并排除；需要只保留 silent middle，并把 Final refinement 明确为 terminal delivery exception 而非第三个 decision checkpoint。 |
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md` | Modify | ARP-004 已拥有 Final Markdown admission 与唯一 crash-safe writer；版本分配、reserved target 和不可覆盖必须深化这一 Module，而不是另造 writer。 |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md` | Modify | RUE-005 当前把 collaboration rhythm 写成 Final terminal delivery 而非 interaction loop；入口需要准确呈现 bundle base 或 post-rerun next version 交付后仍在 Final 打磨。 |
| `engine/runtime-reentry-debuggability` | `openspec/specs/engine/runtime-reentry-debuggability/spec.md` | Modify | RRD-007/008 已拥有 `current_node` resume 与 clean Final root projection；中断后必须从 lineage + inventory 区分 immediate delivery 与 refinement，显式 research rerun 才选择 C5。 |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Modify | POF-001 当前是唯一 post-final mutation/reentry path；需明确它只承接证据/研究扩张，不吞掉 presentation-only Final revision，并在较新 Final handoff 后保留 prior-inventory witness，直到新版本完成交付绑定。 |
| `research/content-delivery-experiments` | `openspec/specs/research/content-delivery-experiments/spec.md` | Modify | CDE-003 已拥有 Final delivery tail 和 Final Agent-behavior proof边界；应选择一条受限的真实 multi-turn refinement case，不能用 Markdown regex 证明交互。 |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md` | Modify | ACS-001 当前把 Final 明确排除为 post-delivery repair surface；需保留 Agent-owned command responsibility，同时授权 Final presentation refinement 和 publication 命令，不把用户变成 CLI co-runner。 |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md` | Verify-only | Final refinement 是交付协作而非 HITL decision/Gate checkpoint；复用 recommendation-first、minimum clarification 和中文交互姿态，但不扩张 HITL1/HITL2 owner。 |
| `engine/cli-phase-transition` | `openspec/specs/engine/cli-phase-transition/spec.md` | Modify | CPT-003 已拥有 route-bound `load_complete` 与 `current_node` entry witness；必须在首个 Final load 前证明空 primary baseline，并在 accepted C5 返回后的新 Final load 前证明完整 inventory 仍等于 event-bound prior digest。cue enum 保持不变。 |
| `research/final-delivery-backing` | `openspec/specs/research/final-delivery-backing/spec.md` | Verify-only | FDB-001/002 已适用于每一份 Final Markdown；所有版本继续逐份 admission，不改变 submitted-backing 或语义质量边界。 |
| `research/content-delivery-gate-implementation` | `openspec/specs/research/content-delivery-gate-implementation/spec.md` | Verify-only | Readiness 仍是最后 Gate，Final 仍无 Gate；本 Change 不新增或修改 delivery Gate verdict。 |
| `governance/guidance-constitution` | `openspec/specs/governance/guidance-constitution/spec.md` | Verify-only | `helper-oriented-agent.md` 中把 terminal 与 non-interactive 绑定的当前投影需随 accepted behavior 对齐，但不改变 Charter topology、guidance authority 或 GCO requirements。 |
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md` | Excluded | 不改 `ProfileSchema`、HITL2 handoff 或 lifecycle state；publication/inventory result schema 留在既有 artifact-persistence owner。 |

## Capabilities

### New Capabilities

无。Final phase、workflow placement、artifact persistence、run entry、reentry、post-final rerun 和 delivery experiment 已覆盖全部可观察行为；新建 capability 会制造平行 owner。

### Modified Capabilities

- `research/content-delivery-phase-content`: 每个合法 Final lineage 先交付（空 bundle 写 base，post-rerun 追加 next version）、随后原地等待/修订、满意退出当前 turn、研究扩张才 rerun，并使用 canonical primary series。
- `workflow/workflow-node-contract`: 定义 terminal interactive Final 的 metadata/header/continuation 语义，同时保持无 Gate、无 next。
- `workflow/silent-wave-execution`: 将 Final refinement 从 non-terminal silence 中明确排除，但不把它称作第三个 HITL decision checkpoint。
- `bundle/artifact-persistence-recovery`: 增加 Engine-owned primary Final publication、全局单调版本分配、reserved target、legacy-base 与 crash/concurrency recovery contract。
- `bundle/run-entry`: 对外呈现“current-lineage Final 先交付 -> 原地反馈/追加版本 -> 满意”的默认协作节奏。
- `engine/runtime-reentry-debuggability`: clean Final 以 prior-inventory binding 恢复到 immediate delivery 或 current refinement owner，显式 evidence-expanding request 才选择 post-final rerun。
- `research/post-final-recovery`: 把 presentation refinement 排除在 C5 之外，保留 research/evidence rerun 的唯一 audited authority，并在 rerun 返回 Final 时提供 prior-inventory delivery witness。
- `research/content-delivery-experiments`: 增加真实 multi-turn Final refinement 的受限 agent-flow proof，并保持 deterministic/semantic claim 边界。
- `agent/agent-command-surface`: 让 Agent-facing 命令文案呈现 Final deliver-first refinement，并保持 publication、repair、rerun mechanics 全由 Agent 执行。
- `engine/cli-phase-transition`: 在写首个 route-bound Final `load_complete` 前建立空 bundle 或 event-bound prior inventory 的发布前基线，同时保持 load 后的既有 Readiness status synchronization、entry/status writer 分工与 legacy 已进入 bundle 兼容。

## Semantic Precision

`Final refinement` 回答 Final Agent 和用户的一个有界问题：**在不改变当前 verified research boundary 的前提下，当前 latest Final 是否需要另一份面向用户偏好的呈现版本？** 它保留会改变答案的区别：当前 lineage 尚未交付/已有 bound latest、空 bundle base/post-rerun global append、presentation-only revision/需要新证据、清楚反馈/实质歧义、canonical/legacy/ambiguous series，以及 committed/uncommitted publication。用户说满意与 Engine publication verdict 也保持分离。

正常停止点是 `legal readiness-to-Final lineage + Final entry baseline + route-bound load + Readiness source Gate/status window + current_node + canonical inventory + accepted prior-inventory witness（如有）+ current user turn`：首个 Final load 先证明 empty primary baseline，post-C5 Final load 先证明完整 prior inventory 未变，load 后先完成既有 status synchronization；terminal Final window 成立后，当前 lineage 尚未交付时必须写 base 或 next global version；已有 bound latest 且用户提出 presentation feedback 时再追加一个版本；用户满意时停止当前 turn；请求越过 evidence boundary 时进入现有 rerun。无需从 chat history 重建版本号，也不把满意度、报告质量或 view 深度变成机器事实。

## Control And Responsibility

Direct Source of Record 是合法 readiness-to-Final lineage、`enter-phase` 在首个 route-bound Final load 前执行的 inventory admission、route-bound load、Readiness status synchronization、`rb_status.current_node`、canonical primary Final inventory、accepted C5 event 绑定的 prior Final inventory digest、existing submitted backing 和 artifact-persistence workspace。文件名表达版本/feature；Engine 从 inventory 分配下一个全局 `N`，Agent 不手算，profile 不保存 duplicate counter。artifact-persistence publisher 不验证或建立 lifecycle lineage；它的 committed verdict 必须与独立 entry/lineage witness 合取后才构成合法 delivery。较新的 Final handoff 先交给既有 entry/status owners，不会把旧版本自动冒充新 lineage 的交付；其 load 前必须精确复现 prior inventory，terminal status window 后还必须证明至少追加一个 canonical version。

最短合法闭环是：

```text
enter-phase admits empty first baseline or exact post-C5 prior inventory
  -> enter Final
  -> synchronize the Readiness source Gate window
  -> Agent 从 accepted handoff + verified evidence 写首版 staging
  -> Engine publish-final-report -> final/final.md
  -> Agent 展示并等待反馈（仍在 Final）
  -> presentation feedback -> Agent 修订 latest staging
  -> Engine publish-final-report -> final[_feature]_vN.md
  -> 展示并继续等待
  -> satisfied: 停止当前 turn；new evidence: existing audited rerun
  -> rerun 后再次合法进入 Final: 追加 latest + 1，再展示并等待
```

这条闭环删除或避免四类复杂度：不新增 profile counter/current pointer，不复制 Final-backing validator，不回写 HITL2 handoff，不为满意度增加 Gate/state。用户决定报告是否满意及新的呈现语义；Agent 负责边界判断、最小澄清、写作与合法命令；Engine 只负责 lineage eligibility、series classification、serial allocation、path/immutability、backing admission、atomic commit/recovery。Engine 不裁决报告是否“真的更技术化”。

## Impact

- Workflow/controller：`phase-final.md`、workflow loader terminal header、continuation cue、silent/entry/command guidance，以及 `helper-oriented-agent.md` 的有效 Final interaction 投影。
- Engine/CLI：深化 `engine/helpers/artifact-persistence.mjs` 与 `operate-artifact-persistence.mjs`（或在同一 Module seam 下提供等价窄 adapter），为 `enter-phase` 增加 Final inventory admission，并调整 clean-Final reentry projection；无新增依赖。
- Runtime outputs：新 bundle 的 primary report 为 `final/final.md`，修订只追加 canonical version；旧版与 submitted evidence 不删除、不改写。
- Verification：focused publication/inventory unit + CLI integration + delivery deterministic E2E + 一个真实 Agent multi-turn `agent_flow_e2e`；报告有用性和最终满意度仍需真实用户/Agent observation，不由 Node fixture证明。
- Compatibility：已有 arbitrary `final/*.md` 仍可作为 supplementary/historical artifacts；reserved primary names 只能走新 publication interface。已存在 route-bound Final load 的历史 bundle 可把单一 legacy primary 只读分类为 v0；尚未进入 Final 的 bundle 不得用 legacy-looking 文件绕过新的空基线 admission，ambiguous legacy set fail closed。
