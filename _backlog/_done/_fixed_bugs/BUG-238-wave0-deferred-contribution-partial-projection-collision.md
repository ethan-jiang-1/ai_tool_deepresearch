# BUG-238: Wave0 deferred contribution has an undocumented all-or-nothing precondition

- **Severity:** P2 (documentation/operation-contract clarity; no authority loss or corrupt state observed).
- **Observed:** 2026-08-24, real run `dpt_rb_ai-coding-evolution`, Wave0.
- **Affected identities:** topic `02_models-products-events-ecosystem`; submitted contribution `wu-w0-b000-src-i0002`; persisted coordinate `wu-w0-b000-src-i0002/1` and its still-unprojected sibling identities.
- **Owner hypothesis:** `command_playbook/operate-topic-state.md` and Wave0 phase guidance. The writer's non-overwrite behavior is intentional and already regression-tested.
- **Classification confidence:** high. The implementation, an existing integration test, and the active-bug index agree that the remaining defect is playbook DX, not an Engine semantic defect.

## Context

Wave0 permits two legal ways to project submitted source contribution identities into a seed:

1. an explicit entry for one exact `<work_id>/<ordinal>` with a materialized consumer reference; or
2. a Wave0-only `deferred_contribution` selector for an allowed limitation outcome.

The playbook says that the deferred form derives "every currently unprojected" identity. A Phase Agent therefore has a reasonable reading that it can first materialize one strong source explicitly, then defer only the remaining identities from that same submitted contribution.

That is not the writer's actual contract. The selector expands the complete contribution before it tests existing projections. Every selected identity must either be unprojected or already contain an *equivalent* deferred projection. A materialized, explicit entry is deliberately a conflicting disposition, even when other ordinals remain unprojected.

## Preconditions

- The bundle is in the legal Wave0 `wave_projection/apply_seed_projection` window.
- `wu-w0-b000-src-i0002` is a retained submitted Wave0 contribution for the target topic and owns more than one exact source identity.
- At least one identity from that work ID, specifically `/1`, has already been committed as an explicit materialized projection.
- At least one sibling identity from the same contribution is still unprojected.

## Observed Reproduction

1. Inspect Wave0 output to obtain the authoritative work ID and ordinal interval for `wu-w0-b000-src-i0002`.
2. Apply a legal explicit `wave0_evidence` packet for `wu-w0-b000-src-i0002/1`.
3. While the sibling ordinal(s) are still absent, apply this otherwise valid deferred selector:

```json
{
  "context": "wave_projection",
  "action": "apply_seed_projection",
  "topic_uid": "<current topic uid>",
  "wave": "wave0",
  "updates": [{
    "slot_id": "wave0_evidence",
    "deferred_contribution": {
      "source_identity": {
        "kind": "submitted_work",
        "work_id": "wu-w0-b000-src-i0002"
      },
      "evidence_meaning": "<allowed limitation meaning>",
      "next_hop": "limitation: <concrete next research hop>"
    }
  }]
}
```

4. Run the ordinary `operate-topic-state apply` command with that retained packet.

**Actual:** the writer rejects the whole packet with
`projection_deferred_contribution_collision`, naming
`seed_topics/02_models-products-events-ecosystem.md#wu-w0-b000-src-i0002/1`:

```text
<entry_id> already has a different persisted Wave0 projection disposition;
contribution-scoped deferred input cannot overwrite it.
```

No prepared workspace or partial seed mutation is created. The engine’s existing integration test reproduces the same shape: explicit materialization followed by deferred selector is rejected and the seed remains byte-for-byte unchanged.

## Expected Contract And Why The Current Text Misleads

The desired behavior is **not** to let a deferred selector overwrite an explicit materialization. That would destroy a useful atomicity and provenance boundary.

The expected playbook contract is instead one of the following, stated explicitly before the command is offered:

- a contribution-wide deferred selector is available only when every selected identity is unprojected, or already has the same deferred disposition; or
- if any identity has a different persisted disposition, use explicit entries only for the remaining authoritative ordinals, each with its own legal projection basis.

Current prose in `operate-topic-state.md` says the writer "derives every currently unprojected" identity, and `phase-wave0.md` repeats "expands currently unprojected exact identities." Both omit the collision precondition and recovery choice. This is the source of the operational surprise.

## Evidence

- Submission authority: `dpt_rb_ai-coding-evolution/rb_trace.jsonl`, events at 2026-08-24T07:04:41.836Z and 07:10:46.666Z, which claim and submit `wu-w0-b000-src-i0002`.
- Writer behavior: `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs:1273-1348`. It generates all selected candidates, then rejects any existing non-equivalent disposition at lines 1327-1336 before appending only missing entries.
- Conflicting documentation: `DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md:96-128` and `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md:239-267`.
- Existing intentional behavior test: `tests/integration/cli/operate-topic-state-projection.test.mjs:487-501`, `rejects a deferred contribution that would overwrite a materialized identity`.

## Impact

- A Phase Agent can follow the plain-language reading, receive a blocking collision, and have to inspect implementation or discover the hidden all-or-nothing rule by trial.
- The documented deferred path cannot finish a partially explicit contribution; the legal workaround is more verbose explicit per-ordinal projection for the remainder.
- The system remains safe: no seed, source, ledger, receipt, trace, or existing materialized reference may be hand-edited to bypass the collision.

## Recovery Used In This Run

Do not retry the same deferred selector. Retain the already materialized `/1` projection and apply explicit, authoritative entries for each remaining ordinal, then rerun the normal Wave0 inspect. The selector is suitable only before a contribution has a different persisted disposition, or for an equivalent deferred replay.

## Proposed Remediation Boundary

**In scope for a future OpenSpec change**

- Clarify the precondition and non-overwrite rationale in the operate-topic-state playbook and Wave0 phase instructions.
- Make the blocking feedback, or immediately adjacent command guidance, name the direct legal recovery: explicit packets for the remaining ordinals.
- Add a documentation/contract regression that covers partial explicit projection followed by deferred selector and asserts the prescribed recovery guidance.

**Explicit non-goals**

- Do not change `expandWave0DeferredContribution` to overwrite explicit projections.
- Do not silently convert the selector into a subset operation or infer which existing disposition the caller wants to preserve.
- Do not allow raw seed/index/ledger/receipt/trace edits as a repair path.

## Acceptance Criteria

- A reader can determine, without source inspection, that `deferred_contribution` is all-or-nothing with respect to *disposition compatibility*, not merely the set of missing ordinals.
- The docs state the exact condition: every selected identity is unprojected or already an equivalent deferred entry.
- The docs direct a mixed contribution to explicit remaining-ordinal packets and the normal inspect rerun.
- The existing non-overwrite integration test remains green; a focused doc/contract test fails if this prerequisite or repair path is removed.
