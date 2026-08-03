## Context

See `proposal.md` for the motivation. The direct source of record for normal
DeepSeek/Claude child environment construction is
`DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`; it currently clears inherited
tool-discovery configuration and then writes `ENABLE_TOOL_SEARCH=false`. The
separate iterative Subject runner invokes that launcher but also supplies a
tool-owned private settings JSON. Its existing `v1` settings file is immutable on
reuse, so a source-only literal change would leave an already-created `false` value
active for case-owned Subjects.

The selected adapter contract already defines the semantic operation and the existing
profile/Gate path. This change changes no state, projection, Gate, or reader-facing
workflow concept. Its bounded configuration fact answers only whether the selected
runtime can be offered the declared tool surface; the active bundle's retained Subject
trace remains the authority for callable search/fetch and available access.

## Goals / Non-Goals

**Goals:**

- Make `ENABLE_TOOL_SEARCH=true` a fixed, isolated launcher configuration across
  direct and supervised Claude children.
- Give independent Subjects a fresh, tool-owned settings identity that cannot reuse
  the pre-change `v1` disabled setting.
- Prove configuration transport deterministically, then seek one fresh explicit
  assurance-scoped provider observation without upgrading historical results.

**Non-Goals:**

- Adding a provider registry, fallback, capability cache, second Gate, retry,
  permission bypass, or environment-variable runtime state.
- Claiming that a visible tool name proves a callable search/fetch result, content,
  or an available profile observation.
- Rewriting `v1` settings, a retained experiment bundle, native outcome, health
  report, or run-profile policy.

## Decisions

### D1. Keep tool discovery a fixed value in the shared launcher boundary

`buildChildEnv` will continue to remove inherited `ENABLE_TOOL_SEARCH`, reject it in
caller extras, and set the final value itself. The only semantic delta is `false` to
`true`. This preserves provider isolation and means neither a shell nor Supervisor
can silently select a different tool-discovery policy.

Using caller-controlled extra env was rejected because it makes the selected adapter
surface vary across invocations. Adding a host capability checker was rejected because
the real Subject probe and existing Gate already own the only useful availability
answer. This is a net simplification: one direct config fact replaces a permanently
contradictory adapter declaration without adding a new controller or verdict.

### D2. Version the private Subject settings identity instead of rewriting `v1`

The Subject runner will move from its private `...-v1.settings.json` identity to a
new `...-v2.settings.json` identity and create it atomically with its existing mode
and directory protections. The new content will set `ENABLE_TOOL_SEARCH=true`; the
old file remains untouched and is no longer selected by the runner. On reuse, the
runner will parse the v2 file and fail closed unless its owned setting remains true.

Mutating `v1` on every launch was rejected because it turns an existing private file
into an implicit migration target and makes rollback ambiguous. Refactoring the
settings builder into the shared launcher was rejected because its Subject-specific
aliases and settings-file transport are a separate execution boundary; a one-line
fixed-value alignment plus versioned identity is the smaller change.

### D3. Separate deterministic configuration proof from provider evidence

The fake-Claude launcher integration test will assert that inherited/caller attempts
to disable tool discovery do not survive and that the final child receives `true`.
The Subject runner contract test will bind the new `v2` identity and enabled value to
the selected generic invocation. These are deterministic contracts only.

The existing case-115 Markdown playbook remains the agent-flow proof asset. Its
existing one-search, at-most-three-candidate, native-first/same-URL fallback boundary
is already the accepted `REA-002` semantic contract and remains unchanged. The
verification uses the existing `assurance` profile with an explicit one-case scope,
so the selector confirms the declared case under a fixed duration/budget envelope
without rotating through unrelated discovery candidates. Its retained trace must still
show a real `WebSearch`, a returned eligible URL, and same-URL native `WebFetch` or
the already permitted exact fallback before any available claim can pass. The Agent
owns that ordinary probe; the Engine owns native completion and Gate verdict; the
user's earlier authorization covers this mechanical repair and bounded execution but
does not turn configuration into provider proof.

## Risks / Trade-offs

- [Dynamic discovery exposes a name but the provider still cannot execute it] ->
  Preserve `surface_absent` or `permission_required` and record the available-path
  claim as `NOT_RUN`; do not add a fallback or retry loop.
- [An existing `v2` private file is malformed or disables discovery] -> Retain the
  runner's parse/fail-closed behavior rather than silently replacing user-visible
  private bytes.
- [The explicit assurance scope cannot select case-115 under its declared bounds] ->
  Record the available-path claim as `NOT_RUN` and stop; do not fall back to discovery,
  widen the envelope, or retry.

## Migration Plan

1. Update the shared fixed environment value and the Subject settings identity/content.
2. Update focused deterministic tests and release projections for `v0.68`.
3. Run one current bounded `assurance` preflight scoped explicitly to case-115, then
   exactly that one selected real slice; inspect native, health, and Subject evidence
   before marking the agent-flow claim. A terminal result ends this change's runtime
   observation; no discovery queue progression or automatic retry is authorized.
4. Rollback restores the prior launcher behavior and Subject `v1` identity in source;
   the untouched private `v1` settings remain available and no bundle migration is
   required.
