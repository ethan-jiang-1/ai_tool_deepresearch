## Context

`DPT_FRAMEWORK/engine/queue-manager.mjs` 当前 1053 行，承担 Queue active window、refill pool、receipt checking、delegated relay provenance、output declaration ledger、projection render、trace/log feedback 和 public lifecycle API。对应 regression monolith `tests/engine/queue-manager.test.mjs` 当前 1138 行，覆盖 schema、targets、window mechanics、CLI/projection、delegated Queue↔Relay provenance、ledger、logging 等多个关注点。两者都是当前 Queue Manager 维护面的超千行文件；`_original_*` 历史归档不计入当前工程面。

上一 active change `split-subagent-relay` 已为同类清理建立模式：保留 canonical import 文件作为 barrel，内部实现迁到同目录扁平子模块，外部 consumers 不改 import。Queue Manager 也适合该模式，因为当前 direct code consumers 都 import `DPT_FRAMEWORK/engine/queue-manager.mjs`：

| Consumer | 当前用途 |
|----------|----------|
| `DPT_FRAMEWORK/cli/operate-queue.mjs` | queue lifecycle CLI |
| `DPT_FRAMEWORK/cli/validate-bundle.mjs` | `OutputDeclarationLedgerRecord` |
| `tests/engine/queue-manager.test.mjs` | public API regression |
| `experiments_playbook/exp_agentic-queue/*.md` | controlled E2E inline scripts |
| `experiments_playbook/exp_system-logging/*.md` | logging checks |

Public export baseline（apply 前 `rg '^export '`）：`QUEUE_ACTIVE_WINDOW_SLOTS`, `SLOT_NAMES`, `QueueItemSchema`, `QUEUE`, `OutputDeclarationLedgerRecord`, `checkReceipts`, `createQueue`, `loadQueue`, `saveQueue`, `enqueue`, `claim`, `complete`, `fail`, `preempt`, `inspect`, `pendingCount`, `render`, `makeItem`。

影响面不能只看 `.mjs` import graph。Queue Manager 还通过 `operate-queue.mjs` 被 workflow phase MD、shared subagent handoff MD、experiment playbooks、integration tests 间接调用。设计和任务必须把以下三层都纳入验收：

| Impact layer | Examples | Expected change |
|--------------|----------|-----------------|
| Direct JS imports | `operate-queue.mjs`, `validate-bundle.mjs`, `tests/engine/queue-manager*.test.mjs` | import path stays `queue-manager.mjs` |
| MD inline JS imports | `exp_agentic-queue/case-41..43`, `exp_system-logging/case-72/75` | import path stays `../DPT_FRAMEWORK/engine/queue-manager.mjs` |
| CLI-driven MD/playbooks | `phase-seed-topics.md`, `phase-wave*.md`, engine-boundary/evidence/wfn playbooks | no content edit; smoke via CLI/integration/playbook scans |

## Goals / Non-Goals

**Goals:**

1. 保持 `DPT_FRAMEWORK/engine/queue-manager.mjs` 为唯一 external import surface。
2. 将 Queue Manager 内部实现拆成 5 个扁平子模块，单文件不再超过 1000 行。
3. 将 `tests/engine/queue-manager.test.mjs` 拆成主题化 regression test files，保留同等覆盖并继续从 barrel import。
4. trace/logger singleton 只保留一份，其他子模块 import 使用。
5. 保持 Queue state file shape、ledger JSONL shape、projection Markdown shape、trace/log event 名称、public function signatures 不变。
6. 保持 `operate-queue.mjs`、`validate-bundle.mjs`、workflow MD、相关 experiment playbooks 行为不变。
7. 子模块依赖图保持 DAG，无 ESM circular import。

**Non-Goals:**

- 不改变 AGQ active-window 状态机、refill pool 排序、receipt 语义、delegated relay provenance、cache trail warning/filter 策略。
- 不把 Queue Manager 变成 Agent Flow controller；它仍只做 deterministic checkpoint / feedback。
- 不修改 workflow phase Markdown 或 command playbook 文案。
- 不降低 test coverage，不把 regression tests 移入 `DPT_FRAMEWORK/`。
- 不新增 npm 依赖，不改 TypeScript/构建体系。
- 不引入 `engine/queue-manager/` 子目录。

## Decisions

### Decision 1: 5 个扁平子模块 + barrel

采用同目录扁平文件，避免新增 directory import surface：

```
DPT_FRAMEWORK/engine/
  queue-manager.mjs            # barrel re-export + role/comment
  queue-manager-core.mjs       # trace/logger, constants, schemas, queue helpers
  queue-manager-window.mjs     # active window / pool mechanics + preempt
  queue-manager-ledger.mjs     # delegated provenance + output declaration ledger
  queue-manager-lifecycle.mjs  # public lifecycle API + receipt checking
  queue-manager-render.mjs     # projection renderer
```

