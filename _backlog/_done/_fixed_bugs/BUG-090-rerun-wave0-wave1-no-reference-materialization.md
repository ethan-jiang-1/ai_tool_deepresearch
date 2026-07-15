# BUG-090: Rerun 新增 topic 的 wave0/wave1 sub-agent 未生成 reference/*.md 文件

> **结案 (2026-07-16) — 定性为 cross-version skew，当前版本不复现，不作为 bug 修。** 该 bundle 是 2026-07-10 旧框架产物；2026-07-15 新框架 rerun 时 gate 卡在 `handoff_target_mismatch` / `No transition ... in chain table`（attempt 31，未跑到内容规则）。同版本干净跑下 `per_topic_ref_md_count_floor` 会按 `topic_registry` 对新 topic 展开、缺 reference 必挡。唯一同版本残留是 Wave0 `shared_ref_count_floor` 全局计数（低危，Wave1 per-topic 兜底）。症状层（偏移不可见）由 change `bundle-version-skew-advisory`（CMI-007 戳 + RRD-011 advisory）处理；根因（gate 权威被 bypass）由 plan `gate-bypass-authority-audit` 只读调查。详见 memory `bug-090-091-version-skew-closure`。

## 发现
2026-07-15, `aiewf-2026-community-pulse` rerun round 2。通过 `operate-topic-state apply add_topic` 新增 topic 08（资本与投资视角）和 09（Fair 的技术影响力），然后走完整 rerun pipeline（wave0 → wave1 → wave2）。两个 topic 的 source intake 和 deepening sub-agent 均成功完成并 submit，产出：

- `artifacts/wave0/{topic}/source.yaml` ✓
- `_cache/wave{0,1}/primary/{topic}/` cache trails ✓
- `result.json` ✓

**但 reference/ 目录完全没有任何 08/09 的文件。** 对比：初始 7 个 topic（01-07）在 reference/ 下有 49 个文件（`{topic_slug}-w{wave}-{source_slug}.md`），新 topic 为 0。`reference/_INDEX.md` 也未更新。

## 复现
1. 在 rerun 中通过 `operate-topic-state apply` add topic
2. 为新增 topic 创建 wave0 source intake queue item，action 指定 "write artifacts/wave0/{slug}/source.yaml; write leaf cache trails; return output_files[] and cache_trails[]"
3. 用 dpt-source-intake sub-agent claim + 执行
4. 检查 reference/ —— 无新文件

## 根因

### 直接原因
Queue item 的 `required_receipts` 只要求 `source.yaml`，`action` 字段没有明确要求生成 reference 文件。Sub-agent 完成了合同要求的产出，reference materialization 不在合同内。

### 深层原因
1. **Queue item template 不完整**：`action` 中 reference 生成为 "optionally write"（phase-wave0.md line 84），未作为必须产出
2. **Gate 不检查 per-topic reference**：`wave0-complete` gate 只检查 `00-shared-*.md`（共享 reference）和 `source.yaml`（thin YAML），不检查 `{topic_slug}-w{wave}-{source_slug}.md` 格式的 per-source reference
3. **Seed backfill 依赖 reference 但无 fallback**：seed_topic 的 `__BACKFILL_WAVE0_EVIDENCE__` 回填要求 "refs 指向 concrete existing reference/*.md 文件"，没有 reference 时这个步骤无法执行
4. **初始 run 和 rerun 的差异**：初始 run 的 sub-agent（可能是 2026-07-10 的旧版 agent 指令）额外生成了 reference 文件，但当前 dpt-source-intake agent 严格按合同执行

## 影响
- 下游消费者（HITL2 审查、final report reader）无法通过 reference/ 导航到单个 source
- Seed topic 的 wave0 backfill section 没有 reference refs 可填
- `reference/_INDEX.md` 不完整——丢失了新增 topic 的所有 source 索引
- 信息不对称：source 数据存在于 cache 中，但没有人类可读的 reference projection

## 严重程度
P1 — Rerun 是核心流程，新增 topic 是 rerun 的主要用例。每次 rerun 都会丢失 reference materialization。

## 临时修复（本次执行）
HITL2 前用批量脚本从 `_cache/` 的 `meta.json` + `page.md` + `websearch.json` 重建了 51 个 reference 文件，更新了 `_INDEX.md`。

## 建议修复
1. **Queue item action 明确 reference 生成**：将 "optionally write reference/00-shared-<slug>.md" 改为 "write one reference/`{topic_slug}-w{wave}-{source_slug}.md` per accepted source"，或至少 "write reference files for key sources"
2. **required_receipts 包含 reference**：添加 `"file:reference/{topic_slug}-w0-*.md"` pattern 或最小数量要求
3. **Gate 添加 per-topic reference 检查**：`per_topic_ref_md_count_floor` 规则应该对新增 topic 也生效（当前可能只计数已有文件）
4. **Sub-agent playbook 明确 reference 合同**：`dpt-source-intake` 和 `dpt-evidence-extractor` 的 agent 定义中应包含 reference materialization 作为强制产出
5. **Seed backfill 的降级路径**：当 reference 文件不可用时，允许 backfill 直接引用 `source.yaml` 或 cache trail，而非只要求 reference

## 相关
- BUG-073: gate 格式问题（可能涉及同一批 gate 规则的缺陷）
- phase-wave0.md line 84: "optionally write reference/00-shared-<slug>.md"
- phase-wave0.md line 181-189: seed backfill 要求 concrete reference refs
