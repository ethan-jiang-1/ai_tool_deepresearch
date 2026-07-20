## Why

`_backlog/bugs/BUG-093-seed-topic-appendix-naming-ambiguous.md` 与 `BUG-094-rerun-direction-section-no-template.md` 暴露了同一个剩余缺口：seed skeleton、return-map entry 和 rerun direction 的 canonical 写法散落在 phase prose、shared schema 说明与 JS renderer 中，Agent 可以写出 reader 勉强可读、但字段不完整或形状持续漂移的 seed guidance。前置 change `restore-section-scoped-seed-projection-contract` 已关闭 deterministic projection false pass；现在需要收敛 producer contract，而不是再增加一套 return-map validator。

## What Changes

- 在现有 workflow shared context 中建立两个职责收敛的 Agent-facing contracts：seed-topic authoring拥有canonical skeleton与rerun-direction fragment；return-map authoring拥有wave-to-section responsibility、一次性token lifecycle和canonical entry shape。
- 让首次 materialization、rerun topic-state renderer、phase-seed-topics 与 Wave backfill guidance 引用对应 readable contract，并用 deterministic parity/structure tests 防止 JS renderer、generated work-unit cue 与 shared contracts 再次漂移。
- 固定 rerun direction 的 canonical write shape、action mapping 与 required fields；保留对现有标题后缀、有无 bullet、有无 bold label 的兼容读取。
- 让 sanctioned rerun 的 `add_topic` / `update_intent` 输入携带 Agent-authored direction candidate，由现有 topic-state workspace 在同一 plan+seed transaction 中校验并提交；关闭 topic mutation 已 commit、direction 尚未直写时的 crash gap，不新增 affected-topic state 或 Engine 语义生成。
- 收敛 `phase-rerun` 的 recovery 顺序：只对 accepted topic-state workspace 执行 exact recover；旧 matching/stale direction 不能作为新一轮事务收据，Phase 不得绕过 retained input 直接写 direction 或跳过 apply。
- 在既有 rerun-ready Gate 路径复用 focused direction parser/evaluator：只检查 round/action/required-field 结构与 profile-count synchronization，给出 exact seed/field 或现有 count-owner repair 后重跑同一 checkpoint；不判断搜索方向、深度、guardrail 或 rationale 的语义质量。
- 将既有 case-318 real Subject Agent canary 同步到 sanctioned topic-state transaction 路径：它只证明给定 recorded rationale 后 Agent 能形成 retained candidate、调用既有 apply、跨 direction/profile crash window 恢复并完成同一 Gate，不证明 Agent 总能推断 affected Topic 或评价方向语义。
- 删除被 shared contract 取代的重复完整模板 prose；保留各 phase 在实际决策点所需的简短责任、命令顺序和引用。
- 不重命名现有 seed section，不重新注入已消费 token，不批量迁移历史 bundle，不新增通用 Markdown linter、模板引擎、CLI、gate family、runtime state、自动 repair 或第二份 projection authority。
- 这是 framework behavior/documentation change，implementation 时将版本提升至 `v0.36`，并同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。

Direct Source of Record 保持不变：canonical topic identity/intent 来自 `rb_plan.md#/topic_registry`，rerun round 与用户决定来自 `rb_profile.yaml`，submitted rows/findings 仍是 evidence projection authority；shared Markdown 只拥有 Agent-facing canonical authoring contract，seed direction 是下游 guidance projection而非新的 topic/evidence authority。最短闭环是 Agent 读取 shared contract并把 direction candidate 放进既有 sanctioned topic-state input，Engine只校验结构并随 touched seed原子提交，Agent执行现有 count increment，rerun-ready/Wave consumer复用同一 parser；失败回到 exact seed或count owner后重跑同一 checkpoint。

Net simplification 来自以两个按消费边界加载的 shared readable surfaces 替换 phase 间重复的完整 skeleton/direction/return-map 示例、删除 Wave consumer 的本地 action regex，并把 direction publication并入现有 topic-state transaction；本 change 明确避免 template registry、通用 linter、第二 renderer、额外 affected-topic state 和新的修复控制层。用户只拥有 rerun 语义与 rationale 决定，Agent负责形成 candidate并执行机械修复，Engine只裁决可解析结构、round/action binding、required-field presence与existing transaction；`human-directed` 不创造写入权限或绕过能力。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `seed-topic-materialization`: 将 seed skeleton/research appendix 的 Agent-facing contract 集中到已加载 seed-authoring surface，并要求 initial/rerun renderer 与该 contract 保持 executable parity。
- `canonical-topic-state`: sanctioned rerun add/update action携带结构化 direction candidate，direction-only supplement使用同一ordered action/workspace，并由现有 crash-safe plan+seed transaction原子发布，不新增 CLI 或 workspace path。
- `research-return-map`: 让各 Wave/seed phase 通过实际 `requires` 加载同一个canonical entry/section responsibility contract，role guidance只保留静态 cue；generated work-unit cue保持自包含且以静态field parity对齐，不改变 `RRM-007` authority/projection verdict。
- `rerun-topic-integration`: 固定 rerun direction canonical shape、兼容读取、future/count-sync语义与最小 structural readiness，并复用既有 rerun-ready checkpoint 返回 same-check repair。

## Impact

- 主要实现面：`DPT_FRAMEWORK/workflows/nodes/shared/`、相关 phase/return-map-producing role nodes、generated work-unit task/spawn cue、workflow package validation、`canonical-topic-state.mjs` 的 apply input/seed renderer/workspace、一个 focused pure rerun-direction helper、现有 Wave consumers，以及 rerun-ready Gate definition/dispatch。
- 测试面：shared-context reachability、renderer parity、legacy direction compatibility、required-field/root-first diagnostics、rerun-ready integration、必要的 deterministic rerun chain，以及更新后的 case-318 narrow Agent-flow recovery canary。
- OpenSpec：只修改既有 `STM-001`、`CTS-003`、`RRM-003`、`RTI-007` 行为，不分配新 requirement ID；apply/归档前仍需完成 registry/spec governance 与 verification-routing checks。
- 不新增依赖；只使用 Node.js、现有 `yaml`/`zod` 与项目既有 Markdown/parser helpers。
