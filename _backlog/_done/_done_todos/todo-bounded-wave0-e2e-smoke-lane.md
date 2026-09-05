# TODO: bounded-wave0-e2e-smoke-lane（单线短时端到端回归）

> 状态: 待设计 | 优先级: 高 | 更新: 2026-08-19
> 目标: 为 Agent Experiment 建立一条可在短时间内稳定跑完的真实端到端“细线”
> 直接背景: case-717 两次真实 Subject 执行均在长 rerun 完成前进入 ERROR；现有 Autorun 没有短时语义回归车道
> 相关: `DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs`、`experiments_env/shared/run-iterative-interaction-subject.mjs`、Wave0 accepted contracts、现有 light playbooks

## 结论先行

需要建设的是一个 **Agent-flow smoke lane**，不是一个更宽松的 PASS 规则，也不是把
fixture-backed Wave0 测试改名为端到端。

推荐的最小路径是：

```text
fresh disposable bundle
  -> legal HITL1/setup boundary
  -> one canonical Topic
  -> one bounded Wave0 source-intake demand
  -> one real Subject Phase Agent turn
  -> at most one real bounded source-intake child/search action
  -> existing work-unit claim -> submit -> Wave0 inspect/gate
  -> one case-owned native completion
```

这条路径只证明“当前 Agent/Engine/queue/work-unit/Wave0 这根线能合法闭环”，不跑
Wave1、Wave2、Final、rerun、C5、跨 Topic synthesis，也不要求搜索饱和。它必须保留
真实 Agent、真实生产 CLI、真实 receipt/ledger/inspect/gate 和真实 completion；否则
只能归类为 deterministic fixture，不是本 TODO 的目标。

## 为什么现有机制不够

| 观察 | 后果 | 设计含义 |
| --- | --- | --- |
| `light` 只是 playbook 成本标签，不限制语义任务大小 | light case 仍可能包含多轮 Agent、多个 work unit 或真实搜索 | 需要一个明确的短路径 contract，而不是只改标签 |
| Autorun `--timeout` 是宿主生命周期边界 | 延长 timeout 只能让长任务多跑，不会减少任务扩散 | 短时性必须由 playbook/Subject turn 的 bounded objective 产生 |
| Subject adapter 按 case id 选择 prompt/timeout | 每个历史 case 各自声明，难以统一迁移 | 复用现有 adapter/runner，集中一个最小 smoke profile |
| Wave0 fixture case 能很快完成 | 无法证明 Agent 的语义 authoring、claim、submit 或真实 child 行为 | fixture 与 real Agent evidence 必须双轨标记 |
| native completion 由 case-owned trace 绑定 | 不能由 Supervisor 根据“看起来完成”补 PASS | smoke lane 仍只接受 native completion；缺失就是 ERROR，依赖不可用才是 NOT_RUN |

## 目标行为

### Smoke lane 必须证明

1. 一个 fresh disposable bundle 能到达合法 Wave0 前置边界。
2. Subject Agent 在一个 bounded turn 内读取现有控制/Topic/task brief，做出最小
   Wave0 行动，并使用现有生产命令。
3. 最多一个 canonical Topic、一个 Wave0 demand、一个 work-unit attempt；不得
   因 repair、并发或历史队列自然扩散成第二条研究支线。
4. 搜索/抓取有明确上限（建议最多一次 search + 一次 fetch，具体数值在 explore
   时由现有 adapter/tool contract 定案）；超出边界应为可观察的 limitation 或
   honest failure，而不是悄悄继续搜索。
5. 结果经过现有 work-unit submit、ledger/receipt、Wave0 inspect/gate，并由 case
   自己写出一次 native completion。
6. 失败分类保持原语义：Subject/工具真正不可启动为 `NOT_RUN`；已启动但超时、
   缺 completion、非法结果或语义失败为 `ERROR`/`FAIL`，不得降级为 PASS。

### Smoke lane 不得证明

- 研究质量、来源充分性、跨 Topic 关系、Wave1 深化、Wave2 synthesis、Final 交付；
- 通用 Agent interpretation quality、用户满意度或长流程稳定性；
- “搜索结果存在”就等于 evidence quality；
- 一个 fixture 输出可以代表真实 Subject/child；
- 未来所有历史 playbook 都会自动变短。

## 推荐机制形状

### 首选：既有 playbook/runner 上的 bounded smoke profile

