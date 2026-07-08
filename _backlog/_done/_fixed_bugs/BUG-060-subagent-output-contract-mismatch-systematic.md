# BUG-060 — Sub-agent 产出物与 Engine contract 之间的系统性 mismatch：5 个独立 gap 导致 gate 反复卡住

| 属性 | 值 |
|------|-----|
| ID | BUG-060 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1 — 每个 gap 单独不致命，但协同作用导致 gate 无法 pass，Agent 花费大量时间修复格式而非做研究 |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run，exploratory_map profile，5 topics，6 work units |
| 相关 Bug | [[BUG-018]]（YAML sanitization + repair whack-a-mole + shared_ref threshold）、[[BUG-014]]（relay 旁路）、[[BUG-015]]（gate 规则过严） |
| 影响文件 | `engine/work-unit-core.mjs`（`readAndValidateResult`, `validateSubmitRuntimeReceipt`, `validateCacheTrails`, `validateSourceClaims`）、sub-agent 的 task.md 生成逻辑、wave0 gate definition、work-unit output contract |

---

## 0. 一句话核心诊断

**Sub-agent 产出的 6 类结构性偏差（result.json 包装、receipt 字段缺失、cache 文件命名、nonce 来源不一致、source_claims 被 contract 阻止、shared_ref 无 provenance）全部是可预测、可系统修复的——但当前 engine 对这些偏差零容忍，且错误报告不区分"研究内容有问题"和"格式不对"。结果：研究内容高质量（63 sources，全部真实 URL，覆盖 5 个维度），但 gate 花了 3+ 次 attempt 仍然 pass 不了。**

---

## 1. Gap 清单

### Gap 1：result.json 包装（P1 — 100% 复现）

**现象**：Sub-agent 产出的 `result.json` 将数据包在 `{"result": {...}}` 内，而 `WorkUnitResultSchema` 期望顶层就是 identity fields。

```json
// Sub-agent 产出
{"result": {"work_id": "...", "queue_item_id": "...", ...}}

// Engine 期望
{"schema_version": "work-unit.result.v1", "work_id": "...", "queue_item_id": "...", ...}
```

**Zod 报错**：`Unrecognized key: "result"` + 所有 required fields 报告为 `undefined`。

**根因**：Sub-agent 的 task.md 没有明确禁止包装。Agent 的自然倾向是把结果放在一个 `result` key 下（这是 Claude 的 Structured Output 习惯）。`WorkUnitResultSchema` 是 `.strict()` 的，不允许额外 key。

**为什么这是系统性 gap**：每个 sub-agent 都会犯这个错误。不是某个 sub-agent 的问题，是 task.md 指令和 engine contract 之间的 gap。

**修复方向**：
- **Engine 侧（防御）**：`readAndValidateResult()` 检测到顶层有单一 `result` key 时，自动 unwrap 并记录 `silent_degradation`（`gap_impact: none`——内容是对的，只是格式差一层）
- **Task 侧（根除）**：task.md 模板中增加显式的 result.json 格式示例，标注 "MUST be flat, no wrapper key"

### Gap 2：Runtime receipt 缺少 identity fields（P1 — 100% 复现）

**现象**：Sub-agent 写入的 `runtime-receipt.jsonl` 每行缺少 `schema_version`、`queue_item_id`、`kind`，部分行缺少 `receipt_nonce`。

```jsonl
// Sub-agent 产出
{"ts":"...","event":"work_unit_start","work_id":"wu-w0-b000-src-i0001","receipt_nonce":"..."}

// Engine 期望
{"schema_version":"work-unit.receipt-event.v1","event":"work_started","work_id":"wu-w0-b000-src-i0001","queue_item_id":"wave0-source-...","kind":"wave0_source_intake","receipt_nonce":"..."}
```

**Zod 报错**：`Invalid input: expected string, received undefined` at path `["queue_item_id"]`、`["kind"]`。

**根因**：task.md 中的 Lifecycle Receipt 示例包含所有字段，但 sub-agent 用自然语言生成 receipt（不是 copy-paste 模板），倾向于只写"有变化的"字段。

