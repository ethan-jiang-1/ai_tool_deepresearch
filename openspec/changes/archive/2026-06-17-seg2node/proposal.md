# Proposal: seg2node

## Why

"segment" 是从 gate-loop 时代沿用下来的术语——当时没仔细想过用词。在 FSM 语境下这个词不精确：FSM 有环，"段"暗示线性。代码层已经全部采用了 "node" 术语（`currentNode`、`node_start`、`node_complete`、`loadAndExecuteNode`、Machine class），目录名和 concept name 应该跟上。

## What Changes

- **重命名** 所有 `experiments/` 下的 segments 目录和文件引用：`segments-workflow-fsm/` → `nodes-workflow-fsm/`、`segments-workflow-next/` → `nodes-workflow-next/`、`segments-gate-loop/` → `nodes-gate-loop/`、`segments-gate-fork/` → `nodes-gate-fork/`
- **重命名** JS变量：`SEGMENTS_DIR` → `NODES_DIR`、`segmentPath()` → `nodePath()`、`SegmentFrontmatter` → `NodeFrontmatter`
- **重命名** bundle 内路径：`exp/segments/` → `exp/nodes/`
- **重命名** 两个 capability：`conditional-segments` → `conditional-nodes`（COS-001）、`dynamic-segment-loading` → `dynamic-node-loading`（DYS-001）
- **更新** openspec 内所有 active change 的 delta specs 中的措辞
- **更新** guidelines 中的措辞和示例
- req ID 不变（COS-001, DYS-001），capability name 变

## Capabilities

### New Capabilities

- `seg2node`: 全局术语统一——所有 "segments"（目录、变量、函数、路径、capability 名）改为 "nodes"。受影响的 capability：`conditional-segments`→`conditional-nodes`、`dynamic-segment-loading`→`dynamic-node-loading`。Req ID 不变，语义不变。**Req: SEG-001**

## Impact

- 4 个 experiment 目录和内部文件
- 9 个 command experiment playbook
- 2 个 main spec capability（通过 delta RENAMED）
- `openspec/config.yaml` — 模板注释中的 segments 措辞
- `guidelines/command-experiments.md` — 所有 segments 相关措辞
- `guidelines/project.md` — 如有引用
- 不变：req IDs、archive 内容、`.fsm.json`、node MD 内部内容
