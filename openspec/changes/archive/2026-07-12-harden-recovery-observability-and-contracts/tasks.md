## Traceability Note

Tasks 1.5–1.7 are governance/path-retirement support for the two existing Evolution Directions. They do not create or modify a runtime capability requirement and therefore do not allocate a new requirement ID. Task 1.6 explicitly reinforces the existing `ACS-001` action-responsibility contract; detailed runtime behavior remains owned by the six delta specs in this change.

## 1. Traceability And Characterization

- [x] 1.1 登记 `FIO-006`、`RRD-008`、`CHI-003`、`RRM-005`、`CRC-008`，并更新 `IOC-001` 的稳定描述；按 capability 组与数字序修改 `openspec/governance/req-registry.yaml`。Done condition：新 ID 唯一、不新增 delta 组头、proposal/spec/task 引用一致。
- [x] 1.2 为 `IOC-001` 与 `RRM-005` 增加 apply 前 characterization fixtures：证明当前 H1 reference metadata 会误报、bold-wrapped return-map fields 当前无法解析，同时锁定 unwrapped canonical form 的既有行为。Done condition：测试在旧实现上只因两个目标缺口失败，不引入无关格式断言。
- [x] 1.3 为 `CRC-008` 增加 cache validation characterization tests，覆盖 canonical base files、assigned `cache_policy.leaf_files` additions、五个 source-mapping fields、placeholder-only page 与 explicit degraded capture。Done condition：default-policy、content 与 degraded 既有 cases在旧实现上保持通过；base+additions及五字段跨 consumer一致性只因已识别 contract drift在旧实现上失败；测试不改变 policy assignment authority。
- [x] 1.4 为 `FIO-006`、`RRD-008`、`CHI-003` 建立 incident-shaped regression fixture helper，包含 registry 内正常 topic、registry 外 explicit topic identity、悬空 `related_topic`、平行 durable final/reference output 与不可达 predecessor advice context。Done condition：fixture 只写 disposable/test temp bundle，不写 production bundle或 mock Engine verdict。
- [x] 1.5 执行 Evolution Direction path retirement：删除 `guidelines/simple-reliable-control.md`；不修改 `_backlog/_done/_closed_plans/` 与 `openspec/changes/archive/` 的历史文字。Done condition：active guidelines/backlog/其他 changes/framework/tests无 old-path导航引用；本 change只保留 deletion-contract文字且不得形成链接/reading route；closed/archive排除在 current-navigation audit之外；Git diff显示 notice删除且无历史 artifact改写。
- [x] 1.6 强化 OpenSpec evolution governance（支持既有 `ACS-001` action-responsibility contract）：在 `openspec/config.yaml` context/rules中加入两条 canonical evolution paths、net simplification/direct Source-of-Record义务，以及 user decision / Agent execution / Engine verdict / no-ad-hoc-permission边界。Done condition：文字简短、不复制 guideline全文、不新增第三种 authority或 helper subsystem。
- [x] 1.7 增加 focused OpenSpec-config/guideline static regression：用 `yaml` 解析 `openspec/config.yaml`，验证 notice文件不存在、canonical paths存在、config包含稳定 simplicity/helper markers、active surface无 old-path导航引用，并仅 allowlist本 change的 deletion-contract文字。Done condition：删除任一 canonical path或核心 obligation marker会失败，测试不扫描 closed/archive历史内容，也不扩成逐句 prose classifier。

## 2. Shared Cache Leaf Contract

