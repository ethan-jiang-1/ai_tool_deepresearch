## MODIFIED Requirements

### Requirement: Transition table file naming convention

Transition tables SHALL be named `transitions.<impl>.json` where `<impl>` is `chain` (a static mapping table). The only recognized suffix SHALL be `.chain.json`.

#### Scenario: Chain format recognized by suffix

- **WHEN** a file path ends with `.chain.json`
- **THEN** it SHALL be dispatched to `transition-chain.mjs` (`loadChain` + `resolveTransition`)

### Requirement: Detailed node-result router dispatches by file suffix

The `resolveNodeTransitionDetailed(path, currentNodeRef, outcome, context)` function SHALL route by `path` suffix. The only recognized suffix SHALL be `.chain.json`, routed to `transition-chain.mjs` (`loadChain` + `resolveTransition`). Unknown suffixes SHALL return `kind: "config_error"` with a message listing `.chain.json` as the expected format.

The detailed router SHALL NOT accept gate-key routing as a public contract and SHALL NOT expose the retired `askNext(path, gate, state)` API.

#### Scenario: Chain suffix uses chain backend

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the chain backend SHALL produce the detailed routing result

#### Scenario: Unknown suffix returns config_error

- **WHEN** the transitions path does not end with `.chain.json`
- **THEN** the function SHALL return `kind: "config_error"`
- **AND** the message SHALL indicate `.chain.json` is the expected format

#### Scenario: Retired askNext contract is absent

- **WHEN** a developer searches for the accepted router contract
- **THEN** there SHALL be no public `askNext(path, gate, state)` contract in this capability

#### Scenario: Canonical fileRef is accepted

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** `currentNodeRef` SHALL be treated as the canonical routing identity

#### Scenario: Invalid fileRef is rejected

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'wave0-complete', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'invalid_input'`

### Requirement: Detailed node-result router contract

The `resolveNodeTransitionDetailed()` function SHALL accept:
- `transitionsPath`: absolute or relative path to the transition table file (MUST end with `.chain.json`)
- `currentNodeRef`: file ref string (e.g. `phases/phase-wave0.md`)
- `outcome`: `"passed"` or `"failed"`
- `context`: object with optional `searchRoot` (for resolving relative paths)

The function SHALL return a discriminated result object with shape:
```json
{
  "kind": "next" | "terminal" | "no_transition" | "invalid_input" | "config_error",
  "next": "<file-ref>" | null,
  "source": "chain",
  "context": { "currentNodeRef": "...", "outcome": "...", "transitionsPath": "..." }
}
```

`kind` values SHALL mean:
- `next`: transition found, `next` field contains the resolved file ref
- `terminal`: the transition exists but target is `null` (end of chain)
- `no_transition`: `currentNodeRef` not found in table
- `invalid_input`: empty/null `currentNodeRef` or `outcome`
- `config_error`: unreadable table file, invalid JSON, or unknown suffix

`next` SHALL be a non-empty string when `kind === 'next'`, and `null` otherwise. `source` SHALL always be `"chain"`.

The function SHALL reject empty `currentNodeRef` strings, gate keys (e.g. `wave0_complete`), phase keys (e.g. `wave0`), and frontmatter `id` values that look like gate names.

#### Scenario: Terminal lookup returns terminal

- **WHEN** a transition table maps a node to `null` for a given outcome
- **THEN** the function SHALL return `kind: "terminal"` with `next: null`

#### Scenario: Reject empty current node ref

- **WHEN** `currentNodeRef` is empty string
- **THEN** the function SHALL return `kind: "invalid_input"`

#### Scenario: Reject gate key as current node ref

- **WHEN** `currentNodeRef` is a gate key like `wave0_complete`
- **THEN** the function SHALL return `kind: "invalid_input"`

#### Scenario: Reject phase key as current node ref

- **WHEN** `currentNodeRef` is a bare phase key like `wave0`
- **THEN** the function SHALL return `kind: "invalid_input"`
