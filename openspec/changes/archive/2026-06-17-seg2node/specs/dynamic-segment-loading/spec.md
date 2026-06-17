# dynamic-segment-loading → dynamic-node-loading

> req: DYS-001

## RENAMED Requirements

- FROM: `dynamic-segment-loading`
- TO: `dynamic-node-loading`

Reason: 统一术语——项目已将所有 "segment" 替换为 "node"（目录 `nodes-*/`、env var `NODES_DIR`、函数 `nodePath()`、类型 `NodeFrontmatter`、变量 `nodeRegistry`）。capability 名同步更新。req ID 不变（DYS-001），语义不变。
