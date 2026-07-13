# Design Analysis: Seed Topic Backfill Zone Lacks Round Continuity

## Metadata

| Field | Value |
|---|---|
| **Identifier** | `seed-backfill-round-continuity` |
| **Category** | Structural Design Flaw（非单点 bug） |
| **Severity** | **P0** — blocks sanctioned multi-round rerun |
| **Status** | Analysis / Awaiting Implementation |
| **Date** | 2026-07-13 |
| **Related Bugs** | BUG-081 (seed skeleton minimal), BUG-082 (work-unit provenance), BUG-080 (rerun backfill quality) |
| **Related Change** | `repair-rerun-added-topic-bootstrap` (addresses BUG-081-084, does NOT address this flaw) |

---

## 1. What This Is

### The Core Flaw

Seed topic 文件的「研究轮次追加区」是 **单次消费结构**。`__BACKFILL_*__` token 被设计为 grep 定位 → 替换 → gate 验证已消费。第一次 research round 完美工作。但框架明确支持多轮 rerun（HITL2 → rerun → seed-topics → wave0/1/2 → HITL2 循环），token 在 round 1 消费后永久消失，round 2 没有结构化的回填目标。

### 具体症状

1. **One-shot token**：`__BACKFILL_WAVE0_EVIDENCE__` 等在 round 1 被替换后消失。phase-wave0.md:165 说 "Locate `__BACKFILL_WAVE0_EVIDENCE__`"——但 round 2 时 token 不存在。

2. **"本轮"命名是相对的、误导的**：section header 如「本轮新增证据」「本轮新增机制理解」描述"当前轮次"，但第一轮填充后变成"上一轮"。第二轮读这些 header 时，不知道内容是 round 1 的还是自己的目标位置。

3. **`## 本轮重跑方向` 无法连接回填目标**：phase-rerun 写入 `action: supplement`、`new_search_dimensions` 告诉下一轮搜什么，但不创建搜完后往哪写的结构性目标（fresh token）。

4. **Phase doc 假设首次运行**：三个 wave phase 的回填指令全部是 "grep token → replace"，没有任何 "token 已消费时的替代路径"。

5. **Gate 产生虚假通过**：gate-wave1-complete 检查 `__BACKFILL_WAVE1_MECHANISMS__` 不存在（negate: true）。Round 1 消费后 token 消失 → gate 通过。Round 2 什么都没做 → gate 也通过（因为 token 是 round 1 消费的，gate 无法区分「本轮消费」和「上轮消费」）。

6. **问题逐轮恶化**：Round 1 正常 → Round 2 Agent 即兴发挥 → Round 3 回填区变成无结构的多轮混合内容，无法追溯哪条证据来自哪一轮。

### 这不是 BUG-081

| 关注点 | BUG-081 | 本缺陷 |
|---|---|---|
| 新 topic (add_topic) 获得 backfill token | ✅ `renderSeed()` 产出完整骨架 | ❌ 不影响 `renderSeed()` |
| 已有 topic 在 round 2+ 获得 backfill token | ❌ `renderSeed()` 只影响新建 | ✅ phase-rerun 重新注入 token |
| 本质 | 初始骨架太薄 | **回填区结构缺乏跨轮连续性** |

**即使 BUG-081 完全修好**（每个新 topic 都有完整骨架+5 个 token），round 1 消费后 token 仍然消失，round 2 仍然没有回填目标。

---

## 2. Full Impact Trace

### Primary Failure Scenario

**Given**: 研究跑完一轮完整 cycle（HITL1 → seed-topics → wave0 → wave1 → wave2 → HITL2）。所有 seed topic 文件的 `__BACKFILL_*__` token 已消费。

**When**: HITL2 用户决定 rerun，提供新 rationale（如 "补充成本分析维度"）。框架路由：phase-rerun → seed-topics → wave0 → wave1 → wave2 → HITL2。

**Then**: wave0/1/2 的 Phase Agent 尝试回填时发现所有 5 个 token 都不存在。Agent 没有结构性目标——可能追加在旧内容后、覆盖上轮内容、或（最可能）静默跳过回填。

### Phase-by-Phase Breakdown

