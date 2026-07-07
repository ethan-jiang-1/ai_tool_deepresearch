## ADDED Requirements

> req: DEW-009, DEW-010

### Requirement: Work-unit tasks SHALL expose bundle-root absolute paths and write-before-return verification

Generated work-unit task Markdown and any Agent-facing claim/spawn output SHALL include the active bundle root as an absolute `bundle_dir`, the exact work-unit identity fields, bundle-relative canonical refs, and absolute paths for files the sub-agent must read or write. The task SHALL instruct the sub-agent to resolve every runtime write under `bundle_dir`, preserve identity fields exactly, and verify required outputs before returning control.

The required verification SHALL cover declared `writes_to` outputs, `result.json`, `runtime-receipt.jsonl`, and cache leaf files required by the work-unit cache policy. A sub-agent that cannot write or verify the files SHALL report work-unit failure rather than returning only research text.

#### Scenario: Claimed task contains absolute runtime paths

- **WHEN** `operate-work-unit claim` creates a work unit for active bundle `/repo/dpt_rb_aidlc-investigation`
- **THEN** the generated task SHALL include `bundle_dir: /repo/dpt_rb_aidlc-investigation`
- **AND** it SHALL include absolute paths for `_beacon.json`, `result.json`, `runtime-receipt.jsonl`, declared output files, and required cache leaf directories
- **AND** bundle-relative paths SHALL remain clearly labeled as refs relative to `bundle_dir`

#### Scenario: Sub-agent must verify writes before returning

- **WHEN** a sub-agent completes a work-unit task
- **THEN** the task contract SHALL require it to verify every declared output file exists under active bundle root
- **AND** it SHALL require `result.json` and `runtime-receipt.jsonl` to contain the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** it SHALL require cache trail leaves to contain required files before the sub-agent returns success

#### Scenario: Chat-only completion is not successful delegated completion

- **WHEN** a sub-agent returns research findings in conversation text but does not write the required result, receipt, output, and cache files
- **THEN** the work unit SHALL remain unsubmitted or submit SHALL reject it
- **AND** the Phase Agent SHALL treat the return as work-unit failure or repair input, not delegated completion

### Requirement: Submitted result and ledger hashes SHALL detect post-submit drift before gate pass

After successful work-unit submit, submitted ledger rows SHALL preserve enough binding hashes and refs for later gate or preflight checks to detect post-submit mutation. A gate that consumes delegated coverage SHALL cross-check the current result, manifest, beacon, runtime receipt, output files, cache trail leaves, index entry, and ledger row against the submitted binding data before it can pass.

If a result file, receipt, output declaration, cache trail, or binding surface drifts after submit, the gate SHALL fail closed with a repair-targeted diagnostic. The repair path SHALL NOT be to hand-edit ledger rows or status files.

#### Scenario: Post-submit result mutation fails gate coverage

- **WHEN** a work unit has a submitted ledger row with `result_hash`
- **AND** the current `result.json` content no longer matches the submitted `result_hash`
- **THEN** delegated gate coverage for that work unit SHALL fail
- **AND** diagnostics SHALL name the affected `work_id` and hash drift surface

#### Scenario: Ledger row remains the delegated authority

- **WHEN** a work-unit output file exists but the submitted ledger row is missing or fails binding cross-check
- **THEN** the output SHALL NOT count as delegated gate coverage
- **AND** diagnostics MAY report the file as cleanup, bypass, or drift evidence only

#### Scenario: Hash drift repair avoids hand-written ledger mutation

- **WHEN** a gate reports submitted result hash mismatch
- **THEN** advice SHALL direct repair through a valid work-unit retry, replacement submit, or explicit terminal/retry operation
- **AND** advice SHALL NOT tell the Agent to edit `rb_output_declarations.jsonl` by hand
