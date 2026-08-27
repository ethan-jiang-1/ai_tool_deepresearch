# Tasks: post-final primary-series append 证明的结构化降级 fallback（BUG-247）

> 实现 `specs/research/post-final-recovery/spec.md` 的 MODIFIED POF-001 段落（primary-scoped 绑定的
> structural fallback + 警示暴露），按 `design.md` D1/D2/D3 落地。

## 1. 收尾前置 review（先于首次 target edit）

- [x] 1.1 `openspec-feedback:plan-review` — reviewed whole-change coherence before target edits:
  proposal ↔ delta spec (MODIFIED POF-001) ↔ design D1/D2/D3 ↔ tasks ↔ verification-plan consistent;
  mechanical diff confirms the delta changes exactly the fallback paragraph + one new scenario + one
  rewritten scenario (title preserved as deprecated anchor); fallback mirrors the legacy precedent
  (same removal-prefix enumeration + structural check + `.at(-1)`), the "fallback acceptance never
  silent" invariant owns both `unchanged` and retired→`eligible` exits; semantic-closure record
  covers the changed surfaces with resolver `#proveNewerFinalAppend`, consumers limited to verdict
  consumers (`inspectNewerFinalStage`, operate-post-final-recovery CLI), overlap derived from
  POF-001; real-bundle preconditions verified read-only (terminal Final, rerun_count 3/10, witness
  `022f9bf8…` unreachable across all 5 retained digests, inventory structurally valid); blast-radius
  sweep confirmed only the planned unit-tamper case flips. No open findings.

## 2. Engine 修复

- [x] 2.1 POF-001: `handoff-helpers.mjs` 的 `proveNewerFinalAppend` 把 early-return 收窄为仅
  `exactMatches.length > 1`；`whole_tree` 与 `primary_series` 两个 basis 统一走既有 structural 证明
  （`finalRemovalPrefixes` + `retainedPrimarySeriesValid`，取 `structuralMatches.at(-1)`），返回 basis
  分别为 `legacy_structural_fallback`（不变）与 `primary_series_structural_fallback`（新）；结构匹配
  为零仍 `matched:false`；注释说明「绑定态字节不可复原（合法越带重组）→ 无 per-file prior hash 则
  字节级证明不可能」的先例一致性（D1）
- [x] 2.2 POF-001: `post-final-recovery.mjs` 的 `inspectInternal` 消费 stage 结果的 `append_proof`：
  basis 为 `legacy_structural_fallback` 或 `primary_series_structural_fallback` 时，`unchanged` 与
  retired→`eligible` 出口 `warnings` 追加含 basis 名的确定性警示文案；retired→`eligible` 出口并以
  `facts.retired_append_proof` 暴露所接受的完整证明（exact 或 fallback 形状一致）（D2）

## 3. 回归测试

- [x] 3.1 POF-001: `tests/engine/helpers/handoff-final-append-proof.test.mjs` 将原「primary basis
  字节篡改必 block」用例改写为 BUG-247 形状正例：witness 绑定另一字节态（base 字节不同）+ 现行系列
  结构合法（base + 追加 revision）→ `matched:true`、`basis:'primary_series_structural_fallback'`、
  `removed_targets:['final/final_v1.md']`、`current_target:'final/final_v1.md'`
- [x] 3.2 POF-001: 新增 zero-append fallback 用例（绑定态字节不可达、无追加 revision）→ `matched:true`、
  `removed_targets:[]`（delivery pending 语义）
- [x] 3.3 POF-001: 新增结构破坏负例（primary basis：base 被移除留 orphan revision）→ `matched:false`，
  证明 fallback 未放宽结构校验；既有 exact-match 正例与 legacy fallback 用例零改动通过
- [x] 3.4 POF-001: `tests/integration/cli/post-final-recovery.test.mjs` 的 `driveNewerFinalCycle`
  增加 base 字节改写选项；新增 BUG-247 变体（modern base）：first C5 apply → 周期内改写 `final.md`
  字节 + 追加 `final_v1.md` → second inspect 不得返回 `accepted_lineage_drift`/`newer_final_inventory_drift`，
  `verdict:'eligible'`，`warnings` 含 fallback 警示，`facts.retired_append_proof.basis ===
  'primary_series_structural_fallback'`；second apply 后 newest C5 事件绑定当前 `primary_sha256` 且带
  basis marker

