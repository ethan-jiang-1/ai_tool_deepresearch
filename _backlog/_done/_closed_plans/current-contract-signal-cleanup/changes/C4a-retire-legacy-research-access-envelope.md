# C4a: Retire Legacy `research_access` Envelope

> Candidate change: `retire-legacy-research-access-envelope`
>
> Status: governed-archived as `2026-08-13-retire-legacy-research-access-envelope` (dashboard item 06)
>
> Risk: L3

## One question

Can the current profile contract reject the old URL/fetch/search/access-boundary
envelope while keeping the current HITL1 direct-sample observation model intact?

## Verified current versus legacy shapes before item 06

Current states are all intentional and must remain legal:

| Shape | Role |
|---|---|
| `{ status: unprobed }` | current pre-HITL1 state written by the new profile template |
| `available` + complete `sample_observations` | current direct-sample terminal observation |
| `unavailable` + complete `sample_observations` + reason | current direct-sample terminal observation |

The legacy branch was a different envelope: `available` / `unavailable` plus
URL, fetch outcome, search/fetch surface, candidate metadata, and optional
`access_boundary`. Before item 06, `ProfileSchema` accepted both families; this
paragraph records the removed compatibility boundary, not the current contract.

HITL1 is the direct semantic consumer. Its specialized adapter feedback reads a
schema-validated legacy `access_boundary`; the selected research-access adapter
itself is still current executor-scoped canary metadata and must not be deleted
because it contains the word "legacy" in a comment. `apply-research-style` does
not own this field; it passively preserves it while writing style parameters.

The current writer has no legacy branch: the profile template writes only
`unprobed`, and the HITL1 Phase writes only one complete direct-sample result.
`validate-bundle`, Setup, rerun-ready, and post-final recovery parse the shared
profile schema, so removal makes historical envelopes invalid at those general
boundaries too. They do not otherwise interpret URL/fetch/boundary fields.

## Archived current-only result

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
| A. Keep field optional globally; HITL1 requires a recorded current observation when it needs one (confirmed) | Preserves current generic profile parsing and pre-HITL lifecycle; avoids broad mutation/read failures | Some non-HITL profile reads still accept absence, as they do today |
| B. Make field globally required | Every profile reader/mutator rejects absence immediately | Wider breakage surface; turns a legacy cleanup into a new global lifecycle invariant |

The user confirmed **A** on 2026-08-13. It removes the old shape without
smuggling in a new global state requirement: absence remains schema-valid
outside HITL1, while HITL1 continues to reject it through its existing
recorded-observation rule.

## Archived effect and side effects

- Old profile envelopes no longer pass schema validation or reach the special
  access-boundary routing path.
- A historical bundle with that envelope cannot pass current HITL1 without a
  new current direct-sample record. Humans can still inspect its YAML.
- The old adapter-specific owner hint disappears with the positive legacy
  branch. The replacement must be one owned rejection result, not a generic
  YAML parser error or a fabricated direct observation.
- Current `unavailable` stays meaningful: it is not an old format merely
  because the word appears in both schemas.

## Rejection-owner decision (confirmed)

The user confirmed that a retired envelope SHALL reuse the existing
`ProfileSchema` rejection boundary, not add an
`unsupported_current_profile_contract` taxonomy.

- HITL1 exposes its existing `profile_schema_valid` root with its existing
  `missing_contract` repair semantics and suppresses later field rules.
- Setup, rerun-ready, post-final recovery, and `validate-bundle` retain their
  existing shared profile-schema boundaries; they do not classify or migrate an
  old envelope specially.
- No reader keeps an envelope detector, no migration/upgrade is added, and no
  current direct observation is inferred from old URL, fetch, reason, or
  boundary data.

This is the shortest honest loop: the Schema is the Source of Record for the
current shape, while the Agent uses the owning HITL/profile flow to create a
new observation when appropriate.

## Protected current behavior

- Direct sample IDs, source groups, outcomes, and `unprobed` state.
- The selected host adapter's current canary identity and ordinary permission
  protections.
- Style projection writes that preserve unrelated profile facts.

## Proposal gate

- [x] Current/legacy profile shapes distinguished.
- [x] Producer/reader trace mapped: only the current template/HITL1 write the
  field; HITL1 is the legacy-envelope semantic reader; generic validators are
  shared rejection consumers.
- [x] Current status values identified as protected.
- [x] User selected A: `research_access` remains globally optional; only HITL1
  rejects absence when a recorded current observation is required.
- [x] User selected the existing `ProfileSchema` boundary: HITL1 reuses
  `profile_schema_valid` / `missing_contract`; shared readers fail only through
  their existing schema boundaries, with no legacy-specific taxonomy or reader.
- [x] Current direct-sample preservation, absent/unprobed failure, adapter
  boundary, and style-preservation evidence passed: 64 focused tests, 0 fail.
- [x] Proposal `retire-legacy-research-access-envelope` specifies one schema-root
  legacy rejection boundary per affected reader class and removes all positive
  legacy fixtures/tests/guidance together; strict OpenSpec, requirement registry,
  capability discovery, verification routing, and semantic closure plan-mode
  validation passed on 2026-08-13.

## Verification route used

```bash
node --test tests/schema/contracts/profile.test.mjs \
  tests/integration/cli/check-gate-hitl1-recorded.test.mjs \
  tests/integration/cli/hitl1-research-access-adapter.test.mjs \
  tests/integration/cli/apply-research-style.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

Apply, accepted-spec sync, selected deterministic verification, closeout review,
and governed archive completed on 2026-08-13.