- [x] 2.1 实现 `CRC-008`：新增或抽取 Engine-owned cache-leaf contract module，导出 canonical base leaf files、`resolveCacheLeafContract(cachePolicy)` 的 base+additions并集、source-mapping fields、explicit degraded signals 与 `CacheLeafMetaSchema`；使用 `.refine()` 要求至少一个 mapping field。Done condition：模块只依赖 `zod` 和 Node.js built-ins，不改变 policy assignment authority，并带 `// @impl CRC-008`。
- [x] 2.2 实现 `CRC-008` 的 submit-side migration：让 `work-unit-utils.mjs`、work-unit submit validation与 cache mapping复用 shared cache contract/pure inspection result，删除重复 required-file/mapping-field/degraded literals。Done condition：default-policy、content/degraded与 normalization/write behavior不变；assigned policy按 base+additions解释，五个 canonical mapping fields按 shared contract一致识别。
- [x] 2.3 实现 `CRC-008` 的 read-side migration：让 `wave-depth-contracts.mjs`、`gate-helpers-checks.mjs` 与 file-observability cache-gap diagnostics复用 shared cache contract/pure inspection result。Done condition：gate/depth/file-observability对同一缺口报告相同 canonical field/file，且 inspect路径零写入。
- [x] 2.4 实现 `CRC-008` 的 projection drift guard：更新 `shared-subagent-protocol.md`、shared anti-cheating guidance、cache README/template 等直接 Agent-facing projection，并增加静态 regression读取 Engine-owned vocabulary。Done condition：删掉任一 required file/mapping marker都会使测试失败，runtime 不读取 Markdown 作为 authority。

## 3. Wave0 And Return-Map Contract Repair

- [x] 3.1 实现 `IOC-001`：将 Wave0 reference metadata region 改为首个 H2 semantic section 之前的内容，允许可选 H1 title，保持 bullet metadata、section classification 和 non-gate exit/output contract不变。Done condition：H1+完整 metadata 不误报，真实缺 key 仍报告 advisory，recursive snapshot 无副作用。
- [x] 3.2 实现 `RRM-005`：在 return-map line parser 前加入 balanced `**field**:` 窄归一化，映射既有五个 canonical fields；不引入 Markdown dependency或放宽 field/enum/ref validation。Done condition：bold/unwrapped entries结果等价，misspelling和缺 concrete ref仍按既有规则失败。
- [x] 3.3 更新 `IOC-001`、`RRM-005` 的 Agent-facing producer/inspect guidance，明确 H1 metadata boundary 与 presentation tolerance，但不把 return map描述为 gate/provenance authority。Done condition：相关 MD static/integration regression通过且无新增 prose classifier。

## 4. Canonical Topic Footprint Audit

- [x] 4.1 实现 `FIO-006`：增加 pure topic identity extractor，只从 `topic_registry`、accepted topic paths、reference metadata、queue/work-unit/output declarations 等 explicit surfaces读取 exact id/slug；按现有 contract处理 `related_topic: all` 与逗号列表，禁止标题相似度、数字邻近或任意文件名猜测。Done condition：unit tests覆盖 registered、unregistered、sentinel/list、dangling和unknown presentation。
- [x] 4.2 实现 `FIO-006`：扩展 `auditFileObservability()` 检测 registry-missing canonical surfaces、registry-external durable topic output、dangling `related_topic` 与 durable parallel namespace；missing-surface只相对 `targetPhase`/normalized target和现有 manifest/gate truth计算，cache-only scratch保持 non-authoritative supporting evidence。Done condition：早期 target不要求未来 wave/final，无 target不推断 lifecycle completeness；findings不授予 authority、不修改 bundle。
- [x] 4.3 实现 `FIO-006`：按 design 的有界 precedence将同一 explicit topic identity 的 dangling metadata、parallel namespace和 supporting provenance分组进一个 canonical primary finding；不得建立通用 root/masked graph。Done condition：incident fixture每个 identity至多一个 primary finding，supporting details可追溯，unknown identity presentation保持 warning。
- [x] 4.4 验证 `FIO-006`：扩展 file-observability regression，证明合法 canonical bundle clean、registry外 durable output blocking、dangling metadata可定位、cache-only unknown subtree不被误判为完成 topic。Done condition：focused `node:test` 全 PASS，历史 non-work-unit provenance cases语义不退化。

## 5. Reachable Recovery Summary

