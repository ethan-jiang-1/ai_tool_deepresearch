# CX: Transition Boundary Review

> Status: exploration memo for review, not an accepted OpenSpec spec.
> Audience: another Agent or maintainer reviewing the workflow transition confusion.
> Context note: this complements `_backlog/trainsistion/cc_transition_systemic_analysis.md`, which contains a fuller file inventory and raw evidence snapshot.

## Why This Note Exists

The current transition confusion is real, but it is easy to misdiagnose as only a naming cleanup problem.

The visible symptoms are:

- `DPT_FRAMEWORK/workflows/transitions.chain.json` and `DPT_FRAMEWORK/workflows/transitions.fsm.json` use different keys.
- Their transition verbs differ: `passed` in chain, `success` in FSM.
- `DPT_FRAMEWORK/workflows/manifest.json` has yet another key vocabulary: `phase key`, `node`, and `gate`.
- phase node frontmatter duplicates some manifest facts.
- `rb_status.json` and `schema/contracts/gate.mjs` use underscore-style gate states and uppercase events.

The deeper issue is that the repo currently has multiple legitimate transition-like layers, all using the word `transition`, but they are not the same contract.

Before changing code or specs, reviewers should decide whether these are separate layers that need clearer naming and validation, or whether one should become canonical and generate/provide projections for the others.

## Current Working Model

There appear to be three distinct transition layers.

### 1. Workflow Node Routing Transition

This layer answers:

```text
Given a gate result, which Markdown workflow node should the Agent load next?
```

Current shape:

```text
gate_key + gate_result_state -> next_md_node_file_ref
```

Example:

```text
instantiation-complete + passed -> phases/phase-hitl1.md
```

Current surfaces:

- `DPT_FRAMEWORK/workflows/transitions.chain.json`
- `DPT_FRAMEWORK/engine/transition-chain.mjs`
- `DPT_FRAMEWORK/engine/ask-next.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs`
- gate CLI output field `check.next`

Current query shape:

```js
askNext(transitionsPath, gate, state)
```

where `gate` is a kebab-case gate key such as `wave0-complete`, and `state` is currently usually `passed` or `failed`.

This is the surface most directly connected to the current Workflow Foundation gate CLIs.

### 2. Workflow FSM Node Transition

This layer answers:

```text
Given the current node and an event/status, what is the next node?
```

Current shape:

```text
current_node_file_ref + event -> next_node_file_ref | null
```

Example:

```text
phases/phase-instantiation.md + success -> phases/phase-hitl1.md
```

Current surfaces:

- `DPT_FRAMEWORK/workflows/transitions.fsm.json`
- `DPT_FRAMEWORK/engine/transition-fsm.mjs`
- `DPT_FRAMEWORK/engine/workflow-fsm.mjs`
- `tests/engine/transition-fsm.test.mjs`
- `tests/engine/workflow-fsm.test.mjs`

Current native query shape:

```js
resolveTransition(fsm, currentNode, status)
```

or statefully:

```js
const f = createFSM(fsmDef);
f.askNext("success");
```

This layer is a general FSM engine contract. It is not currently equivalent to gate CLI routing.

### 3. Gate / Bundle Status Machine Transition

This layer answers:

```text
Given a persisted gate/status state and an event, what gate/status state follows?
```

Current shape:

```text
current_gate_state + event -> next_gate_state
```

Example:

```text
setup_ready + PASS_WAVE0 -> wave0_complete
```

Current surfaces:

- `DPT_FRAMEWORK/schema/contracts/gate.mjs`
- `DPT_FRAMEWORK/schema/contracts/status.mjs`
- `DPT_FRAMEWORK/schema/enums.mjs`
- `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl`
- `tests/schema/gate.test.mjs`
- `tests/schema/contracts.test.mjs`

This layer uses underscore-style state values such as `setup_ready` and uppercase events such as `PASS_WAVE0`. It appears to be bundle/status state, not Markdown node routing.

## Why `.fsm.json` Is Not a Transparent Replacement For `.chain.json`

The accepted `askNext()` entry point currently dispatches by filename suffix:

```js
askNext(path, gate, state)
```

For a `.chain.json`, this matches the data shape:

```text
chain[gate][state]
```

For a `.fsm.json`, the resolver expects:

```text
fsm.states[currentNode].on[event]
```

That means passing a gate key such as `instantiation-complete` into the FSM branch misses the table, because the FSM state key is `phases/phase-instantiation.md`.

Observed behavior from local inspection:

```text
askNext(transitions.chain.json, "instantiation-complete", "passed")
-> phases/phase-hitl1.md

askNext(transitions.fsm.json, "instantiation-complete", "passed")
-> null

askNext(transitions.fsm.json, "phases/phase-instantiation.md", "success")
-> phases/phase-hitl1.md
```

