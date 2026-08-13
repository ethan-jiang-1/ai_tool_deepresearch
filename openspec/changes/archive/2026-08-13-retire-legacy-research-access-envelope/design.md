## Context

See [proposal.md](proposal.md). `ProfileSchema` is the direct Source of Record
for `rb_profile.yaml` shape. It currently unions three current forms with a
retired URL/fetch/search/source-class/access-boundary envelope. HITL1 is the
only semantic reader of that envelope: it asks the adapter resolver to turn a
validated boundary location into an external or Agent repair hint. Generic
validators, Setup, rerun-ready, and post-final recovery only parse the whole
profile and therefore become fail-closed consumers once the union is removed.

## Goals / Non-Goals

Goals:

- make optional `research_access` current-only without changing the legal
  absent, `unprobed`, completed `available`, or completed `unavailable` states;
- give a rejected retired envelope one existing schema root in HITL1 and no
  legacy-specific owner projection;
- remove every current positive writer, reader, fixture, test, and guidance
  path for retired envelope fields.

Non-goals:

- making `research_access` globally required;
- migrating, rewriting, upgrading, or auto-normalizing historical profiles;
- creating a new unsupported-profile code, command, adapter, profile state, or
  user decision;
- changing current direct-sample controller, selected adapter canary metadata,
  permissions, source-alignment flow, C4b topic migration, or C5 recovery
  semantics.

## Decisions

### Current shape is one optional union

`ProfileSchema` retains only these forms:

```text
research_access absent                    -> schema-valid outside HITL1
{ status: unprobed }                      -> schema-valid pre-HITL1
complete current direct-sample observation -> schema-valid completed record
old URL/fetch/.../access_boundary envelope -> schema-invalid
```

The current direct observation remains strict. Removing legacy enums/helpers
must not loosen the direct-sample field, status/content, complete-sample, or
no-request invariants.

Alternative rejected: requiring the field globally. It would turn a format
cleanup into a new lifecycle invariant and expand the failure surface of
generic profile readers without a new product decision.

### Reuse schema root; do not introduce a legacy taxonomy

HITL1 evaluates `profile_schema_valid` before its dependent access field rule.
When a retired envelope fails parsing, it returns that existing root with
`missing_contract`, masks dependent rules, and does not inspect historical
fields. The agent's legal loop is the existing profile/HITL path followed by
rerun of the same Gate.

Alternative rejected: `unsupported_current_profile_contract`. It would require
every reader to retain an envelope recognizer merely to distinguish one kind of
schema-invalid profile. That duplicates the Source of Record and preserves
legacy branching without adding a new actionable repair.

### Delete the boundary-owner resolver as a positive consumer

The selected adapter's canary identity, launcher non-bypass protection, and
current executor-neutral controller relationship remain. Only the
`access_boundary` -> owner/repair mapping and its imports/tests/guidance leave.
The adapter cannot infer a current repair from reason prose or historical fields.

### Retire legacy vocabulary with its only contract consumer

`SourceClass`, `SourceClassReachability`, `ResearchAccessBoundaryLocation`, and
`ResearchAccessBoundaryExtent` have no consumer outside the legacy ProfileSchema
branch and its barrel exports. Apply removes those declarations and exports with
that branch. Current `ResearchAccessSourceGroup`, sample ID, sample outcome, and
retrieval-surface enums remain the direct-sample vocabulary.

This is not a generic enum cleanup: it is required to ensure that source-class
and access-boundary forms cannot remain an apparently supported current schema
vocabulary after their sole contract reader is removed.

### Constitutional review

Semantic precision: readers need answer only whether a profile has a current
legal shape. A separate “legacy profile” verdict does not preserve a distinction
that changes the legal next step; schema-invalid is the normal stop.

Simple reliable control: one schema predicate replaces the schema union plus
HITL1 boundary resolver plus adapter mapping. A rejected profile reports its
earliest direct failure and returns to the same checkpoint.

Helper-oriented responsibility: the user made the compatibility policy
decision; the Agent may write an authorized current observation through the
existing HITL path; the Engine validates shape and emits the existing verdict.
No hint creates host permission, migration authority, or a new user checkpoint.

## Risks / Trade-offs

- Historical profile that used the envelope becomes invalid for every existing
  schema consumer -> explicit policy; regression tests cover HITL1, Setup,
  rerun-ready, post-final recovery, and `validate-bundle` failure boundaries.
- Removing boundary resolver could accidentally remove current canary safeguards
  -> retain its contract loading, launcher, and permission-bypass tests; delete
  only boundary-map tests and imports.
- Current `unavailable` may be mistaken for legacy -> retain direct-sample
  available/unavailable success and no-provider-diagnosis tests.
- Style writer may have preserved an old envelope -> it must no longer treat an
  invalid profile as a successful style-write input; retain only preservation of
  valid current observations.
- Current-success fixtures across downstream gates and E2E chains still write the
  retired form -> enumerate and convert them in the same Apply; a fixture may not
  keep an old envelope merely because its owning Gate does not inspect access
  fields semantically.

## Migration Plan

No automatic migration exists. Apply changes schema/guidance/tests together so
newly created bundles remain valid and old envelopes fail at their current
schema boundaries. Rollback, if required before archive, is a revert of this
single change; it does not mutate any bundle. Historical YAML remains manually
readable outside Engine operation.
