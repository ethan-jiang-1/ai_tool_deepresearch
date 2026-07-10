## Context

Canonical research waves 依赖 Agent 环境提供真实 search 与 fetch，但当前框架直到 silent Wave0 才会碰到该依赖。JavaScript Engine 无法调用或证明宿主 Agent 的外部工具能力；继续让 Engine 猜测会形成虚假的可用性证明。

HITL1 是进入 silent execution 前最后一个用户本来就在场的 checkpoint，因此能力确认应放在这里：Agent 做一次真实、有限的 search+fetch；Engine 只校验记录的直接 observation 是否自洽，并在 observation 不可用时阻止进入 Setup。

## Goals / Non-Goals

**Goals:**

- 在 silent waves 前确认当前 Agent 环境确实能搜索并抓取一个真实结果页面。
- 用 `rb_profile.yaml#/research_access` 保存最小、可审计的直接 observation。
- 对 missing、unprobed、unavailable 和伪 available 状态 fail closed。
- 在 HITL1 给出一个明确 blocker 和同一 probe 的重试路径。

**Non-Goals:**

- 不实现 offline research、无证据报告或用户素材 ingestion。
- 不建立 generalized capability registry、工具矩阵或 runtime capability daemon。
- 不把 probe 结果计入 reference、cache、ledger 或 Wave coverage。
- 不用 fake WebSearch/WebFetch、mock URL 或固定 fixture 声称外部研究能力可用。

## Decisions

### 1. Probe 由 HITL1 Agent 执行，Engine 不代替工具调用

`phase-hitl1.md` 允许一个 `capability_probe_only` 例外：执行一次真实搜索，从结果中选一个正常 URL，再用实际 fetch surface 获取页面内容。成功标准只包含两个直接事实：搜索返回真实 URL，fetch 返回页面内容。

Probe 不评价来源质量，不选择研究策略，不做多站点重试树。失败时记录当次直接原因并停留 HITL1；环境修复后重跑同一 bounded probe。

替代方案是在 JS CLI 中探测 `curl`、网络或工具名；这无法证明 Agent 的 WebSearch/WebFetch surface 可用，并会制造错误信心，因此不采用。

### 2. `research_access` 使用最小判别状态

Profile 增加 optional legacy-compatible observation，新模板初始化为：

```yaml
research_access:
  status: unprobed
```

Agent probe 后只写以下直接字段：

- `status`: `available | unavailable`；
- `probed_at`: ISO 8601 timestamp；
- `search_tool`、`fetch_tool`: 实际使用的工具 surface 名称，工具缺失时可省略对应字段；
- `result_url`: 搜索返回并尝试抓取的 URL，可用路径必填；
- `fetch_outcome`: `success | failed | blocked | not_attempted`；
- `reason`: unavailable 路径必填的直接失败原因。

Schema 使用 status 分支做直接一致性校验：available 要求 tool names、parseable URL 和 `fetch_outcome: success`；unavailable 要求 timestamp、非空 reason，且不得声明 success；unprobed 不携带成功事实。旧 profile 缺少整个字段时仍可解析，但 gate 按 unprobed 处理。

不记录 response body、搜索 query 历史、HTTP 状态矩阵或多次尝试列表，避免 profile 变成 capability log system。

### 3. HITL1 gate 增加一个专用 availability rule

在现有 HITL1 gate definition 增加一个直接的 `research_access_available` rule。该 rule 先依赖 `ProfileSchema` 通过，再读取 `research_access`：

- missing/unprobed：返回“运行真实 HITL1 probe”；
- unavailable：返回已记录 reason，并要求修复环境后重跑；
- available：由 schema 已保证 URL/fetch observation 自洽。

该 check 只存在于 HITL1 gate，不抽象成通用 capability framework，也不提供 degraded pass。现有 profile/user-decision checks 保持原职责。

### 4. Probe observation 与 research evidence 明确隔离

Phase guidance 和 payload checklist 明确禁止把 probe URL、内容或工具结果写入 reference、cache、work-unit output、ledger 或 artifact。Engine 不需要新增“删除 probe evidence”的复杂清理逻辑；受控实验和静态文档 guard 只验证 guidance 与 bundle 写入边界。

### 5. 真实能力只由 Agent-controlled experiment 验证

Schema unit test 和 HITL1 gate integration test 只证明 observation 结构与 fail-fast routing。另用 controlled Agent playbook 在具备真实工具的环境执行 probe，记录真实 URL/fetch outcome；若环境没有工具，预期 verdict 是正确停在 HITL1，而不是伪造 PASS。

## Risks / Trade-offs

- [Risk] Agent 错报 available → schema 只能校验 observation 自洽，不能独立证明外部调用；通过 HITL1 明确步骤、真实 controlled run 和禁止 mock 降低风险。
- [Risk] 单站点暂时失败造成 unavailable → 允许环境修复或选择另一个真实搜索结果后重跑同一 bounded probe，不增加自动重试树。
- [Risk] 旧 bundle 缺字段 → schema 保持可读，HITL1 gate 明确按 unprobed 阻止，不静默放行。
- [Trade-off] 该设计没有离线降级能力 → 接受早失败，优先避免生成无证据或伪证据报告。

## Migration Plan

1. 增加 ProfileSchema observation 分支及 schema regression tests。
2. 更新新 bundle profile template，默认写入 `status: unprobed`。
3. 更新 HITL1 phase execution contract、probe 步骤和 payload checklist。
4. 增加 HITL1 专用 gate rule、失败诊断和 integration tests。
5. 增加真实 Agent-controlled probe playbook，更新 CHANGELOG 与 `DPT_FRAMEWORK/RUN.md`，版本提升到 `v0.18`。

回滚时删除新模板字段和 gate rule即可；旧 bundle 中额外的 `research_access` 字段不会影响旧 ProfileSchema 的其他 authority surface。

## Open Questions

无。工具 surface 的具体名称按运行环境原样记录，不建立预注册枚举。
