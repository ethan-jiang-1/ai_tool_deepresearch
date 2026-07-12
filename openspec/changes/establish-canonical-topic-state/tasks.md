## 1. Governance And Surface Characterization

- [ ] 1.1 登记 `CTS` → `canonical-topic-state` 与 `CTS-001`..`CTS-004`，并把 `SCO-013`、`STM-007`、`QIV-006`、`REI-006`、`RES-007`、`RRD-009` 放入各自 capability 组。Done condition：prefix/ID 唯一、排序正确，proposal/spec/tasks 一致。
- [ ] 1.2 为 `CTS-001` 建立 current topic identity/intent surface inventory，覆盖 registry、seed、queue/work-unit、reference metadata/index、wave0/wave1 cache/artifact 与 final/free-prose exclusion。Done condition：形成 allowlisted owned/projection/historical manifest，未知 surface 默认 blocked。
- [ ] 1.3 为 `CTS-002` 建立 direct progress fact characterization，锁定 registry/seed、queue、work-unit status、submitted ledger 与 accepted wave artifact facts 的 precedence。Done condition：不把 trace/log/chat/mtime 或新 progress 文件作为 primary authority。
- [ ] 1.4 为 `CTS-003` 建立真实 disk transaction fixtures，覆盖 prepare 前、prepared manifest 后、registry replace 后、seed/path moves 中、profile recompute 前与 cleanup 前 crash。Done condition：fixture 只用临时 bundle 与 production test hooks，不手写被测 verdict。
- [ ] 1.5 为 `CTS-004` 建立 recursive authority snapshot helper。Done condition：证明只允许 manifest 列出的 topic-owned projections、operation workspace、既有 profile owner projection和 run.log 变化；status/trace/queue/work-unit/ledger/receipt/final narrative 与 bundle 外零 mutation。

## 2. Canonical Schema And Inspection

- [ ] 2.1 实现 `SCO-013` canonical topic entry Zod schema：`topic_uid/id/slug/title/must_answer/scope_role/depends_on_topic_uids` 与 registry cross-field checks。Done condition：unique UID/slug、resolved dependency、no self-cycle、derived count exact；legacy shape 只进入 diagnostic result。
- [ ] 2.2 实现 `CTS-001` registry/seed binding parser 与 legacy migration preflight。Done condition：只有 unique valid registry slug + exact matching seed + zero canonical drift 才可生成 deterministic migration manifest；否则 no-write blocked。
- [ ] 2.3 实现 `CTS-002` side-effect-free progress projection。Done condition：closed precedence 输出 `not_started|in_progress|complete|deferred|blocked`、direct `fact_refs[]`、one reason 与最多一个 action；不持久化 projection。
- [ ] 2.4 实现 `RRD-009` topic-state root projection adapter。Done condition：同一 `topic_uid` 的 registry/seed/downstream症状合并为一个 root，accepted mutation workspace成为直接 blocker，adapter 无 mutation authority。
- [ ] 2.5 验证 schema/inspect。Done condition：覆盖 valid/legacy/duplicate/dangling dependency/orphan seed、never-started、queued、claimed、submitted complete、deferred、mixed blocker与第二次 inspect byte-stable。

## 3. Shared Transaction Workspace

- [ ] 3.1 实现 `CTS-003` `canonical-topic-state.mjs` manifest/result schemas 与 path helpers。Done condition：仅一个 `_diagnostics/topic-state/<operation-id>/`、一个 helper；manifest绑定operation、old/new entries、expected hashes、staged replacements、allowlisted moves。
- [ ] 3.2 实现 durability adapters：exclusive workspace、durable prepared publication、file/dir fsync、same-device checks、hash/path mutation-boundary recheck与test hooks。Done condition：无copy fallback、timer/sleep、watcher、lock/lease/PID inference 或通用 transaction framework。
- [ ] 3.3 实现 accepted workspace recovery preflight。Done condition：每个 mutation 前 deterministic complete/rollback-or-block；`inspect`只报告 blocker不恢复；无 public fifth operation。
- [ ] 3.4 实现 transaction commit/rollback ordering。Done condition：crash 后只存在 old 或 new canonical identity；ambiguous/late drift 保留 workspace并 blocked，不自动删未知数据。
- [ ] 3.5 验证 workspace recovery。Done condition：覆盖每个 crash boundary、hash mismatch、missing staged file、path drift、cross-device、cleanup interruption、repeated preflight 与 mixed blocked workspace。

## 4. Register Rename And Renumber

- [ ] 4.1 实现 `CTS-001` `register`。Done condition：显式 intent input → Engine-generated UID → registry + seed skeleton 原子提交；成功前 topic 不可进入 queue/content work，failure 不留 half registration。
- [ ] 4.2 实现 `CTS-003` `rename`。Done condition：按 `topic_uid` 保持 ordinal、更新 title/descriptive slug 与 allowlisted projections；unknown refs/active owner blocked，无全仓 string replace。
- [ ] 4.3 实现 `CTS-003` `renumber`。Done condition：显式 ordered `topic_uid[]` 重算 id/numeric slug 与 allowlisted paths；dependency UID不变，失败 old-or-new，不出现双 identity。
- [ ] 4.4 实现 allowlisted derived surface adapters。Done condition：registry、seed、wave0/wave1 artifact/cache、parseable reference metadata/index与accepted links有精确 adapter；free prose/trace/receipt/history不改。
- [ ] 4.5 实现 `RES-007` post-commit style recompute。Done condition：只读取 committed registry count并复用现有 profile owner；blocked/prepared workspace不影响 profile且无 unrelated field loss。
- [ ] 4.6 验证 register/rename/renumber。Done condition：覆盖 add、rename、reorder、dependency preservation、reference/index path updates、unknown ref、active work blocker、late drift、rollback与legacy migration。