## 4. 验证

- [x] 4.1 运行 focused 测试：`node --test tests/engine/helpers/handoff-final-append-proof.test.mjs` 与
  `node --test tests/integration/cli/post-final-recovery.test.mjs` 全绿
  （13/13 与 14/14 pass；同轮把 modern-series base 篡改负例按新边界改写为 fallback 正例——与 3.1 同类，
  属 D3 声明的边界改写面）
- [x] 4.2 真实 bundle 验收（BUG-247 最小可复现）：`node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs
  inspect --bundle dpt_rb_chinese-ai-inference-chips-vs-nvidia` 从 `blocked: accepted_lineage_drift`
  变为 `verdict:'eligible'`，`warnings` 含 structural fallback 警示，`facts.request_bindings` 绑定当前
  lineage；随后按 bug 卡解锁剧本走 apply → `enter-phase phase-rerun` → `advance-status --to
  hitl2_recorded` → `check-reentry --at hitl2_recorded` 达 rerun 窗口（只读验收 + bundle 内 sanctioned
  操作，不写入 repo 文件）
  （实测：inspect eligible + warning + `facts.retired_append_proof.basis=primary_series_structural_fallback`
  （removed=全部 4 revisions，与枚举预演一致）；request 保留于 bundle
  `_scripts/post-final-rerun-request-v4landing.json`（scope 取自 `_diagnostics/next-dig-list-v4-landing-feedback.md`）；
  apply committed（event index 1253，op `0721dd84`）；advance-status ok（`hitl2_recorded → rerun_ready`，
  source_handoff_kind `post_final_reentry`）；check-gate-rerun-ready `passed:true`（count 3→4，limit 11）；
  inspect 终态 `unchanged / descendant_pipeline`——rerun 预算重新可达，BUG-247 死锁解除；rerun#4 的研究
  执行本身是 bundle 常规运营工作，不属本修复面）
- [x] 4.3 全量 `node --test` 通过（无新增 fail；pre-existing 失败逐一核对与基线一致）
  （2863 pass / 4 fail，4 项与 BUG-246 收尾基线完全一致：`_backlog/_done/_old_topics/_original_dpt_v12/` 旧归档 3 项 + `scripts/test-shard.mjs` 被 node --test 收集；净增 3 pass 来自本 change 新用例）

## 5. 收尾检查（归档前硬性 done condition）

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change
  2026-08-27-post-final-primary-series-structural-fallback` 必须 PASS（0 duplicate / 0 orphan /
  0 unregistered / 0 reusedRetired）
  （实测 PASS：667 registered / 57 retired / 0 orphan）
- [x] 5.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain /
  0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
  （实测 PASS：82 main spec files / 0 violations；delta→main POF-001 块同步后复核 DELTA == MAIN 逐字节一致）
- [x] 5.3 `openspec-feedback:closeout-review` — reviewed the change-scoped diff
  (`handoff-helpers.mjs` fallback branch narrowed to exact-ambiguity short-circuit with per-basis
  diagnostic naming, `post-final-recovery.mjs` warning helpers + unchanged/eligible exits, unit
  truth-table rewrite + 2 new cases + modern-tamper boundary rewrite, integration
  `driveNewerFinalCycle` rewriteBase option + BUG-247 variant + legacy warning assertions, main
  spec POF-001 sync), semantic-closure record vs implemented surfaces (resolver/established_by are
  actually changed symbols `#proveNewerFinalAppend`/`#inspectInternal`; consumers limited to verdict
  consumers; overlap derived matches the synced POF-001 paragraph), delta/main re-comparison
  (POF-001 block byte-identical after sync; check-project-specs 0 violations), and verification
  evidence (focused 13/13 + 14/14; full node --test 2863 pass with only the 4 pre-existing
  baseline failures identical to the BUG-246 closeout set; real bundle
  dpt_rb_chinese-ai-inference-chips-vs-nvidia unlocked end-to-end: eligible + warned fallback →
  apply committed (event 1253) → rerun-ready gate passed (count 3→4) → descendant_pipeline). No
  open findings.
