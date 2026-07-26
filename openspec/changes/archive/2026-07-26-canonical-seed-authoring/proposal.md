## Why

`_backlog/plans/evidence-production-and-phase-projection-boundaries.md` 的 Change 1 指出了一个不可执行的契约：Seed Topics Agent 目前必须手写 YAML enrichment，同时又要保证其中的 canonical Topic 字段与 `rb_plan.md#/topic_registry` 完全一致；特殊字符、错误转述或一次普通编辑都会把同一文件变成 identity drift。现有 topic-state renderer 已经拥有 canonical merge、YAML 序列化和原子写入能力，本 change 要补齐它缺少的 Agent-facing enrichment 入口，而不是再建第二个 seed writer。

## What Changes

- 扩展既有 `operate-topic-state apply`，增加一个只接受 Topic selector 与 closed enrichment object 的 seed enrichment 形式。Engine 从 canonical registry 读取 identity，拒绝 input 中的 canonical keys，只验证 `hypothesis`、`in_scope`、`out_of_scope`、`search_guardrails`、`evidence_route` 的结构，并通过现有 topic-state renderer/workspace 写回同一个 seed。
- 明确 canonical binding 的比较语义是 YAML 解析后的精确值相等，而非序列化字节相等：类型与字符串 code-point 序列必须相同，数组顺序必须相同，mapping key 顺序和 YAML quoting/style 不参与相等判断。quoted、colon、multiline、CJK/Unicode `must_answer` 必须经一次序列化后保持相同解析值。
- 将 `must_answer`、`in_scope`、`out_of_scope`、`evidence_route` 的重复 authoring surface 收敛到 frontmatter：新 seed body 不再复制 canonical `must_answer`，也不再要求 Agent 在正文重复 scope/evidence-route 判断；正文继续由 Agent 直接写作并由 enrichment operation 原样保留。既有 seed 的重复正文段落保持可读兼容，但不再是 identity/enrichment authority，也不要求批量迁移。
- 在 enrichment apply 的决策点复用现有 `evaluateSeedTopicAuthoring()`，对写入前可解析的 canonical drift 返回被同一 writer 修复的一个最早 binding root，并对写入后的 canonical envelope 做同源断言；strict input/schema failure 在写入前失败并指向同一个 apply checkpoint。Queue completion、topic-state inspect 和最终 seed-topics Gate 继续复用该 evaluator；只有已验证的 Seed Topics queue completion 与 Gate 才能把 `enrich_seed` 投影为可执行 repair，generic inspect 保持只读诊断，不新增 lint CLI、hash identity 或第二套 schema。
- 更新 `phase-seed-topics.md`、shared seed authoring contract、task-card action/done condition 和 topic-state command guidance：Agent 通过 structured enrichment input 写 frontmatter，正常只直接编辑非权威 Markdown body；唯一例外是 apply 明确报告的 bounded frontmatter syntax coordinate，修到可解析后仍立即走 writer；`must_answer` 由 Engine 从 registry 复制，绝不由 Agent 摘要或重写。
- 调整 `seed_topic_materialize` completion 的 fallback feedback：在已验证的 Seed Topics window，canonical binding drift 指向 topic-state enrichment apply 这个合法 Engine operation，正文/input 或 bounded syntax 修复后仍回到原 enrichment/queue completion checkpoint；窗口外的任何 authoring root 都不伪造 writer，不再把 raw canonical YAML edit 描述成正常修复路径。
- 不改变 queue admission、work-unit provenance、evidence ownership、Wave projection、shared-reference floor 或后续 change 的任何行为；不新增 state、CLI family、workspace、runtime cache、自动重试、语义评分或用户 checkpoint。
- 这是向后兼容的 framework behavior/documentation change；implementation 时版本提升至 `v0.50`，并同步根 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` banner/release notes。

语义层反思：这个 change 新增的不是另一份“seed 状态”，而是一个有界的 authoring operation，供 Seed Topics Agent 精确回答“如何更新 Agent-owned search enrichment，同时不取得 canonical identity 写权限”。它必须保留 selector 与 identity、enrichment 与 Markdown prose、结构错误与合法 semantic gap、pre-existing drift 与 post-write binding 这几组区别。Agent 在 operation 输出的 `committed|unchanged` 或一个 direct root/同一 checkpoint 上即可停止，不需要回到底层 renderer、queue completion 或 late Gate 重建含义。

Direct Source of Record 仍是 `rb_plan.md#/topic_registry` 的 Topic identity/intent；seed frontmatter 只是其 canonical projection加Agent-owned enrichment，Markdown body 是非权威研究判断。最短合法闭环仅发生在见证过的 Seed Topics window：topic-state skeleton -> Agent 写 body并提交 structured enrichment -> 同一 writer canonicalize/serialize -> 现有 evaluator -> 原 queue completion；失败只修正 named body/input 或执行同一 writer，再重跑同一 checkpoint。窗口外的 inspect 只报告 direct diagnostic 和当前 owner，不伪造 writer path。

Net simplification 来自删除正常流程中的 raw YAML identity authoring、正文 `must_answer` 复制和 scope/evidence-route 双写义务，并复用现有 renderer、workspace、evaluator、queue completion 与 Gate。新增的一个 apply input form替代三处隐含规则，不增加第二 authority、第二 validator 或 recovery tree。用户只拥有新的 Topic/研究语义决定；Agent负责从既有 intent 形成 enrichment、写正文和执行机械修复；Engine负责 schema、canonical binding、序列化、原子提交和 deterministic feedback，`human-directed` 不创造额外写权限。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `canonical-topic-state`: 既有 topic-state apply/writer 增加 closed seed enrichment form、parsed-value canonical binding、body preservation、single-root drift signalling 与兼容边界。
- `seed-topic-materialization`: Seed Topics phase、shared authoring contract 和 task card 改走 structured enrichment operation，并删除正文中的 canonical/structured enrichment 双写要求。
- `agentic-queue`: `seed_topic_materialize` completion 保留同一个 evaluator 与 terminalization boundary，但 canonical drift 的 repair owner 改为 topic-state enrichment operation，而非 direct YAML edit。

## Impact

- 主要实现面：`DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs`、既有 seed authoring evaluator、`operate-topic-state.mjs`/command playbook、queue completion adapter、Seed Topics phase/shared guidance与新-seed renderer body skeleton。
- 测试面：topic-state helper/CLI 的 exact parsed-value round trip、frontmatter 终止 LF 后的 lexical body-suffix preservation、strict enrichment rejection与crash recovery；queue/in-window Gate shared-evaluator feedback及generic-inspect no-fake-writer regression；Markdown wiring与duplicate-authoring static regression；一个真实 Seed Topics Agent-flow canary验证正常路径不再手写 canonical YAML。
- OpenSpec：修改既有 `CTS-003`、`STM-001`、`AGQ-002`，不分配新 requirement ID；apply/archive 前仍需通过 requirement governance、verification-routing、focused/full regression和strict OpenSpec validation。
- 不新增依赖；实现仅使用 Node.js、现有 `yaml`/`zod` 与 `node:test`/`node:assert`，测试仍全部位于 repo-root `tests/` 或既有 `experiments_playbook/` Agent-flow 路径。
