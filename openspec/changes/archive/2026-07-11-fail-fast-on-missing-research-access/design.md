## Context

Canonical research waves 依赖当前 Agent 环境提供真实 search 与 fetch，但现有 framework 直到 silent Wave0 才会碰到该依赖。JavaScript Engine 无法调用或证明宿主 Agent 的外部工具能力；让 Engine 探测 `curl`、网络或工具名会把“某个底层通道存在”误当成“当前 Agent 能通过实际 surface 搜索并抓取证据”，形成虚假的可用性证明。

HITL1 是进入 silent execution 前最后一个用户本来就在场的 checkpoint，因此能力确认应放在这里。Change1 (`v0.17`) 已建立 shortest control path 与 one authority path 的基线，本 change 继续采用同一纪律：Agent 做一次真实、有限的 search+fetch；profile 保存直接 observation；ProfileSchema 校验结构；现有 HITL1 gate rule 只判断 status 是否 available；失败后回到同一 probe/gate。

## Goals / Non-Goals

**Goals:**

- 在 silent waves 前确认当前 Agent 环境能搜索并抓取一个真实 HTTP(S) 页面。
- 用 `rb_profile.yaml#/research_access` 保存最小、可审计、不可由现有 bundle state 重建的直接 observation。
- 对 missing、unprobed、unavailable 和结构伪造的 available 状态 fail closed。
- 让 Agent 从一次 gate 输出得到一个最近动作：修复/切换环境后重跑同一 probe 和同一 gate。
- 保留用户已经完成的 HITL1 profile/must-answer 决策，避免环境问题迫使用户重复回答。

**Non-Goals:**

- 不实现 offline research、无证据报告或用户素材 ingestion。
- 不建立 generalized capability registry、工具矩阵、runtime daemon、watcher 或 retry controller。
- 不把 probe 结果计入 reference、cache、ledger、work-unit output 或 Wave coverage。
- 不用 fake WebSearch/WebFetch、mock URL、固定 fixture URL 或手写 fetch success 声称外部研究能力可用。
- 不追溯阻断已经越过 HITL1 的 legacy bundle。

## Decisions

### 1. HITL1 使用一个短而固定的 probe/gate 回路

HITL1 的顺序固定为：

```text
用户确认 HITL1 choices
  -> 写入 choices 并运行 apply-research-style
  -> 至多一次 neutral capability-only search
  -> 对第一个 usable HTTP(S) result 做至多一次 fetch
  -> 写 research_access observation
  -> 运行现有 hitl1-recorded gate
```

Successful probe 恰好执行一次搜索和一次抓取；失败路径至多调用一次 search 和一次 fetch：

- search surface 缺失、search 调用失败/被阻止、没有 usable result、没有 HTTP(S) URL，或 search 成功但 fetch surface 在调用前即缺失：记录 `unavailable`，`fetch_outcome: not_attempted`；
- search 返回 usable URL，但 fetch 被阻止或失败：记录 `unavailable`，outcome 为 `blocked` 或 `failed`；
- search 返回真实 URL 且 fetch 返回页面内容：记录 `available` 与 `fetch_outcome: success`。

不评估来源质量；只取 search 返回的第一个 usable HTTP(S) result。不做自动第二站点、不做工具 fallback matrix、不做指数退避。若 unavailable，HITL1 向用户说明 evidence-backed waves 当前不能启动；保留 `hitl1.status: recorded` 和用户 choices，环境修复或用户决定再次尝试后，重跑同一 probe 和同一 gate。

### 2. `research_access` 使用 strict discriminated branches

新 bundle template 初始化为：

```yaml
research_access:
  status: unprobed
```

Schema 使用 `status` 判别的严格分支，而不是一组层层叠加的 post-validation：

```text
unprobed
  required: status
  allowed:  no success fields

available
  required: status, probed_at, result_url, fetch_outcome=success
  optional: search_surface, fetch_surface

unavailable
  required: status, probed_at, fetch_outcome=failed|blocked|not_attempted, reason
  optional: result_url, search_surface, fetch_surface
```

`probed_at` 必须是 ISO 8601 timestamp；任何出现的 `result_url` 都必须是 HTTP(S) URL；`reason` 和 optional surface labels 必须是 trim 后非空字符串。`search_surface` / `fetch_surface` 只是 optional audit labels；真实 gate facts 是 schema-valid observation 与 `status: available`，不因运行环境无法提供稳定工具名而误阻塞。

旧 profile 缺少整个 `research_access` 字段时仍可解析，但 gate 读取缺失 status 时按 not available 失败。Profile 不记录 response body、query history、HTTP 状态矩阵、多次尝试列表或 derived gate verdict。

### 3. 复用 ProfileSchema + existing `field_value`，不新增 checker

HITL1 gate definition 在 `profile_schema_valid` 后增加一条普通 rule：

```json
{
  "id": "research_access_available",
  "check": "field_value",
  "target": "rb_profile.yaml#/research_access/status",
  "operator": "equal",
  "value": "available"
}
```

