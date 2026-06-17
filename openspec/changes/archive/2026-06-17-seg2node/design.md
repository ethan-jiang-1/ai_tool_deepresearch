# Design: seg2node

## Context

"segment" 在 FSM 语境下不精确。代码层已经完全采用 "node" 术语——`currentNode`、`node_start`/`node_complete` receipts、`loadAndExecuteNode()`、`Machine.current` 属性。目录名和 capability 名是最后一块没跟上的。

这是一个纯重命名 change——零语义变化、零 API 变化、零行为变化。

## Goals / Non-Goals

**Goals:**
- 统一术语：所有面向用户和开发者的名称从 "segments" 改为 "nodes"
- 目录、文件路径、变量名、函数名、capability 名全部更新
- 通过 delta specs 的 RENAMED 操作正式重命名两个 capability

**Non-Goals:**
- 不改变任何逻辑、schema、API 行为
- 不修改 archive 内容
- 不修改 req ID
- 不修改 `.fsm.json`、node MD 文件内部

## Decisions

### Decision 1: 单 change 覆盖全 rename

**选择：** 一个 `seg2node` change 覆盖全部 rename，包括 experiment 代码、command playbook、guidelines、delta specs。

**理由：** 这是跨切面的纯概念对齐，拆成多个 change 会导致 rename 碎片化（gate-loop 一个 change、workflow-fsm 一个 change...），增加合并冲突和执行复杂度。

### Decision 2: 用 RENAMED 操作而非手改 main spec

**选择：** 在 delta specs 中使用 `## RENAMED Requirements` 头：

```
## RENAMED Requirements

- FROM: `conditional-segments`
- TO: `conditional-nodes`
```

**理由：** main spec 不能直接改——只能通过 change archive 时合并 delta 来更新。RENAMED 是 OpenSpec 的标准操作，archive 时 governance check 会验证。

### Decision 3: env var `NODES_DIR`，函数 `nodePath()`，schema `NodeFrontmatter`

**选择：** 
- `SEGMENTS_DIR` → `NODES_DIR`
- `segmentPath(fileRef)` → `nodePath(fileRef)`
- `SegmentFrontmatter` → `NodeFrontmatter`

**理由：** 跟代码里已有的 `currentNode`、`loadAndExecuteNode` 形成一致的命名体系。

## Risks / Trade-offs

- **[Risk] rename 漏掉引用导致测试失败** → **Mitigation**: grep 全仓验证 "segments" 无残留（排除 archive 和 main spec）；4 个 prototype 测试套件全部跑通
- **[Risk] git mv 失败或 merge 冲突** → **Mitigation**: 先 git mv 目录，再内容 replace；单 change 降低冲突面
