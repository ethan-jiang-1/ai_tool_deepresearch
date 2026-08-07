## Context

See `proposal.md` for the native failure. Case 225 has one Engine-owned Queue
demand (`case-225-primary-1`) and one resulting work-unit record. Its Subject
is asked to write two case-local path-only indexes after the child and Phase
work complete. Those files are retained evidence locators, but no schema or
literal key protocol currently constrains their Agent-produced shape.

## Goals / Non-Goals

**Goals:**

- Make the two Subject-written index shapes explicit enough for the Subject and
  observer to agree before a native run.
- Bind observer checks to the single Engine-owned work record by queue item,
  then verify each retained index agrees with that identity.
- Preserve strict native PASS/FAIL/NOT_RUN behavior with no summary-key alias.

**Non-Goals:**

- Do not introduce a product schema, a new Engine command, an additional
  lifecycle state, or a second verdict path.
- Do not alter Queue claim/submit, actor preflight/policy, child availability,
  Phase materialization, health, or native finalization.

## Decisions

### 1. Put exact keys in the existing Subject instruction

The existing Case 225 message will state the required literal key sets:

```text
case-225-child-evidence.json:
  work_id, queue_item_id, task_ref, beacon_ref, result_ref,
  receipt_ref, schema_ref, required_outputs, cache_trail_refs,
  source_urls, accepted_source_urls

case-225-phase-closeout.json:
  submitted_work_id, queue_item_id, materialized_reference_refs,
  index_ref, depth_review_ref, seed_ref, inspect_ref
```

The files remain Agent-written path indexes. This is an Agent-facing Markdown
contract, not a new framework schema or product-level projection.

**Alternative considered:** accept `claimed_work_id` and
`materialized_references` as observer aliases. Rejected because aliases would
hide the producer/reader disagreement that this case must expose.

### 2. Anchor observer identity in the Engine index

Step 3 will find the work record by the canonical queue item ID. It will then
require `child.work_id`, `child.queue_item_id`, and
`closeout.submitted_work_id` to agree with that Engine work ID. Ledger and
actor checks use the Engine record, never `child.work_id` as their primary
lookup key.

```text
_work_units/_index.json queue_item_id
  -> Engine work_id / actor_execution / submitted status
  -> child and closeout index equality checks
  -> existing path, ledger, and native checks
```

The durable reader question has a normal stopping point: equality proves the
case-local indexes refer to the one Engine work unit; inequality, absence, or
malformation remains a case failure. No named state, projection, command, or
reader-facing system concept is introduced, so the semantic-precision and
control-shape guidance requires no new layer.

**Alternative considered:** derive every closeout reference from filesystem
enumeration or the ledger. Rejected because that would bypass the Phase-owned
index evidence the case is designed to retain.

### 3. Preserve the existing proof boundary

The focused integration test proves only that the Subject instruction and
observer retain the direct-fact contract. The exact registered Case 225 native
run proves either a real available-child PASS, a real unavailable-child
NOT_RUN, or another retained native failure. The user authorizes mechanical
execution; the Playbook/Subject Agents perform the task; Engine and native
completion remain verdict authorities.

### 4. Quarantine supersedes future native execution

The user-directed `exp_extrem_slow/` quarantine supersedes every earlier
reference in this design to a further native run. The explicit key and
Engine-identity repairs remain as static historical work, while post-repair
native completion remains unobserved. A cancelled run is not evidence, and no
fixture result can close that gap. Any future proof requires a separately
proposed refactor, runnable relocation, manifest registration, and new native
evidence.

## Risks / Trade-offs

- [A Subject still writes a wrong key] -> strict observer failure exposes the
  discrepancy; it is not normalized into a false PASS.
- [A future refactor encounters an unavailable child] -> its own declared
  native `NOT_RUN` boundary remains the only terminal classification.
- [A malformed/missing Engine record] -> no marker or substitute identity is
  created; the existing failure boundary stays visible.

## Migration Plan

1. Add red static assertions for literal producer keys and Engine-anchored
   observer identity.
2. Update the Subject message and observer, then run the focused contract,
   playbook validation, and exact-case dry-run.
3. Record the missing post-repair native evidence under the quarantine and
   update the remediation tracker without overclaiming or launching the case.
4. Roll back only the prompt/observer alignment if the experimental evidence
   boundary is deliberately redesigned; no runtime migration is required.
