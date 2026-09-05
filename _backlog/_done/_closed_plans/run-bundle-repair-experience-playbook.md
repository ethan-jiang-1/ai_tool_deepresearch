# Plan: run-bundle 故障修复手册（自包含版，供独立"修理 Agent"使用）

> 状态：**计划已成文**（自包含修理手册 + 修理入口设计）。本文件是"修 bundle"这条独立支援线的唯一入口文档——任何 Agent 接到"修 bundle"类任务，**先读本文件**，按 §0 工作流 + §1 诊断 + §2 修复场景逐节执行，不要从零摸索。
> 来源：`dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 2026-09-04/05 post-final recovery rerun 全程实战沉淀（08 前缀 drift、wave0/wave1/wave2 多轮 closeout 修复的真实教训）。
> 更新：2026-09-05（补足上下文：bundle 坐标、诊断入口、完整命令模板、修理 Agent 工作流、入口设计草案）。
> 更新 2：2026-09-05（系统性二次审议定稿：新增 §6——两层修理的概念地基、诊断优先的入口形状、对 §5 的三处修正、带外手工的边界定稿、引擎操作化候补队列与落地切分。**与 §5 冲突处以 §6 为准**）。

---

## §0 修理 Agent 工作流（接到"修 bundle"任务先照此走）

1. **定位 bundle**：用户给可达 bundle（目录或其中文件）→ 以该目录为当前 run bundle 根；未给 → 从 `_backlog/plans/README.md` / `DEEP_RESEARCH_HARNESS/RUN.md` / 最近 trace 推断。
2. **基线三命令**（1 分钟内）：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <bundle-path>
   node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <bundle-path>
   node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <bundle-path>
   ```
   记录 outcome/passed/exit code。全绿 = 结构健康；有 finding = 进入 §1 诊断。
3. **读状态**：`<bundle>/rb_status.json`（current_gate/next_gate/current_node）+ `<bundle>/rb_trace.jsonl` 尾部 20 行（最近的 gate_attempt/error/supersede 事件）+ `<bundle>/_diagnostics/`（HANDOFF/修复报告/缺口台账）。
4. **按 §1 诊断**：用对应 wave 的 `inspect-*-output.mjs` 拿 structured hint（`hints[]` 的 rule_id/repair_kind/write_to/missing_fact 就是修复坐标），**别猜**。
5. **按 §2 场景修**：命中哪个场景走哪节；每步完成立刻重跑同一个 inspect/gate 验证。
6. **收尾复检**：基线三命令再次全绿后，把修复结果写回一份 brief（`<bundle>/_diagnostics/<repair>-<date>.md`）并更新本手册新增场景。

**核心纪律**：引擎函数/CLI 是唯一真相（文件名 locator、digest、receipt sha256 都以引擎实现为准）；已提交 authority（result/source.yaml/ledger）**不可手改**，走 supersede/重新提交；seed 投影走 `operate-topic-state apply`；reference 走 `operate-artifact-persistence persist`。

---

## §1 诊断入口（先跑这些拿 structured hint，别猜）

| 波次 | 诊断命令 | 关键输出 |
|---|---|---|
| wave0 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle <b>` | `hints[]`：prefix_drift / materialize_projection / seed_projection_token / backing 等 |
| wave1 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <b>` | `hints[]`：materialize_projection / depth_review / return_map / ref floor |
| wave2 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs --bundle <b>` | `hints[]`：finding_index_contract / scan_pair / wave1_target_binding / seed token |
| 任意 | `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-<wave>-complete.mjs --bundle <b> --current-node phases/phase-<wave>.md` | 正式 gate：`check.passed/failed_rule_ids/masked_rule_ids/routing` |
| 任意 | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <b>` | work unit 投影：claimed/submitted/timed_out/retries 等 |

> 注意：`inspect-*-output` 与 `check-gate-*` 在 check failed 时 exit code 非零，但 stdout 有完整 JSON。用 shell 重定向到文件再解析，或脚本内捕获 `e.stdout`。

