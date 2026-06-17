# conditional-segments → conditional-nodes

> req: COS-001

## RENAMED Requirements

- FROM: `conditional-segments`
- TO: `conditional-nodes`

Reason: 统一术语——项目已将所有 "segment" 替换为 "node"（目录 `nodes-*/`、env var `NODES_DIR`、函数 `nodePath()`、类型 `NodeFrontmatter`、变量 `nodeRegistry`）。capability 名同步更新。req ID 不变（COS-001），语义不变。
