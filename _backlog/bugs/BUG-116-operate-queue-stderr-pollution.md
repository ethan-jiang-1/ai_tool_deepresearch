# BUG-116: operate-queue.mjs output routing causes silent pipe failures

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-116 |
| **Severity** | P3 (high frequency, low per-incident severity) |
| **Phase** | cross-phase (seed-topics, wave0, wave1) |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

`operate-queue.mjs claim`, `operate-queue.mjs enqueue`, and `operate-queue.mjs complete` sometimes emit their primary JSON-structured output to **stderr** instead of stdout. When the Agent pipes through `2>/dev/null | python3 -c "json.load(sys.stdin)"`, the JSON lands in the discarded stderr stream, leaving stdin empty. Python throws `JSONDecodeError: Expecting value: line 1 column 1 (char 0)`.

The command exits 0 (success) but the pipe receives nothing.

## Affected Commands

All `operate-queue.mjs` subcommands exhibited this at least once:
- `operate-queue.mjs claim <bundle> --actor main-agent`
- `operate-queue.mjs enqueue <bundle> --task <task.json>`
- `operate-queue.mjs complete <bundle> --result <result.json>`
- `operate-queue.mjs check <bundle>`

## Frequency

~5-8 occurrences across the seed-topics queue loop and wave0 enqueue loop. Not deterministic — the same command sometimes outputs to stdout, sometimes to stderr. The Agent could not identify a pattern.

## Concrete Examples

### Example 1: seed-topics claim
```bash
# This FAILS — JSON on stderr, pipe gets nothing:
node DPT_FRAMEWORK/cli/operate-queue.mjs claim <bundle> --actor main-agent 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); ..."
# JSONDecodeError: Expecting value: line 1 column 1 (char 0)

# This WORKS — Agent parses mixed stdout+stderr by removing 2>/dev/null:
node DPT_FRAMEWORK/cli/operate-queue.mjs claim <bundle> --actor main-agent 2>&1 | python3 -c "..."
```

### Example 2: wave0 enqueue in bash loop
```bash
for f in /tmp/wfq-wave0-*.json; do
  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task "$f" 2>/dev/null | python3 -c "import json,sys; print('OK' if json.load(sys.stdin).get('ok') else 'FAIL')"
done
# Every iteration: JSONDecodeError — all enqueue output on stderr
```

### Example 3: wave1 enqueue after queue blocked
```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-wave1-01.json 2>/dev/null
# No stdout output at all. Exit code 1. Error "Wave1 assignment_mode must be primary or supplementary" on stderr.
```

## Workaround

The Agent converged on: never use `2>/dev/null` with `operate-queue.mjs`. Always pipe stderr to stdout first (`2>&1`), then parse. This is fragile — if the command also emits warnings to stderr, the JSON parser will see mixed content.

## Root Cause (suspected)

`operate-queue.mjs` likely uses `process.stderr.write()` or `console.error()` for its JSON output in some code paths. Check:
- `DPT_FRAMEWORK/cli/operate-queue.mjs` — the main CLI dispatch
- `DPT_FRAMEWORK/engine/queue-manager-lifecycle.mjs` — queue state management

The queue also uses `writeFileSync(1, ...)` (file descriptor 1 = stdout) in some places (like `operate-topic-state.mjs`), which should go to stdout. But `operate-queue.mjs` might mix `console.log` (stdout) and `console.error` (stderr).

## Suggested Fix

1. Audit all `operate-queue.mjs` code paths — ensure `console.log` or `process.stdout.write` is used for structured JSON output
2. Reserve `console.error` / `process.stderr.write` for actual errors and diagnostics only
3. Add a test: `operate-queue.mjs claim <bundle> 2>/dev/null | python3 -c "json.load(sys.stdin)"` must never fail with JSONDecodeError
