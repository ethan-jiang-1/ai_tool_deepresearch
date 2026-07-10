## 0. Current Baseline Lock

- [ ] 0.1 验证 SWE-001、CPT-001、CPT-003、DEW-003：在改实现前确认当前 v0.18 surfaces：`buildGateResult()`/formal gate wrappers、`enter-phase` loaded markdown + `current_node` write、`advance-status` covered handoff vs bootstrap compatibility、`claimWorkUnits()`/CLI stdout；保留或补 characterization assertions，避免 cue 接入时改变 authority。

## 1. Continuation Projection

- [ ] 1.1 实现 SWE-001、CPT-001、CPT-003、DEW-003：增加无状态 continuation projection helper，输入调用方已拥有的 direct facts（node frontmatter、gate outcome、loaded-node status、claimed ids），输出稳定 `interaction` 与 `next_action` 以及少量 direct locator fields；helper 不读 bundle、不写状态、不读 trace、不执行 Markdown，并补 focused unit tests，确认不输出 confidence/policy/retry-tree/context-estimate/route-choice 字段。
- [ ] 1.2 实现 SWE-001：在 shared gate result construction/projection 路径为 stop:no pass/fail 附加 cue，pass 指向 `consume_check_next`、fail 指向 `repair_and_rerun_gate`；cue 只读 `check.passed`、`check.next`、current node frontmatter，不读取 `failed_rule_ids`/`masked_rule_ids` 做第二套 verdict。
- [ ] 1.3 验证 SWE-001：扩展 gate helper/CLI tests，覆盖 stop:no pass、stop:no fail、pass with null next、stop:yes HITL/research-access failure、unreadable frontmatter diagnostic，确认 top-level `continuation` shape 正确且不改变 routing、exit code、attempt durability、checkpoint 或 degraded authority。

## 2. Decision-Point CLI Outputs

- [ ] 2.1 实现 CPT-003：让 `enter-phase` 从 `assessNode()` 已缓存的 target frontmatter 生成最终 continuation block，仅在 route-bound `load_complete`、`current_node` 写入和 Markdown rendering 全部成功后追加；不要扩大 workflow loader schema authority。
- [ ] 2.2 验证 CPT-003：扩展 `enter-phase` integration tests，覆盖 stop:no、stop:yes、Final、stale route 和 current-node write failure，确认成功 stdout 以 `DPT_CONTINUATION_CUE` marker block 结束，失败输出不含成功 cue。
- [ ] 2.3 实现 CPT-001：让 covered `advance-status` 在 mutation 前验证 `rb_status.json#/current_node` 等于 witnessed handoff target，并从该 loaded node frontmatter 返回 continuation；缺失、handoff 不一致或不可读时不猜且不写 status/trace。
- [ ] 2.4 实现 CPT-001：保留 bootstrap compatibility source sync；仅当 `current_node` 已非空、匹配 computed target 且 frontmatter 可读时输出 loaded-node continuation，否则必须省略 `continuation`（可输出 explicit `continuation_diagnostic`），绝不凭 manifest/chain 猜“已加载”。
- [ ] 2.5 验证 CPT-001：扩展 `advance-status` integration tests，覆盖 Wave1 execute、HITL2 wait、Final delivery、unknown gate、covered invalid current-node rollback/no-mutation，以及 bootstrap success without loaded-node cue。
- [ ] 2.6 实现 DEW-003、SWE-006：在成功 work-unit claim 结果上附加绑定 `claimed_work_ids` 的 `inspect_and_poll_claimed_work` cue；空 claim/failure 不输出成功 continuation。
- [ ] 2.7 验证 DEW-003、SWE-006：扩展 work-unit claim CLI/engine tests，确认 `continuation.work_ids` 等于 `claimed_work_ids`，空 claim 无成功 cue，cue 不推断 readiness、不新增持久状态且不改变 lease/queue/index authority。

## 3. Agent Guidance And Observation

- [ ] 3.1 实现 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：更新 shared silent execution、Wave delegated polling、`COMMANDS.md`/RUN guidance，使 cue 被描述为立即动作 projection，而非 permission、completion proof、新状态机、entry witness、status witness 或 routing authority。
- [ ] 3.2 实现 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：新增或更新 controlled Agent playbook，使 gate、phase entry/status sync、claim 后的 cue 可被真实 Agent 读取；playbook verdict 文案必须区分“cue 已正确输出”与“真实 Agent 未 surfacing”。
- [ ] 3.3 验证 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：执行 controlled Agent observation，记录真实 stop:no run 在 gate、phase entry/status sync、claim 后是否继续；禁止用 mock 行为或脚本 fixture 声称真实 Agent continuation 已被保证。

## 4. Version And Verification

- [ ] 4.1 实现 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：更新 `CHANGELOG.md`，新增 `v0.19` 条目，概括决策点 continuation cues 与无持久状态边界。
- [ ] 4.2 实现 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：同步 `DPT_FRAMEWORK/RUN.md` 版本横幅与 `v0.19` 最新条目。
- [ ] 4.3 验证 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：运行 gate helper、enter-phase、advance-status、operate-work-unit 和 silent guidance focused tests，确认原 authority、mutation、exit-code contract 无退化。
- [ ] 4.4 治理 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：核对 reused requirement registry 与新增 `@impl` 标注后，运行 `node openspec/governance/check-project-reqs.mjs`，必须达到 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired。
- [ ] 4.5 治理 SWE-001、SWE-006、CPT-001、CPT-003、DEW-003：运行 `node openspec/governance/check-project-specs.mjs`，必须达到 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader。
