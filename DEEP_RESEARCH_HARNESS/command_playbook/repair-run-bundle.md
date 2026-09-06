# repair-run-bundle

Agent command: reload one explicitly supplied, reachable existing run bundle with maintenance/repair intent, diagnose first through Engine structured verdicts, and perform legal repair through existing Engine operations. This playbook is navigation and Agent flow; it does not create lifecycle, Gate, receipt, trace, permission, or mutation authority.

## Entry Selection (pointer)

Entry intent families are named once in `command_playbook/continue-run-bundle.md` "Entry Selection (canonical)": a supplied reachable bundle with maintenance/repair intent (修 bundle / 数据修复 / gate 修复 / 残留清理 / 为什么卡住) applies the SAME same-root `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` preflight and the SAME `unsupported_current_entry_contract` stop, then routes here instead of the continuation or research flow. This section is a pointer, not a restatement; the complete entry rule lives only in the canonical section.

## 0. 修理 Agent 工作流（接到"修 bundle"任务先照此走）

1. **定位 bundle**：用户给可达 bundle（目录或其中文件）→ 以该目录为 current run bundle root；未给 → 按 Entry Selection 规则报告边界，不从对话/历史推断 bundle。只服务 production `dpt_rb_*`；`dpt_disp_*` 是 disposable experiment bundle，不修，直接重建。
2. **基线三命令**（1 分钟内）：
   ```bash
   node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <bundle-path>
   node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <bundle-path>
   node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <bundle-path>
   ```
   记录 outcome / passed / exit code。全绿 = 结构健康 → **落回 continuation 流程**（`command_playbook/continue-run-bundle.md`，同一 preflight 面内，不跨边界）；有 finding = 进入 §1 诊断。
3. **读状态**：`<bundle>/rb_status.json`（current_gate / next_gate / current_node）+ `<bundle>/rb_trace.jsonl` 尾部 20 行（最近的 gate_attempt / error / supersede 事件）+ `<bundle>/_diagnostics/`（HANDOFF / 修复报告 / 缺口台账）。
4. **按 §1 诊断**：消费引擎 structured verdicts（audit 封闭 outcome / `check-reentry.root_findings[]` / wave inspect `hints[]`），**别猜**。
5. **按 §2 场景修**：命中哪个场景走哪节；每步完成立刻重跑同一个 inspect/gate 验证。
6. **收尾复检**：基线三命令再次全绿后，写一份 repair brief 到 `<bundle>/_diagnostics/<repair>-<date>.md`。

**核心纪律**：引擎函数/CLI 是唯一真相（文件名 locator、digest、receipt sha256 都以引擎实现与 `COMMANDS.md` Copyable Contract Templates / owner spec 为准）；已提交 authority（result / source.yaml / ledger）**不可手改**，走 supersede / 重新提交；seed 投影走 `operate-topic-state apply`；reference 走 `operate-artifact-persistence persist`；无合法引擎路径 → `missing_contract` 停边界，不手写 authority、不建 Engine-invisible parallel path；**修 ≠ 改研究语义**——语义修正（新来源 / 新 Topic / 结论变化）走 rerun（`command_playbook/post-final-recovery.md`），不在修理面内。

## 1. 诊断入口（先跑这些拿 structured hint，别猜）

| 面 | 命令（全前缀） | 关键输出 |
|---|---|---|
| 生命周期审计 | `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <b>` | 封闭 outcome 直接指名修复坐标：`premature_final_present` / `plan_progress_tamper_suspected` / `status_drift` / `manual_bypass_suspected` / `missing_witness` / `failed_gate_downstream_status` / post-final 各 stage；诊断式、不写文件 |
| Progress presentation 修复（可选、非 authority） | `node DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs --bundle <b>` | Engine 从 trace witnesses 重建 `rb_plan.md## Progress`（含 cycle 块）；不创造 gate 语义、不写 trace/checkpoint/status；对生命周期中段的存量 bundle 须在**下一次 gate pass 之前**执行（否则新 pass 会勾进基线块）；结果仍受 audit tamper/stale 检查约束 |
| 重入诊断 | `node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle <b> --at <target>` | `recovery.root_findings[]`：reachable 根至多一个 sanctioned 最近动作；`missing_contract` 是直接停边界 |
| wave0 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle <b>` | `hints[]`：prefix_drift / materialize_projection / seed_projection_token / backing 等 |
| wave1 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <b>` | `hints[]`：materialize_projection / depth_review / return_map / ref floor |
| wave2 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs --bundle <b>` | `hints[]`：finding_index_contract / scan_pair / wave1_target_binding / seed token |
| 正式 gate | `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs --bundle <b> --current-node phases/phase-wave0.md`（wave1 / wave2 同理） | `check.passed / failed_rule_ids / masked_rule_ids / routing` |
| work unit 投影 | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <b>` | claimed / submitted / timed_out / retries 等 |

