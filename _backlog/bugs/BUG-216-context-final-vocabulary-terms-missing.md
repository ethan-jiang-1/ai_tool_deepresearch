# BUG-216: CONTEXT.md 缺少 Final-backing 词汇锚点

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-11 | source: `npm test` 全量回归

## Why

`tests/integration/md/artifact-persistence-contract.test.mjs` 的 subtest
「keeps Final-backing vocabulary and current release scopes bounded」断言
`CONTEXT.md` 包含三个加粗术语：`**Final key-finding declaration**`、
`**Final Evidence Map**`、`**Final backing**`。当前 `CONTEXT.md` 不含任一术语，
测试在 HEAD（本 change 之前）即失败。

## 复现

```bash
node --test tests/integration/md/artifact-persistence-contract.test.mjs
# fails: The input did not match the regular expression /\*\*Final key-finding declaration\*\*/
```

在 `git stash`（回到 HEAD）下同样失败，与 `rebuild-hitl1-source-access-alignment`
change 无关；该 change 不修改 `CONTEXT.md`。

## Owner / 最小修复

- Owner: `CONTEXT.md`（Final-backing 词汇 / artifact-persistence capability）
- 最小修复: 在 `CONTEXT.md` 中补入三个加粗术语定义（Final key-finding declaration、
  Final Evidence Map、Final backing），使其与 accepted Final 交付契约对齐。
- 可观察 done 条件: 上述 subtest 通过。

## 备注

该 finding 由 `rebuild-hitl1-source-access-alignment` task 6.1 的全量 `npm test`
记录，按用户决定移入 backlog，不在该 change 的 closeout 范围内。
