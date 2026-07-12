## 1. Traceability And Characterization

- [ ] 1.1 登记 `FIO-006`、`RRD-008`、`CHI-003`、`RRM-005`、`CRC-008`，并更新 `IOC-001` 的稳定描述；按 capability 组与数字序修改 `openspec/governance/req-registry.yaml`。Done condition：新 ID 唯一、无 delta 组头、proposal/spec/task 引用一致。
- [ ] 1.2 为 `IOC-001` 与 `RRM-005` 增加 apply 前 characterization fixtures：证明当前 H1 reference metadata 会误报、bold-wrapped return-map fields 当前无法解析，同时锁定 unwrapped canonical form 的既有行为。Done condition：测试在旧实现上只因两个目标缺口失败，不引入无关格式断言。
- [ ] 1.3 为 `CRC-008` 增加 cache validation characterization tests，覆盖 required files、五个 source-mapping fields、placeholder-only page 与 explicit degraded capture。Done condition：当前 accepted/rejected matrix 被测试固定，后续 refactor 不改变 authority semantics。
- [ ] 1.4 为 `FIO-006`、`RRD-008`、`CHI-003` 建立 incident-shaped regression fixture helper，包含 registry 内正常 topic、registry 外 explicit topic identity、悬空 `related_topic`、平行 durable final/reference output 与不可达 predecessor advice context。Done condition：fixture 只写 disposable/test temp bundle，不写 production bundle或 mock Engine verdict。

## 2. Shared Cache Leaf Contract

- [ ] 2.1 实现 `CRC-008`：新增或抽取 Engine-owned cache-leaf contract module，导出 required leaf files、source-mapping fields、explicit degraded signals 与 `CacheLeafMetaSchema`；使用 `.refine()` 要求至少一个 mapping field。Done condition：模块只依赖 `zod` 和 Node.js built-ins，并带 `// @impl CRC-008`。
- [ ] 2.2 实现 `CRC-008`：让 work-unit submit validation、cache mapping 与 wave/depth cache inspection 复用 shared cache contract/pure inspection result，删除重复 required-file/mapping-field literals。Done condition：characterization matrix全部保持一致，submit 与 inspect 对同一缺口报告相同 canonical field/file。
- [ ] 2.3 实现 `CRC-008`：更新 `shared-subagent-protocol.md`、shared anti-cheating guidance、cache README/template 等直接 Agent-facing projection，并增加静态 drift regression读取 Engine-owned vocabulary。Done condition：删掉任一 required file/mapping marker都会使测试失败，runtime 不读取 Markdown 作为 authority。

## 3. Wave0 And Return-Map Contract Repair

- [ ] 3.1 实现 `IOC-001`：将 Wave0 reference metadata region 改为首个 H2 semantic section 之前的内容，允许可选 H1 title，保持 bullet metadata、section classification 和 non-gate exit/output contract不变。Done condition：H1+完整 metadata 不误报，真实缺 key 仍报告 advisory，recursive snapshot 无副作用。
- [ ] 3.2 实现 `RRM-005`：在 return-map line parser 前加入 balanced `**field**:` 窄归一化，映射既有五个 canonical fields；不引入 Markdown dependency或放宽 field/enum/ref validation。Done condition：bold/unwrapped entries结果等价，misspelling和缺 concrete ref仍按既有规则失败。
- [ ] 3.3 更新 `IOC-001`、`RRM-005` 的 Agent-facing producer/inspect guidance，明确 H1 metadata boundary 与 presentation tolerance，但不把 return map描述为 gate/provenance authority。Done condition：相关 MD static/integration regression通过且无新增 prose classifier。

## 4. Canonical Topic Footprint Audit

- [ ] 4.1 实现 `FIO-006`：增加 pure topic identity extractor，只从 `topic_registry`、accepted topic paths、reference metadata、queue/work-unit/output declarations 等 explicit surfaces读取 id/slug；禁止标题相似度或任意文件名猜测。Done condition：unit tests覆盖 registered、unregistered、dangling和unknown presentation。
- [ ] 4.2 实现 `FIO-006`：扩展 `auditFileObservability()` 检测 registry-missing canonical surfaces、registry-external durable topic output、dangling `related_topic` 与 durable parallel namespace；cache-only scratch保持 non-authoritative supporting evidence。Done condition：findings不授予 authority、不修改 bundle，并带稳定 rule/classification/surface/topic fields。
- [ ] 4.3 实现 `FIO-006`：增加 root-cause/masked finding关联，使一个 unregistered topic 的 missing seed/wave/reference/final症状保留 forensic detail但只产生一个 primary root action。Done condition：incident fixture的 root finding数量稳定，masked finding可追溯且修复 root 后可重新显现剩余独立问题。
- [ ] 4.4 扩展 file-observability regression，证明合法 canonical bundle clean、registry外 durable output blocking、dangling metadata可定位、cache-only unknown subtree不被误判为完成 topic。Done condition：focused `node:test` 全 PASS，历史 non-work-unit provenance cases语义不退化。

