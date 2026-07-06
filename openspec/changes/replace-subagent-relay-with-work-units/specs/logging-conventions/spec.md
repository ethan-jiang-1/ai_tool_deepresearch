> req: LOC-010

## MODIFIED Requirements

### Requirement: Long-running phases SHALL leave enough log and diagnostic evidence for post-mortem debugging

Sub-agent execution and Agent-side repair loops SHALL be included in the long-running phase diagnostic scope. Work-unit task and spawn prompts SHALL contain explicit logging instructions naming specific events to log, including search start, search done, fetch done, file written, error, and work complete. Delegated logging examples SHALL bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: Sub-agent spawn prompt includes logging instructions

- **WHEN** a work-unit prompt is generated
- **THEN** the prompt SHALL include diagnostic logging examples that bind the assigned work unit
- **AND** command examples SHALL use accepted log levels and the bundle's log-event CLI path