优先探索一个 Agent-facing 的 **smoke profile**，其值只表达这条测试路径的边界：

- one-topic Wave0 setup；
- one current demand / one work-unit attempt；
- one Subject turn；
- bounded search/fetch allowance；
- short Subject timeout and aggregate hard cap；
- native completion required。

实现时优先复用现有 playbook frontmatter、case-cost 体系、Subject adapter、
`run-agent-experiment.mjs`、work-unit CLI 和 Wave0 inspect/gate。只有在现有
contract 无法表达上述边界时，才考虑新增一个经过 OpenSpec 批准的声明字段；不得先
新增 runtime state、queue kind、schema authority、Gate、retry controller 或第二
套 completion。

### 不推荐的方案

| 方案 | 不采用原因 |
| --- | --- |
| 只把 case 文件名从 `heavy` 改成 `light` | 成本标签不会减少 Agent 任务或搜索扩散 |
| Supervisor 到时强杀后算 PASS | 把 lifecycle error 伪装成行为证明，破坏 native proof boundary |
| 写一个旁路 `run-smoke-e2e.mjs` | 会形成第二个 runner/authority，历史 playbook 无法共享同一 contract |
| 用 fixture 生成 Subject result，再跑 Wave0 gate | 只能证明 Engine mechanics，不是 Agent-flow E2E |
| 为 smoke lane 新建 `smoke` lifecycle state 或 Gate | 把测试预算问题扩张为生产生命周期概念 |
| 让 smoke lane 自动 fallback 到更少步骤并仍判 PASS | 路径变化不可见，结果不再能说明具体机制是否跑通 |

## 需要先回答的设计问题

1. **边界在哪里？** 是从 setup/HITL1 到 Wave0 gate，还是允许从已有合法 Wave0
   boundary 直接开始？推荐默认前者，另提供 deterministic setup-only fixture，
   不让 Subject 负责搭环境。
2. **真实 Agent 的最小语义义务是什么？** 推荐只要求读取当前 controls/seed/task
   brief、选择一个 bounded source-intake action、等待 child/CLI 完成并完成现有
   submit/inspect；不要求写长报告。
3. **是否需要 real child？** 若目标是 Wave0 delegated path，至少一次真实
   `dpt-source-intake` child 才能证明 actor boundary；若认证/工具成本过高，应
   把“Subject-only Wave0 smoke”与“Subject+child canary”拆成两个明确 case，不能
   混为一个 PASS。
4. **搜索预算如何表达？** 优先用现有 adapter 的 turn/tool boundary；只有直接
   contract 缺失时，才设计 bounded tool allowance。不要把搜索次数写成 Engine
   semantic verdict。
5. **短时失败如何诊断？** 必须分别保留 Subject prompt/transcript/result、run
   report、bundle trace 和 native completion；timeout 只能解释为 ERROR，不能自动
   变成 NOT_RUN。
6. **历史 playbook 如何受益？** 先迁移一到两个最小 Wave0/ready light case 作
   canary，再提供逐 case adoption checklist；不对全部历史 playbook 做一次性重写。

## 分阶段执行计划

### Phase A: Explore and freeze the bounded question

- [ ] 盘点现有 `light` playbooks 的真实耗时、Subject turn 数、child 数、Wave0
      demand 数和 completion 路径，选择一个最小可复用基线。
- [ ] 对照 accepted Wave0/work-unit/Agent Experiment contracts，确认哪些边界已有
      owner，哪些仅是 playbook prose，禁止把缺口误报成新 runtime capability。
- [ ] 用一次 deterministic dry-run 验证 setup -> one Wave0 demand -> native completion
      的最小机械骨架，不把 fixture PASS 当作 Agent 行为证据。
- [ ] 产出一页 bounded smoke contract：输入、唯一生产路径、预算、直接证据、终止
      条件、PASS/FAIL/NOT_RUN/ERROR 语义和明确 non-goals。

### Phase B: Propose one focused OpenSpec change

- [ ] 由 Explore 结论决定是否需要变更 accepted behavior；若只需既有 playbook
      约定，先不新增 schema/field。
- [ ] 若确需声明 smoke profile，建立一个最多覆盖 runner/adapter/playbook
      contract 的 focused change，明确不新增 lifecycle state、queue kind、Gate 或
      completion authority。
- [ ] 为 smoke case、历史 light case adoption、deterministic contract tests 和
      real Agent-flow evidence 分别指定 proof boundary。
