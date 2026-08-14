# C9a: Preserve Current Queue Bundle-Identity Initialization

> Audit disposition: protected current semantic, not a cleanup candidate
>
> Risk if removed: L3

## What looked suspicious

`rb_queue.json.tmpl` writes `bundle_name: null`, and the first successful
`operate-queue` operation fills it from `rb_status.json`. Comments and tests
call this a legacy normalization path.

## Verified current contract

- A fresh current template intentionally starts before the bundle identity is
  persisted in the queue file.
- The accepted `agent/queue-input-validation` spec explicitly permits null or
  absent `bundle_name` at instantiation/migration boundary and requires the
  first operation to inject the status bundle name before normal validation.
- Later operations reject a mismatched queue/status identity. This binds the
  mutable queue to the selected bundle and prevents cross-bundle contamination.
- `agent/agentic-queue` adds an important failure rule: failed seed-authoring
  completion must not normalize a missing identity as a side effect. The
  operation persists it only when the normal operation reaches its legal save.
- Template, schema, CLI, focused validation tests, and seed-authoring tests all
  encode this behavior.

## Disposition

Keep it. It is a current creation-time initialization transition, not support
for a prior queue version. A later wording cleanup may stop calling a fresh
template "legacy", but must not change the initialization or failure atomicity
without an independent queue behavior change.

## Protected tests

```bash
node --test tests/integration/cli/operate-queue-validation.test.mjs \
  tests/integration/cli/operate-queue-seed-authoring.test.mjs \
  tests/schema/contracts/queue.test.mjs
```

