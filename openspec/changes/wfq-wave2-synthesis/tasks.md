## 1. Phase MD — wave2 main-agent (核心交付物)

- [ ] 1.1 重写 `phase-wave2.md` §3 为 queue-driven 三阶段 — @impl WTS-001, WTS-007, RWP-003
  - §3.1 灌料：1 synthesis task card JSON 模板（`producer_rule: cross_topic_synthesis`，`required_receipts` 覆盖三件套）+ N backfill task card JSON 模板（`producer_rule: seed_topic_backfill_wave2`）+ enqueue 指令
  - §3.2 执行循环：Phase 1 synthesis with finding triage + targeted search loop 协议（inventory→build scan matrix→classify findings into ledger/index→make decision→JS feedback check→spawn sub-agent only for exploit/explore_search→ingest receipt→JS feedback check→write synthesis projection→JS feedback check→backfill projection）+ Phase 2 backfill claim→execute→complete 循环
  - §3.3 收尾+gate：检查三件套 artifact 完整性 + gate CLI + gate fail 修复
  - frontmatter 新增 `max_gapfill_iterations: 2` 和 `max_gapfill_subagents_per_round: 3`
- [ ] 1.2 phase-wave2.md §4 Expected Artifacts 更新 — @impl WTS-004, WTS-007
  - 三件套 artifact：synthesis.md（narrative projection + W2F-xxx 引用）+ cross-topic-ledger.md（6 个固定 section）+ finding-index.yaml（11 required field per finding + scan 对象）
  - 所有 seed topic 文件 backfill token 已替换，内容从 ledger/index 投影
- [ ] 1.3 phase-wave2.md §7 On Gate Fail 更新 — @impl RWG-003, RWG-010
  - 新增 ledger/index 缺失修复场景
  - 新增 backfill token 残留修复场景
  - 新增 wave1 evidence 引用缺失修复场景
  - 新增 finding id 引用缺失修复场景
- [ ] 1.4 phase-wave2.md §9 Anti-Cheating Rules 更新 — @impl RWP-007, WTS-008
  - 新增 8+ 条 phase-specific 禁令（涵盖 backlog 三件套 + finding taxonomy + decision/receipt/orphan 反作弊规则）

## 2. Phase MD — wave2 sub-agent (新建)

- [ ] 2.1 新建 `phase-wave2-subagent.md` — @impl WTS-006, RWP-008
  - Role: `dpt-topic-scout`，targeted finding search（仅对 `decision=exploit_search|explore_search` 的 finding 执行）
  - §1 Stage Goal：定向搜索填补 specific finding，不替代 main-agent 做 cross-topic judgment
  - §2 Required Inputs：finding description + search keywords + output schema（从 main-agent 传入）
  - §3 Allowed Actions：WebSearch + WebFetch → 提取 evidence → 返回结构化 JSON
  - §4 Expected Artifacts：structured JSON（found_evidence, source_urls, fills_gap, confidence）
  - §5 无需 gate（sub-agent 不跑 gate）
  - §6-8：复用 shared-subagent-protocol.md 的 relay slot 契约
  - §9 Anti-Cheating Rules：禁止编造 source、禁止跨 topic 声明、禁止做 synthesis judgment、必须走完 tool degradation chain

## 3. Shared MD — schema 引用更新

- [ ] 3.1 `shared-schemas.md` 更新 — 新增 wave2 三件套 artifact 路径说明
  - `artifacts/wave2/synthesis.md`、`artifacts/wave2/cross-topic-ledger.md`、`artifacts/wave2/finding-index.yaml` 路径
  - gap-fill sub-agent 的 `_cache/wave2/slot_MM/` 和 `_subagents/wave_02/slot_MM/` 路径
  - finding-index.yaml 的 field schema 和 enum value 参考（type/status/decision enum 值）
  - ledger 6 个固定 section 名称

## 4. Gate — definition JSON + CLI