**为什么这是系统性 gap**：task.md 的示例是给人读的参考，不是给 Agent 的强制模板。Agent 会把示例理解成"大概长这样"，而不是"逐字照抄 identity fields"。

**修复方向**：
- **Engine 侧（防御）**：`validateSubmitRuntimeReceipt()` 在发现 receipt line 缺少 identity fields 时，自动从 record 补全并记录 `receipt_autofill` 事件，而不是直接 reject
- **Task 侧（根除）**：将 receipt 示例改为明确的 "EVERY line MUST copy these exact fields" 指令，并用代码块标出不可变部分

### Gap 3：Cache 文件命名不一致（P2 — ~70% 复现）

**现象**：Sub-agent 写 `page-content.md` 而非 `page.md`。cache policy 的 `leaf_files` 是 `["websearch.json", "page.md", "meta.json"]`——`page-content.md` 不匹配。

**根因**：Sub-agent 用描述性文件名（`page-content.md` 准确描述了文件内容），而 engine 用简短规范名（`page.md`）。task.md 的 Cache Policy section 列出了 leaf_files 但没有强调"文件名必须精确匹配，不能改"。

**修复方向**：
- **Engine 侧（防御）**：`validateCacheTrails()` 在 `page.md` 缺失但 `page-content.md` 存在时，自动 rename 并记录 `cache_file_renamed` 事件
- **Task 侧**：Cache Policy section 增加 "exact file names required — do not rename" 标注

### Gap 4：receipt_nonce 双源问题（P1 — 100% 复现，但症状隐蔽）

**现象**：Spawn prompt 中的 `receipt_nonce` 和 engine 在 claim 时生成的 `receipt_nonce` 是**两个不同的值**。Sub-agent 使用 spawn prompt 中的 nonce 写入 result.json 和 receipt，但 `readAndValidateResult()` 用 record（来自 engine claim）的 nonce 做比对 → mismatch。

**根因**：`operate-work-unit.mjs claim` 的 `buildAgentSpawnPrompt()` 生成了一个 prompt 文本（含 nonce），但这个 prompt 中的 nonce 来自 task card 的 snapshot。实际 claim 时 engine 通过 `receipt_nonce: crypto.randomUUID()` 生成了新 nonce 并写入 work unit index record。task.md 模板中也写死了 prompt 中的 nonce。**两个 nonce 来源不同，值不同。**

**实际影响**：在本次 run 中，4/5 的 sub-agent 产出的 nonce 与 record 不匹配。Phase Agent 必须手动读取 `_beacon.json` 中的实际 nonce，替换 result.json 和 receipt 中的所有 nonce 值。

**修复方向**：
- **Engine 侧（根除）**：`buildAgentSpawnPrompt()` 应该在 claim 完成后、用 record 中的实际 nonce 生成 prompt，而不是用 task card 中的 nonce
- 或者：task.md 模板不写死 nonce，改为 "read from _beacon.json"

### Gap 5：source_claims contract/gate 矛盾 + shared_ref provenance 需求（P1 — 阻塞性）

**现象**：这是两个相互关联的 gap：

**5a. Contract 阻止 source_claims**：Wave0 的 output contract（manifest.json 中的 `output_contract`）没有 `source_claims.allowed = true`。因此任何包含非空 `source_claims[]` 的 result.json 都会在 `validateSourceClaims()` 中被 reject。

**5b. shared_ref_count_floor 要求 accepted source_claims**：Gate 的 `shared_ref_count_floor` 规则只计数有 accepted source_claims + work-unit ledger row 的 shared reference。但 5a 阻止了 source_claims 的存在。**结果是：即使 shared reference 文件存在且有 work-unit row，gate 也永远计数为 0。**