| Phase | What Breaks |
|---|---|
| **phase-rerun** | 写入 `## 本轮重跑方向`（搜什么）但不创建结构性回填目标（往哪写）。职责不完整。 |
| **phase-seed-topics** | rerun-aware 行为（lines 323-341）保留了已有文件但不刷新 token。盲点。 |
| **phase-wave0 §3.3** | "Locate `__BACKFILL_WAVE0_EVIDENCE__`" — token 不存在，无替代指令。阻塞。 |
| **phase-wave1 §3.3** | 同上，三个 token 全部不存在。阻塞。 |
| **phase-wave2 §3.2.3** | 同上，两个 token 不存在。阻塞。 |
| **gate-wave1-complete** | token 在 round 1 消费后不存在 → 虚假通过（没有消费 round 2 的 token，因为根本没有） |
| **gate-wave2-complete** | 同上，虚假通过 |

---

## 3. Design: Phase-Rerun 重新注入 Token

**核心思路**：wave 是组织原则，不是 round。每个 wave section（Wave0 Evidence、Wave1 Mechanisms、Wave1 Trends & Gaps、Wave2 Findings、Open Questions）是固定的，内容按 `### Round N` 在 section 内累积。token 永远在对应 wave section 底部，phase-rerun 只干一件事——检测 token 是否被消费，被消费了就在 section 底部重新注入。

**三个设计修正：**

1. **Wave 固定 section，Round 在内部累积**：`## Wave0 Evidence` 下 `### Round 1` → `### Round 2` → … → token。Round 10 也不影响可读性——你要看 Wave0 的所有证据就只看一个 section。
2. **回填要求在 seed topic 里简单说**：每个 wave section header 下面一句简洁的回填要求（对齐 phase-waveN.md 的现有要求），Agent grep 到 token 时就能看到它该填什么。
3. **Phase-rerun 只重新注入 token**：不改 header、不追溯标记。读完每个 wave section，如果底部没有 `__BACKFILL_*__` 就补一个。

**After（round 1 完成 → phase-rerun 注入 token 后）：**

```markdown
## ═══ 研究轮次追加区 ═══

## Wave0 Evidence
> return-map entry: evidence_meaning + relationship + refs (≥1 concrete reference/00-shared-*.md) + status + next_hop。禁止 bare URL。连接 must_answer 或初始假设。

### Round 1
- evidence_meaning: 官方立场文件确认...
  relationship: supports
  refs:
    - reference/00-shared-official-positions.md
  status: supported
  next_hop: Wave1 deepen mechanism behind official stance

__BACKFILL_WAVE0_EVIDENCE__

## Wave1 Mechanisms
> return-map entry: evidence_meaning + relationship + refs (优先 reference/{topic.slug}-<source-slug>.md，artifacts/_cache 仅二级) + status + next_hop。从 evidence-summary.md 提取，说明机制如何连接证据到结论。

### Round 1
- evidence_meaning: 法规驱动机制为...
  ...

__BACKFILL_WAVE1_MECHANISMS__

## Wave1 Trends & Gaps
> return-map entry: evidence_meaning + relationship + refs + status + next_hop。从 evidence-summary.md 提取趋势/局限/矛盾。relationship: refutes 需说明反驳了什么及替代解释。

### Round 1
...

__BACKFILL_WAVE1_TRENDS__

## Wave2 Findings
> return-map entry: evidence_meaning + relationship + refs (保留 W2F-xxx ID，优先 reference/00-cross-*.md，ledger/index 仅二级 provenance) + status + next_hop。从 cross-topic-ledger.md + finding-index.yaml 提取。禁止从 synthesis 叙事直接摘抄。

### Round 1
...

__BACKFILL_WAVE2_JUDGMENT__

## Open Questions
> 每行 [开放]|[部分解答]|[涌现] + return-map entry。Wave1 首填，Wave2 终更。不得留空。

### Round 1
- [部分解答] 实施时间线尚不明确...

__BACKFILL_PENDING_QUESTIONS__

## 重跑方向
- action: supplement
- new_search_dimensions: "成本分析"
```

**为什么是这个方案：**

- **可读**：Round 100 也不怕——你要看 Wave0 的所有证据就看 `## Wave0 Evidence` 一个 section，Round 子标题在里面像日志一样累积
- **简洁**：phase-rerun 只干一件事（补 token），不改 header、不追溯标记
- **Agent 友好**：回填要求就在 seed topic 里，grep 到 token 就能看到要求。同时 phase doc 里有完整要求，两处对齐
- **Gate 兼容**：token 每轮结束时消费、phase-rerun 重新注入，gate 检查模式不变
- **最小变更**：phase-rerun.md（补 token）、phase-seed-topics.md（模板）、canonical-topic-state.mjs（renderSeed 用新模板）

**特别修正：Wave2 回填补齐**

