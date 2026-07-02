# Bug: Rerun 增量 Topic 产出空壳 — Gate 通过但语义未集成

**Severity**: P0 | **Discovered**: 2026-06-29 | **Fixed**: 2026-07-01 | **Bundle**: `dpt_rb_china-japan-relations-since-april-2026`
> 状态: 已修复（已移入 done/_fixed_bugs/）

---

## 1. 现象

HITL2 用户选择 rerun，新增 topic 05（韩国因素）。Wave0/Wave1/Wave2 三个 gate 全部 `passed: true`。但韩国内容**实质性缺失**：

- **Wave1 reference 文件**：topic 05 的 8 个 `reference/05_south-korea-factor-*.md` 中，3 个用 YAML frontmatter 格式（gate 的 content_dedup 对其不可见），5 个是 Phase Agent 为满足 count_floor 手工补的模板壳（source_url 为 homepage 而非 article URL，Key Facts 仅 3 行，Core Content Capture 为套话）
- **Wave2 synthesis**：韩国分析以 `## 8. Cross-Topic Addition (Rerun #1)` 追加，未重新扫描全部 10 对 topic pair，未将韩国 evidence 反向注入已有的 4 个 topic 分析
- **旧 topic**：已有的 4 个 topic 的 wave1 artifacts 从未因新增 topic 而更新交叉引用

**直接结果**：gate 全绿，final report 有韩国章节，但深度研究实际上**没有把韩国"拽进来"**——reference 是壳、synthesis 是附加章、旧 topic 不知道韩国的存在。

---

## 2. 三条独立追踪线

### Bug A: Reference 文件格式链断裂

**问题**：Sub-agent 产出的 reference 文件用了 YAML frontmatter 格式（`---`），而 gate 的 content_dedup 期望 metadata block 格式（`- key: value`）。

**规范链追踪**：

