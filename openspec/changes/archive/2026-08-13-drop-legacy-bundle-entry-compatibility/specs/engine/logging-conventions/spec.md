> req: LOC-005

## MODIFIED Requirements

### Requirement: Inspect-bundle observable extension

`inspect-bundle.mjs` SHALL evaluate the selected root through the shared
current-entry predicate before every view. The predicate passes only when both
`BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` exist at that root.

After a passing preflight, the supported views are:

1. **default (no flag)**: validate required files/directories and report the
   structural result;
2. **`--summary`**: read `rb_trace.jsonl`, call `traceSummary()`, output
   `{ events: N, passed: N, failed: N }`, each gate pass/fail row, and
   `_logs/run.log` health;
3. **`--timeline`**: read the sink files and output one time-ordered timeline;
   and
4. **`--log`**: output `_logs/run.log` content.

If the pair is absent, every mode SHALL exit `1` with the scoped
`unsupported_current_entry_contract` rejection and SHALL emit no log content,
timeline entries, summary data, or other historical inspection data. The
rejection is a known selected-root validation failure; it does not provide a
legacy inspection, migration, or compatibility route.

After a passing preflight, observable modes preserve their existing
mode-specific output semantics. A complete pair plus legacy Markdown files
passes; the extra files are historical debris, not another entry path.

#### Scenario: Summary does not bypass current-entry admission

- **WHEN** `inspect-bundle <bundle> --summary` is called on a directory missing
  either current root file
- **THEN** it SHALL exit `1` with `unsupported_current_entry_contract`
- **AND** stdout SHALL not contain gate summary or log-health data from that
  directory

#### Scenario: Summary flag prints pass/fail table with log health

- **WHEN** `inspect-bundle <bundle> --summary` is called for a current-pair
  bundle
- **THEN** stdout SHALL output each `gate_attempt` event's gate name,
  pass/fail, and timestamp
- **AND** SHALL output `{ events: N, passed: N, failed: N }` plus
  `_logs/run.log` line health
- **AND** an empty log SHALL yield its existing warning without changing the
  successful current-pair exit behavior

#### Scenario: Timeline does not bypass current-entry admission

- **WHEN** `inspect-bundle <bundle> --timeline` is called on a directory
  missing either current root file
- **THEN** it SHALL exit `1` with `unsupported_current_entry_contract`
- **AND** stdout SHALL not contain timeline entries from that directory

#### Scenario: Timeline flag stitches all sinks

- **WHEN** `inspect-bundle <bundle> --timeline` is called for a current-pair
  bundle
- **THEN** stdout SHALL output timestamp-ordered sink entries
- **AND** each row SHALL identify its source sink

#### Scenario: Log view does not bypass current-entry admission

- **WHEN** `inspect-bundle <bundle> --log` is called on a directory missing
  either current root file
- **THEN** it SHALL exit `1` with `unsupported_current_entry_contract`
- **AND** stdout SHALL not contain `_logs/run.log` content from that directory

#### Scenario: Log flag prints run.log content

- **WHEN** `inspect-bundle <bundle> --log` is called for a current-pair bundle
- **THEN** stdout SHALL output `_logs/run.log` content

#### Scenario: Observable views retain current-pair behavior

- **WHEN** an inspected bundle contains the current pair and the requested
  observable data
- **THEN** each selected view SHALL emit its existing mode-specific output
- **AND** an extra legacy entry or map file SHALL not alter the successful
  current-pair conclusion