## 5. Reachable Recovery Summary

- [ ] 5.1 实现 `RRD-008`：定义 Zod recovery finding/summary schema与 cross-field `.refine()`，约束 root ids、masked counts、`reachable|missing_contract|not_applicable` 和 recommended action一致性。Done condition：invalid combinations被 schema拒绝，schema不保存或写入 bundle state。
- [ ] 5.2 实现 `CHI-003`：新增 pure structured action/reachability helper，对本 change触及的 deterministic `rerun_gate`、`enter_phase`、`repair_surface` action复用现有 transition/handoff/status-window checks；不得解析 prose或选择语义 repair strategy。Done condition：reachable action返回最近合法目标，不可达 action返回 direct blocker/missing contract。
- [ ] 5.3 实现 `RRD-008`、`CHI-003`：在 `check-reentry.mjs` 组合 canonical footprint findings、root masking和 reachability result，输出 additive `recovery` summary并从结构化 action渲染 primary advice。Done condition：旧 output字段与 exit code保持兼容，不再对 incident fixture输出必然失败的 predecessor/enter-phase循环命令。
- [ ] 5.4 增加 reentry/feedback integration tests，覆盖 clean compatibility、one-root incident、missing sanctioned path、reachable same-check action与 recursive zero-mutation snapshot。Done condition：测试读取真实 CLI JSON，不手写被测 result或 trace authority。

## 6. Agent-Facing Recovery Guidance

- [ ] 6.1 按 `FIO-006`、`RRD-008`、`CHI-003` 更新直接相关 reentry/inspect/repair guidance：说明 canonical footprint finding、root/masked关系、reachable action与 missing contract边界。Done condition：文档不给出 addendum、手写 trace/status或未实现 post-final reentry作为成功路径。
- [ ] 6.2 更新来源 backlog 状态：BUG-077 标注 contract-opacity部分已由本 change覆盖但 API 402仍开放；BUG-079 标注 incident已可检测但 canonical materialization/reentry仍开放；Overall plan C1 标记完成后下一步仍为 C2/C4。Done condition：不关闭 BUG-077、BUG-079 或两个 source plans，不声称 C3/C5 runtime已完成。

## 7. Controlled Experiment Proof

- [ ] 7.1 实现 `FIO-006`、`RRD-008`、`CHI-003` 的 G30 incident-shaped controlled case（建议 next available case id），使用 `new-disposable-bundle.mjs` 创建真实 disposable bundle并运行 production `check-reentry`/file-observability path。Done condition：trace-jsonl verdict证明 one-root summary、parallel output non-authority、missing-contract advice和 zero authority mutation。
- [ ] 7.2 更新 `experiments_playbook/RUN_EXPS.md` 的 G30 manifest/description，不新增 experiment family、runner或 helper subsystem。Done condition：active manifest只列真实可运行 case，case proof boundary明确不证明 post-final reentry已可用。
- [ ] 7.3 逐 step 执行现有 G30 case-307/308/309 与新增 incident case，并按受影响范围复跑 G26 file-observability cases。Done condition：每个 case从自己的真实 bundle/trace得出 PASS，失败现场保留到修复，PASS后清理。

## 8. Version And Focused Verification

- [ ] 8.1 按 VEM-002 更新 `CHANGELOG.md`，增加简洁 `v0.22` 条目，说明 canonical recovery observability、reachable advice、Wave0/return-map修复与 shared cache contract；不得声称 reentry/mutation/persistence已实现。Done condition：版本描述与实际 diff一致。
- [ ] 8.2 按 VEM-003/004 同步 `DPT_FRAMEWORK/RUN.md` version banner为 `v0.22`，与 CHANGELOG最新条目一致。Done condition：version-management regression通过。
- [ ] 8.3 运行 focused regression：cache/work-unit validation、return-map、Wave0 inspect、file-observability、check-reentry、check/inspect feedback、相关 MD contract tests。Done condition：全部 PASS，且 `git diff --check` 无错误。
- [ ] 8.4 运行 `openspec validate harden-recovery-observability-and-contracts --strict`。Done condition：change artifacts与 delta specs严格验证 PASS。

## 9. Governance Closure

- [ ] 9.1 运行 `node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate、0 orphan、0 unregistered、0 reusedRetired。
- [ ] 9.2 运行 `node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain、0 missingPurpose、0 missingRequirements、0 missingReqHeader。
- [ ] 9.3 做最终 scope audit：确认无新 CLI/family/dependency、无 status/queue/trace/ledger/artifact/cache authority mutation、无 actor availability/post-final reentry/override/rename/progress实现，并核对 proposal六个 modified capabilities与五个新增 requirement全部有代码/测试/task证据。Done condition：scope fence与来源关闭条件逐项记录，无 overclaim。
