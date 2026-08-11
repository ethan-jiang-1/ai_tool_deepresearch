# BUG-217: parallel-delegated work-unit guidance 缺少 bounded top-up 措辞

> 状态: 已修复 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-12 | source: `npm test` 全量回归

## Resolution

已由 `repair-agent-guidance-contract-drift`（`65fdb829a`）修复：shared、Wave0 与
Wave1 guidance 明确既有 bounded top-up、cap/capacity 与 drain-before-gate 顺序。
focused `parallel-delegated-reference-materialization` 12/12 与全量 suite 均通过。

## Why

`tests/integration/md/parallel-delegated-reference-materialization.test.mjs` 断言
`shared/shared-subagent-protocol.md` 与 `phase-wave0.md` / `phase-wave1.md` 包含
`bounded top-up` 措辞（top-up batch claiming 与 drain-before-gate order）。当前这些
文件不含该措辞，测试在 HEAD（本 change 之前）即失败。

## 复现

```bash
node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs
# fails: The input did not match the regular expression /bounded top-up/i
```

在 `git stash`（回到 HEAD）下同样失败，与 `rebuild-hitl1-source-access-alignment`
change 无关；该 change 不修改 `shared-subagent-protocol.md`、`phase-wave0.md` 或
`phase-wave1.md`。

## Owner / 最小修复

- Owner: parallel-delegated work-unit guidance（`shared-subagent-protocol.md`、
  `phase-wave0.md`、`phase-wave1.md`）
- 最小修复: 恢复 `bounded top-up` 措辞，描述 bounded top-up batch claiming 与
  drain-before-gate 顺序，使测试断言恢复匹配。
- 可观察 done 条件: 上述 subtest 通过。

## 备注

该 finding 由 `rebuild-hitl1-source-access-alignment` task 6.1 的全量 `npm test`
记录，按用户决定移入 backlog，不在该 change 的 closeout 范围内。