So `.fsm.json` is queryable, but not under the same semantic contract as `.chain.json`.

This is the central ambiguity reviewers should resolve.

## Manifest Role

`DPT_FRAMEWORK/workflows/manifest.json` currently has:

```json
{
  "phases": [
    {
      "key": "instantiation",
      "node": "phases/phase-instantiation.md",
      "gate": "instantiation-complete"
    }
  ],
  "shared": [
    "shared/shared-profile.md"
  ]
}
```

The accepted `workflow-node-contract` already frames manifest as lifecycle inventory/index, not next-node authority.

Recommended interpretation for review:

- `manifest.phases[].key` is an Agent-readable phase identifier.
- `manifest.phases[].node` is the loadable Markdown node fileRef.
- `manifest.phases[].gate` is the outgoing gate key for non-final phases.
- `manifest.shared[]` lists shared Markdown node fileRefs.
- manifest array order can describe lifecycle order for humans and consistency checks.
- manifest should not regain a `next` field.
- runtime next-node routing should not be inferred from array adjacency.

If a future change wants manifest to generate transition tables, that should be explicit generation/projection behavior, not implicit runtime routing authority.

## Phase Frontmatter Role And Current Gap

Phase node frontmatter currently carries metadata such as:

```yaml
node_type: phase
id: phase-wave0
phase: wave0
gate: wave0-complete
stop: "no"
requires:
  - shared/shared-anti-cheating-rules
suggested_context:
  - shared/shared-schemas
```

The accepted `workflow-node-contract` says the Agent should be able to determine phase, gate, and stop behavior from frontmatter.

However, `workflow-chain.mjs` currently defines:

```js
export const NodeFrontmatter = z.object({
  requires: z.array(z.string().min(1)).default([]),
});
```

Because Zod strips unknown object keys by default, parsed frontmatter returned by the loader preserves only `requires`. Fields such as `node_type`, `id`, `phase`, `gate`, `stop`, `suggested_context`, and `subagent` are not returned in the parsed frontmatter object.

This looks like a contract gap:

- If frontmatter metadata is meant only for the raw Markdown body, then the spec language should say so.
- If frontmatter metadata is meant to be parsed and returned to the Agent/controller, then `workflow-chain.mjs` needs a richer metadata schema.

This should be reviewed before any transition redesign, because transition consistency checks need parsed metadata.

## Reference Style Inconsistency

`requires` mostly uses fileRef-like shared references:

```yaml
requires:
  - shared/shared-profile
```

But some `suggested_context` entries use bare ids:

```yaml
suggested_context:
  - shared-schemas
```

Current loader resolves only `requires`, so this inconsistency has not become a runtime failure. If `suggested_context` becomes loader-resolved or consistency-checked, the repo needs one reference convention.

Likely safer convention:

```text
shared/shared-schemas
```

because it is directly loadable by the existing node fileRef mechanism after appending `.md`.

## Candidate Interpretations

### Interpretation A: Chain Is Current Canonical Gate Routing

In this interpretation:

- `transitions.chain.json` is the current Source of Record for gate result to next Markdown node.
- gate CLIs keep calling `askNext(transitionsPath, gate, passedOrFailed)`.
- `manifest.json` remains inventory/index.
- `.fsm.json` is not a production routing source unless generated from chain or explicitly queried by node path.
- FSM engine remains useful as a generic lower-level engine, but not equivalent to gate routing.

Advantages:

- Matches current gate CLI behavior.
- Matches WFF playbook wording around `check.next`.
- Keeps current OpenSpec boundary: Gate provides check/inspect/advice and next node reference; Markdown/Agent loads the returned node.
- Smallest safe cleanup scope.

Risks:

- Leaves `.fsm.json` as confusing unless moved, renamed, or documented as non-authoritative.
- Does not solve future desire for richer branching, retry, or terminal semantics.

### Interpretation B: FSM Becomes Canonical

In this interpretation:

- node path is the canonical workflow state key.
- events such as `success`, `failure`, `blocked`, or `repair` drive next node routing.
- gate CLIs would need either current-node context or a gate-to-node mapping.
- chain could be removed or generated as a projection.

Advantages:

- More expressive for branching and terminal nodes.
- `phase-final.md -> success -> null` terminal semantics are explicit.
- Aligns with a general FSM model.

Risks:

- Current gate CLIs are not shaped this way.
- `askNext(path, gate, state)` becomes the wrong API.
- Requires migration of specs, tests, playbooks, and maybe runtime status semantics.
- Could drift toward JS-owned workflow control if not carefully bounded.

