## Context

See [proposal.md](proposal.md) for the motivation. The accepted HITL1 contract already
owns a bounded probe, one direct `rb_profile.yaml#/research_access` observation, and
the fail-closed `research_access_available` Gate. It also already allows Node fetch
and bounded curl only after a real search result. BUG-143 establishes that the missing
piece is neither a new Gate nor a weaker schema: it is the absent, callable semantic
search boundary for the current host.

The direct Source of Record remains split by fact: the selected adapter contract owns
what the Agent may invoke; retained provider-scoped execution evidence supports, but
does not replace, the Agent's external-behavior claim; the profile owns the bounded
result recorded for the current run; and the existing Gate owns advancement. No one
source implies the others.

## Goals / Non-Goals

**Goals:**

- Give the HITL1 Agent one declared adapter contract that separates search from fetch
  and binds a fetch target to the URL returned by that search.
- Preserve one short loop: adapter contract -> bounded Agent probe -> direct profile
  observation -> existing HITL1 Gate -> same-probe feedback on failure.
- Make the smallest no-path boundary discoverable without treating user semantic
  confirmation, launcher configuration, or a shell binary as authority.

**Non-Goals:**

- Adding a provider selection mechanism: the user-authorized selection of the
  existing Claude CLI / DeepSeek-compatible host is recorded in
  [provider-decision.md](provider-decision.md).
- A multi-provider registry, provider fallback chain, capability cache, background
  watcher, generic retry service, scheduler, or another lifecycle transition.
- Engine-owned research, provider credential storage in bundles, or deterministic
  proof of an external tool call.

## Decisions

### D1. A single versioned adapter contract is the semantic boundary

Implementation will add one Agent-readable contract beside the selected host adapter
under `DPT_FRAMEWORK/host_tools/`. It will declare exactly: adapter identity, host
owner, generic non-bypass launcher invocation, legal Agent-native search operation,
legal same-URL fetch operation, output facts, and the two unavailable boundaries. Any
thin host bridge may launch or
normalize the selected native Agent runtime, but it SHALL NOT select a query, choose
candidates, execute a search/fetch sequence in place of that Agent, mutate a bundle,
create retries, or add/pass a permission-bypass option.

The contract gives the Phase Agent a precise stopping point: it can determine whether
there is one authorized probe to run, or name the absent-surface/permission fact and
stop. It does not create a runtime `capability` state, a provider profile, or a new
reader-facing lifecycle projection.

Alternatives rejected:

- Inferring an adapter from executable names, environment variables, or launcher
  `--check`: these provide partial host facts and cannot establish callable search.
- A provider registry/config matrix: it creates selection, precedence, stale-state,
  and retry semantics that this one current adapter does not need.
- Treating every external URL fetcher as search: it loses the candidate provenance
  required to distinguish a real search result from a constructed URL.

### D2. The adapter returns ephemeral probe facts; the existing profile remains the run record

The Agent invokes the declared operation and consumes its structured result in the
same turn. It records only the existing `research_access` direct facts through the
current profile-writing route: status, timestamp, final candidate metadata, result
URL when applicable, outcome, reason, and optional surface labels. Raw query,
candidate list, page content, credentials, and complete provider transcript remain
outside the bundle's evidence and control state.

The Engine validates only that record's schema and keeps the existing Gate rule. It
does not authenticate the provider invocation or write an available observation on
the Agent's behalf. Production HITL1 retains no raw provider evidence. Only the
existing real Agent-flow experiment may retain its required Subject prompt, transcript,
and result at its experiment run root; that evidence supports one provider-scoped
operational claim, cannot prove another host, and never becomes research evidence.

### D3. Claude public tool facts establish search-to-fetch binding

The selected Claude CLI Phase Agent uses native `WebSearch` followed by native
`WebFetch` for a returned URL. The host bridge only launches that Agent runtime; it
does not perform, select, or normalize the semantic sequence. Case 115's existing
experiment-owned Subject evidence makes the binding independently observable: its
deterministic observer parses the public `WebSearch` `Links` payload, retains its
eligible returned order, and requires `research_access.result_url` to equal the
returned candidate before it accepts the corresponding native fetch or existing
same-URL curl branch.

The existing HITL1 rules still own eligibility, one search, first-three ordering,
native-first fetch, one independently permitted same-URL fallback, and early success.
The binding remains execution evidence, not a durable attempt ledger: it adds no URL
history, receipt, generalized request signature, or retry tree.

### D4. Selection is decided; host permission remains a runtime boundary

The user authorized choosing the existing concrete Claude CLI host, and that selection
and evidence form are recorded in [provider-decision.md](provider-decision.md). The
launcher is a thin host bridge, not a search controller. It configures and starts the
runtime but cannot establish that the runtime exposes or is permitted to use
`WebSearch` / `WebFetch`.

Host policy owns that permission fact at execution time. When permission is missing or
the surface is absent, the Phase Agent writes the existing honest unavailable result
with `permission_required` or `surface_absent`. Case 115 may still pass its existing
broad bounded-probe verdict for that honest branch, but `apply-evidence.md` MUST mark
this change's narrower available-path claim `NOT_RUN` unless its retained trace shows
an available same-URL branch. The Agent owns ordinary probe execution and reversible
mechanical repair; the Engine owns only schema and Gate verdicts. Selection does not
turn into a provider credential or success assertion.

The selected invocation is the generic `claude-deepseek.mjs` bridge without a
caller-supplied bypass flag. The existing Autorun-specific Headless bypass and
case-115 runner's current `--dangerously-skip-permissions` argument are not this
adapter's permission model. The apply work must align case 115 to the selected mode;
an explicit escalation is a new host/user permission decision, not an adapter fallback.

### D5. Gate feedback projects the existing root, not a new validator

`check-gate-hitl1-recorded.mjs` continues to depend on ProfileSchema and its current
field-value rule. A small feedback projection maps the existing direct unavailable
reason to the selected adapter contract, owner, and same-probe rerun. It does not add
a check type, inspect command, provider preflight, alternate Setup route, or write
path.

This is a net simplification: instead of making Agents reconstruct the missing
adapter boundary from Phase prose, launcher configuration, and a generic
`external_action` hint, one existing failing rule delivers its direct owner and one
legal next action.

## Risks / Trade-offs

- [Provider still unavailable after selection] -> Preserve the unavailable branch;
  do not add a fallback provider or automatic re-probe.
- [Provider transcript claims success without real page content] -> The adapter
  protocol requires page-content semantics and same-URL binding; any missing fact
  records unavailable, while Engine claims only schema validity.
- [Credential or probe leakage] -> Provider credentials, query, candidate list, and
  page bytes never appear in production adapter output, profile, trace, or research
  evidence. The existing agent-flow case retains only its declared Subject evidence
  at its experiment run root, under the existing experiment policy.
- [A future host needs another provider] -> It requires a new scoped OpenSpec change
  or an explicit amendment after evaluating whether a second adapter preserves the
  one-adapter model; this change does not pre-build extension machinery.

## Migration Plan

1. Add the selected adapter contract and bind it to the existing thin Claude CLI host
   bridge, then update HITL1
   guidance and Gate feedback together.
2. Add deterministic unit/integration proof for adapter result pairing, absent-surface,
   permission, and existing Gate behavior; run one provider-scoped real Agent-flow
   observation separately.
3. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` for `v0.65` only after the
   selected provider path has real evidence. Rollback removes the adapter and its
   guidance projection; existing unavailable profiles remain valid and need no
   migration.