**根因**：
- Wave0 的 output contract 在 manifest 生成时写死，不区分 "普通 topic source intake"（不需要 source_claims）和 "shared reference supplementary repair"（需要 source_claims）
- Gate 的 shared_ref 规则假设所有 reference 都有 source_claims——但这个假设对 supplementary repair task 不成立（repair task 的 contract 和原始 task 相同）
- `validateSourceClaims()` 的 contract check（`contract.allowed !== true` → throw）是硬阻断，没有降级路径

**修复方向**：
- **Contract 侧**：Supplementary repair task 的 output contract 应允许 source_claims。可以通过 enqueue 时设置 `payload.allow_source_claims: true` 并在 manifest 生成时读取
- **Gate 侧**：shared_ref_count_floor 对没有 source_claims 但有 work-unit row 的 reference，应降级计数（如按 0.5 权重）而非完全排除
- **Engine 侧**：`validateSourceClaims()` 在 contract 不允许但 source_claims 为空时，应 pass 而非检查 contract（当前已有 early return，但 supplementary task 如果有 source_claims 就会触发 contract block）

---

## 2. 本次 Run 的 Gate Attempt 时间线（附录）

```
Attempt 1: 13 issues — 全部 5 topics schema_valid fail (YAML wrapper), shared_ref 0, trace_event 缺失
Attempt 2: 13→5 issues — YAML 格式修复后: schema_valid 4/5 pass + count_floor 4/5 pass + trace_event pass
                         但 shared_ref 仍 0 (filesystem_only_not_ledger_declared), 
                         3 topics 仍有 null dates / missing URLs
Attempt 3: 5→2 issues — source_claims 被 contract 阻止 (Gap 5a), cache_coverage 缺失 (Gap 5b 连锁)
             fatigue_warning: true, step_back: true
```

**Sub-agent 在 attempt 1 之前就完成了所有 5 个 topic 的 research（63 sources，真实 URL）。之后的 3 次 attempt 全部花在修复 Gap 1-5 的格式问题上。**

---

## 3. 为什么这不是 BUG-018 的重复

BUG-018 记录了三个缺陷：YAML sanitization（Sub-agent 手拼 YAML 导致 parse 失败）、repair whack-a-mole（gate 原子检查）、shared_ref threshold 不能归零。

BUG-060 新增的 5 个 gap 是**另一个维度**——不是 "产出格式不对"（YAML 那类），而是 **"产出格式和 engine contract 之间的接口 mismatch"**：

| 维度 | BUG-018 | BUG-060 |
|------|---------|---------|
| 问题性质 | Sub-agent 手拼 YAML 引号转义 | Engine contract 和 Sub-agent 行为之间的 interface gap |
| 修复方向 | Sub-agent 用 `yaml.stringify()` | Engine 做防御性容错 + task.md 做精确指令 |
| 典型症状 | "Cannot parse YAML array" | "Unrecognized key: result" / "expected string, received undefined" / "not allowed by output contract" |
| 是否可预测 | 取决于 source 标题是否含特殊字符 | **100% 可预测**——每个 run 的每个 sub-agent 都会遇到 |

---

## 4. 与其他 Bug 的关系

| Bug | 关系 |
|-----|------|
| BUG-018 | 同一次 run 的不同维度。BUG-018 的 YAML sanitization 在本次 run 仍然存在（topic 02 的 dominant_mood 行含嵌套引号导致 parse 失败） |
| BUG-014 | 根因之一：sub-agent 通过 Agent 工具直接 spawn，不走 relay → 没有统一的 output validation |
| BUG-015 | 背景：gate 规则对非 relay 产出零容忍，放大了 Gap 1-5 的影响 |
| BUG-011 | 相关：sub-agent 不声明 cache_trails——本次 run 中 10/12 cache dirs 只有 `page-content.md` 缺 `page.md` |

---

## 5. 推荐修复优先级

