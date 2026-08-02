## Why

现有 Agent Experiment Autorun 的 101 个 Headless case 是重要的真实 Agent Flow 资产，但 filename 中的 `light`、`standard`、`heavy` 同时被当作创建时估计和默认选择策略。最新保留观测合计约 430 分钟、$164；默认 filename-Light 选择仍约 98 分钟，因而实际触发频率很低。更重要的是，快而干净的候选目前全部是 `deterministic_contract`，若只缩小旧 Light 集合，高频运行会退化为纯 fixture regression，失去发现真实系统问题的价值。

原始问题与历史观察来自 `_backlog/plans/experiment-progressive-run-strategy/`，但该目录的汇总和当前 playbook 已有漂移，不能作为运行时权威。本 change 将现有 manifest、frontmatter 与 Supervisor 保留报告组合成可重算的选择投影：保留创作目录和 case 身份，不要求作者在创建时完成全局分类，也不把历史文件移动或改名。

## What Changes

- 新增 `experiment-run-strategy` capability：从当前注册 playbook、已有 proof profile 和保留的 Autorun audit/report 建立虚拟 case 运行画像。画像保留 `unknown`，区分创建时 filename cost、观测成本、验证新鲜度、native outcome 与 health 信号，且不是新的 case 注册表或 verdict。
- 为新 case、变更后 case 和历史 case 提供显式的校准、快速发现、诊断和保证覆盖选择视图。它们只选择下一批完整 Markdown playbook；不调度 Agent、不中断/修复 Agent Flow、也不改写 native outcome 或 health。
- 将无过滤 Autorun 从隐式 filename-Light 默认选择迁移为显式 profile/精确选择。`--tier` 保留为兼容性的历史 filename 筛选，不再表达当前运行成本、覆盖或优先级。
- 在保留报告中绑定可复核的执行表面身份，使画像能诚实地区分“仍可用于历史成本预测”与“当前 proof 已需要重新校准”。报告继续把 native outcome、生命周期、health 和 cleanup 分开。
- 用预算、预测耗时和轮转多样性而不是目录迁移或静态 tier 决定快速发现批次；直接受 change 影响的 case 仍由该 change 的 OpenSpec verification plan 明确选择。真实 Agent 行为覆盖有单独的陈旧度目标，不能被 deterministic case 静默替代。
- 将 health `ISSUES` 保留为诊断事实。第一版不会把它重写为 FAIL 或自动吞掉；只有明确的后置审阅才能把稳定已知诊断与新的 health 问题区分开。

明确不包含：重命名或移动既有 case、要求新 case 填写完整全局 taxonomy、把 `experiments_playbook/` 迁入普通 CI、创建长期 daemon/scheduler、让 JS 解释 Markdown 语义、让历史报告替代本次 native completion、或添加第二个 manifest/第二个 verdict。

## Capabilities

### New Capabilities

- `experiment-run-strategy`: 将 case 注册、proof profile、保留运行观测和明确 profile 请求投影为可解释、预算受限的下一批 Autorun 选择；支持后置、部分和 `unknown` 分类，而不改变 case 所证明的内容。

### Modified Capabilities

- `experiment-agent-autorun`: 修改选择入口和运行身份记录，使无过滤调用不再默认为 filename-Light，并保留旧 tier 仅作显式兼容筛选。
- `experiment-observability`: 扩展 Supervisor 报告的执行表面身份和选择相关观测，同时保持 outcome、health、lifecycle 与 cleanup 的正交性。
- `playbook-runner`: 将 normal Autorun 的操作说明更新为显式 profile/精确选择，不把历史 filename tier 描述为当前运行策略。

## Impact

- 预期修改 `DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs`、其选择/报告 helper 与 schema、`experiments_playbook/README.md`/运行说明，以及对应 `tests/host_tools/` 和 `tests/integration/host_tools/`。
- 新增只读画像/选择投影的 host-tool surface；它读取 manifest、frontmatter 与 `.exp-bundles/` 保留报告，不复制 case 路径、playbook policy 或 runtime truth。
- 新 case 创建仍只要求现有单一 proof goal 与局部覆盖审查；首次受限校准运行后才可能获得运行画像。现有 102 个注册 case 不需要文件迁移或批量 frontmatter 重写。
- 此 change 修改 `DPT_FRAMEWORK/` 的 host-tool 行为，计划发布 `v0.66`，并在 apply 时更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。

### Semantic And Control Boundary

**Semantic precision.** 新投影服务于维护者的有界问题：在给定预算、时间和已知运行事实下，“下一批哪些完整 case 最值得启动，且哪些结论仍是 unknown？”它必须保留创建时成本标签、实测成本、proof subject、native outcome、health、运行能力和 freshness 的区别；读者可以在 manifest/frontmatter、保留报告与选择理由处停止推理，不能将选择结果外推为新的 case verdict、全库覆盖证明或 Agent 行为 PASS。

**Direct facts and net simplification.** active path/order 仍只来自 `PLAYBOOK_MANIFEST.md`；case policy 仍只来自选择到的 frontmatter；一次运行的 outcome/health 仍只来自其 native completion 和 Supervisor health report。新画像是可删除、可重算的读取投影，替代 filename tier、手写速度表和过期汇总并列充当选择依据的现状。最短闭环是：真实 Autorun 写保留报告 -> 选择投影读取当前权威与报告 -> 明确 profile 产出下一批 case -> 现有 Supervisor 执行完整 playbook 并再次写报告。

**Responsibility.** 用户只决定新的运行策略语义和成本边界；Playbook Agent/Subject Agent 继续执行已选 case；Autorun Supervisor 只做确定性选择、启动、验证、health、审计和报告。Engine 不取得 coverage 语义判断、研究编排、自动修复或 scheduler 权限；profile 选择也不授予 Agent 或用户绕过既有预算、native completion 或 proof 边界的权限。