## §1.1 关键 authority 文件与命令坐标

- **bundle 根**：`dpt_rb_glm-5-3-deepseek-v4-domestic-chips/`（本手册示例；其他 bundle 同理）
- **入口契约**：`BUNDLE_ENTRY.md`、`BUNDLE_MAP.md`
- **状态**：`rb_status.json`（current_gate/next_gate/current_node）· `rb_profile.yaml`（research_style_params/rerun_count/human_decision_checkpoints）· `rb_plan.md`（Decisions>Rerun intent revision）· `rb_queue.json` · `rb_output_declarations.jsonl`（ledger）· `rb_trace.jsonl`
- **wave 产物**：`artifacts/wave0|1|2/` · `_work_units/wave0|1|2/` · `_cache/wave0|1|2/` · `reference/` · `seed_topics/` · `phases/` · `_checkpoints/` · `_diagnostics/`
- **run-scoped 规则**：辅助脚本放 bundle `_scripts/`，中间产物放 bundle `_tmp/`，**禁止**系统 `/tmp`（BUG-254）
- **常用 CLI**（均在 `DEEP_RESEARCH_HARNESS/cli/`）：
  `audit-phase-status.mjs` / `validate-bundle.mjs` / `inspect-bundle.mjs` / `inspect-wave{0,1,2}-output.mjs` / `check-gate-wave{0,1,2}-complete.mjs`（在 `cli/gates/`）/ `operate-queue.mjs` / `operate-work-unit.mjs` / `operate-topic-state.mjs` / `operate-artifact-persistence.mjs` / `operate-post-final-recovery.mjs` / `sync-reference-index.mjs` / `enter-phase.mjs` / `advance-status.mjs` / `log-event.mjs`

---

## §2 修复场景（症状 → 本质 → 合法修复路径 → 命令模板）

### A. 已提交 source 前缀 drift（08 型，BUG-254 证据链）

**症状**：`submitted_source_contribution_prefix_drift` + 下游 `wave0_reference_backing`（整个 wave0 projection 失败 → 4 个 00-shared backing 解析失败）。

**本质**：wave0 `source.yaml` 提交后又被 run-scoped 脚本改写（cleanup/expand），前 N 条 digest ≠ ledger 提交 digest；原始数据可能不在 bundle 内（唯一残留曾在系统 `/tmp`，已清扫）。

**修复路径（合法，不要手写 authority）**：
1. 确认不可恢复：搜 bundle 内所有可能来源（`_scripts/` batch 脚本、`_cache/` 备份、work-unit 目录、gate 历史、checkpoint、系统 `/tmp`、`_diagnostics/`）。digest 验证用引擎算法（`semanticOrderedArrayDigest`，见 `schema/contracts/reference.mjs`）。
2. **supersede 旧提交行**（Engine 判定 eligible，创建 successor）：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <b> --work-id wu-w0-b000-src-i0008 --reason "<审计理由：提交后 source.yaml 被脚本改写，重建前缀>"
   ```
   返回 `successor_queue_item_id`（如 `supersession-wu-w0-b000-src-i0008`）。
3. claim successor → 派子代理**重新搜索并重建 source.yaml**（≥10 条 2026+ 真实来源 + cache leaves + runtime receipt + result.json）→ dry-submit → 正式 submit。
4. 重跑该 wave inspect/gate——prefix drift 与下游 backing 一起消失。

**关键原则**：supersede 的 eligibility 判定**明确包含 source contribution prefix drift**（`engine/work-unit-supersession.mjs` 的 `submitted_output_drift`）。它是修复"提交后内容被改写"的合法引擎操作。

### B. reference 文件名 canonical 规则（wave1 per-topic 型）

**症状**：`materialize_projection`（"N submitted backing candidate(s) without a closed canonical projection"）+ `reference_floor_deficit` + `missing_index_row`。

**本质**：wave1 gate 的 count_floor 只认**引擎 canonical 文件名**：`reference/{topic-slug}-{safeUrlToken(host+pathname)}-{sha256(url).slice(0,12)}.md`（token **全小写**）。手写 slug、保留大小写、无 digest 都不算。

**修复路径**：
1. **必须用引擎 locator 生成文件名**（不要手写）：
   ```js
   import { canonicalWave1ReferencePath } from 'DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
   const loc = canonicalWave1ReferencePath({ topicSlug, sourceUrl: claim.url });
   // loc.path 即精确文件名
   ```
2. body 必须含：frontmatter（`source_url`/`acceptance_status`/`source_type`/`tier`/`evidence_role`/`trust_level`/`why_it_matters`/`accessed_at`/`retrieved_date`/`related_topic_uids`）+ 5 个必需 section（Key Facts / Core Content Capture / Quotable Terms / Relevance To This Research / Risks And Limitations）+ `Submitted Wave1 source identity: <work_id>` + evidence-summary/question-list/cache/work_unit 引用。
3. 提交 + 同步索引：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist --bundle <b> --source <staging.md> --target <canonical-path> --expect-absent
   node DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs --bundle <b>
   ```