## 5. CLI And Existing Owner Integration

- [ ] 5.1 实现 `CTS-003`/`CTS-004` `operate-topic-state.mjs`，仅 `register|rename|renumber|inspect` 与显式 bundle/UID/intent/order 参数。Done condition：stable JSON、exit 0/1/2；无env、force、patch、set-progress/status、repair-all、reentry或override。
- [ ] 5.2 实现 `QIV-006` queue/work-unit UID binding。Done condition：topic-scoped demand必须 valid UID + current slug；stale/unknown/unmaterialized no-write reject；finding exception不回归。
- [ ] 5.3 实现 `STM-007` seed projection integration。Done condition：seed materialization按 UID消费 canonical intent；orphan seed不创建 authority；register后才eligible。
- [ ] 5.4 实现 `REI-006` rerun integration。Done condition：HITL2 rerun adjustment 使用 topic-state CLI；active blocker通过既有owner drain/repair后重试；post-final missing contract不被绕过。
- [ ] 5.5 实现 `RRD-009` reentry integration。Done condition：C1 recovery summary消费 inspect结果、一个root/一个最近动作、无topic mutation或progress persistence。
- [ ] 5.6 验证 production CLI/containment。Done condition：真实 CLI JSON/exit覆盖四操作、legacy/no-op/blocker/crash recovery；recursive snapshot证明 existing owners零 mutation。

## 6. Agent Guidance And Simplicity Guards

- [ ] 6.1 更新 `DPT_FRAMEWORK/COMMANDS.md` 与一个 topic-state Agent playbook。Done condition：copyable `inspect → one repair/owner drain → register|rename|renumber → rerun inspect`，普通命令Agent-owned，不要求用户手改多面。
- [ ] 6.2 更新 HITL1、seed、rerun、Wave 与 shared anti-cheating guidance。Done condition：新scope materialize-before-work；禁 parallel addendum registry、direct multi-file rename、slug-as-identity 与 human-directed permission inflation。
- [ ] 6.3 增加 static contract regression。Done condition：删除 registry owner、stable UID、direct-fact progress、one-action、active-owner blocker或post-final boundary会失败；runtime不读Markdown作authority。
- [ ] 6.4 增加 simplicity scope guard。Done condition：一个 helper、一个四操作CLI、一个workspace、一个playbook；无progress DB/event store/global index/watcher/daemon/lock service/通用transaction framework/第二registry。
- [ ] 6.5 运行 paired Evolution Direction review。Done condition：target manifest逐项证明新增/避免/删除的control surface与user/Agent/Engine责任，无法保持单manifest时在apply前拆change而非继续堆层。

## 7. Controlled Proof And Source Closure

- [ ] 7.1 在现有 reentry/rerun experiment family 新增 controlled case。Done condition：`new-disposable-bundle.mjs` + production CLI/test hooks 证明 register后立即crash可恢复、rename mid-crash old-or-new、active work blocked、direct progress projection与zero authority mutation；不新增family/runner。
- [ ] 7.2 逐step执行 controlled case 并更新 `experiments_playbook/RUN_EXPS.md`。Done condition：PASS来自真实 bytes/CLI/trace checks，重复 inspect/preflight稳定，PASS后清理bundle。
- [ ] 7.3 更新 Breakpoint P2/P3、Human Override A/B、BUG-079 与 Overall roadmap C3 状态。Done condition：只关闭 canonical identity/intent/progress/rename slice；post-final reentry、audited override、state jump 与 C4/C5保持开放。
- [ ] 7.4 按 VEM-002 更新 `CHANGELOG.md` 为 `v0.24`。Done condition：只声明 canonical topic state，不声称 post-final/override 已实现。
- [ ] 7.5 按 VEM-003/004 同步 `DPT_FRAMEWORK/RUN.md` version banner。Done condition：与 CHANGELOG 最新条目一致，version regression PASS。

## 8. Verification And Governance

- [ ] 8.1 运行 CTS/SCO/STM/QIV/REI/RES/RRD focused regression、CLI integration、authority snapshot、MD/static scope与受影响queue/rerun/reentry tests。Done condition：全部PASS，`git diff --check`无错误。
- [ ] 8.2 运行完整 `node --test tests`。Done condition：全套PASS；不修无关failure。
- [ ] 8.3 运行 `openspec validate establish-canonical-topic-state --strict`。Done condition：change严格验证PASS。
- [ ] 8.4 运行 `node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate/orphan/unregistered/reusedRetired。
- [ ] 8.5 运行 `node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain/missingPurpose/missingRequirements/missingReqHeader。
- [ ] 8.6 最终scope audit `CTS-001`..`CTS-004` 与modified requirements。Done condition：single owner/helper/CLI/workspace/read model；无parallel registry/progress ledger/FIO authority change/trace rewrite/status mutation/post-final reentry/override/state jump/actor fallback；全部证据闭环记录。
