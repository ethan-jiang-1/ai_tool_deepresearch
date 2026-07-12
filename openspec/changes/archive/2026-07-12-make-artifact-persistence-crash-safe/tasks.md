## 1. Governance And Characterization

- [x] 1.1 登记 `ARP` → `artifact-persistence-recovery` prefix 与 `ARP-001`、`ARP-002`、`ARP-003` 到 `openspec/governance/req-registry.yaml`。Done condition：ID唯一、按capability/数字序放置，proposal/spec/tasks一致。
- [x] 1.2 为 `ARP-001` 建立writer ownership characterization：锁定producer-owned `reference/`、`artifacts/`、`final/`、`_cache/`为目标面，锁定work-unit submit/cache normalization、status、queue、trace、ledger、checkpoint、profile、plan、receipt为exclude。Done condition：形成可测试project/exclude manifest，未知writer默认exclude。
- [x] 1.3 为 `ARP-001`、`ARP-002` 建立真实disk crash fixtures：payload写后、prepared sidecar后、target rename后、workspace cleanup前、invalid/incomplete workspace与target drift。Done condition：fixtures只使用测试临时目录，不手写被测verdict。
- [x] 1.4 为 `ARP-003` 建立recursive authority snapshot helper。Done condition：可证明仅target、persistence workspace和`_logs/run.log`允许变化，bundle外及control/transaction surfaces零mutation。

## 2. Shared Workspace And Persist

- [x] 2.1 实现 `ARP-001` 的`artifact-persistence.mjs` schemas/path helpers：workspace naming、`preparing|prepared` operation sidecar、result schemas、safe target/source、Engine-generated operation id与supported/excluded roots。Done condition：Zod discriminated union/`.refine()`绑定operation directory/payload/target，模块只依赖zod和Node built-ins。
- [x] 2.2 实现 `ARP-001` 的durability adapters：exclusive workspace、durable preparing publish、payload copy/fsync/hash、atomic prepared replacement、target-parent fsync、same-device检查、mutation-boundary重查与test hooks。Done condition：unsupported fsync/cross-device/path drift显式失败，无timer/sleep或copy fallback。
- [x] 2.3 实现 `ARP-001` 的`persistBundleFile()` acceptance/CAS流程。Done condition：canonical preparing是accepted boundary；此前crash不overclaim且staging保留；create/replace精确提交；initial mismatch无workspace；late drift安全清理或blocked。
- [x] 2.4 验证 `ARP-001`：覆盖四个supported roots、missing parent、unsafe/absolute/traversal/symlink/alias source、excluded targets、cross-device、operation collision、create/CAS、late drift、cleanup failure与staging retention。Done condition：focused tests全部PASS，不使用mtime作verdict。

## 3. Quiescent Sweep

- [x] 3.1 实现 `ARP-002` 的workspace enumeration与quiescent contract：只枚举`_diagnostics/artifact-persistence/<operation-id>/`，不扫描content roots或任意`.tmp`。Done condition：帮助/JSON明确无并发persist前提，无lock/lease/PID inference。
- [x] 3.2 实现 `ARP-002` 的ordered verdict：invalid/unsafe或valid preparing→blocked，prepared target已等于payload→cleaned，expected target drift→blocked，valid prepared→finalized。Done condition：preparing blocker投影staging/target，其他workspace只有一个primary verdict/reason/action。
- [x] 3.3 实现 `ARP-002` 的finalize/clean/idempotence。Done condition：只对valid prepared workspace做rename/cleanup；blocked workspace完全不动；重复sweep不重复内容或重建state。
- [x] 3.4 验证 `ARP-002`：覆盖preparing publish前后、payload fsync后、prepared publish后、target rename后、invalid/missing/next sidecar、payload mismatch、already committed、target conflict、path drift与mixed summary。Done condition：含blocked exit 1；全resolved exit 0；第二次sweep稳定。

## 4. CLI And Operator Feedback

