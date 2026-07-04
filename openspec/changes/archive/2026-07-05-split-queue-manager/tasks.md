## 1. Baseline, Registry, And Impact Map

- [x] 1.1 @impl FRE-005 确认 `FRE-005` 已登记在 `openspec/governance/req-registry.yaml` 的 `framework-engine` 分组：`FRE-005: framework-engine — Queue Manager internal module layout + companion regression split (5 flat sub-modules + barrel, zero behavior change)`；确认 `FRE-004` 已由 `split-subagent-relay` 占用，不复用。
- [x] 1.2 @impl FRE-005 记录 engine public export baseline：`rg '^export ' DPT_FRAMEWORK/engine/queue-manager.mjs`，验收 public exports 为 `QUEUE_ACTIVE_WINDOW_SLOTS`, `SLOT_NAMES`, `QueueItemSchema`, `QUEUE`, `OutputDeclarationLedgerRecord`, `checkReceipts`, `createQueue`, `loadQueue`, `saveQueue`, `enqueue`, `claim`, `complete`, `fail`, `preempt`, `inspect`, `pendingCount`, `render`, `makeItem`。
- [x] 1.3 @impl FRE-005 记录 direct import baseline：`rg -n "from ['\"].*queue-manager|import\\(.*queue-manager|queue-manager\\.mjs" DPT_FRAMEWORK tests experiments_playbook experiments_env guidelines openspec/specs --glob '*.{mjs,js,md}' --glob '!openspec/changes/archive/**' --glob '!_backlog/**'`；分类 production JS/CLI、regression tests、experiment inline JS、guidelines/spec prose。
- [x] 1.4 @impl FRE-005 记录 indirect MD/CLI impact baseline：扫描 `operate-queue.mjs`, `rb_queue.json`, `_cache/agentic-queue/current-task.md`, `complete()`, `checkReceipts()`, `OutputDeclarationLedgerRecord` 在 `DPT_FRAMEWORK/workflows`, `DPT_FRAMEWORK/command_playbook`, `tests`, `experiments_playbook`, `guidelines`, `openspec/specs` 中的引用；标注“不改内容、但纳入验收”的 workflow/playbook 文件。
- [x] 1.5 @impl FRE-005 记录 regression test inventory：`rg -n "describe\\(" tests/engine/queue-manager.test.mjs`，把每个 describe group 映射到新 test 文件；done condition 是当前所有 describe group 均有目标文件。
- [x] 1.6 @impl FRE-005 记录 line-count baseline：`wc -l DPT_FRAMEWORK/engine/queue-manager.mjs tests/engine/queue-manager.test.mjs`；apply 后 queue manager implementation 和 queue manager regression test files 均不得再出现单文件 >1000 行。

## 2. Engine Scaffold And Core Extraction

- [x] 2.1 @impl FRE-005 创建 5 个 engine sub-module 文件：`queue-manager-core.mjs`, `queue-manager-window.mjs`, `queue-manager-ledger.mjs`, `queue-manager-lifecycle.mjs`, `queue-manager-render.mjs`；每个文件头写职责域和 `// @impl FRE-005`，不得放测试或 fixtures。
- [x] 2.2 @impl FRE-005 迁出 core foundation：trace/logger singleton (`ensureTrace`, `traceEntry`, `logEvent`, `_trace`, `_bundleDir`, `_log`)、`QUEUE`, `QueueItemSchema`, queue state/result/failure schemas、timestamp/clone/path/validate helpers、C&I feedback helpers；`queue-manager.mjs` 同步 re-export public core symbols。
- [x] 2.3 @impl FRE-005 跑 `node --test tests/engine/queue-manager.test.mjs`；done condition 是现有 monolith tests 在 core extraction 后 0 fail。

## 3. Engine Window, Ledger, Render, Lifecycle Extraction