| 层 | 文件 | 行 | 规定了什么 |
|----|------|----|-----------|
| 权威模板 | `DPT_FRAMEWORK/workflows/nodes/shared/shared-reference-template.md` | 26-95 | **metadata block** (`- key: value`)，9 个必填字段，5 个 `##` section |
| Sub-agent 角色定义 | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1-subagent.md` | 44-158 | **对 reference 文件格式完全沉默**——只定义了 evidence-summary.md 和 question-list.md 格式 |
| Task card (Phase Agent 构造) | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | 58 | 在 action 文本中引用了 `shared-reference-template.md` 格式——但 sub-agent **收不到这个文件** |
| Relay 契约 | `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` | 27-29 | Sub-agent bounded context **仅** `task.md` + `result.schema.json`——`shared-reference-template.md` 被排除 |
| result.schema.json 生成 | `DPT_FRAMEWORK/engine/subagent-relay.mjs` | 399-468 | 约束 JSON payload 的 key（path/role/source_url），**不约束磁盘文件格式** |
| Schema 契约 | `DPT_FRAMEWORK/schema/contracts/reference.mjs` | 1-15 | 只校验 wave0 的 `source.yaml`（thin YAML），**不校验 wave1 的 `reference/*.md`（rich markdown）** |

**断裂点**：`phase-wave1-subagent.md` 对 reference 格式沉默 + sub-agent 收不到 `shared-reference-template.md` + 没有机器可执行的 reference 文件格式 contract。Sub-agent 靠 LLM 习惯默认生成 YAML frontmatter——gate 的 content_dedup 读的是 declaration ledger 而非文件本身，frontmatter 格式的 metadata 对其不可见。

---

### Bug B: Wave2 Rerun 缺少 `action: add` 分支

**问题**：Wave0 和 Wave1 均有显式的 `action: add` → "全量执行，与首次一致"。Wave2 的 Rerun-Aware Behavior **仅指定了 delta/append 模式**，不区分 `action: supplement` 和 `action: add`。

**对比**：

| Phase | 文件 | 行 | `action: add` 行为 |
|-------|------|----|--------------------|
| Wave0 | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` | 266 | "全量搜索——与首次 wave0 一致" |
| Wave1 | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | 404 | "全量 deepening——与首次 wave1 一致" |
| **Wave2** | `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` | 351-376 | **缺失**——全部 rerun 走 delta/append |

**Wave2 当前的 rerun 指令**（`phase-wave2.md` L353）：

> "当 rerun 路径被触发，Phase Agent MUST 按增量模式执行 synthesis——已有 synthesis 保留为 baseline，新增/变更 topic 的 synthesis 作为 delta section 追加。"

Wave2 的 merge 策略（L359-372）进一步规定：synthesis.md 追加 `## Delta Synthesis (Rerun N)`，cross-topic-ledger.md 追加 `## Delta Findings (Rerun N)`，冲突时标注并 defer HITL2。

**为什么这是 bug**：新增 topic 时需从 scratch 重新生成（scan matrix 从 N×N 变为 (N+1)×(N+1)，每个已有 topic pair 需用新 topic 的 evidence 重新评估），追加 delta section 无法满足。Wave0/Wave1 已经在 rerun 路径上正确区分了 `action: add` 和 `action: supplement`——Wave2 漏掉了这个区分。

---

### Bug C: Gate 检查结构不检查内容

**问题**：Gate wave1-complete 的 13 条规则全部基于 structural markers——文件存在、section header 匹配、count ≥ threshold。没有任何规则检查 reference 文件的**内容质量**。

**规则逐一分析**（`DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json`）：

| 规则 | 行 | 检查什么 | 不检查什么 |
|------|----|---------|-----------|
| `per_topic_ref_md_count_floor` | 23-29 | Glob-count 匹配 `reference/*{topic}*.md` 的文件数 | 文件内容——0 字节文件也计数 |
| `no_example_com_ref_url` | 31-37 | Regex 拒绝字面量 `example.com` | 其他 homepage URL（如 `yna.co.kr/`）放行 |
| `content_dedup` | 101-111 | 从 `rb_output_declarations.jsonl` 读取 reference 声明，检查 URL 重复/homepage/clone | **不扫描 filesystem**——未声明进 ledger 的文件完全不可见 |

**content_dedup 的空转路径**（`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` L686-785）：

```
1. 读 rb_output_declarations.jsonl (L695)
2. 过滤 role === 'reference' 的 entry (L705)
3. 若无 reference entry → return { passed: true }  ← 空转通过 (L721-723)
4. 若有 entry → 读对应文件 → 提取 Key Facts → URL dedup + homepage check + Jaccard (L728-781)
```

**文件进 ledger 的唯一路径**（`DPT_FRAMEWORK/engine/queue-manager.mjs` L643-687）：通过 `operate-queue complete --result`（含 `slot_result_ref`）。Phase Agent 手工写入的文件不经过这个路径，不在 ledger 中。

**三个关键质量检查缺失**：
- 无 `source_url_is_article` 规则——`isHomepageUrl()`（L649-655）只检查 path 为 `/` 或空，不区分 `news.site.com/article` vs `site.com`
- 无 Key Facts 实质性检查——不检查条目数、字数、是否含具体事实
- 无 filesystem ↔ ledger 交叉校验——不检查 `reference/` 目录中的文件是否全部在 ledger 中有声明

---

## 3. 根因综合

三个 bug 的共同根因：**框架在规范层（MD prose）有正确的格式定义，在契约层（schema/gate definition）有 structural check，但在实现层（sub-agent bounded context + gate content validation）存在三个独立的"链断裂"**：

```
规范层: shared-reference-template.md → metadata block 格式 ✓
   ↓
契约层: gate-wave1-complete.definition.json → count_floor + pattern_match ✓ (structural only)
   ↓
实现层: phase-wave1-subagent.md → 对 reference 格式沉默 ✗  ← Bug A
         phase-wave2.md rerun section → 无 action:add 分支 ✗  ← Bug B
         gate-helpers.mjs content_dedup → 只读 ledger, 空转通过 ✗  ← Bug C
```

三个断裂点互相独立——修任何一个都不会自动修另外两个。但它们在 rerun 增量 topic 场景下**同时触发**：sub-agent 产出错误格式 → Phase Agent 补壳文件满足 count_floor → 壳文件不进 ledger → content_dedup 空转 → gate 全绿。

---

## 4. 修复方向

### (A) Sub-agent reference 格式统一
- `phase-wave1-subagent.md` 增加 reference 文件格式规范（引用 `shared-reference-template.md` 的具体字段和 section）
- 或：在 `result.schema.json` 中增加 `reference_file_format: "metadata_block"` 字段，让 sub-agent 显式确认格式
- 或：在 relay slot 目录中放入 `shared-reference-template.md` 作为 sub-agent 可读的 context 文件

### (B) Wave2 rerun 增加 `action: add` 分支
- `phase-wave2.md` Rerun-Aware Behavior section 增加场景表（与 wave0/wave1 对齐）：
  - `action: add` → "全量 synthesis——与首次 wave2 一致。重读所有 evidence-summary，重建 scan matrix，从 scratch 生成 synthesis.md / cross-topic-ledger.md / finding-index.yaml"
  - `action: supplement` → 保持当前 delta/append（正确）
  - 已有 topic 无变更 → 保持已有 synthesis

### (C) Gate 增加内容质量规则
- 新增 `source_url_must_be_article`：拒绝 path depth < 2 的 URL（即拒绝 homepage）
- 新增 `key_facts_min_lines`：`## Key Facts` section 至少 5 行
- 新增 `ledger_coverage`：filesystem 中 `reference/*{topic}*.md` 的文件数 ≤ ledger 中对应 role=reference 的声明数（交叉校验，防止壳文件绕过 content_dedup）
- `content_dedup` 增加独立 filesystem scan（不依赖 ledger）作为 fallback

---

## 5. 可验证证据

本 bundle（`dpt_rb_china-japan-relations-since-april-2026/`）中的具体证据：

**格式证据**（Bug A）：
```bash
# Sub-agent 产出 → YAML frontmatter（无 - source_url: 行）
head -5 reference/05_south-korea-factor-semicon-tungsten.md  # 显示 --- 和 YAML
# 对比：正确的 metadata block 格式
head -5 reference/00-shared-taiwan-cross-cutting.md  # 显示 - source_url: ...
```

**内容证据**（Bug A + C）：
```bash
# 模板壳：homepage URL + 3 行 Key Facts
head -16 reference/05_south-korea-factor-trilateral-cjk-summit-freeze.md
# source_url: https://m-en.yna.co.kr/  ← 不是具体文章
# Key Facts 仅 3 行
```

**合成证据**（Bug B）：
```bash
# Wave2 synthesis 的韩国部分是追加章
grep '^## 8\.' artifacts/wave2/synthesis.md  # "Cross-Topic Addition (Rerun #1)"
# 正确做法应为重写 §1-§7，将韩国纳入主分析
```

---

## 修复记录 (2026-07-01)

通过 OpenSpec change `harden-rerun-topic-integration` 修复，已归档至 `openspec/changes/archive/2026-07-01-harden-rerun-topic-integration/`。

**Bug A（reference 格式链断裂）修复：**
- `phase-wave1-subagent.md` §2 含完整 metadata block 格式 spec（9 必填字段 + 5 标准 section）
- `phase-wave1.md` task card action 内联格式要求
- gate-wave1-complete 新增 4 条质量规则：`reference_format`（拒绝 YAML frontmatter）、`source_url_article_level`（拒绝 homepage URL）、`key_facts_min_lines`（≥5 条 bullet）、`ledger_coverage`（文件系统↔ledger 交叉验证）
- `checkContentDedup()` fail-closed on empty/missing/no-reference ledger
- `isHomepageUrl()` path-depth heuristic（空/`/`/`/index.*`/depth<2）

**Bug B（Wave2 缺少 action:add 分支）修复：**
- `phase-wave2.md` Rerun-Aware Behavior 含场景表（action:add → 全量重合成，action:supplement → delta/append）
- gate-wave2-complete 新增 `rerun_add_full_synthesis` 规则：Delta Synthesis 作为主路径 → fail；slug 覆盖不完整 → fail

**Bug C（gate 只查结构不查内容）修复：**
- 以上所有 gate 质量规则
- 新增基础设施：checkpoint manifests (`_checkpoints/`)、reentry checker CLI (`check-reentry.mjs`)、file observability (`file-observability.mjs`)、gate failure diagnostics (`_diagnostics/gates/`)、`creation_reason` in ledger、12 种 stable diagnostic event kinds

**验证：** 892 回归测试 + 6 个 playbook cases (307-312) 全部通过。
