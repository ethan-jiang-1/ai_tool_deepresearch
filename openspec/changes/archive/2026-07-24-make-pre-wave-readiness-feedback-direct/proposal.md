## Why

`BUG-100`--`BUG-102` 暴露的不是三个互不相干的 Gate 问题，而是一条正常的 pre-Wave producer loop 没有在最早可修的决策点闭合：HITL1 把 access observation 限成第一个结果、canonical topic-state 误用 Gate 后 status window、seed topic 的 YAML/frontmatter 直到 phase-end Gate 才第一次解析。Agent 因而需要通过一次本不必要的失败才能发现合法操作，或把一个可局部诊断的格式错误带到整段 queue 工作结束后。

本 change 只建立一条可审计的 readiness loop：已记录的 HITL1 决定 -> canonical topic state/seed skeleton -> 一次有界 access observation -> seed authoring 的同源 local check -> 既有 Gate。它不放宽 Gate，也不把 Engine 变成 search、写作或 workflow controller。

来源：`_backlog/bugs/BUG-100-research-access-probe-first-result-false-negative.md`、`BUG-101-topic-state-apply-sequencing-contradiction.md`、`BUG-102-seed-topic-yaml-validation-at-gate-not-authoring.md`，以及 `_backlog/plans/wave-execution-and-gate-remediation.md` 的 Change 1。

## What Changes

- 将 HITL1 capability probe 保持为一次 neutral search，但按返回顺序考察最多前三个 syntactically eligible actual HTTP(S) candidates；每个 candidate 只走现有 native-first、同 URL、至多一次 permitted `curl` fallback。持久化的仍是一条 final `research_access` observation，只增加有界 candidate count/final ordinal，不保存 query、URL history、page bytes 或 retry state。
- 将 HITL1 已有的 bootstrap-compatible status synchronization 变成显式 producer step：记录用户决定后先执行既有 `advance-status --to hitl1_recorded`，再运行现有 `operate-topic-state apply`、style/probe 和同一个 Gate。它不修改 topic-state authorization、Gate rule 或状态机，只移除 Agent 必须先碰一次失败才能发现的隐藏顺序。
- 让 `seed_topic_materialize` 的 non-delegated queue completion 在 terminal queue mutation 前调用从 seed-topics Gate 抽出的同一 deterministic authoring evaluator。它只检查当前 queue card 所声明的 seed bytes/path、frontmatter parse 和既有 canonical identity/binding；失败返回该声明文件的直接 repair coordinates，不把 body/semantic quality 或一般 `done_condition` 变成新的 Engine linter。最终 Gate 继续拥有全集合、queue drain、trace 与 phase-boundary verdict。
- 为上述三段添加 focused unit/integration/deterministic-E2E coverage，并更新一个真实 Subject Agent HITL1 playbook。外部 search/fetch 行为仅由真实调用证明；没有可用真实 runtime 时，该 claim 必须为 `NOT_RUN`。
- `DPT_FRAMEWORK/` 行为会改变，目标 framework version 为 `v0.45`；apply 时更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 的 release projection。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `schema-core`: 修改 SCO-002 的 `research_access` discriminated observation，使其能承载有界 candidate count/final ordinal，同时保持单一 final direct observation 与 legacy compatibility。
- `pre-research-phase-content`: 修改 PRP-002、PRP-005，使 HITL1 明确 pre-Gate topic-state sequence、前三个 eligible candidate probe、诚实 unavailable/no-advance branch 与 payload checklist。
- `agentic-queue`: 修改 AGQ-002、AGQ-009，让仅有 `seed_topic_materialize` 在 existing receipt 后、terminal queue mutation 前运行一个共享 deterministic seed evaluator；失败保持 queue authority bytes，最终 Gate 复用同一 pure core。它不把一般 card `done_condition`、body skeleton 或 semantic quality 变成 Queue Manager contract。
`pre-research-gate-implementation` 的 PRG-002/PRG-009 与 `canonical-topic-state` 的 CTS-003/CTS-004 已经定义上述 status window、Gate 和唯一 topic-state writer；本 change 只把既有 legal sequence 交付到 HITL1 control surface，不额外创建 delta spec 或 requirement ID。`seed-topic-materialization` 的 STM-001/STM-002/STM-003 已经定义 seed authoring 与最终 Gate 的 existing deterministic boundary；本 change 通过 AGQ delta 将这一个 boundary 前移到 card completion，而不新增 requirement ID、second parser 或 generic validator。

## Impact

- 预计修改 HITL1 Markdown、profile/topic-state/Gate/queue helper 与 CLI wiring、seed-topic Gate evaluator、对应 root `tests/`、现有 disposable playbooks，以及 v0.45 release projection；不新增 dependency、第二 lifecycle state、generic YAML linter、search client、retry controller、new HITL 或 alternative Setup/Wave route。
- Direct Source of Record 不变：`rb_profile.yaml#/research_access` 是 access observation；既有 `rb_status.json` window 与 `advance-status` 是 topic-state authorization；`rb_plan.md` 与 UID-bound seeds 是 canonical topic intent；current seed bytes 是 authoring evaluator input；queue JSON 是 completion mutation authority；Gate result/trace 是 phase verdict authority。
- 最短合法闭环是：HITL1 decision -> existing status sync -> canonical apply -> style/probe -> same Gate -> existing handoff；以及 seed write -> same parser/evaluator at queue completion -> queue drain -> final Gate。它删除了一次依赖 late Gate 才发现 producer error 的路径，合并 seed authoring 与 Gate 的重复解析方向，并避免了 URL history、second validator、manual status edit、retry tree 和 controller。
- 用户只决定 HITL1 semantic choices、新的 host permission 或不可代理环境动作。当前 Agent turn 在既有 permission、legal operation 和 direct facts 已具备时执行 apply, probe, queue completion repair 与 same-check rerun；Engine 仍只裁决 schema、authorization、parser/evaluator、queue mutation 与 Gate verdict。没有 legal path 的结果必须返回 owner、terminal 或 missing-contract boundary，而非诱导手改 authority。
- 本 change 的 deterministic tests 证明 contract、status/window、parser reuse 和 no-mutation failure；真实 disposable Agent flow 才能证明 Agent 实际执行 probe/authoring loop；真实 external search/fetch 才能证明 access behavior。fixture、console output、手写 profile/status/trace 都不能闭合后两类 claim。