- [ ] 4.1 `gate-wave2-complete.definition.json` 新增规则覆盖三件套 + backfill — @impl RWG-003
  - 新增 `file_exists` + `field_non_empty`：`cross-topic-ledger.md`
  - 新增 `pattern_match`：ledger 含 6 个固定 section 标题
  - 新增 `yaml_parse`：`finding-index.yaml` parseable
  - 新增 `pattern_match`：synthesis.md 含 W2F-xxx finding id 引用
  - backfill token 替换验证（两个 `pattern_match`, `negate: true` 规则，分别检查 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` 不存在）
  - wave1 evidence 引用（`pattern_match`，正则匹配 `\[.*\]\(\.\./wave1/.*/(evidence-summary|question-list)\.md\)`——至少 1 处匹配即 pass）
- [ ] 4.2 `check-gate-wave2-complete.mjs` 新增 `pattern_match` check type — @impl RWG-009
  - 支持 `negate: true`（pattern 找到时 fail）和 `negate: false`（pattern 找到时 pass）
  - 支持 `{topic}` 占位符展开（遍历 topic_registry）
  - 从 `check-gate-wave1-complete.mjs` 复用 `pattern_match` 逻辑（~35 行）
  - 现有 5 种 check type 保持不变，所有现有测试 PASS

## 5. 回归测试

- [ ] 5.1 新增 `tests/integration/md/phase-wave2-queue-loop.test.mjs` — @impl WTS-001
  - 验证 phase-wave2.md frontmatter 含 `max_gapfill_iterations` 和 `max_gapfill_subagents_per_round`
  - 验证 §3 含三阶段结构（§3.1 灌料、§3.2 执行循环、§3.3 收尾+gate）
  - 验证 §3.1 含 synthesis task card JSON 模板（`producer_rule: cross_topic_synthesis`，`required_receipts` 覆盖三件套）和 backfill task card JSON 模板（`producer_rule: seed_topic_backfill_wave2`）
  - 验证 task card 模板使用当前 QueueWorkUnitSchema 可接受的 priority_class
  - 验证 task card 模板的 `required_receipts` 只使用当前 queue engine 支持的 receipt 前缀
  - 验证 §3.2 含 finding triage + targeted search loop 协议（finding 分类→decision→spawn sub-agent→JS feedback check→迭代收敛条件）
- [ ] 5.2 新增 `tests/integration/md/phase-wave2-md-structure.test.mjs` — @impl WTS-004, WTS-007, RWP-003
  - 验证 9-section body 完整性
  - 验证 §4 Expected Artifacts 描述三件套（synthesis.md + cross-topic-ledger.md + finding-index.yaml）
  - 验证 ledger 6 个固定 section 在 phase MD 中描述
  - 验证 index 11 required field 在 phase MD 中描述
  - 验证 §9 Anti-Cheating Rules ≥10 条 phase-specific 禁令
- [ ] 5.3 新增 `tests/integration/cli/check-gate-wave2-complete.test.mjs` 测试用例 — @impl RWG-003
  - 新增 ledger 缺失 → fail 测试
  - 新增 index YAML unparseable → fail 测试
  - 新增 backfill token 残留 → fail 测试
  - 新增 wave1 evidence 引用缺失 → fail 测试
  - 现有测试保持 PASS（无退化）
- [ ] 5.4 运行全量回归确认无退化 — `node --test tests/`

## 6. Playbook 实验验证

- [ ] 6.1 新建 `experiments_playbook/exp_wfn_wave2/test-simple-wave2-synthesis-happy-path.md` — @impl WTS-001, WTS-004, WTS-007
  - 2-topic happy path：pre-seeded wave0 source.yaml + wave1 evidence-summary.md/question-list.md → wave2 queue-driven synthesis → gate pass
  - 验证：三件套 artifact 均存在、synthesis.md 含 Markdown links + W2F-xxx finding id、ledger 含 6 section、index parseable、backfill token 已替换、trace 有 wave2_completion
- [ ] 6.2 新建 `experiments_playbook/exp_wfn_wave2/test-medium-wave2-finding-triage-search.md` — @impl WTS-002, WTS-003, WTS-008
  - 2-topic with legacy question + emergent question：pre-seeded evidence 中有意设置 legacy unresolved question 和 cross-topic emergent question → synthesis 正确分类为 legacy_question/resolution/emergent_question → resolution 不 spawn sub-agent → exploit_search spawn sub-agent 并留下 receipt → gate pass
  - 验证：finding type/decision 正确、resolution 无 receipt、search finding 有 receipt、无 orphan finding
- [ ] 6.3 新建 `experiments_playbook/exp_wfn_wave2/test-medium-wave2-gate-fail-repair.md` — @impl RWG-003, RWG-010
  - gate fail（ledger 缺失 section + backfill token 未替换 + 缺 wave1 evidence 引用）→ inspect/advice → repair → gate pass
  - 验证：trace 含 2 条 gate_attempt（fail + pass）
- [ ] 6.4 更新 `experiments_playbook/RUN.md` 的 playbook manifest — 新增 exp_wfn_wave2 条目

## 7. Registry 与治理检查

- [ ] 7.1 `openspec/governance/req-registry.yaml` 新增 requirement ID — @impl WTS-001~009, AGQ-015~016, RWP-008, RWG-009~010
  - WTS-001: Wave2 phase queue-driven three-stage execution
  - WTS-002: Gap-fill sub-agent dispatch for targeted evidence search
  - WTS-003: Iterative finding triage + targeted search loop with convergence criteria
  - WTS-004: Wave2 three-artifact group with verified references
  - WTS-005: Per-topic backfill via queue task cards
  - WTS-006: Wave2 sub-agent behavior specification
  - WTS-007: Three-artifact Wave2 output with JS feedback integration
  - WTS-008: Finding taxonomy with explicit types, decisions, and consistency rules
  - WTS-009: Cross-topic scan matrix as process evidence surface
  - AGQ-015: Producer rule cross_topic_synthesis for wave2 synthesis task cards
  - AGQ-016: Producer rule seed_topic_backfill_wave2 for wave2 backfill task cards
  - RWP-008: Wave2 gap-fill sub-agent phase file behavior specification
  - RWG-009: Wave2 gate CLI supports pattern_match check type
  - RWG-010: Wave2 phase-internal feedback checks distinct from phase boundary gate
- [ ] 7.2 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS
- [ ] 7.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS

## 8. Phase MD — feedback rails 与 checkpoint 描述

- [ ] 8.1 phase-wave2.md §3.2 添加 JS feedback checkpoint 调用描述 — @impl WTS-007, RWG-010
  - 描述 L0 check 触发时机（ledger/index 初建后）和检查内容（文件存在、section 完整、YAML parse、finding 字段完整、scan 存在）
  - 描述 L1 check 触发时机（finding triage 后 / sub-agent spawn 前 / receipt ingest 后 / synthesis projection 后 / backfill projection 后）
  - 描述 check/inspect/advice 反馈格式和 Agent 修复流程
  - 描述 failure budget：L0 立即修复、L1 最多 2 次后 escalate、L2 不降级
- [ ] 8.2 phase-wave2.md §3.2 添加 finding lifecycle 流程描述 — @impl WTS-008
  - 描述 candidate → classified → decision_made → searched/not_searched → projected → backfilled 生命周期
  - 描述 ledger（reasoning）+ index（lifecycle state）分工
  - 描述三类 finding type 和六种 decision 的判断标准
- [ ] 8.3 phase-wave2.md §3.2 添加 scan matrix 构建指导 — @impl WTS-009
  - topic_count ≤ 5 时默认检查所有 topic pair
  - scan matrix 记录格式和维度定义
  - pair 无 finding 时仍需记录

## 9. Schema — finding-index 结构与 enum 值

- [ ] 9.1 finding-index.yaml schema 文档化 — @impl WTS-007, WTS-008
  - Top-level keys: `version`, `source_layer`, `ledger`, `synthesis`, `scan`, `findings`
  - `scan` object: `topic_count`, `pair_count_expected`, `pair_count_checked`
  - Per-finding: 11 required fields（id/type/status/decision/affected_topics/origin_refs/trigger_refs/search_required/subagent_receipt_refs/appears_in_synthesis/hitl2_handoff）
  - Optional v1 extension: `backfill_topics`, `synthesis_refs`, `handoff_refs`, `last_checked_at`, `repair_attempts`
  - Enum value lists：type (3 values), status (4 values), decision (6 values)
- [ ] 9.2 一致性规则文档化 — @impl WTS-008
  - 8 条 minimum consistency rules（all 11 required fields / resolution has origin_refs + trigger_refs / resolution.search_required=false / emergent affected_topics ≥ 2 / search decision → search_required=true / search decision after completion → receipt / defer/internal → hitl2_handoff=true / no orphan finding）
  - L0/L1/L2 三层反馈的检查清单表