**关键坑**：macOS 默认 APFS **大小写不敏感**——`00-cross-w2f-001.md` 与 `00-cross-W2F-001.md` 是同一文件，但 Node 字符串比较大小写敏感。**seed projection / packet 的 refs 必须用磁盘 readdir 实际文件名**，否则 `projection_entry_ref_missing`（`near_matches` 会提示正确拼写）。

### C. seed projection 回填（Wave0/Wave1/Wave2 slots）

**症状**：`seed_projection_token`（占位 token 残留，如 `__BACKFILL_WAVE0_EVIDENCE__`/`__BACKFILL_WAVE1_MECHANISMS__`）、`return_map_concrete_reference`（entry 引用失效文件）、`return_map_current_row_omission`（缺新 work unit entry）。

**本质**：seed 的 projection slots（`wave0_evidence` / `wave1_mechanisms`+`wave1_trends`+`pending_questions` / `wave2_judgment`）必须由 `operate-topic-state apply` 的 `apply_seed_projection` packet 回填，**禁止手写**。

**packet 格式**：
```json
{
  "context": "wave_projection",
  "action": "apply_seed_projection",
  "topic_uid": "tp_<current_uid>",
  "wave": "wave0|wave1|wave2",
  "updates": [{
    "slot_id": "<slot>",
    "entries": [{
      "source_identity": {"kind": "submitted_work", "work_id": "<work_id>"},
      "entry_id": "<work_id>/<ordinal>",
      "evidence_meaning": "<Agent-authored navigation meaning>",
      "relationship": "supports|refutes|partial|opens|defers|context",
      "refs": ["reference/<existing-file>.md"],
      "status": "supported|refuted|partial|open|emergent|deferred",
      "next_hop": "<wave2|final|limitation: ...>"
    }]
  }]
}
```
- Wave0/Wave1 source_identity.kind=`submitted_work`（entry_id=`<work_id>/<ordinal>`）；**Wave2 kind=`finding`**（entry_id=W2F-xxx）。
- **deferred entry**：refs:['none'] + relationship:defers + status:deferred + next_hop 必须含 `limitation`/`deferred`/`blocked` 等词（`LIMITATION_NEXT_HOP_RE`）。
- **upsert 局限**：apply_seed_projection 只按 entry_id upsert（已有替换、没有追加），**不能清除旧 entry**。旧轮 entries（旧 work_id）会残留并触发 postcondition navigation 失败（引用已删文件）。清空 slots 的可行路径：先**手动清理 seed 的错误 entries**（保留回填卡与标题；这是修复被污染 seed 的必要步骤，非伪造证据；改前备份 `_tmp/seed-backup-*.md`），再用正确 packet apply。
- **wave2 特例**：finding 的 `created_in_rerun_count` 必须等于当前 profile `rerun_count`，否则 `wave2_finding_not_current`；consumer-facing finding 需要 `reference/00-cross-W2F-xxx.md`。

