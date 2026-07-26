## Why

The repository-wide OpenSpec validation is blocked by two retired capability
specifications: one retired requirement lacks mandatory wording and the other
is an empty tombstone. Neither represents active runtime behavior, but both
must remain valid, reviewable records of retired requirement IDs.

## What Changes

- State the retired `bundle-start-from-here` stop-authority boundary using a
  valid non-behavioral SHALL requirement.
- Replace the empty `gate-content-dedup` tombstone with one valid requirement
  that preserves the retirement boundary for GAC-001 through GAC-009.
- Add only focused spec-validation coverage; do not restore either retired
  capability, add a runtime check, or alter production guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bundle-start-from-here`: make its retired stop-authorization requirement
  valid without restoring legacy authority.
- `gate-content-dedup`: make its retired capability tombstone a valid,
  traceable requirement without recreating content deduplication behavior.

## Impact

Only two main OpenSpec specifications and focused validation are affected. No
framework code, runtime state, dependency, version, or user/Agent workflow
changes.