- [x] 5.1 实现 `RRD-008`：定义 Zod canonical finding/recovery summary schema与 per-root cross-field `.refine()`，约束 blocking primary projection、supporting detail count、每个 root 的 `reachable|missing_contract|not_applicable` 和至多一个 recommended action；loaded/normalized output升级为 schema `1.1.0`，无法形成 recovery context的 exit-2 error可省略 recovery。Done condition：invalid combinations被 schema拒绝，Engine不选择全局 repair strategy，旧字段/exit语义兼容。
- [x] 5.2 实现 `CHI-003`：新增 pure structured action/reachability helper，对本 change触及的 deterministic `rerun_gate`、`enter_phase`、`repair_surface` action复用现有 transition/handoff/status-window checks；不得解析 prose或选择语义 repair strategy。Done condition：reachable action返回最近合法目标，不可达 action返回 direct blocker/missing contract。
- [x] 5.3 实现 `RRD-008`：在 `check-reentry.mjs` 接入 canonical footprint findings和有界 grouping；将 blocking canonical primary finding通过窄 adapter投影到现有 blockers/exit verdict，并输出 additive `recovery` summary。Done condition：incident fixture返回 `check.passed:false`/exit `1`，warning不阻断，旧 output字段与既有 exit语义兼容。
- [x] 5.4 实现 `CHI-003`：在 recovery summary 中按独立 root消费 structured reachability result，并只从各 root 的 reachable action渲染一个最近 primary advice；missing path渲染 direct blocker/missing contract。Done condition：同一 root不再输出竞争路线或必然失败的 predecessor/enter-phase循环命令，Engine不替多个 roots选择全局语义顺序，且不改变其他非 recovery advice owners。
- [x] 5.5 验证 `RRD-008`、`CHI-003`：增加 reentry/feedback integration tests，覆盖 clean compatibility、one-root incident、missing sanctioned path、reachable same-check action、schema 1.1.0/exit-2 compatibility与 recursive zero-mutation snapshot。Done condition：测试读取真实 CLI JSON，不手写被测 result或 trace authority。

## 6. Agent-Facing Recovery Guidance

- [x] 6.1 按 `FIO-006`、`RRD-008`、`CHI-003` 更新直接相关 reentry/inspect/repair guidance：说明 canonical primary finding与 supporting details、reachable action与 missing contract边界。Done condition：文档不给出 addendum、手写 trace/status或未实现 post-final reentry作为成功路径。
- [x] 6.2 按 `IOC-001`、`RRM-005`、`CRC-008`、`FIO-006`、`RRD-008`、`CHI-003` 更新来源 backlog 状态：BUG-077 标注 contract-opacity部分已覆盖但 API 402仍开放；BUG-078 保持 runtime reentry open但 impossible advice已收敛；BUG-079 标注 incident已可检测但 canonical materialization/reentry仍开放；Overall plan C1 标记完成后下一步仍为 C2/C4。Done condition：不关闭 BUG-077/078/079 或两个 source plans，不声称 C3/C5 runtime已完成。

## 7. Controlled Experiment Proof

- [x] 7.1 实现 `FIO-006`、`RRD-008`、`CHI-003` 的 G30 `case-313-light-canonical-recovery-incident.md`，使用 `new-disposable-bundle.mjs` 创建 `current_gate: readiness_passed` / `current_node: phases/phase-final.md` 的真实 disposable bundle并运行 production `check-reentry --at readiness_passed`/file-observability path。Done condition：trace-jsonl verdict证明 one-root summary、parallel output non-authority、missing-contract advice和 zero authority mutation，且不借机修 `--at final`/post-final reentry。
- [x] 7.2 按 `RRD-008` 更新现有 G30 case-307 的 JSON contract断言为 schema `1.1.0` + additive recovery，并按 `FIO-006`、`RRD-008`、`CHI-003` 更新 `experiments_playbook/RUN_EXPS.md` 的 G30 manifest/description；不新增 experiment family、runner或 helper subsystem。Done condition：case-307继续证明 clean compatibility，active manifest只列真实可运行 case，proof boundary明确不证明 post-final reentry已可用。
- [x] 7.3 验证 `RRD-008`、`CHI-003`：逐 step 执行 G30 case-307/308/309 与 case-313。Done condition：每个 case从自己的真实 bundle/trace得出 PASS，失败现场保留到修复，PASS后清理。
- [x] 7.4 验证 `FIO-006`：按受影响范围逐 step 复跑 G26 file-observability case-310/311/312。Done condition：现有 provenance/non-authority/action:add proof不退化，每个 PASS后清理自己的 disposable bundle。

