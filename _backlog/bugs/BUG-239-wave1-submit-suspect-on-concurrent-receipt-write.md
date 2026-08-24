# BUG-239: Independent Wave1 receipt append turns another submit into a suspect transaction

- **Severity:** P2 (recoverable lifecycle interruption that blocks inspection and ledger validation; no data loss was observed).
- **Observed:** 2026-08-24, real run `dpt_rb_ai-coding-evolution`, Wave1.
- **Affected identities:** submitter `wu-w1-b000-deep-i0002` / queue item `wave1-source-02`; independent receipt writer `wu-w1-b000-deep-i0001` / queue item `wave1-source-01`; failed transaction `tx-1787569304825-9e469a35`.
- **Owner hypothesis:** work-unit transaction integrity boundary in `engine/work-unit-transaction.mjs`, together with submit mutation-target declaration in `engine/work-unit-submit.mjs`.
- **Classification confidence:** high for the observed false-positive isolation failure; medium for the final implementation shape (narrow the comparison surface versus serialize receipt writes) until a disposable concurrent fixture establishes the intended contract.

## Context

Wave1 legitimately runs delegated work units concurrently. Each actor owns its own `runtime-receipt.jsonl`; a submit transaction owns its target work unit’s result/receipt/status plus shared queue, index, and output ledger mutations.

The transaction helper snapshots the *entire* work-unit authority surface (`_work_units/**`) and the root output-declaration ledger to find undeclared mutations. Submit declares only its own receipt as a mutable target. Consequently, a concurrent append to another still-claimed work unit’s receipt appears after the snapshot as an undeclared mutation in the submitting transaction, even though that other receipt belongs to a separate actor and is not a mutation made by the submit callback.

## Preconditions

- Two independent Wave1 work units are claimed and remain valid, with distinct queue-item and work-unit identities.
- Worker A can append a normal runtime receipt to its own `runtime-receipt.jsonl` while worker B enters normal `operate-work-unit submit`.
- Worker B’s candidate result otherwise passes normal submit validation.

## Observed Reproduction

1. Batch claim produced three delegated Wave1 work units. The relevant claims are recorded at `2026-08-24T10:58:19.614Z` (`i0001`) and `2026-08-24T10:58:19.653Z` (`i0002`).
2. While `wu-w1-b000-deep-i0001` was appending its own receipt, submit the valid result for `wu-w1-b000-deep-i0002`:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs submit \
  dpt_rb_ai-coding-evolution \
  --work-id wu-w1-b000-deep-i0002 \
  --result dpt_rb_ai-coding-evolution/_work_units/wave1/wu-w1-b000-deep-i0002/result.json
```

3. The submit callback first writes its declaration and submitted event, then transaction integrity comparison sees the unrelated receipt change.

**Actual trace:**

```json
{
  "event": "work_unit_transaction_failed",
  "tx_id": "tx-1787569304825-9e469a35",
  "operation": "submit_work_unit",
  "disposition": "suspect",
  "callback_stopped": true,
  "rollback_restored": false,
  "reason": "transaction tx-1787569304825-9e469a35 mutated undeclared targets: _work_units/wave1/wu-w1-b000-deep-i0001/runtime-receipt.jsonl"
}
```

The immediate `operate-work-unit inspect` then reported both an unlocked unresolved suspect journal and an invalid work-unit ledger because of that same transaction.

## Expected Behavior

An unrelated, legal receipt append must not cause worker B’s submit to be classified as `suspect`.

The final implementation may choose either of two safe outcomes:

- serialize the conflicting operation and return a normal structured `busy`/retryable result before B mutates state; or
- keep concurrent receipts outside B’s undeclared-mutation comparison while preserving checks for every actual target of B’s submit.

In neither case should an independent receipt write make a valid B submit globally invalidate work-unit inspection/ledger validation or require proof-limited recovery.

## Evidence

- Real trace: `dpt_rb_ai-coding-evolution/rb_trace.jsonl`, events at 2026-08-24T11:01:44.910Z--11:01:51.033Z. It records B’s append/submitted events, the suspect failure, then three inspection diagnostics.
- The failure names A’s exact receipt path, not a B target or a shared authority file.
- Recovery and successful retry are both in the trace: after recovery, `wu-w1-b000-deep-i0002` submits successfully in `tx-1787569330601-66b49ba4` at 2026-08-24T11:02:11.118Z, with the same result hash.
- `engine/work-unit-transaction.mjs:154-188` defines the broad comparison surface; lines 565-583 compare changed files against only declared mutation targets.
- `engine/work-unit-submit.mjs:2270-2283` declares B’s result, B’s receipt/status, cache pages, ledger, index, and queue, but cannot declare A’s independently owned receipt.

## Impact

- A normal concurrent delegated execution can temporarily halt Wave1 despite valid work and a recoverable journal.
- Inspection and ledger validity become blocked globally, which can prevent downstream convergence or a phase gate from being evaluated.
- The Phase Agent must distinguish a real integrity incident from an isolation false positive, run recovery, and retry a submit that had already produced its valid result.
- The current trace proves recovery was possible here; it does not make the interruption benign for long-running or highly parallel runs.

## Recovery Used In This Run

The unlocked v2 journal supplied a legal recovery route. The Phase Agent did not hand-edit transaction, receipt, ledger, queue, index, or lock state:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction \
  dpt_rb_ai-coding-evolution \
  --tx-id tx-1787569304825-9e469a35
```

After recovery, it reran the original submit for `wu-w1-b000-deep-i0002`, which committed as `tx-1787569330601-66b49ba4`.

## Proposed Remediation Boundary

**In scope for a future OpenSpec change**

- Define the concurrency/isolation contract for runtime receipt writes versus submit transactions.
- Add a deterministic fixture that coordinates two independent claimed Wave1 work units: append only A’s receipt between B’s before/after transaction snapshots.
- Adjust transaction comparison or operation serialization so this fixture yields a successful submit or a normal retryable contention result, never `suspect` solely because of A’s receipt.
- Preserve recovery behavior for genuine undeclared mutations and preserve the existing global lock/journal integrity guarantees.

**Explicit non-goals**

- Do not suppress undeclared-mutation detection globally.
- Do not treat arbitrary changes under `_work_units/**` as safe merely because a run uses sub-agents.
- Do not manually delete a lock/journal or rewrite A/B receipts, ledger, index, status, queue, or trace to clear the symptom.

## Acceptance Criteria

- A deterministic integration test creates the exact two-worker interleaving above and proves that A’s receipt append cannot make B’s transaction `suspect`.
- The accepted result is either B submit succeeds or B receives a structured retryable contention result before irreversible submit mutations; its contract is documented.
- `operate-work-unit inspect` stays valid after the interleaving, absent a genuine corruption.
- A real undeclared mutation to a protected target still produces `suspect` and retains the proof-bounded `recover-transaction` path.
- The regression test exercises the actual transaction helper rather than only asserting post-hoc file content.
