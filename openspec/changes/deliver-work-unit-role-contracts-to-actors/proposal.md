## Why

production bundle `dpt_rb_ai-agents-enterprise-bpm-productivity` 中，Wave1 actor 首次产出的 paired outputs 被现有 dry-submit direct-output contract 拒绝；当前 v0.38 shared evaluator 与 canonical `dpt-evidence-extractor` role template 已经一致，真实缺口是 generated `task.md` / spawn prompt 只交付 exact path、canonical role 和 opaque contract ID，没有把已有 role guidance 与 minimum authoring semantics 送到 actor decision point（来源：`_backlog/bugs/BUG-098-wave1-output-contract-mismatch.md`、`_backlog/bugs/BUG-096-web-fetch-curl-fallback.md`）。这也使 role Markdown 中已存在的 fetch fallback guidance 无法稳定到达 delegated Wave actor，BUG-096 因而只完成了 HITL1/main-Agent 路径。

## What Changes

- 从 existing closed work-unit kind / `actor_policy.delegated_role_key` 派生 canonical role guidance ref，并把该 ref 投影到 generated `task.md` 与 spawn prompt；actor 在 search、fetch、output authoring 前读取该 canonical guidance，queue payload、Phase Agent 和 actor 均不能选择任意 role file。
- 由 existing direct-output contract owner 提供 bounded minimum authoring projection，使 task/spawn 在 exact required output 旁显示 contract-owned semantic requirements；shared evaluator 继续是唯一 deterministic verdict owner，projection 不复制 evaluator、不新增 fuzzy/semantic validator。
- 将 Wave0/Wave1/Wave2 被触碰 role 的共同 page-fetch behavior 收敛到一个 canonical Agent-facing guidance surface，并通过 role ref/task delivery 到达 actor；保留 built-in/browser/Node-first 与 bounded `curl` fallback，删除 active role 中过期 Python fetch fallback 和重复 chain。
- 保持 existing assignment contract、manifest/beacon/result schema、submit/receipt/ledger/Gate authority不变；不新增 actor-selectable role/contract ID、persisted role hash/snapshot、plugin registry、fetch controller、retry tree或第二 submit path。
- 新增 focused unit/integration verification，证明 closed role mapping、unknown/mismatch fail-closed、authoring projection同源、generated envelope delivery与无重复 validator；复用一个 real Wave1 actor case 证明 actor 首次产出而非 Phase repair 满足 paired direct contract，并在可观察的真实 blocked-native/fallback 条件下单独裁决 fetch branch，条件不存在时诚实 `NOT_RUN`。
- Apply 完成后，BUG-098 可关闭；结合已归档 `allow-bounded-hitl1-fetch-surface-fallback`，BUG-096 仅在 delegated actor evidence 达到各自 proof boundary 后整体关闭。BUG-097 不属于本 Change。
- 本 Change 修改 `DPT_FRAMEWORK/` behavior，需要 version bump，目标版本为 `v0.40`；apply 时同步 root `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` banner/current-release summary。

Direct Source of Record 保持分层且唯一：role identity 来自 registered kind 的 closed `delegated_role_key`；required output identity 来自 Engine-resolved `required_outputs[]` 的 exact path/role/`direct_contract`；minimum deterministic semantics 与 verdict 来自 existing direct-output contract owner；rich search/fetch/authoring guidance 来自 canonical role/shared Markdown。Generated task/spawn 只是这些 owner 的 decision-point projection。

最短合法闭环是：registered role + resolved required outputs -> Engine 派生 canonical role ref 和 contract-owned authoring projection -> generated task/spawn 要求 actor 先读 -> actor 自己 search/fetch/write -> existing dry-submit evaluator给同一 root -> actor修复同一 attempt或 Phase Agent按 v0.38 explicit replacement path处理。Net simplification 来自删除 actor 猜 opaque ID、Phase Agent 临场补 headings、重复 role fetch chain和 Python fallback；不增加第二 verdict、状态或恢复路径。用户只负责新的语义、风险、host permission或不可代理环境决定；Sub-agent执行已授权 research/output mechanics，Phase Agent执行 claim/dry-submit/repair/submit mechanics，Engine裁决 deterministic contract。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `delegated-work-units`: generated `task.md` / spawn prompt 从 validated manifest contract 投影 canonical role guidance ref 与 contract-owned minimum authoring requirements，同时保持 assignment、result、submit 与 ledger authority不变。
- `subagent-node-contract`: active role/shared guidance通过 closed role identity交付给真实 actor；共同 fetch guidance收敛为 JS/Node-first + bounded curl且不得重新引入 Python、用户 co-runner或自动 retry tree。
- `research-wave-phase-content`: role guidance 不再只由 Phase Agent读取后依靠临场转述；generated task明确把 canonical ref交给 actor，Phase Agent仍负责选择 registered kind并消费 Engine feedback，而不成为第二 contract author。

## Impact

- Apply 预计修改 `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`、existing direct-output contract owner/closed work-unit role mapping、shared/role Markdown及 focused tests；若 shared fetch guidance提取成立，只替换被触碰 roles 的重复内容，不建设 generic fetch subsystem。
- 不修改 queue payload选择权、assignment schema/version、manifest/beacon persisted shape、result schema、receipt、provenance、ledger、Gate、transition或lifecycle authority；不新增依赖、TypeScript或Python。
- Verification 必须区分 deterministic projection/wiring proof 与真实 actor behavior；fixture、手写 output、Phase Agent补 headings、叙述性 PASS或 mock network不能证明首次 actor compliance/fallback。