- [x] 4.1 实现 `ARP-001`、`ARP-002` 的`operate-artifact-persistence.mjs`，仅提供`persist`/`sweep`和显式bundle/source/target/CAS参数。Done condition：无环境变量、无force/discard/repair-all；exit 0/1/2与stable JSON符合spec。
- [x] 4.2 实现 `ARP-003` 的Zod persist result、sweep entry/summary与reason codes。Done condition：`committed|finalized|cleaned|blocked` cross-field组合严格，invalid output被拒绝。
- [x] 4.3 实现 `ARP-003` 的`_logs/run.log` best-effort projection，直接调用既有`logToRun()`。Done condition：不修改logger返回契约、不新增trace event或第二套logger；日志不参与filesystem verdict。
- [x] 4.4 验证production CLI persist。Done condition：真实CLI JSON覆盖args、tri-state、create/CAS、late drift、cross-device、result schema与staging retention。
- [x] 4.5 验证production CLI sweep与containment。Done condition：真实CLI JSON覆盖finalized/cleaned/blocked与quiescent提示；成功动作写run.log，recursive snapshot证明bundle外/control surfaces零mutation。

## 5. Agent Guidance And Simplicity Guards

- [x] 5.1 更新`DPT_FRAMEWORK/COMMANDS.md`与一个Agent-facing command playbook，提供completed staging→persist、crash→quiescent sweep、blocked→Agent普通cleanup/retry→rerun sweep的copyable闭环。Done condition：不要求用户跑普通命令，不手工promote未知temp。
- [x] 5.2 更新shared producer、anti-cheating、reference/cache guidance，要求成功前保留staging source；producer-owned cache可用persist，Engine submit/cache-normalization transaction保持exclude。Done condition：不新增第二套authority或隐藏fallback。
- [x] 5.3 更新相关Wave、Final与subagent guidance，在合法content-write decision point调用persist并消费反馈。Done condition：不把content generation搬进JS，不绕过phase/submit/gate/handoff/delivery。
- [x] 5.4 增加static contract regression，读取Engine-owned workspace root、supported/excluded roots、operations/verdicts与关键docs。Done condition：删掉staging retention、CAS、quiescent sweep、Agent cleanup或authority boundary会失败；runtime不读Markdown作authority。
- [x] 5.5 增加simplicity scope guard。Done condition：diff只新增一个helper、一个双操作CLI、sidecar/result schemas和一个command playbook；无FIO change、trace event、quarantine/discard/global index/watcher/lock service，existing transaction owners未迁移。

## 6. Controlled Crash Proof

- [x] 6.1 在现有reentry-debuggability family新增controlled case，使用`new-disposable-bundle.mjs`、production helper test hook与production CLI构造prepared-before-rename、committed-before-cleanup、incomplete workspace和target conflict。Done condition：不新增family/runner/helper subsystem，PASS来自真实bundle bytes与trace check verdict。
- [x] 6.2 更新`experiments_playbook/RUN_EXPS.md`并逐step执行case。Done condition：证明finalized、cleaned、blocked no-mutation、Agent cleanup/retry、repeat idempotence与zero authority mutation；PASS后清理bundle。

## 7. Version And Source Closure

- [x] 7.1 更新Breakpoint plan P1、BUG-079与Overall roadmap C2状态。Done condition：只标记sanctioned crash-safe content path完成；P2/P3、canonical state、post-final recovery、override与C3/C4/C5保持开放。
- [x] 7.2 按VEM-002更新`CHANGELOG.md`为`v0.23`。Done condition：只声明workspace/CAS/quiescent sweep，不声称persist前host writes或control files已覆盖。
- [x] 7.3 按VEM-003/004同步`DPT_FRAMEWORK/RUN.md` version banner。Done condition：与CHANGELOG最新条目一致，version regression通过。

## 8. Verification And Governance

- [x] 8.1 运行ARP focused regression、CLI integration、authority snapshot、MD/static scope与受影响content producer regression。Done condition：全部PASS，`git diff --check`无错误。
- [x] 8.2 运行完整`node --test tests`。Done condition：全套PASS；不修无关failure。
- [x] 8.3 运行`openspec validate make-artifact-persistence-crash-safe --strict`。Done condition：change严格验证PASS。
- [x] 8.4 运行`node openspec/governance/check-project-reqs.mjs`。Done condition：0 duplicate/orphan/unregistered/reusedRetired。
- [x] 8.5 运行`node openspec/governance/check-project-specs.mjs`。Done condition：0 deltaHeaderInMain/missingPurpose/missingRequirements/missingReqHeader。
- [x] 8.6 最终scope audit `ARP-001`、`ARP-002`、`ARP-003`。Done condition：一个workspace/helper/CLI，三种recovery verdict，无dependency/FIO change/trace event/discard/quarantine/journal/watcher/lock/control mutation/progress/reentry/override/rename/actor fallback；paired Evolution Direction与全部证据闭环记录。
