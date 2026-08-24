# document-wave0-deferred-all-or-nothing

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` — 在首次 target edit 前读取
      `openspec/operations/change-feedback-loop.md` 并做 whole-change coherence
      review：核对 proposal/CTS-011+RWP-023 delta/design/tasks/verification-plan/
      semantic-closure 与三个受影响面（playbook、phase-wave0、collision 反馈 +
      两个测试）一致；`semantic-closure.yaml` 的 fact/resolver/consumers/overlap
      覆盖实际改动面。Done condition：review 完成且无未记入 task 的 finding。
- [x] 0.2 Plan-mode governance：
      `openspec validate 2026-08-24-document-wave0-deferred-all-or-nothing --strict`、
      `node openspec/governance/check-project-reqs.mjs --mode plan`、
      `node openspec/governance/check-verification-routing.mjs --change 2026-08-24-document-wave0-deferred-all-or-nothing --mode plan`、
      `node openspec/governance/check-semantic-closure.mjs --change 2026-08-24-document-wave0-deferred-all-or-nothing --mode plan`。
      Done when all exit zero。

## 1. Target Edits

- [x] 1.1 `command_playbook/operate-topic-state.md`：在 contribution-wide
      `deferred_contribution` 段落（「derives every currently unprojected」句）
      之后写明 all-or-nothing disposition 兼容性前置条件与混合贡献恢复路径
      （显式 `wave0_evidence` entries 补剩余 ordinal + 同一 inspect rerun）。
      Done when 文档锁测试绿。
- [x] 1.2 `workflows/nodes/phases/phase-wave0.md`：§3.3 deferred 段落补同一
      前置条件与恢复指引。Done when 文档锁测试绿。
- [x] 1.3 `engine/helpers/canonical-topic-state.mjs`：
      `projection_deferred_contribution_collision` 消息追加恢复句
      （「Defer the remaining ordinals with explicit `wave0_evidence` entries,
      then rerun the same inspect」）；判定逻辑零改动。Done when 集成测试绿。
- [x] 1.4 `tests/integration/md/wave-producer-contract-guidance.test.mjs`：
      新增断言两处 guidance 携带前置条件与恢复短语（whitespace-tolerant）。
      Done when 该文件绿。
- [x] 1.5 `tests/integration/cli/operate-topic-state-projection.test.mjs`：
      既有 collision 测试（487-501）追加断言 rejected output 的 reason 文本
      点名恢复路径；seed 字节不变断言保留。Done when 该文件绿。

## 2. Verification

- [x] 2.1 Focused 串行跑 1.4/1.5 及受影响相关测试（
      `seed-topic-projection-document-contract`、`operate-topic-state`、
      `canonical-topic-state`）全部绿。
- [x] 2.2 全量 `npm test` 零 fail；`git diff --check` 干净。Completed 2026-08-24:
      2808/2811 pass；3 个 fail 均为 check-all 的 unregistered-active-delta 健康门
      （CTS-011/RWP-023 尚未注册，属归档前预期瞬态）；归档后重跑确认全绿。

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` — 建立 change-scoped diff 边界
      （本 change 资产 + 五个 target 文件），review 实际 diff 与
      semantic-closure 重新评估；任何 actionable finding 记为普通未完成 task。
      Done when 无 open finding。Completed 2026-08-24: diff 仅限 playbook/
      phase-wave0/error message/两个测试 + change 资产；semantic-closure
      fact/resolver/consumers/overlap 与实际改动面一致；无 finding。- [x] 3.2 Agent-owned spec sync：把 CTS-011/RWP-023 delta 合并进对应 main
      specs（含 `> req:` 头与 `delta-synced` 标记），并更新
      `openspec/governance/req-registry.yaml` 的 CTS-011/RWP-023 行。
- [x] 3.3 Archive-mode governance + finalizer：
      `node openspec/governance/check-project-reqs.mjs --mode archive`、
      `node openspec/governance/check-project-specs.mjs`、
      `node openspec/governance/check-verification-routing.mjs --change 2026-08-24-document-wave0-deferred-all-or-nothing --mode assets`、
      `node openspec/governance/check-semantic-closure.mjs --change 2026-08-24-document-wave0-deferred-all-or-nothing --mode assets`、
      `openspec validate 2026-08-24-document-wave0-deferred-all-or-nothing --strict`、
      `git diff --check`，随后
      `node openspec/governance/finalize-change-archive.mjs --change 2026-08-24-document-wave0-deferred-all-or-nothing`。
      Done when 全部零退出且 change 进入 archive。Completed 2026-08-24: reqs archive consistent (665 registered, CTS-011/RWP-023 live); project specs valid (82); routing assets valid (2 claims); semantic-closure assets valid; strict validate valid; diff-check clean.
