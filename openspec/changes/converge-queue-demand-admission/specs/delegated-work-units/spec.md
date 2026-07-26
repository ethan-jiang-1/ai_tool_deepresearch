> req: DEW-003, DEW-004

## MODIFIED Requirements

### Requirement: Work-unit claim SHALL bind queue demand and lease

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Before allocating a work ID, opening or incrementing a batch, moving queue demand, creating an envelope, or emitting claim success, claim SHALL invoke the shared current queue-demand admission evaluator for every candidate in its planned contiguous prefix. It SHALL use the evaluator's current canonical binding and resolved assignment facts rather than a prior enqueue/check verdict or caller-supplied binding. Any rejected candidate SHALL reject the entire planned batch without queue, index, batch-counter, envelope, delegated-in-flight or success-trace mutation.

Successful claim stdout SHALL include a static Agent-facing top-level `continuation` object for the immediate post-claim decision point with `next_action: inspect_and_poll_claimed_work`. Because claim validates queue/work-unit phase demand but does not read or establish the current lifecycle node's `stop` authority, its continuation SHALL omit `interaction` rather than hardcode a second interaction-placement truth. The already-loaded lifecycle phase/header/cue continues to control whether the framework may initiate user-facing output.

The cue SHALL include `work_ids` equal to the already returned `claimed_work_ids`, SHALL NOT be nested inside queue/index authority objects, SHALL NOT infer readiness, SHALL NOT complete work, and SHALL NOT add persistent work-unit, interaction, message, or pause state. Empty or failed claims SHALL NOT emit a successful continuation cue.

#### Scenario: claim rechecks an admitted card against current authority

- **WHEN** a card was previously enqueued but its current canonical Topic or assignment contract no longer admits it
- **THEN** claim SHALL reject it before any allocation or queue mutation
- **AND** it SHALL not treat the prior enqueue success as authority

#### Scenario: one rejected candidate preserves batch atomicity

- **WHEN** a later candidate in a planned contiguous claim batch is rejected by shared admission
- **THEN** claim SHALL allocate zero work IDs and leave every candidate unclaimed
- **AND** it SHALL report the rejected queue item and direct admission reason

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema, beacon, runtime receipt path, status, result surfaces, and optional runtime refs needed to validate submit and diagnose execution. The Engine SHALL generate an opaque `receipt_nonce` and require the nonce to agree across index, manifest, beacon, task, runtime receipt, result, and ledger.

For every new claim, the Engine SHALL use the shared queue-demand admission evaluator to resolve one closed assignment contract before mutation. Its accepted inputs SHALL be the registered work-unit kind, the evaluator-resolved current canonical Topic UID/current slug when the kind is topic-scoped, the snapshot-bound closed `payload.assignment_mode` when required by that producer, and canonical file: entries in snapshot-bound `required_receipts`. `assignment_mode` SHALL express only `primary|supplementary` assignment intent and SHALL NOT select roles or direct-contract IDs. The evaluator SHALL reject closed reserved selectors, invalid merged kind contracts, unsupported required-receipt sets, unresolved Topic bindings and unknown versions before envelope creation.

The existing `assignment_contract_version: "work-unit.assignment.v1"`, output-contract reconstruction, snapshot hash binding, submit validation, task/starter/checklist projections and actor responsibility boundaries remain unchanged. The evaluator is an admission seam only: it SHALL NOT persist an admission verdict, interpret Agent prose, add a resolver version, or weaken submit-side reconstruction from the hash-bound snapshot.

#### Scenario: the envelope receives only evaluator-resolved contract facts

- **WHEN** a delegated demand passes claim admission
- **THEN** its index, manifest and beacon SHALL bind the assignment facts resolved by the shared evaluator
- **AND** no queue-authored contract selector or stored enqueue verdict SHALL select those facts