## 8. Version And Focused Verification

- [x] 8.1 按 VEM-002 更新 `CHANGELOG.md`，增加简洁 `v0.22` 条目，说明 canonical recovery observability、reachable advice、Wave0/return-map修复与 shared cache contract；不得声称 reentry/mutation/persistence已实现。Done condition：版本描述与实际 diff一致。
- [x] 8.2 按 VEM-003/004 同步 `DPT_FRAMEWORK/RUN.md` version banner为 `v0.22`，与 CHANGELOG最新条目一致。Done condition：version-management regression通过。
- [x] 8.3 验证 `CRC-008`、`RRM-005`、`IOC-001`、`FIO-006`、`RRD-008`、`CHI-003` 与 OpenSpec evolution governance：运行 cache/work-unit validation、return-map、Wave0 inspect、file-observability、check-reentry、check/inspect feedback、config/guideline和相关 MD contract focused regression。Done condition：全部 PASS，且 `git diff --check` 无错误。
- [x] 8.4 验证 `FIO-006`、`RRD-008`、`CHI-003`、`IOC-001`、`RRM-005`、`CRC-008`：运行 `openspec validate harden-recovery-observability-and-contracts --strict`。Done condition：change artifacts与 delta specs严格验证 PASS。

## 9. Governance Closure

- [x] 9.1 对 `FIO-006`、`RRD-008`、`CHI-003`、`RRM-005`、`CRC-008`、`IOC-001` 运行 `node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate、0 orphan、0 unregistered、0 reusedRetired。
- [x] 9.2 对 `FIO-006`、`RRD-008`、`CHI-003`、`IOC-001`、`RRM-005`、`CRC-008` 所属 capabilities运行 `node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain、0 missingPurpose、0 missingRequirements、0 missingReqHeader。
- [x] 9.3 对 `FIO-006`、`RRD-008`、`CHI-003`、`RRM-005`、`CRC-008`、`IOC-001` 与 evolution governance 做最终 scope audit：确认只剩两条 canonical Evolution Directions、无新 CLI/family/dependency、无 status/queue/trace/ledger/artifact/cache authority mutation、无 actor availability/post-final reentry/override/rename/progress实现，并核对 proposal六个 modified capabilities与全部 requirements有代码/测试/task证据。Done condition：scope fence与来源关闭条件逐项记录，无 overclaim。
  - Audit record：active evolution surface仅保留 `evolution-simple-reliable-control.md` 与 `evolution-helper-oriented-agent.md`；旧 notice仅在本 change deletion contract中出现，未形成 active navigation。
  - Audit record：未新增 CLI、experiment family或 dependency；新增 runtime modules仅为 pure/shared contract与 recovery projection，既有 submit write path没有扩大 authority。
  - Audit record：未实现 status/queue/trace/ledger/artifact/cache authority mutation、actor fallback、post-final reentry、human override、topic rename或 progress persistence；相关文档明确保持 missing-contract/open 边界。
  - Audit record：proposal列出的六个 modified capabilities分别由 `FIO-006`、`RRD-008`、`CHI-003`、`IOC-001`、`RRM-005`、`CRC-008` 的 delta requirement、implementation marker、focused regression与本任务清单覆盖。