### Interpretation C: Canonical Lifecycle Model Generates Views

In this interpretation:

- a single canonical lifecycle model contains phase key, node ref, gate key, gate result transitions, and possibly FSM events.
- `manifest.json`, `transitions.chain.json`, and `transitions.fsm.json` become generated or consistency-checked projections.

Advantages:

- Eliminates manual duplication.
- Makes cross-file consistency enforceable.
- Could preserve both gate routing and FSM views.

Risks:

- Introduces a new source file and generation/checking workflow.
- Larger design surface.
- Needs careful OpenSpec proposal before implementation.

## Tentative Recommendation

Do not promote FSM as canonical yet.

The safer near-term move is:

1. Treat `transitions.chain.json` as current canonical gate-to-node routing.
2. Treat `transitions.fsm.json` as non-authoritative until a change explicitly defines its production role.
3. Clarify specs so `.chain` and `.fsm` are not described as interchangeable under the same key contract.
4. Add consistency tests across manifest, phase frontmatter, shared nodes, gate definitions, and chain targets.
5. Fix or clarify `workflow-chain.mjs` frontmatter parsing so it matches `workflow-node-contract`.

This is deliberately scoped as a consistency/boundary pass, not a workflow redesign.

## Specific Review Questions

Please review these before any implementation proposal:

1. Are the three transition layers above real and intentionally separate?

2. Should `DPT_FRAMEWORK/workflows/transitions.fsm.json` remain in the production workflow directory if it is not currently usable by gate CLIs?

3. Should `ask-next.mjs` continue accepting `.fsm.json`, or should there be separate APIs for:
   - gate routing lookup;
   - FSM node transition lookup?

4. Should `transitions.fsm.json` be generated from chain/manifest if retained?

5. Should `manifest.json` ever generate routing data, or should it stay inventory-only?

6. Is frontmatter metadata stripping in `workflow-chain.mjs` an implementation bug, or is raw Markdown frontmatter considered sufficient for Agent consumption?

7. Should `suggested_context` become loadable context, or remain human/Agent-readable hints only?

8. Should underscore gate state values in `rb_status.json` stay separate from kebab-case gate keys, or should a future change normalize them?

## Suggested Minimal Next Change

Possible OpenSpec change name:

```text
clarify-workflow-transition-boundaries
```

Likely scope:

- modify `transition-table` spec to distinguish gate-routing chain from FSM node transitions;
- modify `workflow-node-contract` or `dynamic-node-loading` if parsed frontmatter metadata should be preserved;
- add tests for workflow package consistency;
- document `.fsm.json` as non-authoritative, projection, fixture, or remove it from production workflow surfaces;
- normalize shared reference format in `requires` and `suggested_context` if those fields are loader-consumed.

Likely non-goals:

- do not redesign all workflow lifecycle semantics;
- do not rewrite gate CLI shape;
- do not change `rb_status.json` unless the review explicitly decides status naming is part of this change;
- do not move Agent Flow into JS.

## Suggested Verification For A Future Change

A consistency check should verify:

- every `manifest.phases[].node` exists;
- every `manifest.shared[]` exists;
- every non-final manifest `gate` appears in `transitions.chain.json`;
- every chain next target exists as a Markdown node;
- every phase frontmatter `phase` matches manifest `key`;
- every phase frontmatter `gate` matches manifest `gate`;
- final phase has `gate: null`;
- only HITL phases have `stop: "yes"`;
- shared nodes do not declare `phase`, `gate`, `next`, or `stop`;
- `requires` and any loader-consumed `suggested_context` references resolve.

Focused tests likely include:

```bash
node --test tests/engine/ask-next.test.mjs
node --test tests/engine/transition-chain.test.mjs
node --test tests/engine/transition-fsm.test.mjs
node --test tests/engine/workflow-chain.test.mjs
```

If specs are changed, also run:

```bash
node openspec/governance/check-project-reqs.mjs
node openspec/governance/check-project-specs.mjs
```

## Current Confidence

High confidence:

- `.chain.json` and `.fsm.json` currently have different key contracts.
- `.fsm.json` is not transparent gate-routing replacement for `.chain.json`.
- manifest is already specified as inventory/index, not runtime next-node authority.
- current loader parsed frontmatter does not preserve phase metadata.

Medium confidence:

- `transitions.chain.json` should remain current canonical gate routing.
- `.fsm.json` should be downgraded to projection/compat/fixture until explicitly promoted.

Open:

- whether to keep `.fsm.json` under `DPT_FRAMEWORK/workflows/`;
- whether to split `askNext()` APIs;
- whether status/gate underscore values need normalization now or later.