> `inspect-*` 与 `check-gate-*` 在 check failed 时 exit code 非零但 stdout 有完整 JSON；大输出可能抛 `errno -35`（EAGAIN），重定向到文件再读。
> hint 的 `rule_id` / `repair_kind` / `write_to` / `near_matches` / `missing_fact` 就是修复坐标。`repair_kind` 分类与 disposition → CLI 动词映射以 `RUN.md` disposition 决策表与 `engine/work-unit-repair-vocabulary.mjs` 为准。

## 2. 修复场景（症状 → 本质 → 合法修复路径 → 命令模板）

场景映射以引擎 structured verdicts 为坐标；示例坐标仅为占位（示例），不绑定任何具体 bundle。

| 症状（rule_id 家族） | 本质 | 合法修复路径 | 命令模板 |
|---|---|---|---|
| `submitted_source_contribution_prefix_drift`（提交后 source 文件被改写，前 N 条 digest ≠ ledger） | 提交后 authority 文件被 run-scoped 脚本改写；supersede 的 eligibility 含 `submitted_output_drift` | 确认不可恢复（搜 bundle 内所有可能来源，digest 用引擎 `semanticOrderedArrayDigest`）→ supersede 旧提交行（**仅当 Engine feedback 指名**）→ claim successor → 派子代理重新搜索并重建 source → dry-submit → 正式 submit → 重跑同一 wave inspect/gate | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <b> --work-id <submitted_id> --reason "<审计理由>"` |
| `materialize_projection` / `reference_floor_deficit` / `missing_index_row` | wave1 gate 只认引擎 canonical 文件名 `reference/{topic-slug}-{safeUrlToken(host+pathname)}-{sha256(url).slice(0,12)}.md`（token 全小写） | 用引擎 locator 生成文件名（import `canonicalWave1ReferencePath`，见 `engine/helpers/wave1-reference-convergence.mjs`，勿手写）→ 写齐 body 必需 frontmatter 与 section → persist → 同步索引 → 重跑同一 inspect/gate | `node DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs persist --bundle <b> --source <staging.md> --target <canonical-path> --expect-absent` 后接 `node DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs --bundle <b>` |
| `seed_projection_token` / `return_map_concrete_reference` / `return_map_current_row_omission` | seed 的 projection slots 必须由 `operate-topic-state apply` 的 `apply_seed_projection` packet 回填，禁止手写 | 构造 packet（模板见 `COMMANDS.md` Copyable Contract Templates「Projection packet」；wave0/wave1 `kind=submitted_work`，wave2 `kind=finding`；deferred 用 defers/`refs:["none"]`）→ apply → 重跑同一 inspect/gate | `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <b> --input <packet.json>` |
| `submitted_backing_url_unaccepted` | claim acceptance_status=accepted 但 URL 不在 accepted_source_urls（degraded 捕获误标 accepted） | supersede 旧行（root=`submitted_result_drift`）→ claim successor → 复用修正后 result（更新 work_id / queue_item_id / receipt_nonce 为 successor 值）→ 写 runtime receipt → dry-submit → submit → 同步 depth-review 与 seed projection 里的 work_id | supersede 模板同上；result 契约以 `engine/work-unit-repair-vocabulary.mjs` 决策表为准 |
| `reference_floor_deficit`（某 topic accepted claims < floor） | 需要 supplementary wave1 补来源 | enqueue supplementary 卡（`assignment_mode=supplementary`、`required_receipts=[]`，契约细节见 `COMMANDS.md` 与 owner spec）→ claim → 派子代理补 2-3 条新来源 → submit → 更新 depth-review `reviewed_work_unit_refs` → 生成 canonical reference → 补 seed projection | `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue <b> --task <card.json>` |
| `finding_index_contract`（wave1_target_binding / scan_pair_coverage / pair_duplicate / created_in_rerun_count） | W2F finding 必须绑定当前 wave1 handoff receipt 的 targets；scan pairs 必须同时进 `scan.entries` 与 eligibility YAML anchors（C(n,2)） | 从 `rb_trace.jsonl` `carried_target_receipt` 事件现算 `receipt_sha256`（`sha256(JSON.stringify({contract_version, targets}))`）→ 精确匹配 target_id / target_revision → 补齐 pairs 两处、anchor 编号不冲突 → 重跑 wave2 inspect/gate | 诊断：`node DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs --bundle <b>` |

### gate hint 处理通则（任何 wave）

- `repair_kind: agent_action` → 按 `write_to` 修文件/字段，重跑同 gate。
- `repair_kind: engine_operation` → 走对应 CLI（operate-work-unit / operate-topic-state 等）。
- `repair_kind: missing_contract` → 保留 exact 边界，报告，不手写 authority。
- `repair_kind: user_decision` → 暴露边界等用户决定。
- gate `masked_rule_ids` 里的规则已被豁免（如 legacyReferenceBinding → shared_ref_count_floor）；`degraded_not_eligible` 说明疲劳降级不可用（prefix_drift 等非 required_floor 类规则）。

## 3. 命令入口索引（修理时按需查）

| 场景 | 命令（全前缀） |
|---|---|
| 基线检查 | `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <b>` / `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <b>` / `node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <b>` |
| 波次诊断 | `node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle <b>`（wave1 / wave2 同理） |
| 正式 gate | `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs --bundle <b> --current-node phases/phase-wave0.md`（wave1 / wave2 同理） |
| 提交后漂移 | supersede → claim → submit（见 §2 首行） |
| 声明修复 | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <b> --work-id <submitted_id>`（优先于 supersede） |
| 事务修复 | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <b> --tx-id <id>`（仅当 `repair_kind: recover-transaction` 指名且 journal 可完整比对） |
| materialize reference | persist + sync-reference-index（见 §2） |
| seed 回填 | `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <b> --input <packet.json>` |
| enqueue supplement | `node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue <b> --task <card.json>` |
| 超时处理 | `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs timeout-preflight <b> --work-id <id>` → 按 advice（submit / repair / wait / inspect / block / timeout） |
| 记录事件 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <b> --event <name>` |
| trace 查询 | `<b>/rb_trace.jsonl` 过滤 `carried_target_receipt` / `supersede` / `gate_attempt` / `error` |

