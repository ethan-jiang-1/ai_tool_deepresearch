> req: SNC-008

## ADDED Requirements

### Requirement: Sub-agent slow work SHALL emit observable progress before timeout risk

Sub-agent role guidance and generated work-unit task guidance SHALL instruct Sub-agents performing slow search, fetch, extraction, output, or cache work to emit concise lifecycle progress around bounded batches. Progress events SHALL preserve the assigned `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`, and SHALL write to the assigned work-unit runtime receipt or logging surface under the active bundle root.

Progress guidance SHALL be batch-level rather than noisy per-token or private-reasoning output. Suitable progress points include work start, search batch start/done, fetch batch start/done, cache write, result draft write, output verification, and work done. If a Sub-agent cannot write a progress receipt/log before a long operation, guidance SHALL instruct it to keep the long operation bounded and to write progress as soon as the bundle-root write surface is available.

Progress receipt/log entries SHALL be diagnostic inputs for timeout preflight only. They SHALL NOT satisfy formal submit, delegated ledger coverage, gate coverage, source claim validation, cache trail validation, or final report authority without successful `operate-work-unit submit`.

Active Sub-agent guidance SHALL keep the repo technology constraints: JS/Node-first fetch guidance only, no Python fallback, no Python one-liners, no `.py` scripts, no Engine-owned fetch orchestration, and no alternate delegated completion path.

#### Scenario: slow fetch batch writes progress

- **WHEN** a Sub-agent begins a slow fetch batch for a claimed work unit
- **THEN** active guidance SHALL instruct it to write a progress event tied to the work-unit identity before or at the start of the batch
- **AND** it SHALL write another progress event after the batch or cache write completes

#### Scenario: progress receipts do not satisfy submit

- **WHEN** a work unit has progress receipt events but no successful formal submit
- **THEN** the progress events MAY block premature timeout while fresh
- **AND** they SHALL NOT append a ledger row, complete queue demand, or satisfy wave gate delegated coverage

#### Scenario: progress guidance keeps JS technology stack

- **WHEN** active Sub-agent guidance explains long fetch/search/cache progress
- **THEN** it SHALL NOT instruct Python fallback, Python one-liners, `.py` scripts, or Engine-owned fetch orchestration
- **AND** it SHALL preserve the work-unit submit path as the only successful delegated completion boundary
