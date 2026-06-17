# seg2node

> req: SEG-001

## ADDED Requirements

### Requirement: 统一使用 "node" 替代 "segment" 作为动态 MD 加载单元的名称

项目 SHALL 在所有代码、文档、路径、变量名中将 "segment" 统一替换为 "node"。

涉及的 capability：`conditional-segments` → `conditional-nodes`（COS-001）、`dynamic-segment-loading` → `dynamic-node-loading`（DYS-001）。req ID 不变，语义不变。

#### Scenario: 目录名使用 nodes

- **WHEN** 项目包含动态 MD 文件的目录
- **THEN** 目录名 SHALL 为 `nodes-<component>/` 而非 `segments-<component>/`

#### Scenario: 环境变量使用 NODES_DIR

- **WHEN** Engine 需要引用动态 MD 文件目录
- **THEN** 环境变量 SHALL 为 `NODES_DIR` 而非 `SEGMENTS_DIR`

#### Scenario: 函数和类型使用 node 前缀

- **WHEN** 定义路径解析函数或 Zod schema
- **THEN** 名称 SHALL 为 `nodePath()` 和 `NodeFrontmatter` 而非 `segmentPath()` 和 `SegmentFrontmatter`