- [x] 3.1 @impl FRE-005 迁出 active-window mechanics 到 `queue-manager-window.mjs`：`rank`, `sortPool`, `firstOpenSlot`, `promote`, `refill`, public `preempt`；依赖只指向 core，不 import lifecycle。
- [x] 3.2 @impl FRE-005 迁出 delegated provenance 和 ledger 到 `queue-manager-ledger.mjs`：`OutputDeclarationLedgerRecord`, `deriveCreationReason`, `appendOutputDeclarationLedger`, `validateDelegatedCompletion`；保留对 `./subagent-relay.mjs` barrel 的 public import。
- [x] 3.3 @impl FRE-005 迁出 projection renderer 到 `queue-manager-render.mjs`：public `render(queue, bundleDir)`；保持 `QUEUE.PROJECTION`、Markdown 文案、trace event `projection_rendered` 不变。
- [x] 3.4 @impl FRE-005 迁出 lifecycle API 到 `queue-manager-lifecycle.mjs`：`checkReceipts`, `createQueue`, `loadQueue`, `saveQueue`, `enqueue`, `claim`, `complete`, `fail`, `inspect`, `pendingCount`, `makeItem`；`complete/fail` 调用 window/render/ledger helpers，行为不变。
- [x] 3.5 @impl FRE-005 每完成 3.1-3.4 任一迁出后跑 `node --test tests/engine/queue-manager.test.mjs`；done condition 是迁移中间态始终 0 fail。
- [x] 3.6 @impl FRE-005 清理 `queue-manager.mjs` 为纯 barrel：保留 role/lifecycle 注释、sub-module 列表、public re-export 块；不得残留 inline implementation。
- [x] 3.7 @impl FRE-005 验证 dependency DAG：`queue-manager-core` 不 import queue-manager siblings；`window/render/ledger` 不 import lifecycle；`lifecycle` 可 import core/window/render/ledger；grep 确认无 circular path pair。
- [x] 3.8 @impl FRE-005 验证 singleton：`rg "_trace =|_bundleDir =|_log =" DPT_FRAMEWORK/engine/queue-manager*.mjs` 只在 `queue-manager-core.mjs` 匹配。

## 4. Regression Test Split

- [x] 4.1 @impl FRE-005 创建 `tests/engine/queue-manager-fixtures.mjs`，迁入 shared helpers：`tempBundle`, `cleanup`, `item`, `baseState`, `writeRuntimeReceipt`, `setupDelegatedFixture`；helper 可 import Queue Manager barrel、Subagent Relay barrel、Gate Helpers public API，不 import Queue Manager submodules。
- [x] 4.2 @impl FRE-005 创建 `tests/engine/queue-manager-schema.test.mjs`，覆盖原 describe groups：`Queue schema`, `Queue active-window constants`, `TargetSpec schema`, `Queue item with targets`, `Claim advice with targets.delegates`。
- [x] 4.3 @impl FRE-005 创建 `tests/engine/queue-manager-window-lifecycle.test.mjs`，覆盖原 describe groups：`Enqueue and claim`, `Queue pending count`, `Complete, promote, refill, and fail`, `Preemption`。
- [x] 4.4 @impl FRE-005 创建 `tests/engine/queue-manager-receipts-cli-render.test.mjs`，覆盖原 describe group：`Receipts, projection, and CLI`，包括 `checkReceipts`, `render`, `saveQueue/loadQueue`, `operate-queue.mjs` smoke。
- [x] 4.5 @impl FRE-005 创建 `tests/engine/queue-manager-delegated.test.mjs`，覆盖原 describe group：`Delegated queue completion (Stage 2)`，包括 delegated complete rejection/success, Queue↔Relay pipeline, batch slots, ledger, `checkContentDedup`, `creation_reason`。
- [x] 4.6 @impl FRE-005 创建 `tests/engine/queue-manager-logging.test.mjs`，覆盖原 describe group：`LOG-006 accident-grade diagnostics`。
- [x] 4.7 @impl FRE-005 删除或清空 `tests/engine/queue-manager.test.mjs` monolith；done condition 是 `find tests/engine -maxdepth 1 -name 'queue-manager*.test.mjs' -exec wc -l {} +` 无单文件 >1000 行，且不保留重复执行同一测试的大型 aggregator。
- [x] 4.8 @impl FRE-005 验证 regression tests 只 import public barrel：`rg -n "from ['\"].*DPT_FRAMEWORK/engine/queue-manager-|import\\(.*DPT_FRAMEWORK/engine/queue-manager-" tests/engine/queue-manager*.test.mjs tests/engine/queue-manager-fixtures.mjs` 必须 0 匹配；允许 test files/helpers 彼此 import `./queue-manager-fixtures.mjs`。
- [x] 4.9 @impl FRE-005 跑 `node --test tests/engine/queue-manager*.test.mjs`；done condition 是 split regression suite 0 fail。

## 5. JS, CLI, MD, And Experiment Impact Verification

