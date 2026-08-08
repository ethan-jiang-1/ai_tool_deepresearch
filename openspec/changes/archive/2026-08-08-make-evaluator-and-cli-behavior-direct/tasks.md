# Tasks: make-evaluator-and-cli-behavior-direct

> 实现前先运行 `check-verification-routing.mjs --mode plan`；归档前运行
> `--mode assets`。reference 到 BUG-205/209。

## 0. Feedback-Lifecycle Review Marker

- [x] 0.1 `openspec-feedback:plan-review` — 已按 change-feedback-loop 完成 apply 前 scoped review：WAI-011/AGQ-027 各有 owner/可见结果、无 re-entry/time 边界、无新增 check（改 evaluator/CLI 结论）、verification 证明确定性声明。无待转换 finding。
- [x] 0.2 `openspec-feedback:closeout-review` — 已按 change-feedback-loop 完成归档前 scoped review：change-scoped diff（parser 嵌套 + queue drain 结论 + 2 测试 + v0.78 bump）、2 个 delta requirement 均有实现与测试锚点、writer/reader 期望一致（`###` 子节不再判空；`drained` 结论可区分）、verification 证明确定性声明（19 新测试 + 58 既有 PASS、governance checks PASS）。无 open finding。

## 1. Semantic-section parser 嵌套子节（WAI-011）— BUG-205

- [x] 1.1 修改 `markdown-semantic-sections.mjs#markdownSemanticSectionEntries`：section body
  从自身 heading 到下一个同级/更高级 heading，低级别 `###` 子节内容并入父 body
- [x] 1.2 单测：`## Key Findings` 下只有 `###` 子节时，`key findings` section 非空；
  真正空的 Key Findings 仍为空（tests/engine/markdown-semantic-sections.test.mjs PASS）
- [x] 1.3 integration：wave1 evidence-summary 以 `###` 子节组织 Key Findings 时
  dry-submit 不报 `key_findings_missing_or_empty`（parser 单测 + gate-helpers-checks 既有
  测试确认）

## 2. operate-queue check drain 结论（AGQ-027）— BUG-209

- [x] 2.1 修改 `operate-queue check`：`active_window`/`refill_pool`/`delegated_in_flight`
  全空时返回显式 `drained: true`，advice 不再建议 refill/blocker
- [x] 2.2 单测/integration：drain 态返回 `drained`；有工作返回 `passed:true`；阻塞/
  缺 receipt 返回 `passed:false`（不误标 drained）（tests/integration/queue-check-drained-verdict.test.mjs PASS）

## 3. 版本 bump 与指引同步

- [x] 3.1 version bump **v0.78**：更新 `RUN.md` banner 与 CHANGELOG
- [x] 3.2 若 phase 指引提到 `operate-queue check` 结论，同步 `drained` 语义（检查后无
  phase 文本硬编码旧 advice，N/A）

## 4. 验证与治理

- [x] 4.1 运行全部受影响单测/integration 并 PASS（含既有 semantic-section / reference /
  queue 测试无回归）
- [x] 4.2 运行 `check-verification-routing.mjs --change make-evaluator-and-cli-behavior-direct --mode assets`
- [x] 4.3 运行 `check-project-reqs.mjs` 与 `check-project-specs.mjs` 并 PASS
- [x] 4.4 更新 `_backlog/bugs/README.md`：BUG-205/209 标记 fixed 归属本 change；
  更新 `_backlog/plans/bug-205-211-*.md` 状态