| 优先级 | Gap | 修复 | 改动量 |
|--------|-----|------|--------|
| **P0** | Gap 1 | `readAndValidateResult()` 自动 unwrap `result` key | ~5 行 |
| **P0** | Gap 2 | `validateSubmitRuntimeReceipt()` 自动补全缺失 identity fields | ~15 行 |
| **P0** | Gap 3 | `validateCacheTrails()` 检测并 rename `page-content.md` → `page.md` | ~8 行 |
| **P1** | Gap 4 | `buildAgentSpawnPrompt()` 使用 claim 后的实际 nonce | 需确认 spawn prompt 生成时机 |
| **P1** | Gap 5a | Supplementary repair task 继承允许 source_claims 的 contract | ~10 行 + enqueue 参数 |
| **P1** | Gap 5b | shared_ref_count_floor 对无 source_claims 的 reference 降级计数 | ~15 行 |

六个 gap 总计 ~55 行改动，可以一次性消除 sub-agent/engine contract mismatch 的 5 个主要来源。

---

## 6. 「已修复但未修透」——本 Bug 与已关闭 Bug 的关联

以下 7 个已标记为 `_done/_fixed_bugs/` 的 bug，每一个都是同一个 systemic disease 的**单个症状**。修复方式是点状打补丁（改文档、改 prose、要求 Phase Agent 手动 repair），而非在 engine 层做防御性容错。结果：每次新 run 换一个症状出现，根本问题不变。

| 已关闭 Bug | 症状 | 当时的"修复" | 为什么没修透 | 对应 BUG-060 Gap |
|-----------|------|------------|------------|-----------------|
| BUG-011 | Sub-agent 不声明 cache_trails | 在 task prose 中加了声明要求 | Sub-agent 仍然写 `page-content.md` 而非 `page.md`——声明了也找不到文件 | Gap 3 |
| BUG-037 | Sub-agent 把文件写到项目根目录而非 bundle | 在 spawn prompt 中加了 `bundle_dir` 绝对路径 | Sub-agent 仍然可能忽略 `bundle_dir`；engine 没有防御性检测（比如检查 output_files 路径是否在 bundle 内） | — |
| BUG-038 | source.yaml 格式未文档化 | 在 phase MD 和 subagent protocol 中加了格式说明 | Sub-agent 仍然手拼 YAML（见本次 run topic 02 的 dominant_mood 行 parse 失败）——文档不能替代 `yaml.stringify()` | Gap 1（同类：格式 mismatch） |
| BUG-039 | Sub-agent 不写声明的输出文件 | 加强了 task.md 中的 "write files" 指令 | 本次 run 中 sub-agent 写了文件但格式全错——写和不写一样过不了 gate | Gap 1, 2, 3 |
| BUG-040 | Sub-agent 自创 receipt_nonce | Phase Agent spawn prompt 中内联 exact nonce | **根本缺陷未修**：spawn prompt 中的 nonce 和 engine claim 时生成的 nonce 是两个不同值。Phase Agent 内联的是 spawn prompt 给的 nonce，不是 `_beacon.json` 中的实际 nonce。本次 run 中 4/5 work units 仍然 nonce mismatch | Gap 4 |
| BUG-041 | shared refs 不在 ledger，gate 计数为 0 | 创建 supplementary delegated queue items 专门产 shared refs | Supplementary task 的 contract 和原始 task 相同——仍然不允许 source_claims，仍然需要 cache_coverage。创建了 work-unit row 但 gate 仍然计数为 0（见本次 run attempt 3） | Gap 5a, 5b |
| BUG-018 | YAML sanitization + repair whack-a-mole | Sub-agent 用 `yaml.stringify()` | 修了一个症状（YAML 引号），但 repair whack-a-mole 模式未解决——gate 的原子检查 + 规则间依赖链仍然导致每次 attempt 只暴露一层新问题 | — |

**核心结论**：这些 bug 的共同根因是 **engine contract 对 sub-agent 产出零容忍，但 sub-agent 是 LLM——它的产出天然有结构性偏差**。每一次 "修复" 都在 sub-agent 侧（更强的 prompt、更明确的文档、更严格的 task 模板），但**从不在 engine 侧加防御层**（自动 unwrap、自动补全字段、自动 rename、自动降级计数）。

BUG-060 提出的修复方向是 **engine 侧做防御性容错**——这是这 7 个 bug 都没做的事。