## 4. 边界与纪律

1. **引擎是唯一真相**：文件名 locator、digest 算法、receipt sha256、packet / queue 卡模板都以引擎实现与 `COMMANDS.md` Copyable Contract Templates / owner spec 为准；本手册只做导航与映射，不复制契约细节（避免第二真相源）。
2. **已提交 authority 不可改**：result / source.yaml / ledger 一旦 submit，修正是 supersede（不是 edit）；声明缺行走 `recover-declaration`。
3. **修 ≠ 改研究语义**：语义修正（新来源 / Topic / 结论）走 `post-final-recovery` rerun；本手册只做机械修复。
4. **无合法路径即停**：`missing_contract` 是直接边界，不重试已知被拒的 predecessor，不手写 authority。
5. **用户决定只留给语义/风险**：需要用户明示的仅限语义修正、破坏性/不可逆选择、权限缺失；其余机械步骤 Agent 直接执行并重跑同一 checkpoint。
6. **run-scoped 纪律**：辅助脚本进 bundle `_scripts/`，中间产物进 bundle `_tmp/`，禁止系统 `/tmp/`（BUG-254）。
7. **备份再动手**：改 seed / reference 前先 `_tmp/` 备份，方便回滚。
8. **做完一步重跑 inspect**：closeout 是循环（materialize → inspect → 补 → inspect）直到 passed 再跑 gate。

## 5. 手工权宜步骤（interim，Change B–D 落地前）

以下步骤当前无引擎 verb，属 missing capability 下的权宜，**不是常态合法路径**：仅在用户明示该项语义修正后执行，且必须 `_tmp/` 备份 + `log-event` 审计留痕，不得默认自授权。每个步骤对应一个引擎操作化候补（独立 change），verb 落地后本节对应行缩为一条命令。

| 权宜步骤 | 触发条件 | 候补 verb（独立 change） |
|---|---|---|
| seed projection 污染 entries 清理：`apply_seed_projection` 按 entry_id upsert、无法清除旧行（旧轮 entries 残留并触发 postcondition navigation 失败） | 用户明示清理该项；先备份 `_tmp/seed-backup-*.md`；`log-event` 记录；保留回填卡与标题 | `operate-topic-state` prune-projection（ref-integrity 判定 + dry-run/apply） |
| wave1 reference 文件名生成 | 引擎 locator 尚无 CLI 包装（当前需 import `canonicalWave1ReferencePath`） | persist 吸收 canonical 定位（`--from-source-url` / `--topic-slug`） |
| `wave1_target_binding` 的 `receipt_sha256` 手工从 trace 计算 | wave inspect 尚未直接产出 copy-ready binding 块 | wave inspect 产出 binding 投影 |

> **泛化说明**：本手册对任意 `dpt_rb_*` / 任意 wave / 任意未来破损类别成立。§2 场景映射以引擎 structured verdicts 为坐标；任何具体坐标（work_id / topic slug / 文件名 / bundle 名）仅为示例占位，不作为契约输入。每次真实修复后，把新场景追加到 §2（实战沉淀 → 手册 → 引擎 verb 三级闭环）。