不选 `engine/queue-manager/index.mjs`：会制造第二个看似 canonical 的 import surface。  
不选按 line-count 平均切块：Queue Manager 的风险集中在 state/provenance/IO 边界，按职责切更容易 review。

### Decision 2: `queue-manager-core.mjs` owns shared state and schemas

`queue-manager-core.mjs` 是 foundation module：

- imports: `zod`, `node:path`, `./trace.mjs`, `./logger.mjs`, `../schema/contracts/queue.mjs`, `../schema/contracts/queue-slots.mjs`
- public exports: `QUEUE_ACTIVE_WINDOW_SLOTS`, `SLOT_NAMES`, `QueueItemSchema`, `QUEUE`
- sibling-only exports: `ensureTrace`, `traceEntry`, `logEvent`, `QueueStateSchema`, `QueueResultSchema`, `QueueFailureSchema`, `now`, `clone`, `withTimestamps`, `touchQueue`, `syncQueueHealth`, `bundlePath`, `queuePath`, `queueStateFromFile`, `canonicalQueueFileShape`, `validateQueue`, `check`, `advice`

`_trace`, `_bundleDir`, `_log` module-level singleton state SHALL exist only here. This mirrors the `subagent-relay-schemas-trace.mjs` decision and avoids split modules writing to separate trace/logger instances.

### Decision 3: active-window mechanics live outside lifecycle

`queue-manager-window.mjs` owns deterministic slot/pool mechanics:

- sibling exports: `sortPool`, `firstOpenSlot`, `promote`, `refill`
- public export: `preempt`
- imports: `SLOT_NAMES`, `validateQueue`, `clone`, `touchQueue`, `syncQueueHealth`, `withTimestamps`, `now`, `traceEntry`, `logEvent`

Rationale: `complete()` and `fail()` call `promote/refill`, while `fail()` may call public `preempt()`. Keeping this mechanics module independent prevents lifecycle from becoming another monolith. `window` SHALL NOT import `lifecycle`.

### Decision 4: delegated completion and ledger are one provenance module

`queue-manager-ledger.mjs` owns:

- `OutputDeclarationLedgerRecord`
- `appendOutputDeclarationLedger`
- `validateDelegatedCompletion`
- internal `deriveCreationReason`
- internal ledger file constant

It imports `SlotResult`, `validateRuntimeReceipt`, and `resolveSlotFromResultRef` from `./subagent-relay.mjs` exactly as current Queue Manager does. This keeps relay provenance and output declaration ledger concerns together, and keeps `complete()` focused on lifecycle orchestration.

`LEDGER_FILE` is not a public export today despite the file header mentioning it. This change SHALL NOT expose it unless apply discovers an external import that already depends on it.

### Decision 5: lifecycle module owns public queue operations and receipts

`queue-manager-lifecycle.mjs` owns:

- `checkReceipts`, `createQueue`, `loadQueue`, `saveQueue`, `enqueue`, `claim`, `complete`, `fail`, `inspect`, `pendingCount`, `makeItem`
- internal `checkOneReceipt`, `makeRepairItem`

It imports `render` from `queue-manager-render.mjs`, window mechanics from `queue-manager-window.mjs`, and provenance helpers from `queue-manager-ledger.mjs`. `checkReceipts` stays here because it is a public deterministic checkpoint used directly by `inspect()` and `complete()`.

`enqueue()` stays in lifecycle rather than window because it is a public queue API with trace/log semantics and user-facing feedback; window keeps the lower-level slot mechanics.

### Decision 6: projection render gets its own module

`queue-manager-render.mjs` owns public `render(queue, bundleDir)` and no lifecycle behavior. It imports only core helpers and `node:fs`/`node:path`.

This file may be under 100 lines after split. That is acceptable because projection rendering is a distinct IO surface and public API; forcing it into lifecycle would keep unrelated formatting code inside the highest-churn module.

### Decision 7: Barrel export contract

After migration, `queue-manager.mjs` keeps the role/lifecycle comment and a sub-module list, then re-exports the same public symbols:

| Barrel source | Public exports |
|---------------|----------------|
| core | `QUEUE_ACTIVE_WINDOW_SLOTS`, `SLOT_NAMES`, `QueueItemSchema`, `QUEUE` |
| ledger | `OutputDeclarationLedgerRecord` |
| lifecycle | `checkReceipts`, `createQueue`, `loadQueue`, `saveQueue`, `enqueue`, `claim`, `complete`, `fail`, `inspect`, `pendingCount`, `makeItem` |
| window | `preempt` |
| render | `render` |

