## Why

Dashboard item C8 exposed eleven current-contract alignment failures after C3,
C4a, C5a-2, and C6 completed. Three root/Harness routing assertions still
expect retired entry wording, one HITL1 hint assertion still expects the
retired `external_action` route, one reference-guidance assertion describes a
historical reader rather than the current rejection boundary, `RUN.md` omits
the current logical-actor/liveness limit, two generated-guidance fixtures lack
the complete current actor profile, one actor-delivery test still treats an
unbound legacy envelope as a success path, and one work-id fixture builds an
obsolete assignment/actor envelope. During Apply, the formerly envelope-blocked
direct-output asset also exposed one over-broad negative assertion that rejects
correct current task wording instead of only an actor choosing a contract.

The existing current contracts already decide all of these facts. Leaving the
tests and one public guidance surface behind creates false failures and makes
the historical shape look current.

## What Changes

- Update the routing, HITL1 feedback, and reference-guidance integration
  assertions to protect their existing current contracts rather than retired
  phrasing or retired success-path assumptions.
- Add the existing logical-actor boundary to `DEEP_RESEARCH_HARNESS/RUN.md`:
  `actor_execution` binds a logical attempt but is not physical-writer
  authentication or host/sub-agent liveness proof.
- Give the three positive work-unit test fixtures the complete current
  assignment/actor profile that the envelope already requires, and make the
  actor-delivery test protect rejection of an incomplete legacy envelope. Do
  not relax the envelope check or construct a legacy profile.
- Keep every target behavior and current owner unchanged: no entry fallback,
  version reader, historical reference reader, Gate repair kind, work-unit
  schema, Engine runtime, or accepted main spec is added, removed, or changed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change declares `skip_specs: true`: it only aligns Markdown/test
projections and test-owned fixture inputs with existing accepted behavior.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/run-entry` | catalog; `openspec/specs/bundle/run-entry/spec.md`; root/Harness routing docs; routing integration test | Verify-only | Existing current entry contract already owns selected-bundle routing and the no-pre-entry-research boundary. Tests must stop requiring retired wording; no route changes. |
| `agent/agent-context-routing` | catalog; `openspec/specs/agent/agent-context-routing/spec.md`; root `AGENTS.md`/`CLAUDE.md`; routing integration test | Verify-only | Root instructions already route current authority correctly. No `CONTEXT.md` or root instruction rewrite is needed. |
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md`; current HITL1 node; gate-hint integration test | Verify-only | HITL1 exposes its actual current kinds. `research_access` now has the existing bounded probe/Engine-operation path, so the stale test must not invent `external_action`. |
| `agent/delegated-work-units` | catalog; `openspec/specs/agent/delegated-work-units/spec.md`; `work-unit-lifecycle.mjs`; `work-unit-envelope.mjs`; five selected work-unit tests | Verify-only | The current envelope requires assignment v3, submission v1, actor v1, and exact `actor_execution`. Positive fixtures must provide those existing facts, while the incomplete legacy fixture must remain rejected before publication; Engine admission stays strict. |
| `governance/guidance-constitution` | catalog; `openspec/specs/governance/guidance-constitution/spec.md`; `RUN.md`; public recovery guidance test | Verify-only | Adding the already-current logical-actor/liveness limit prevents RUN.md from becoming a misleading authority projection. |
| `verification/verification-routing` | catalog; `openspec/specs/verification/verification-routing/spec.md`; selected unit and integration assets | Verify-only | The focused in-process work-id fixture remains `unit`; the seven Markdown/Engine boundary assets remain `integration`. No taxonomy or proof-permission change. |

## Semantic-Precision Reflection

The reader-facing question is narrow: “Does this current guidance or test
describe and exercise the existing current contract?” The answer remains with
the existing accepted spec and executable owner, not with a literal sentence
or fixture shape. The required distinctions are current entry versus retired
entry, a logical actor binding versus physical liveness, and current fixture
facts versus a relaxed legacy envelope. The reasoning stop is direct: once the
projection matches its owner and the focused unit/integration evidence passes, this
change adds no new state, command, reader, or behavior.

## Impact

- Target Markdown: `DEEP_RESEARCH_HARNESS/RUN.md` only.
- Target tests: six existing `tests/integration/md/*.test.mjs` assets, one
  existing `tests/integration/engine/*.test.mjs` asset, and one existing
  `tests/engine/*.test.mjs` asset.
- No dependency, API, runtime bundle, current data, schema, accepted main-spec,
  registry, or compatibility migration impact.
- The user-selected current-only policy remains unchanged. The Agent changes
  the approved projections/fixtures only after Apply authorization; the Engine
  continues to own all routing, envelope, and verdict facts.