这条 rule 只回答一个问题：status 是否 available。Available 所需的 timestamp、URL 与 fetch success 已由 `ProfileSchema` 的单一分支定义，不在 gate CLI 再写一份近似 validator。

Failure message 只给一个动作：读取 `rb_profile.yaml#/research_access/reason`（若存在），修复/切换环境，重跑同一 HITL1 probe 和 gate。Gate 不动态拼接 reason，不新增 `research_access_available` check type，不新增 inspect command，也不产生 degraded Setup route。

### 4. Style writer 必须做语义保真更新

当前 `apply-research-style.mjs` parse 后通过手写 allowlist 重建整个 `rb_profile.yaml`。任何新 profile section 都会被静默删除；即使 HITL1 正确写入 `research_access`，后续 style apply/rerun 也可能把它抹掉。

本 change 将 writer 收敛为：读取完整 profile object，只替换 `research_profile` 与 `research_style_params`，再用 approved `yaml.stringify` 写回完整 object。它必须保留 root must-answer、HITL decisions、rerun fields 和 `research_access` 的语义值；不承诺保留空格、引号或注释等 presentation formatting。

这是局部简化而非额外保护层：删除字段 allowlist serializer，减少未来新增 profile 字段时的重复写入逻辑。

### 5. HITL1 metadata 明确声明 `capability_probe_only`

`phase-hitl1.md` 不能一边声明 `execution_contract.search_policy: no_search`，一边在正文要求真实 search。Frontmatter 改为 `capability_probe_only`；现有 consistency validator 将该值加入合法 policy，并将其设为 HITL1 的唯一 expected policy。

该 policy 只允许当前 phase Agent 执行上述一次 capability probe，不授权 research evidence collection、work-unit delegation 或 silent wave search。其他 lifecycle phase 的 expected policy 不变，不新增第二个执行 surface。

### 6. Probe observation 与 research evidence 通过写入边界隔离

Phase guidance 和 controlled playbook 明确禁止把 probe URL、页面内容或工具结果写入：

- `reference/`
- `_cache/`
- `artifacts/`
- work-unit output/result/receipt
- submitted ledger 或 output declarations
- Wave coverage/count floors

Engine 不新增“清理 probe evidence”的二次控制器。静态 Markdown test 验证规则可见，controlled playbook 在 gate verdict 前检查上述 surface 没有 probe leakage。

### 7. 真实能力由一个 Agent-controlled canary 观察

新增 `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` 并登记到 `RUN_EXPS.md`。

Canary 必须由当前 Agent 实际执行 search/fetch，URL 必须来自当次动态搜索结果：

- 若工具可用，写入 available observation，HITL1 gate 应 pass；
- 若工具缺失或调用失败，写入 unavailable observation，HITL1 gate 应 fail 且不得给出 Setup next；
- 两条环境观察都必须检查 probe 未进入 evidence surfaces；
- case verdict 来自 profile + gate JSON + trace checks 的一致性，不来自硬编码 `passed: true`。

Deterministic schema/gate fixtures 可以写 synthetic valid observation，但必须明确只证明 Engine contract，不得作为真实 Agent capability evidence。

## Risks / Trade-offs

- [Risk] Agent 错报 available → Schema 只能校验 observation 自洽，不能独立证明外部调用；通过明确 phase contract、真实 canary 和禁止 fixed URL/mock 降低风险。
- [Risk] 单次 fetch 遇到临时站点故障 → 接受 conservative unavailable；用户仍在 HITL1，可决定修复/重试同一 probe，避免自动 retry tree。
- [Risk] Legacy profile 缺字段 → Schema 保持可读；仅在 HITL1 gate 被评估时按 unprobed 阻止，不对已越过 HITL1 的 bundle 做大范围迁移。
- [Risk] Existing deterministic fixtures 大量依赖旧 HITL1 pass shape → 系统性更新所有 pass fixtures，统一写 synthetic valid observation，并保留一个 missing legacy negative case。
- [Trade-off] 该设计没有离线降级能力 → 接受早失败，优先避免生成无证据或伪证据报告。

## Migration Plan

1. 增加 strict `research_access` branches、profile template 默认值与 schema regressions。
2. 将 style writer 改为完整 profile 保真写回，并增加 HITL1/rerun preservation regressions。
3. 更新 HITL1 `capability_probe_only` metadata、phase probe/checklist/no-evidence wording 与 consistency tests。
4. 在 HITL1 gate definition 复用 `field_value` rule，更新 gate-rule audit、gate tests 与所有 deterministic pass fixtures。
5. 增加 real Agent-controlled case-115，更新 `RUN_EXPS.md`、CHANGELOG 与 `DPT_FRAMEWORK/RUN.md`，版本提升到 `v0.18`。

回滚时删除新 template 字段、schema branch、HITL1 field-value rule 与 probe guidance，并恢复 HITL1 `no_search` expected policy。Style writer 的完整-object 保真写入是独立简化，可安全保留，不需要恢复字段 allowlist serializer。

## Open Questions

无。工具 surface 名称按运行环境原样选择性记录，不建立预注册枚举。
