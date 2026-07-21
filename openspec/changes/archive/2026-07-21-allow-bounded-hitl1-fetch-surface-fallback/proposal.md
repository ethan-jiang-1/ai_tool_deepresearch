## Why

当前 HITL1 research-access probe 只允许对第一个 usable URL 执行一次 fetch；当 Coding Agent 的 native fetch surface 被 host policy 阻止、但同一已授权环境中的 `curl` 仍能读取该 URL 时，Agent 只能错误地记录 `unavailable` 并把本可机械完成的操作交还用户。BUG-096 在 production bundle `dpt_rb_ai-agents-enterprise-bpm-productivity` 再次复现了这一缺口（来源：`_backlog/bugs/BUG-096-web-fetch-curl-fallback.md`）；需要在进入 evidence-backed waves 前建立一个有上限、同 URL、无新状态的 fallback contract。

## What Changes

- 将 HITL1 probe 保持为至多一次 neutral search 和第一个实际 HTTP(S) 搜索结果，但允许 native surface 不存在或 native fetch 未返回真实 page content（blocked / unavailable / failed）后，对同一 URL 再执行至多一个 standalone shell fallback：`curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'`。
- 只有真实 page content 才能把现有 `research_access` 记录为 `available`；v0.39 HITL1 writer 记录最终实际成功的 `fetch_surface`，但该 optional audit label 仍不是 schema/Gate-required fact。若 native 与唯一 fallback 均失败，使用现有 `unavailable` branch 记录直接 reason，并停留在同一个 HITL1/Gate 边界。
- Agent 仅在 independently configured host shell/network permission 已允许该调用时自行执行 fallback、写入 observation 并重跑同一个 `hitl1-recorded` Gate；native policy failure 本身不构成 shell 授权，也不得触发 project permission 扩张。缺少合法 surface、需要新权限或必须由外部环境处理时，只把最小边界交还用户。
- 保持 `rb_profile.yaml#/research_access`、现有 schema、Gate、HITL1 `stop: yes` placement 和 probe evidence-exclusion boundary 不变；不增加 `fallback_used`、surface list、attempt history、retry state、controller 或新交互点。
- 更新 focused Markdown contract tests、现有 transcript observer 和 case-115 真实 HITL1 Subject Agent probe，使 deterministic evidence 只证明 bounded guidance/observer shape；从同一次 retained Subject transcript 的公开 tool-use/result events 能观察到 Claude `WebFetch` blocked/failed、exact `curl` 成功分支时才证明该 runtime 的 fallback behavior，未观察到时仅将该分支 claim 诚实记录为 `NOT_RUN`，不复制第二个 canary，也不把 Claude evidence 外推为 Codex runtime proof。
- 本 Change 只修 BUG-096 的 HITL1/main-Agent 路径；delegated Wave actor 的 fallback contract delivery 留给后续 `deliver-work-unit-role-contracts-to-actors`，因此本 Change archive 时不单独关闭整个 BUG-096。
- 本 Change 修改 `DPT_FRAMEWORK/` 行为，需要 framework version bump，目标版本为 `v0.39`；apply 时同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` banner。

最短合法闭环是：一次 neutral search -> 只检查第一个实际 HTTP(S) 结果且要求它满足 narrow eligible URL contract -> 至多一次 native fetch -> 仅在未返回真实内容且既有 host permission 独立允许时对同一 URL 执行一次 exact standalone fallback -> 写现有 direct observation -> 重跑同一个 Gate。第一条结果不合格时不得改选第二条。Direct Source of Record 仍是 `rb_profile.yaml#/research_access`，成功事实来自当前 invocation 真实返回的 page content，确定性 verdict 仍由现有 `hitl1-recorded` Gate 拥有。

Net simplification 来自删除“native fetch 失败后必须先交还用户、再由用户提醒 Agent 使用 curl”的隐含人类 co-runner 步骤，并避免建立 surface registry、fallback tree、retry history、派生状态或第二个 Gate。用户只拥有新的语义、权限或不可代理环境决定；Agent 拥有已授权的 search/fetch/write/Gate mechanics；Engine 继续只裁决现有 schema 与 Gate facts。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `pre-research-phase-content`: 修改 PRP-002、PRP-005，使 HITL1 research-access probe 在一次 search、一个 URL 的边界内允许 native fetch 后最多一个由既有 host permission 独立允许的 exact same-URL fallback，并保持现有 observation、evidence exclusion、HITL placement 和 Gate ownership。

## Impact

- Apply 预计修改 `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`、focused Markdown contract test、现有 case-115 Subject runner/playbook、现有 `observe-iterative-interaction-case.mjs` 的 case-115 verification branch 及其 focused integration test；不增加 Subject identity 或 playbook manifest entry。
- 不修改 `DPT_FRAMEWORK/schema/contracts/profile.mjs`、`hitl1-recorded` Gate definition/CLI、transition/status、Wave/work-unit actor guidance、evidence/provenance/receipt/ledger authority或用户决策 enum。
- 不新增依赖、CLI、schema 字段、持久状态或 runtime fetch implementation；fetch 仍由 Coding Agent 使用当前会话实际可用且已获权限的 surfaces 执行。
- Verification 必须区分 deterministic Markdown/shape assertions 与真实 external-call Agent behavior；fixture、mock page、搜索摘要或手写 profile success 不能证明 fallback 可用。