- [ ] 5.1 @impl FRE-005 跑 engine integration regression：`node --test tests/engine/queue-manager*.test.mjs tests/engine/subagent-relay*.test.mjs tests/engine/helpers/relay-provenance-gate.test.mjs`。
- [ ] 5.2 @impl FRE-005 跑 queue CLI integration tests：`node --test tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/validate-bundle.test.mjs tests/integration/cli/check-reentry.test.mjs tests/integration/cli/inspect-bundle.test.mjs`。
- [ ] 5.3 @impl FRE-005 跑 CLI syntax checks：`node --check DPT_FRAMEWORK/cli/operate-queue.mjs` 和 `node --check DPT_FRAMEWORK/cli/validate-bundle.mjs`。
- [ ] 5.4 @impl FRE-005 验证 direct imports 仍指向 barrel：先用 `rg -n "from ['\"].*queue-manager|import\\(.*queue-manager" DPT_FRAMEWORK tests experiments_playbook --glob '*.{mjs,js,md}'` 生成影响面清单；再用 `rg -n "from ['\"].*(DPT_FRAMEWORK/engine/)?queue-manager-|import\\(.*(DPT_FRAMEWORK/engine/)?queue-manager-" DPT_FRAMEWORK tests experiments_playbook --glob '*.{mjs,js,md}'` 检查违规。done condition 是第二条命令除 `DPT_FRAMEWORK/engine/queue-manager*.mjs` sibling imports 外 0 匹配。
- [ ] 5.5 @impl FRE-005 验证 workflow MD 不直接 import Queue Manager：`rg -n "queue-manager\\.mjs|queue-manager-" DPT_FRAMEWORK/workflows --glob '*.md'`；done condition 是 0 direct engine import，workflow 继续通过 `operate-queue.mjs`。
- [ ] 5.6 @impl FRE-005 验证 experiment playbook structural validity：`node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_agentic-queue experiments_playbook/exp_system-logging experiments_playbook/exp_engine-boundary experiments_playbook/exp_evidence-extraction`。
- [ ] 5.7 @impl FRE-005 执行 direct-import experiment smoke（按 `experiments_playbook/RUN_EXPS.md` 逐 step，不得只 validate frontmatter）：`exp_agentic-queue/case-41-light-minimal-path.md`, `case-42-standard-urgent-preemption.md`, `case-43-standard-failure-repair.md`, `exp_system-logging/case-72-standard-engine-lifecycle.md`, `case-75-light-engine-hot-path.md`；done condition 是每个 verdict PASS 或保留失败 bundle 并记录具体 regression。
- [ ] 5.8 @impl FRE-005 执行 CLI/delegated experiment smoke（按 `RUN_EXPS.md` 逐 step）：`exp_engine-boundary/case-401-light-full-boundary.md`, `case-402-light-complete-reject.md`, `case-404-standard-queue-boundary.md`, `case-405-light-trace-single-sink.md`, `exp_evidence-extraction/case-161-light-complete-cache-trails.md`；done condition 是 PASS/CLEAN 或失败现场保留并记录。
- [ ] 5.9 @impl FRE-005 对 heavy real-agent experiments 不做强制自动跑；确认 `case-406` / `case-163` 仍通过 `operate-queue.mjs` canonical CLI path，若本轮环境具备 real subagent/WebSearch/WebFetch surface 则执行，否则记录 `NOT RUN` 原因。

## 6. Final Cleanup And Governance

- [ ] 6.1 @impl FRE-005 跑 line count sanity：`wc -l DPT_FRAMEWORK/engine/queue-manager*.mjs tests/engine/queue-manager*.test.mjs tests/engine/queue-manager-fixtures.mjs`；done condition 是无 implementation/test monolith >1000 行，低于 100 行仅人工 review 其职责是否独立。
- [ ] 6.2 @impl FRE-005 跑 syntax check：`node --check DPT_FRAMEWORK/engine/queue-manager.mjs` 以及每个 `DPT_FRAMEWORK/engine/queue-manager-*.mjs`。
- [ ] 6.3 @impl FRE-005 确认不触碰或遗留 runtime bundle state：`git diff --name-only` 和 `git status --short --untracked-files=all` 不应包含 `dpt_rb_*`, `dpt_disp_*`, `_cache/`, `rb_trace.jsonl`, `rb_queue.json` 等运行时产物；额外运行 `find . -maxdepth 1 \( -name 'dpt_rb_*' -o -name 'dpt_disp_*' \) -print`，除明确保留的失败实验现场外应为空。
- [ ] 6.4 @impl FRE-005 如果 `split-subagent-relay` 仍是 active change，确认 `FRE-004` registry 状态不会导致本 change final governance 误判；最终 checks 必须在 active delta registry 一致后执行。
- [ ] 6.5 @impl FRE-005 运行 `node openspec/governance/check-project-reqs.mjs`，必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [ ] 6.6 @impl FRE-005 运行 `node openspec/governance/check-project-specs.mjs`，必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
