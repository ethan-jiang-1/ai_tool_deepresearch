---
schema: command-experiment/v1
experiment: reentry-debuggability
case: case-316-light-canonical-topic-layout-recovery
weight: light
case_goal: "验证 stable-UID rename/renumber、历史 Wave0/Wave1 coverage 原位聚合、mid-seed exact recover、safe remove 与 ambiguous/free-text no-write。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: tests/.test-tmp/topic-layout-*
trace: tests/.test-tmp/topic-layout-*/rb_trace.jsonl
verdict: filesystem
production_distance: >
  串行执行现有 production helper/CLI 的 real disposable bundle regressions；不新增 runner、mock、artifact mover、ledger rewrite 或第二 registry。
---

# Case 316 — Canonical Topic Layout Recovery

## Execution Contract

逐条执行下列 focused regressions。每条都必须 PASS；不得并行，不得改写测试逻辑。

## Step 1 — Real disk rename and crash recovery

```bash
node --test --test-name-pattern='mutates current layout|keeps historical outputs|recovers partial multi-seed' tests/engine/helpers/canonical-topic-state.test.mjs
```

## Step 2 — Safe remove and unresolved history boundaries

```bash
node --test --test-name-pattern='safely removes|blocks safe remove|free-text topic prose' tests/engine/helpers/canonical-topic-state.test.mjs
```

## Step 3 — Historical Wave0 UID coverage

```bash
node --test --test-name-pattern='aggregates historical Wave0' tests/integration/cli/check-gate-wave0-complete.test.mjs
```

## Step 4 — Historical Wave1 UID coverage and current seed

```bash
node --test --test-name-pattern='aggregates historical Wave1' tests/integration/cli/check-gate-wave1-complete.test.mjs
```

## Step 5 — Queue alias and UID mismatch no-write

```bash
node --test --test-name-pattern='previous-layout slug|caller UID mismatch|accepted workspace recovery' tests/integration/cli/operate-queue-validation.test.mjs
```

## Verdict

PASS only when all five commands exit `0`. Each regression creates and cleans its own real disposable bundle or real temporary bundle and asserts immutable ledger/work-unit/history bytes directly.