- [ ] 将 runtime budget、tool cap、one-line route 和 migration scope 写成可审核
      的 tasks，不把“跑得快”作为不可观察目标。

### Phase C: Implement the smallest canary

- [ ] 复用现有 disposable-bundle、Subject adapter、work-unit CLI、Wave0 inspect/gate
      和 native finalizer；不创建旁路 runner。
- [ ] 先实现一个 one-topic/one-demand/one-attempt smoke playbook，并把每个
      Playbook Agent 与 Subject Agent 动作写清楚。
- [ ] 加 deterministic static/contract checks：边界未扩散、唯一 queue/work-unit、
      bounded task brief、completion 绑定、缺失依赖分类诚实。
- [ ] 加一个短时 real Agent-flow autorun；保留完整 prompt/transcript/result/report
      坐标，并设置单次执行、无自动 retry、显式预算。
- [ ] 记录首次失败根因；不得通过降低 verdict 标准或写 synthetic completion 修复。

### Phase D: Adopt into historical playbooks selectively

- [ ] 选择 1-2 个过去耗时过长但语义边界清楚的 playbook，改写为 smoke canary 或
      增加同 case 的 bounded variant；保留原 heavy/standard case 作为完整证据。
- [ ] 为每个迁移 case 记录“证明了什么/没有证明什么/预算/证据角色/运行坐标”。
- [ ] 比较 smoke 与完整 case 的覆盖差异，确认 smoke 不是静默删步骤后冒充完整回归。
- [ ] 只有两个以上 case 稳定通过且失败分类清晰后，才考虑把 profile 作为历史
      playbook 的默认短回归入口；默认不改变原有重回归。

### Phase E: Closeout and maintenance

- [ ] 运行 focused tests、workflow package validation、manifest/governance checks 和
      smoke autorun；分别记录 deterministic 与 real-Agent 结果。
- [ ] 将首个 smoke lane 的报告/诊断坐标写入 change-root evidence，保留 residual
      semantic risk。
- [ ] 为“单线预算超时”“依赖不可用”“child 未完成”“submit/inspect blocker”建立
      最小诊断表，不增加第二套 verdict。
- [ ] 归档 change；后续历史 playbook 迁移以小批次独立 changes 进行。

## 预期文件/责任面（仅计划，不代表已授权修改）

| 面 | 可能触及 | 责任 |
| --- | --- | --- |
| Agent Experiment contract | `DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs` | 仅在现有 frontmatter/成本声明不足时调整声明 contract |
| Supervisor | `DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs`、`.../agent-experiment-supervisor.mjs` | 预算/超时/报告机械边界，不做语义判断 |
| Subject adapter | `experiments_env/shared/run-iterative-interaction-subject.mjs` 或共享抽象 | 单 turn/child/tool 边界与原始证据保留 |
| Wave0 playbook | `experiments_playbook/exp_wfn_wave0/` 或独立 smoke playbook | 一条生产路径、明确 non-goals、native completion |
| Tests | `tests/integration/md/`、`tests/deterministic_e2e/`、`experiments_playbook/` | 静态/机械/真实 Agent-flow 分层，不混淆证据 |
| Accepted specs | 仅在 behavior contract 变化时通过 OpenSpec | 维护 owner、proof boundary、兼容路径 |

## 成功标准

- 一次 smoke autorun 在声明的短预算内完成或诚实终止；运行时间有报告坐标，而非
  依赖主观感觉。
- PASS 必须同时有 native completion、one-line Wave0 trace/work-unit/inspect/gate
  证据和 real Subject evidence；fixture 只能独立报告 deterministic PASS。
- 任何超时、缺 completion、真实 Subject 已启动后的失败都不被重标为 NOT_RUN。
- smoke lane 不改变完整研究路径的语义、不改变 queue/work-unit/Gate authority，
  不增加第二个 runner 或 verdict。
- 至少一个历史长 playbook 能复用这条 lane 的 bounded setup/adapter/observer，且
  迁移前后证明差异被明确记录。

## 暂不做

- 不在本 TODO 中直接修改 Harness、runner、schema、Gate 或 playbook。
- 不把所有历史 playbook 一次性迁移。
- 不为短回归引入自动 retry、隐式降级、旁路 completion 或新的 lifecycle state。
- 不承诺短 smoke PASS 等同于完整研究 PASS。

