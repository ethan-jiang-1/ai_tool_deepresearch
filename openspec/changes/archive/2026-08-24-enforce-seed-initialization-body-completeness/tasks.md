# enforce-seed-initialization-body-completeness

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` — 在首次 target edit 前读取
      `openspec/operations/change-feedback-loop.md` 并做 whole-change coherence
      review：核对 proposal/STM-010 delta/design/tasks/verification-plan/
      semantic-closure 与五个受影响源码面（evaluator、gate definition、gate CLI、
      phase-seed-topics、template）一致；`semantic-closure.yaml` 的 fact/resolver/
      consumers/overlap 覆盖实际改动面，fragment 均为真实符号或 bare file
      coordinate。Done condition：review 完成且无未记入 task 的 finding。
- [x] 0.2 Plan-mode governance：
      `openspec validate 2026-08-24-enforce-seed-initialization-body-completeness --strict`、
      `node openspec/governance/check-project-reqs.mjs --mode plan`、
      `node openspec/governance/check-verification-routing.mjs --change 2026-08-24-enforce-seed-initialization-body-completeness --mode plan`、
      `node openspec/governance/check-semantic-closure.mjs --change 2026-08-24-enforce-seed-initialization-body-completeness --mode plan`。
      Done when all exit zero。

## 1. Target Edits

- [x] 1.1 `seed-topic-authoring-evaluator.mjs`：从 `SEED_TOPIC_INITIALIZATION.sections`
      派生占位行集合（trim 后逐行），在 `evaluateSeedInitializationStructure` 的
      below-boundary ghost 检查之后增加区域内占位行检查：任一命中 → failure
      `reason_code: seed_initialization_structure`、`write_to: <path>#seed-initialization`、
      missing_fact 指明占位行与所属 section。Done when 单元测试绿。
- [x] 1.2 `tests/engine/helpers/seed-topic-authoring-evaluator.test.mjs`：
      现有「渲染区域 pass」用例改为 fail（模板占位）；新增 enriched body pass、
      显式 gap 改写 pass、单行残留 fail、ghost-below 仍 fail、legacy 仍 pass。
      Done when 该文件全绿。
- [x] 1.3 `gate-seed-topics-ready.definition.json`：`seed_initialization_structure`
      rule 的 `failure_message` 补充「替换区域内模板 pending 占位行或改写显式
      gap」文案。Done when JSON 合法且 validate 通过。
- [x] 1.4 `check-gate-seed-topics-ready.mjs`：`seed_initialization_structure`
      finding 的 repair 文案补充占位替换/显式 gap 形式。Done when 集成测试绿。
- [x] 1.5 `phase-seed-topics.md`：task card `action`/`done_condition`、§3.1 的
      gap 句、§4 Expected Artifacts 明确「初始化区域内不得保留模板 pending 占位行；
      显式 gap 改写为具体缺失事实」。Done when 文档锁测试绿。
- [x] 1.6 `templates/seed-topic-template.md`：Initialization Skeleton 增加 readable
      mirror 说明（renderer 输出 pending 占位，Agent 必须在 seed-topics-ready 前
      替换或改写）。Done when 文档锁测试绿。
- [x] 1.7 `tests/integration/md/seed-topic-projection-document-contract.test.mjs`：
      为 phase/template 的「替换占位」要求加 doc-lock 断言。Done when 该文件绿。
- [x] 1.8 `tests/integration/cli/check-gate-seed-topics-ready.test.mjs`：新增
      current-marker seed 带 pending body → gate fail（hint rule_id=
      `seed_initialization_structure`、repair_kind=agent_action、write_to 含
      `#seed-initialization`、rerun 指向同一 gate）；enriched body → pass。
      Done when 该文件全绿。

## 2. Verification

- [x] 2.1 Focused 串行跑三个测试文件（1.2/1.7/1.8）+ evaluator 相关既有测试，
      全部绿；记录红/绿对照（修复前 pending body 红，修复后绿）。
- [x] 2.2 真实 bundle `dpt_rb_ai-coding-evolution`：用新 evaluator 对五个 seed
      逐文件跑 `evaluateSeedInitializationStructure` → 修复前均 fail（占位行残留）。
- [x] 2.3 运行时 repair 五个 seed 的初始化正文（只改 markers 内 Agent-owned 区域，
      从 `rb_plan.md`/`rb_profile.yaml` 已记录事实派生，不足处以显式 gap 表述；
      不动 frontmatter、appendix token）。Done when 新 evaluator 对五个文件全部
      pass 且正文可读。
- [x] 2.4 全量 `npm test`（或规范等价命令）零 fail；`git diff --check` 干净。
- [x] 2.5 全量跑出的 change-scoped 连带更新（STM-010 的合法后果）：
      (a) `tests/e2e/pre-wave-readiness.test.mjs` 与
      `tests/e2e/post-final-rerun-lineage-continuity.test.mjs` 的模拟 Agent 现在
      必须先把 current-marker seed 的初始化正文占位替换为创作内容再跑
      seed-topics-ready（与真实 phase contract 一致）；(b)
      `user-intent-carry-through-contract.test.mjs` 的 gap 措辞锁改为
      改写后的显式 gap 断言；(c) `agent-experiment-autorun-terminology.test.mjs`
      的 sentinel 要求 STM-010 在 delta/main spec 携带 "native completion"
      锚点。Done when 四个文件 + 全量绿。

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` — 建立 change-scoped diff 边界
      （本 change 资产 + 五个 target 文件），review 实际 diff 与 semantic-closure
      重新评估；任何 actionable finding 记为普通未完成 task。Done when 无 open
      finding。
- [x] 3.2 Agent-owned spec sync：把 STM-010 delta 合并进
      `openspec/specs/research/seed-topic-materialization/spec.md`（含
      `> req:` 头与 `delta-synced` 标记），并更新
      `openspec/governance/req-registry.yaml` 的 STM-010 行。
- [x] 3.3 Archive-mode governance + finalizer：
      `node openspec/governance/check-project-reqs.mjs --mode archive`、
      `node openspec/governance/check-project-specs.mjs`、
      `node openspec/governance/check-verification-routing.mjs --change 2026-08-24-enforce-seed-initialization-body-completeness --mode assets`、
      `node openspec/governance/check-semantic-closure.mjs --change 2026-08-24-enforce-seed-initialization-body-completeness --mode assets`、
      `openspec validate 2026-08-24-enforce-seed-initialization-body-completeness --strict`、
      `git diff --check`，随后
      `node openspec/governance/finalize-change-archive.mjs --change 2026-08-24-enforce-seed-initialization-body-completeness`。
      Done when 全部零退出且 change 进入 archive。Completed 2026-08-24: reqs archive consistent (663 registered, STM-010 live); project specs valid (82); routing assets valid (3 claims); semantic-closure assets valid; strict validate valid; diff-check clean; full suite 2810/2810.
