# seg2node

> req: SEG-001

## Purpose

统一项目术语：所有 "segment"（目录、变量、函数、路径、capability 名）改为 "node"。代码层已全面采用 node 术语，spec 层通过本 capability 和关联的 RENAMED delta 同步。

## Requirements

### Requirement: 统一使用 "node" 替代 "segment" 作为动态 MD 加载单元的名称

项目 SHALL 在所有代码、文档、路径、变量名中将 "segment" 统一替换为 "node"。

涉及的 capability：`conditional-nodes`、`dynamic-node-loading`。关联 req ID 不变，语义不变。

Engine 需要引用动态 MD 文件目录时，目录配置 SHALL 通过函数参数、runtime 属性或 CLI 参数显式传入，MUST NOT 通过环境变量传递。

#### Scenario: 目录名使用 nodes

- **WHEN** 项目包含动态 MD 文件的目录
- **THEN** 目录名 SHALL 为 `nodes-<component>/` 而非 `segments-<component>/`

#### Scenario: Node directory is configured explicitly

- **WHEN** Engine 需要引用动态 MD 文件目录
- **THEN** caller SHALL 通过函数参数、runtime 属性或 CLI 参数显式传入 node directory
- **AND** Engine MUST NOT require `process.env.NODES_DIR` 或其他环境变量作为配置来源

#### Scenario: 函数和类型使用 node 前缀

- **WHEN** 定义路径解析函数或 Zod schema
- **THEN** 名称 SHALL 为 `nodePath()` 和 `NodeFrontmatter` 而非 `segmentPath()` 和 `SegmentFrontmatter`
