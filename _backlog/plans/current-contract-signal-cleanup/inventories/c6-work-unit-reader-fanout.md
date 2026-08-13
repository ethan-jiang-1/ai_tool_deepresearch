# C6 Work-Unit Historic-Reader Fanout

> Scope: all tracked current Harness, accepted-spec, focused-test, and
> Agent-guidance readers of the four C6 historic work-unit shapes. No run
> bundle was opened. Audited 2026-08-13.

The four shapes overlap in real historical data, but the reader consequences do
not. This inventory closes the C6 discovery obligation without deciding whether
the future policy is reject, opaque history, or retain read-only interpretation.

## C6a: Explicit Assignment v1/v2

| Reader class | Current surface | Consequence / disposition |
| --- | --- | --- |
| Current writer | `helpers/queue-demand-admission.mjs`, `work-unit-lifecycle.mjs` | New claims write only assignment v3. Protected current writer. |
| Schema admission | `schema/contracts/work-unit.mjs` | The enum still parses v1/v2/v3 and binds marker presence to `required_outputs`. C6a candidate reader. |
| Immutable output interpretation | `work-unit-assignment-contract.mjs`, `work-unit-validation.mjs` | A marked v1/v2 manifest is validated against its recorded contract, so a later v3 default cannot reinterpret it. C6a candidate reader. |
| Submit/envelope inspection | `work-unit-submit.mjs`, `work-unit-envelope.mjs`, `work-unit-inspect.mjs` | Submit validates the record/manfiest/beacon binding; task and inspect projections expose the marker. Do not remove only the schema union. |
| Agent guidance | `workflows/nodes/shared/shared-schemas.md`, `shared-subagent-protocol.md` | New v3 assignment is current; old marked assignments are deliberately described as immutable history. |
| Accepted/spec and tests | `agent/delegated-work-units`, `tests/engine/work-unit-assignment-contract.test.mjs`, `tests/engine/work-unit-submit.test.mjs`, `tests/schema/contracts/work-unit.test.mjs` | Existing characterization evidence proves v1/v2 differs from v3 and must be changed only with an explicit boundary policy. |

## C6b: Markerless Submission / Hash-Mirror Representation

| Reader class | Current surface | Consequence / disposition |
| --- | --- | --- |
| Current writer | `work-unit-lifecycle.mjs`, `work-unit-submit.mjs` | New claims write `work-unit.submission.v1`; successful submit writes one immutable accepted-ledger fingerprint, not old mirrors. Protected current writer. |
| Schema and ledger parser | `schema/contracts/work-unit.mjs`, `work-unit-submitted-ledger.mjs` | The marker selects either current fingerprint/status or markerless result/ledger hash mirrors. C6b candidate reader. |
| Submit and declaration recovery | `work-unit-submit.mjs`, `work-unit-validation.mjs`, `work-unit-attempt-disposition.mjs` | A markerless submitted attempt can be validated/reconstructed only through a complete historical tuple; partial/mixed shapes fail closed. |
| Supersession | `work-unit-supersession.mjs` | Supersession validates the full historic acceptance tuple, output/cache evidence, trace, and original hash before treating a predecessor as historical. |
| Gate/provenance and inspection | `helpers/gate-helpers-provenance.mjs`, `work-unit-projection.mjs`, `work-unit-inspect.mjs` | Current coverage derives from normalized submitted facts; historical predecessors stay historical and cannot become current coverage. |
| Safety scan | `work-unit-submitted-ledger.mjs`, `work-unit-supersession.mjs`, `helpers/gate-helpers-provenance.mjs` | `legacy_non_work_unit_rows` is surfaced to provenance-bypass checking. It is a current rejection/safety fact, not harmless JSONL debris. |
| Agent guidance/spec/tests | `command_playbook/provenance-forensics-guide.md`, `agent/agent-output-declaration`, `agent/delegated-work-units`, `agent/work-unit-provenance-gate`, recovery/projection/submit/e2e tests | Keep direct current-marked recovery, late-submit, and supersession characterization before selecting an old-input policy. |

## C6c: Missing Actor Provenance

| Reader class | Current surface | Consequence / disposition |
| --- | --- | --- |
| Current writer | `work-unit-lifecycle.mjs`, `work-unit-envelope.mjs` | New claim creates actor v1 and exact delegated/fallback observation. Protected current writer. |
| Schema projection | `schema/contracts/work-unit.mjs` | `LegacyActorExecutionSchema` turns an absent old actor into `legacy_unrecorded`, unknown observation, and `legacy_compatibility`; it never invents a real actor. C6c candidate reader. |
| Submit/validation | `work-unit-submit.mjs`, `work-unit-validation.mjs`, `work-unit-candidate-projection.mjs` | New claims require actor identity binding; old records can only take the explicit unknown projection. |
| Inspection/disposition | `work-unit-attempt-disposition.mjs`, `work-unit-inspect.mjs` | Inspect and nearest-action projections expose `legacy_unrecorded` rather than `delegated_subagent` or `phase_agent_fallback`. |
| Gate/provenance | `helpers/gate-helpers-provenance.mjs` | Current Gate evidence keeps actor class/provenance distinct from liveness or host inference. |
| Agent guidance/spec/tests | `COMMANDS.md`, `setup-real-subagents.md`, wave phase docs, `shared-subagent-protocol.md`, `agent/delegated-work-units`, `agent/subagent-runtime-logging`, actor/submit/Gate/integration tests | Current actor-v1 path is protected; C6c alone owns the missing-actor treatment. |

## C6d: Transaction v1 Journal

| Reader class | Current surface | Consequence / disposition |
| --- | --- | --- |
| Current writer | `work-unit-transaction.mjs`, `work-unit-index.mjs` | New mutation writes only v2 journal, lock owner, before-image proof, and legal state transitions. Protected current writer. |
| Schema/read admission | `schema/contracts/work-unit-transaction.mjs`, `schema/index.mjs` | The union parses v1/v2 so a v1 journal can be classified rather than ignored. C6d candidate reader. |
| Mutation safety | `work-unit-transaction.mjs`, `work-unit-submit-integrity.mjs`, `work-unit-timeout-preflight.mjs` | A non-committed v1 is an explicit `suspect_transaction` blocker. Deleting its parser without a raw-shape scan would permit unsafe mutation. |
| Recovery | `work-unit-transaction.mjs`, `cli/operate-work-unit.mjs` | `recover-transaction` accepts proof-complete v2 only; v1 remains non-recoverable and fails closed. |
| Inspection/Gate projection | `work-unit-inspect.mjs`, `work-unit-attempt-disposition.mjs`, normalized submitted-ledger/Gate readers | Old unresolved state remains visible in inspection and cannot masquerade as a busy/current v2 transaction. |
| Historical acceptance evidence | `work-unit-supersession.mjs`, declaration recovery paths | A committed v1 journal may supply original-submit evidence for historical predecessor validation and supersession; this is distinct from mutation recovery. |
| Agent guidance/spec/tests | `COMMANDS.md`, CLI/provenance/playbook guidance, wave phase docs, `agent/delegated-work-units`, transaction/recovery/CLI/e2e tests | Current v2 locking and rollback must be characterized independently before a v1 reader decision. |

## Closure Results

- Every reader is classified as a current writer, active mutation/recovery,
  provenance/Gate, inspection/diagnostic, guidance/spec, or focused test.
- `legacy_non_work_unit_rows` is retained in the C6b safety path; it is not a
  fifth cleanup candidate.
- No C6 card may use a shared "remove all historic work units" proposal. After
  the Global Coverage Gate, the user chooses C6a, then C6b, C6c, and C6d one at
  a time.