External files SHALL NOT import `queue-manager-*.mjs` directly. Only sibling modules under `DPT_FRAMEWORK/engine/queue-manager*.mjs` may use those paths.

### Decision 8: Migration strategy

Use staged extraction:

1. Create submodule files with headers and `// @impl FRE-005` while keeping barrel import path.
2. Move core first, then window, ledger, render, lifecycle.
3. After each extraction, re-export from `queue-manager.mjs` and run `node --test tests/engine/queue-manager.test.mjs`.
4. Final cleanup leaves `queue-manager.mjs` as pure barrel.

This follows the relay split strategy and avoids a large all-at-once move.

### Decision 9: Companion regression tests split with shared fixtures

`tests/engine/queue-manager.test.mjs` SHALL be removed or reduced to a non-test README-style stub; actual regression coverage moves to flat test files under `tests/engine/` plus one shared helper module:

```
tests/engine/
  queue-manager-fixtures.mjs                 # temp bundles, item(), relay fixture helpers
  queue-manager-schema.test.mjs              # QueueItemSchema, TargetSpec, constants, makeItem defaults
  queue-manager-window-lifecycle.test.mjs    # enqueue, claim, pendingCount, complete/fail/promote/refill, preempt
  queue-manager-receipts-cli-render.test.mjs # checkReceipts, projection, save/load, operate-queue CLI smoke
  queue-manager-delegated.test.mjs           # delegated complete, Queue↔Relay pipeline, ledger, gate handoff
  queue-manager-logging.test.mjs             # LOG-006 accident-grade diagnostics
```

Tests continue importing from `../../DPT_FRAMEWORK/engine/queue-manager.mjs`. They SHALL NOT import `queue-manager-*.mjs` submodules directly, because the test contract should protect the external barrel and public API. The shared helper may import Relay public barrel symbols to build delegated fixtures, matching the current monolith test.

Not chosen: a `tests/engine/queue-manager/` subdirectory. The existing relay split uses flat `subagent-relay-*.test.mjs` files under `tests/engine/`; matching that pattern keeps `node --test tests/engine/queue-manager*.test.mjs` simple.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Trace/logger singleton duplication | `_trace`, `_bundleDir`, `_log` only in `queue-manager-core.mjs`; grep for `_trace =` and `_log =` after split |
| Circular import between lifecycle/window/render | Enforce DAG: core → window/render/ledger → lifecycle; lifecycle imports outward, lower modules never import lifecycle |
| Public export omitted from barrel | Compare apply baseline `rg '^export ' DPT_FRAMEWORK/engine/queue-manager.mjs` to final barrel |
| `validate-bundle.mjs` loses ledger schema import | Explicitly re-export `OutputDeclarationLedgerRecord` from barrel and run `node --check DPT_FRAMEWORK/cli/validate-bundle.mjs` |
| Regression test split drops coverage | Preserve every current `describe()` group in one of the new test files; run old-vs-new describe inventory before deleting monolith |
| Experiment playbooks import submodules by accident | grep for import statements targeting `DPT_FRAMEWORK/engine/queue-manager-*.mjs`; matches outside Queue Manager sibling implementation must be zero |
| MD/playbook indirect impact missed | Maintain an impact scan for `queue-manager.mjs`, `operate-queue.mjs`, `rb_queue.json`, `_cache/agentic-queue/current-task.md`, `complete()`, and ledger references; run representative integration tests and smoke playbooks |
| Tiny render module feels over-split | Accept because it isolates projection IO and keeps lifecycle focused |

## Migration Plan

1. Apply tasks in order, keeping every step behavior-preserving.
2. Run focused regression after each major extraction: `node --test tests/engine/queue-manager.test.mjs`.
3. Final verification:
   - `node --test tests/engine/queue-manager*.test.mjs tests/engine/subagent-relay*.test.mjs`
   - `node --test tests/integration/cli/operate-queue.test.mjs tests/integration/cli/operate-queue-validation.test.mjs tests/integration/cli/validate-bundle.test.mjs`
   - `node --check DPT_FRAMEWORK/cli/operate-queue.mjs`
   - `node --check DPT_FRAMEWORK/cli/validate-bundle.mjs`
   - `rg -n "from ['\"].*DPT_FRAMEWORK/engine/queue-manager-|import\\(.*DPT_FRAMEWORK/engine/queue-manager-" tests experiments_playbook --glob '*.{mjs,js,md}'` returns 0
   - scan direct and indirect MD impact paths for unchanged canonical queue usage
   - `node openspec/governance/check-project-reqs.mjs`
   - `node openspec/governance/check-project-specs.mjs`
4. Rollback strategy: revert the apply commit(s). Because public import paths remain stable, rollback is a file layout revert only.

## Open Questions

- None blocking. Companion regression test splitting is part of this change, not a follow-up.
