## Context

The case-164 integration test read the shared Subject runner as text. Its
previous end boundary was case 232, which included case 225 and made an
unscoped child-actor phrase count fail. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- Read the case-164 entry through its next runner-entry boundary.
- Assert the ordered three-message protocol and exercise its negative
  boundaries with synthetic message arrays.

**Non-Goals:**

- Change the runner, playbook, Engine, work-unit lifecycle, or native
  experiment evidence.
- Create a new reader-facing concept, state, validator, or runtime controller.

## Decisions

### Keep protocol extraction and assertions inside the existing integration test

The test-local reader finds case 164, stops at the next entry, extracts the
ordered `messages` array, and passes that array to a pure assertion. The runner
configuration remains the direct Source of Record; the test reports the one
actionable mismatch without creating production parsing behavior.

The alternative, a reusable runner parser or a phrase count over a larger text
slice, would add either unnecessary production surface or another
wording-sensitive cross-case failure mode.

### Prove malformed protocols with synthetic arrays

Synthetic arrays isolate missing, misplaced, and incorrectly counted child
turns without invoking a real Agent or treating static fixtures as behavioral
evidence. The existing retained native case evidence remains authoritative for
the real-Agent claim.

The semantic-precision, control-simplification, and helper-responsibility
reviews are not applicable to a test-local reader: no named layer, control
loop, user decision, Agent authority, or Engine verdict changes.

## Risks / Trade-offs

- [The source reader depends on the runner's object formatting] -> It targets
  the direct case-entry and `messages` layout, so a formatting or protocol
  change fails the focused integration test rather than silently widening the
  read boundary.
- [Static verification cannot prove a real execution] -> The test claims only
  the configured protocol; native experiment evidence retains execution
  authority.
