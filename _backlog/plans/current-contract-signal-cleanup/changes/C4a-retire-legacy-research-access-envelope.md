# C4a: Retire Legacy `research_access` Envelope

> Candidate change: `retire-legacy-research-access-envelope`
>
> Status: decision ready; no proposal created
>
> Risk: L3

## One question

Can the current profile contract reject the old URL/fetch/search/access-boundary
envelope while keeping the current HITL1 direct-sample observation model intact?

## Verified current versus legacy shapes

Current states are all intentional and must remain legal:

| Shape | Role |
|---|---|
| `{ status: unprobed }` | current pre-HITL1 state written by the new profile template |
| `available` + complete `sample_observations` | current direct-sample terminal observation |
| `unavailable` + complete `sample_observations` + reason | current direct-sample terminal observation |

The legacy branch is a different envelope: `available` / `unavailable` plus
URL, fetch outcome, search/fetch surface, candidate metadata, and optional
`access_boundary`. `ProfileSchema` currently accepts both families.

HITL1 is the direct semantic consumer. Its specialized adapter feedback reads a
schema-validated legacy `access_boundary`; the selected research-access adapter
itself is still current executor-scoped canary metadata and must not be deleted
because it contains the word "legacy" in a comment. `apply-research-style` does
not own this field; it passively preserves it while writing style parameters.

## Proposed current-only result

- Remove `LegacyResearchAccessSchema` from `ProfileSchema`.
- Retain all three current states above and their direct-sample validation.
- Replace legacy-envelope-specific HITL1 feedback with one consistent current
  contract failure for an invalid/unsupported profile shape.
- Do not infer a direct sample, convert an old record, auto-upgrade a profile,
  or invent tool/access facts from old reason text.

## The one policy decision

After the legacy union is removed, should a profile that entirely lacks
`research_access` be invalid everywhere or only fail the existing HITL1
checkpoint?

| Choice | Effect | Risk |
|---|---|---|
| A. Keep field optional globally; HITL1 requires a recorded current observation when it needs one (recommended) | Preserves current generic profile parsing and pre-HITL lifecycle; avoids broad mutation/read failures | Some non-HITL profile reads still accept absence, as they do today |
| B. Make field globally required | Every profile reader/mutator rejects absence immediately | Wider breakage surface; turns a legacy cleanup into a new global lifecycle invariant |

Recommendation: **A**. It removes the old shape without smuggling in a new
global state requirement.

## Expected effect and side effects

- Old profile envelopes no longer pass schema validation or reach the special
  access-boundary routing path.
- A historical bundle with that envelope cannot pass current HITL1 without a
  new current direct-sample record. Humans can still inspect its YAML.
- Current `unavailable` stays meaningful: it is not an old format merely
  because the word appears in both schemas.

## Protected current behavior

- Direct sample IDs, source groups, outcomes, and `unprobed` state.
- The selected host adapter's current canary identity and ordinary permission
  protections.
- Style projection writes that preserve unrelated profile facts.

## Proposal gate

- [x] Current/legacy profile shapes distinguished.
- [x] HITL1 and adapter feedback dependency mapped.
- [x] Current status values identified as protected.
- [ ] User selects A or B.
- [ ] Current direct-sample characterization and unsupported-legacy boundary tests are specified in the proposal.

## Expected verification

```bash
node --test tests/schema/contracts/profile.test.mjs \
  tests/integration/cli/check-gate-hitl1-recorded.test.mjs \
  tests/integration/cli/hitl1-research-access-adapter.test.mjs \
  tests/integration/cli/apply-research-style.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