### D. work-unit result 修正（submitted_backing_url_unaccepted 型）

**症状**：`submitted_backing_url_unaccepted`（claim acceptance_status=accepted 但 URL 不在 accepted_source_urls，通常是 degraded 捕获误标 accepted）。

**修复**：已提交行的 result 不能改（`duplicate_content_mismatch`）。合法路径：
1. supersede 旧行（root=`submitted_result_drift`）→ claim successor。
2. 复用修正后 result（更新 `work_id`/`queue_item_id`/`receipt_nonce` 为 successor 的值）写入 successor result.json → 写 runtime receipt（work_started→work_done）→ dry-submit → submit。
3. 同步受影响的 depth-review `reviewed_work_unit_refs` + seed projection 里的 work_id。

### E. supplementary wave1 补齐 reference floor

**症状**：某 topic accepted claims < 8（`reference_floor_deficit`；`wave1_per_topic_ref_floor`）。

**修复**：
1. enqueue supplementary 卡片（`_tmp/supp-<slug>.json`）：`kind: wave1_topic_deepening`，**payload.assignment_mode='supplementary'**，**required_receipts=[]**（supplementary 的 receipt set 必须为空，否则 `assignment_contract_rejected`）：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue <b> --task _tmp/supp-<slug>.json
   ```
2. claim → 派子代理补 2-3 条新来源（append evidence-summary + cache leaves + result）→ submit。
3. 更新该 topic depth-review `reviewed_work_unit_refs` 加 supplement work_id（否则 convergence 不认 supplement claims）。
4. 为 supplement claims 生成 canonical reference 文件（§B 引擎 locator）。
5. 补 seed projection（supplement work_id 的 entries）。

### F. finding-index / scan 维护（wave2 型）

**症状**：`finding_index_contract`（wave1_target_binding / scan_pair_coverage / pair_duplicate / created_in_rerun_count）。

**关键机制**：
1. **wave1_target_bindings**：每个 W2F finding 必须绑定当前 Wave1 handoff receipt 的 targets。`receipt_sha256` 必须是**当前** receipt 的 sha256（`sha256(JSON.stringify({contract_version, targets}))`，从 `rb_trace.jsonl` 的 `carried_target_receipt` 事件计算），`intent_sha256`/`target_id`/`target_revision` 精确匹配 receipt 里该 topic 的 target。
2. **scan**：`scan.topic_count`/`pair_count_expected`（C(n,2)）/`pair_count_checked` 必须与 canonical topic 数一致（12 topics → 66 pairs）；**且 `synthesis_eligibility.scan_topic_pair_coverage.pairs` 必须用 YAML anchors 列出全部 pairs**（引擎从 eligibility 读，不从 scan.entries 读）。新 topic 的 pairs 必须补进两处（scan.entries + eligibility.pairs）。
3. pair 不能重复（`pair_duplicate_invalid`）；插入时注意 anchor 编号不冲突。

### G. gate 失败 hint 处理通则（任何 wave）

- `repair_kind: agent_action` → 按 write_to 修复文件/字段，重跑同 gate。
- `repair_kind: engine_operation` → 走对应 CLI（operate-work-unit/operate-topic-state 等）。
- `repair_kind: missing_contract` → 保留 exact 边界，报告（不手写 authority）。
- `repair_kind: user_decision` → 暴露边界等用户。
- gate `masked_rule_ids` 里的规则已被豁免（如 legacyReferenceBinding → shared_ref_count_floor）；`degraded_not_eligible` 说明疲劳降级不可用（prefix_drift 等非 required_floor 类规则）。

---

## §3 命令入口索引（修理时按需查）

| 场景 | 命令 |
|---|---|
| 基线检查 | `audit-phase-status.mjs --bundle <b>` / `validate-bundle.mjs <b>` / `inspect-bundle.mjs <b>` |
| 波次诊断 | `inspect-wave0/1/2-output.mjs --bundle <b>` |
| 正式 gate | `gates/check-gate-wave0/1/2-complete.mjs --bundle <b> --current-node phases/phase-waveN.md` |
| 修复前缀 drift | `operate-work-unit.mjs supersede <b> --work-id <id> --reason "<审计理由>"` → claim → submit |
| 修复 result | supersede → 复用修正 result → submit |
| materialize reference | `operate-artifact-persistence.mjs persist --bundle <b> --source <staging> --target <ref> --expect-absent` → `sync-reference-index.mjs --bundle <b>` |
| canonical 文件名 | import `canonicalWave1ReferencePath`（引擎函数，勿手写） |
| seed 回填 | `operate-topic-state.mjs apply --bundle <b> --input <packet.json>` |
| enqueue supplement | `operate-queue.mjs enqueue <b> --task <card.json>`（payload.assignment_mode=supplementary, required_receipts=[]） |
| 超时处理 | `operate-work-unit.mjs timeout-preflight <b> --work-id <id>` → 按 advice（submit/repair/wait/inspect/block/timeout） |
| 阶段切换 | `enter-phase.mjs --bundle <b> --node phases/phase-<wave>.md` → `advance-status.mjs --bundle <b> --to <gate>` |
| 记录事件 | `log-event.mjs --bundle <b> --event <name>` |
| trace 查询 | `rb_trace.jsonl` 过滤 `carried_target_receipt` / `supersede` / `gate_attempt` / `error` |

---

## §4 泛化原则（血泪总结）

1. **先跑 inspect/gate 看 structured hint**，别猜；hint 的 `write_to`/`repair`/`near_matches` 就是修复坐标。
2. **引擎函数/CLI 是唯一真相**：文件名 locator、digest 算法、receipt sha256 都以引擎实现为准，别手搓近似。
3. **大小写坑**：文件名以磁盘 `readdir` 实际值为准；macOS 大小写不敏感文件系统会掩盖差异，但 Node 字符串比较大小写敏感。
4. **已提交 authority 不可改**：result/source.yaml/ledger 一旦 submit，修正是 supersede（不是 edit）。
5. **seed 污染要彻底清**：错误 packet 会残留 entries，postcondition 会卡 navigation；必要时手动清理 + 备份。
6. **supplement 有独立契约**：receipt set 空、assignment_mode=supplementary、depth-review 必须收录。
7. **做完一步重跑 inspect**：closeout 是循环（materialize → inspect → 补 → inspect）直到 passed 再跑 gate。
8. **备份再动手**：改 seed/reference 前先 `_tmp/` 备份，方便回滚。
9. **run-scoped 纪律**：脚本进 `_scripts/`、中间产物进 `_tmp/`、禁止系统 `/tmp`（BUG-254）。

---

## §5 修理入口设计（给 AGENTS.md 的改动草案——待走 OpenSpec change）

> 状态：方向经 §6 复核成立；**入口形状、落位、"自包含"定义三处已修正，冲突处以 §6 为准**。

**问题**：AGENTS.md 的 Execution Brief 入口表只有"研究/续跑/报告"和"改行为/动框架"两行，**没有"修 bundle"入口**。修理任务会被错误路由到"研究"入口（打开 continue-run-bundle.md 的 Entry Selection），导致修理 Agent 按研究流程走、反复碰壁。

**建议新增一行**（AGENTS.md §0 Execution Brief 入口表）：

| 这一轮是 | 打开 | 完成 | 此刻不要 |
|---|---|---|---|
| **修 bundle / 数据修复 / gate 修复 / 残留清理** | 用户给了可达 bundle 且意图是"修"（含"修好/恢复/删掉堵路的/为什么卡住"等）→ `_backlog/plans/run-bundle-repair-experience-playbook.md` 的 **§0 修理 Agent 工作流** | 该手册已在上下文 | 按研究/续跑流程走、改 authority、新建 bundle |

**配套建议**：
- 在 `DEEP_RESEARCH_HARNESS/command_playbook/` 建一份 `repair-run-bundle.md`（Entry Selection 的修理版，指向本手册），与 `continue-run-bundle.md` 平行——"研究入口"与"修理入口"完全分离。
- 修理入口的判定词：用户说 bundle"有问题/卡住/坏了/残留/修一下/恢复/清掉/为什么不过"→ 修理入口；说"继续/深挖/补研究/更新 final"→ 研究入口。
- 本手册保持**自包含**（bundle 坐标、命令全参、场景流程都在文件内），修理 Agent 不需要依赖原始会话记忆。
- 落地 AGENTS.md/command_playbook 改动需走 OpenSpec change（propose → explore → apply → archive），建议作为独立 change 推进，不阻塞主线研究链。

---

## §6 系统性反思与设计定稿（二次审议）

> 本节把"上回怎么修"（§0–§4）与"入口怎么开"（§5）上升为"这件事应该怎么设计"。审议基于契约面复读：`openspec/constitution/project-charter.md`（权威表 + Design Review Route 三联）、`command_playbook/continue-run-bundle.md` Entry Selection (canonical)、`RUN.md` disposition 决策表、`openspec/specs/agent/agent-command-surface/spec.md`（ACS-001/004）、`openspec/specs/workflow/repair-loop/spec.md`（REL-001）、`COMMANDS.md`、Harness `README.md`。**与 §5 冲突处以本节为准；§0–§4 操作内容经核对与契约无冲突，继续有效。**

### 6.1 概念地基：项目里已有两套"修理"，缺的只是入口

- **run 内修理（已是引擎一等公民，无需独立入口）**：五个 work-unit 反馈面同形输出 `attempt_disposition` + `next.recovery_action`（exact command 或 `write_to` + 同一重跑 checkpoint）；disposition→CLI 动词映射由 `engine/work-unit-repair-vocabulary.mjs` 定义并被 `tests/engine/work-unit-recovery-decision-table.test.mjs` 锁定；`workflow/repair-loop` spec（REL-001）规定修完必须回 gate 重评、以 `maxIterations`/状态哈希不变显式终止；`audit-phase-status.mjs` 封闭 outcome 直接指名修复坐标；`check-reentry.mjs` 每个 reachable 根至多给一个 sanctioned 最近动作。"修理与主线内在逻辑一样"不是口号，是已实现的引擎事实。
- **带外修理（契约缺口所在）**：run 停摆/漂移/污染后，用户持 bundle 求修。这正是 ACS-001 命名的 *out-of-band maintenance/debug collaboration*——不是 lifecycle checkpoint、不是 Final 修复环、不是任意改状态授权。而 Entry Selection (canonical) 只点名 **continuation 与 inspection** 两个 intent 族：supplied bundle + 修理意图在 canonical 契约里**未定义**，于是被硬塞进续跑流程。§5 观察到的"修理 Agent 按研究流程走、反复碰壁"，契约根源即此，是文本事实不是经验印象。

### 6.2 修理入口的形状：诊断优先，不是第二条研究流程

- **本质**：修理线 = 主线 error branch 外置后再进入。同一套引擎回路（inspect → structured verdicts → 合法操作 → 重跑同一 gate/inspect），不同的只是触发位置与姿势。
- **流程**：用户修理请求 = human-directed maintenance 决策来源（ACS-001 语义，不转移 command-runner 角色）→ 基线三命令诊断 → 消费引擎 verdicts（audit closed outcomes / `check-reentry.root_findings[]` / wave inspect `hints[]`）→ 合法修复操作（supersede / recover-* / apply / persist / 未来 prune）→ 重跑同一 checkpoint。
- **合法结论包含"没坏"**：诊断全绿 ⇒ 直接落回 continuation 流程（已在同一 preflight/Reload 面内，不跨边界）。两条车道由这个落点连通，不靠关键词硬分流。
- **判定姿势**：沿用 `COMMANDS.md` post-final 迭代意图路由的既有先例——示例词只是导航线索，不是分类 enum；Agent 拥有语义分类；混合/含混先最小澄清；不自动选路。否则修理入口会退化成关键词分类器。
- **边界**：只服务 production `dpt_rb_*`（`dpt_disp_*` 一次性，坏了重建不修）；**修 ≠ 改研究语义**，语义修正永远走 rerun（post-final recovery）；无引擎路径 ⇒ `missing_contract` 停边界，不手写 authority、不发明 transition。

### 6.3 对 §5 原案的三处修正

1. **分流位置精确化**：bundle preflight 与 intent 无关——`BUNDLE_ENTRY.md`+`BUNDLE_MAP.md` 验证、`unsupported_current_entry_contract` 停边界对修理意图**原样适用**（不新增 stop 名）；canonical 节只在 intent 族上扩一项 maintenance/repair，分流发生在 entry 时（留在 canonical 节，保持"完整规则只有一处"），承接面才是修理 playbook。两个极端都不取：全并进 `continue-run-bundle.md` 会撑爆它并稀释 ACS-004 的"唯一 continuation playbook"契约；另立完全独立的第二契约则复刻 preflight 与引擎纪律 = 第二真相源。取中：**一个 canonical 规则，两个下游薄 playbook**。
2. **落位**：`command_playbook/repair-run-bundle.md`。依据：Harness `README.md` 已把 `command_playbook/` 定义为 "Agent-facing command instructions and **diagnostic/maintenance playbooks**" 的容身位，`provenance-forensics-guide.md` 是既有先例；`_backlog/` 在根 AGENTS.md Do-Not-Read 区，不能承载入口目标。
3. **"自包含"重新定义（修正本手册 §5 自己的建议）**：导航自包含（bundle 坐标、命令全参、流程序、边界规则）≠ 契约复述。packet 模板、canonical 文件名规则、supplementary receipt set 等一律**引用** `COMMANDS.md` Copyable Contract Templates 与 owner spec（本文件 §2.C/E 的内联模板即第二真相源实例，迁移时改为引用）。修理 Agent 无会话记忆的鲁棒性靠"引用可达"保证，不靠复制文本。

### 6.4 边界定稿：目前唯一"修理逻辑 ≠ 主线逻辑"的地方

§2.C 手动清理 seed 污染 entries（`apply_seed_projection` 按 entry_id upsert、无法清除旧行）：

- **定性**：missing engine capability 下的权宜，不是常态合法路径。ACS-001 原文：unsupported maintenance remains a missing capability rather than generic override。
- **短期合法条件（写进入口文档）**：仅当用户明示该项语义修正后执行；先 `_tmp/` 备份；`log-event.mjs` 留审计事件；不得默认自授权。
- **长期正解**：引擎 prune 操作——按 ref-integrity 确定性判定（entry refs 指向不存在的 `reference/*.md` 即可 prune），`dry-run` 预览 → apply；内容歧义才升级 user decision。把最后一处带外手工收编进引擎。

### 6.5 引擎操作化候补队列（手册是候补队列，不是永久资产）

原则：§2 每个反复出现的**手工步骤**都是"引擎缺一个 verb"的信号（supersede 的 `submitted_output_drift` eligibility 即先例）；verb 落地，对应场景缩成一行。语义判断永远留 Agent（helper-oriented triad），引擎只吃确定性判定。手册终态不是零，而是收敛为稳定薄核：诊断序列 + findings→合法操作映射 + 边界规则。

| 优先 | 候补操作 | 设计要点 | 匹配场景 |
|---|---|---|---|
| 1 | `operate-topic-state` prune-projection | ref-integrity 判定 + dry-run/apply 两段；歧义升级 user | §C |
| 2 | `operate-artifact-persistence` 吸收 canonical reference 定位 | 接受 `--from-source-url`/`--topic-slug` 由引擎算 canonical target，拒绝手写 wave1 reference 目标——让合法路径成为最容易路径 | §B |
| 3 | wave inspect 产出 `wave1_target_binding` copy-ready 投影 | 从 `rb_trace.jsonl` `carried_target_receipt` 现算 `receipt_sha256`，直接给 binding 块 | §F |
| 4 | `check-reentry` 增加 content-digest 对账 root_finding | submitted 贡献 digest vs 当前文件早对账，把 prefix drift 类破损从远下游 gate 提前暴露（可行性需 explore 验证） | §A 预防 |

### 6.6 落地切分与顺序

- **Change A：入口与路由（先做，解决今天的错误路由）**——Entry Selection (canonical) 扩 maintenance/repair intent 族（同 preflight、同停边界）；新建 `command_playbook/repair-run-bundle.md`（按 §6.2–§6.4 形状写，interim 手工步骤标注其 verb 候补编号）；根 `AGENTS.md` Execution Brief 加行 + Deep Research Routing 指针更新；ACS 静态校验 markers/allowlist 适配。
- **Change B/C/D：§6.5 候补逐个独立小 change**，不阻塞 A；每落地一个，本手册对应场景缩一行。
- **本文件角色**：迁移后保留为实战沉淀史 + 场景候补队列；修理入口只指框架面；每次真实修复后继续在 §2 追加场景（"实战沉淀 → 手册 → 引擎 verb"三级闭环）。

### 6.7 审议中确认成立的部分

- §5 的独立入口方向成立；§0 基线三命令工作流成立，且与 Reload Procedure 兼容（可作 repair playbook 的诊断节）。
- §2 各场景引擎事实与 `RUN.md` 决策表、`COMMANDS.md` 模板核对无冲突（§A supersede 本就写明"Engine 判定 eligible"，与决策表"仅当 Engine feedback 指名"一致）。
- §4 九条纪律全部与契约一致；其中第 2 条"引擎是唯一真相"正是本节要求手册自身收缩为导航面的依据——手册用引擎的纪律约束它自己。

### 6.8 两条硬约束（用户定稿 2026-09-05）

1. **泛化优先（不为单项目打补丁）**：Change A–D 与修理入口、引擎 verb 全部按**框架级通用能力**设计。`dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 只是沉淀来源与正例（provenance），不是契约输入：
   - Entry Selection 分流、repair playbook 流程、命令序列必须对**任意 `dpt_rb_*` / 任意 wave / 任意未来破损类别**成立；
   - 场景知识以"症状 → 引擎 structured verdicts（`rule_id`/`repair_kind`/`write_to`/`near_matches`）→ 合法操作"的通用形态沉淀，不写死具体 `work_id`、topic slug、文件名、bundle 坐标；
   - §2 场景正文中的具体坐标一律视为示例，迁移进框架面时替换为通用模式或参数化占位。
2. **变更流程契约（质量门槛在 apply 之前）**：任何 OpenSpec change 在 propose 之后**必须**跟 `/polish-openspec-change`，打磨到 `ready for apply`（以证据为准，不是凭信心）才 `/opsx:apply`；apply 完成后一路到底：spec 同步（如需）→ `finalize-change-archive` → commit。不在 apply 之后补质量。

---

## 后续建议

> 拆分粒度、设计与排序已由 §6.5–§6.6 细化（候补队列含逐项设计要点；Change A 先行、B/C/D 不阻塞），以那里为准。

- 本手册的 §A–§G 场景可逐步拆为可执行的 OpenSpec change（如"reference 文件名 canonical 校验 helper"、"seed projection clear 命令"）以减少人工步骤。
- 每次真实修复后，把新场景追加到 §2（保持"实战沉淀 → 手册"的闭环），让手册随项目一起成长。
