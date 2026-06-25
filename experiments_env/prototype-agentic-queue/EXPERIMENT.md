# prototype-agentic-queue

> @impl AGQ-006

## Goal

Validate a JS-owned Queue Manager API for agentic work queues.

This prototype proves queue mechanics, deterministic receipts, Markdown projection,
and trace verdicts. It does not prove research quality, source quality, claim truth,
or a production dispatcher surface.

## Design

This prototype keeps the useful queue shape but moves authority to JS/JSON:

- JSON queue state is the source of record.
- JS APIs mutate queue state.
- Markdown is generated projection only.
- Only `slot_1_current` is executable.
- Slots 2-5 and `refill_pool` are previews/candidates.

## Prototype Files

- `agentic-queue.mjs`: schema, API, receipt checks, projection renderer.
- `agentic-queue-cli.mjs`: thin CLI over the same API.
- `trace.mjs`: append-only trace helper for command experiments.
- `agentic-queue.test.mjs`: unit tests for mechanics and CLI behavior.
- `nodes-agentic-queue/`: placeholder node directory for command experiment shape.

## API Surface

- `loadQueue(bundleDir)`
- `saveQueue(bundleDir, queue)`
- `validateQueue(queue)`
- `enqueue(queue, item, { mode })`
- `claimCurrent(queue, { actor })`
- `completeCurrent(queue, result, bundleDir)`
- `failCurrent(queue, failure, bundleDir)`
- `preempt(queue, item, { reason, unsafeCurrent, replaceCurrent })`
- `promote(queue)`
- `refill(queue)`
- `checkReceipts(queue, item, bundleDir)`
- `renderProjection(queue, bundleDir)`
- `inspectQueue(queue, bundleDir)`

## Historical Prototype State File

This retired prototype used a prototype-only queue state filename. That filename
is historical noise, not current guidance. Production and current experiments use
the canonical runtime queue file `rb_queue.json`.

## Command Experiment Cases

- Simple: enqueue three tasks, claim current, complete current, verify promotion,
  projection, and trace verdict.
- Medium: full active window plus refill pool, urgent preemption, displaced tail
  restore metadata, completion/refill.
- Complex: invalid task rejection, missing receipt blocking, unsafe-current guard,
  failure repair route, empty queue after refill/blocker path.

## Results

Record actual command results here after running the playbooks:

- Unit tests: PASS — 14/14 (5 suites)
- Simple playbook: PASS — 3 check events all passed
- Medium playbook: PASS — 4 check events all passed
- Complex playbook: PASS — 7 check events all passed (filtered by playbook source)

## Not Productionized

- Historical prototype-only queue filename and shape.
- Receipt grammar beyond the deterministic subset.
- Component-specific `payload` schemas.
- Production dispatcher command name, such as future `ds.mjs`.