原设计 phase-wave2.md §3.2.3 有 backfill 指令但 Wave2 回填在实际上从未可靠执行——模板有 token，phase doc 有指令，但 token 消费问题同样存在，加上 Wave2 关注点在 cross-topic-ledger 和 finding-index，seed topic 回填容易被跳过。本方案将 Wave2 回填与 Wave0/Wave1 统一：同一个 token 注入/消费机制，同一个 seed topic 内的 wave section 结构，同一套 gate 验证。

**风险和缓解：**

- seed topic 文件随轮次增长 → `rerun_count < 3` cap
- phase-rerun 崩溃 → staged write + 幂等（检测 token 已存在则跳过）

---

## 4. Implementation Specification

### 4.1 核心变更：phase-rerun.md（新增 Stage 3b：重新注入 Token）

在写入 `## 重跑方向` 之后、递增 `rerun_count` 和运行 gate 之前：

```
### Stage 3b: Re-inject Backfill Tokens

对每个受影响的已有 topic（action: supplement 或无结构变更）：

1. 定位回填区（delimited by ## ═══ 研究轮次追加区 ═══）

2. 检测模板版本：
   - 若存在 `## Wave0 Evidence` → 新模板，跳到步骤 3
   - 若存在 `## 本轮新增证据` → 旧模板，先做一次性迁移：
     a. 将旧 header 替换为新 header（`## 本轮新增证据` → `## Wave0 Evidence`，类推）
     b. 在每个新 header 下加回填要求（`> return-map entry: ...`）
     c. 将已有回填内容包一层 `### Round 1`
     d. 然后继续步骤 3

3. 对每个 wave section（Wave0 Evidence、Wave1 Mechanisms、Wave1 Trends & Gaps、
   Wave2 Findings、Open Questions），检查 section 底部是否有对应的 __BACKFILL_*__ token：
   - 有 → 上轮未完成回填，跳过（token 仍有效）
   - 无 → 上轮已消费，在 section 底部（最后一个 ### Round N 之后）重新注入 token

4. 新 topic（本轮 add_topic）跳过——已有 fresh skeleton with tokens

5. staged write（tmp → verify → atomic rename）
```

**检测逻辑（极简）：**
```
for each wave section:
  grep __BACKFILL_*__ within the section
  if found → skip
  if not found → insert token at bottom of section (after last ### Round N, before next ## header)
```

不再追溯标记 header、不再改名（旧模板一次性迁移除外）。phase-rerun 的核心逻辑：检测模板版本 → 旧模板迁移一次 → 补 token。

### 4.2 模板与 seed 骨架变更

| File | Change |
|---|---|
| `phase-seed-topics.md` (lines 161-196) | **模板重写**。当前模板用 `## 本轮新增证据` 等 header + 无回填要求 + token。改为 wave 固定 section（`## Wave0 Evidence`）+ 简洁回填要求（`> return-map entry: ...`）+ token。不再提及"本轮"。 |
| `canonical-topic-state.mjs` `renderSeed()` | **配合 BUG-081**：初始骨架的回填区使用与 phase-seed-topics.md 一致的新模板（wave section + 回填要求 + token），Round 1 初始状态无 `### Round` 子标题，token 在 section 底部等待首次消费。 |
| `phase-wave0.md` §3.3 | 添加 missing token 的 fallback 指令（边缘情况） |
| `phase-wave1.md` §3.3 | 同上 |
| `phase-wave2.md` §3.2.3 | 同上 |
| `shared-schemas.md` | 记录 multi-round 结构和 wave section 内 Round 累积约定 |
| Gate definition JSON | **无变更**（主要流程）；可选 P2 diagnostic 增强 |

### 4.3 文件变更汇总

| File | Change Type | Description |
|---|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md` | **Major** | 新增 Stage 3b：检测每个 wave section 底部是否有 token，没有则重新注入 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md` | **Major** | 模板重写：wave 固定 section + 简洁回填要求 + token，去掉"本轮" |
| `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` | **Major** (via BUG-081) | `renderSeed()` 用新模板 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` | Minor | 添加 missing token fallback |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | Minor | 同上 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` | Minor | 同上 |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md` | Minor | 记录 multi-round 结构 |
| Gate definitions | **None** (primary) / Minor (optional) | 现有 pattern 继续工作 |

---

## 5. Migration

### 自动迁移

| 当前状态 | 检测方式 | 动作 |
|---|---|---|
| 首次运行，token 存在 | `__BACKFILL_*__` found in each wave section | 无需变换 |
| Round 1 完成后（新模板），token 不存在 | `__BACKFILL_*__` NOT found in wave section（header 匹配 `## Wave0 Evidence` 等） | 在 section 底部重新注入 token |
| Round 1 完成后（**旧模板**），header 不匹配 | `## Wave0 Evidence` not found，存在 `## 本轮新增证据` 等旧 header | 先迁移模板：将旧 header 替换为新 header + 加回填要求，然后将已有回填内容包一层 `### Round 1`，最后注入 token |
| 新 topic（add_topic，BUG-081 fix 已应用） | Fresh skeleton with tokens | 无需变换 |
| 新 topic（add_topic，BUG-081 fix 未应用） | 薄骨架，无回填区 | 无法变换——需先修 BUG-081 |

### 已有 Bundle 迁移路径

- **处于 HITL2 和 rerun 之间**：phase-rerun 自动检测消费的 token 并变换。无需人工干预。
- **处于 mid-round**（如 rerun 的 wave1 中）：wave phase fallback 指令处理 missing token。下个 rerun 时 phase-rerun 自动迁移。
- **已完成（phase-final 后）**：下次 rerun 时自动迁移。

---

## 6. Interactions

### 与 BUG-081/082 的组合效果

| Fix | 解决的问题 |
|---|---|
| BUG-081 | 新 topic 在 rerun 中起始就有完整骨架+backfill token |
| BUG-082 | 新 topic 有 work-unit provenance，通过 gate |
| **本 fix** | 已有 topic 每轮 rerun 获得 fresh backfill token，种子文件累积轮次记录 |

### 依赖关系

```
BUG-081 (完整骨架) ──→ 本 fix (phase-rerun 刷新 token)
     ↓                        ↓
  新 topic 有 token      已有 topic 每轮重新获得 token
                         
BUG-082 (provenance) ── 正交，互不阻塞
```

1. **先修 BUG-081**：确保新 topic 有回填区结构锚点
2. **再修 BUG-082**：确保新 topic 通过 provenance gate
3. **再修本 fix**：已有 topic 获得跨轮回填连续性（依赖 BUG-081，不依赖 BUG-082）

---

## 7. Verification

### Unit-Level

- **Test 1**：Round 1 完成后运行 phase-rerun → 每个 wave section 底部重新出现 token、原内容在 `### Round 1` 下保留、`## 重跑方向` 存在
- **Test 2**：已有 `### Round 1` + `### Round 2` 的 topic 再次 phase-rerun → 每个 section 底部补上 token（Round 3 回填目标）
- **Test 3**：有未消费 token 的 topic → phase-rerun 检测到 token 已存在，跳过，不重复注入
- **Test 4**：本轮新建 topic（add_topic）→ phase-rerun 跳过（已有 fresh skeleton with tokens）

### Integration-Level

- **Test 5**：完整 rerun cycle（round 1 done → rerun → seed-topics → wave0 → wave1 → wave2）→ 各 wave 后对应 token 被消费（替换为 `### Round 2` 内容）、所有 gate 通过（无虚假通过）
- **Test 6**：含 add_topic 的完整 rerun cycle → 新 topic 有完整骨架、已有 topic 有刷新 token、所有 topic 回填完成、所有 gate 通过

### Edge Cases

- **Test 7**：Phase-rerun 崩溃恢复 → 幂等（token 已存在则跳过）
- **Test 8**：Wave phase 遇到 missing token（phase-rerun 未执行）→ Agent 执行 fallback 指令
- **Test 9**：rerun_count = 3（最大轮次）→ 每个 section 下 `### Round 1`、`### Round 2`、`### Round 3` 累积，token 正确注入和消费

### Controlled Real-Agent Evidence

从干净 normal-run fixture（3 topics, 1 completed round）开始，用真实 Agent 执行完整的 phase-rerun → seed-topics → wave0 → wave1 → wave2 路径，验证以上所有断言。再重复第二个 rerun（round 3）验证 Round 累积。

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase-rerun 崩溃留下 hybrid 文件 | Low-Medium | High | Staged write (tmp → verify → atomic rename)；幂等设计 |
| Agent 在 wave phase 找不到 token | Low | Medium | Wave phase fallback 指令 + trace event |
| Token 插入位置错误 | Low | Low-Medium | 精确指令：插入在 section 底部、最后一个 `### Round N` 之后、下一个 `##` header 之前 |
| Seed topic 文件过大 | Low | Low | rerun_count < 3 cap；return-map 简洁 |
| Phase-rerun 旧模板迁移出错 | Low-Medium | Medium | 一次性迁移逻辑简单（rename header + wrap `### Round 1` + 加回填要求 + 注入 token）；幂等（检测到新 header 则跳过迁移） |
