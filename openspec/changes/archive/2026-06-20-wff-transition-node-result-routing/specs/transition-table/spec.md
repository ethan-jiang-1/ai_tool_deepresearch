> req: TRT-001, TRT-002, TRT-003, TRT-004, TRT-005

## Purpose

定义 transition table 层作为 node-result 路由的 Source of Record。路由输入 SHALL 是 `currentNodeRef + outcome`，而不是 gate key。`askNext(path, gate, state)` 不再是 accepted contract；详细 router 返回分类结果，chain 和 FSM 只是同一抽象的两个 backend。

## RENAMED Requirements

- FROM: `### Requirement: ask-next.mjs dispatches by file suffix`
- TO: `### Requirement: Detailed node-result router dispatches by file suffix`
- FROM: `### Requirement: transition-chain.mjs provides chain tracker`
- TO: `### Requirement: transition-chain.mjs provides node-keyed chain lookup`

## MODIFIED Requirements

### Requirement: Transition table file naming convention

Transition table files SHALL be named `transitions.<impl>.json`. `<impl>` SHALL be `chain` (static node map) or `fsm` (node graph).

#### Scenario: Chain format recognized by suffix

- **WHEN** `resolveNodeTransitionDetailed('.../transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the chain backend SHALL be used to resolve the next node

#### Scenario: FSM format recognized by suffix

- **WHEN** `resolveNodeTransitionDetailed('.../transitions.fsm.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the FSM backend SHALL be used to resolve the next node

### Requirement: transitions.chain.json structure

`transitions.chain.json` SHALL be a `{ currentNodeRef: { outcome: next_node } }` map. `outcome` SHALL use the public vocabulary `passed` and `failed`. `next_node` SHALL be a relative node file reference or `null`.

#### Scenario: Known current node and outcome returns next node

- **WHEN** `resolveTransition(chain, 'phases/phase-instantiation.md', 'passed')` is called
- **THEN** the result SHALL be `{ next: 'phases/phase-hitl1.md', found: true }`
- **AND** `next` SHALL be a full relative node file reference with `.md` suffix

#### Scenario: Missing outcome returns no match

- **WHEN** `resolveTransition(chain, 'phases/phase-wave0.md', 'failed')` is called and the chain has no `failed` entry
- **THEN** the result SHALL be `{ next: null, found: false }`

### Requirement: transition-chain.mjs provides node-keyed chain lookup

`transition-chain.mjs` SHALL provide the following interfaces:

- `ChainDefinition` - Zod schema for `{ [currentNodeRef]: { [outcome]: next_node } }`
- `loadChain(path)` - read and validate a `.chain.json` file
- `resolveTransition(chain, currentNodeRef, outcome)` - pure function returning `{ next, found }`

The chain backend SHALL be stateless. It SHALL NOT own a tracker cursor, a `current` property, transition receipts, or a `createChain(pathOrDef, trace?)` tracker contract. Current node progression is owned by the caller that already knows `currentNodeRef`.

#### Scenario: pure lookup returns next node

- **WHEN** `const chain = loadChain('transitions.chain.json'); resolveTransition(chain, 'phases/phase-wave0.md', 'passed')` is called and the table maps that branch to a next node
- **THEN** the result SHALL be `{ next: '<target>', found: true }`

#### Scenario: pure lookup completes on terminal branch

- **WHEN** `resolveTransition(chain, 'phases/phase-final.md', 'passed')` returns `next: null, found: true`
- **THEN** that branch SHALL be treated as terminal by the caller
- **AND** the result object SHALL expose `next: null`

#### Scenario: pure lookup halts on missing transition

- **WHEN** `resolveTransition(chain, 'phases/phase-wave0.md', 'failed')` is called and the chain has no `failed` entry
- **THEN** the result SHALL be `{ next: null, found: false }`

## ADDED Requirements

### Requirement: Detailed node-result router contract

`resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)` SHALL be the detailed public router contract. It SHALL select the backend by file suffix, validate the inputs that the backend needs, and return a discriminated result object.

`context` SHALL be a caller-owned plain object. It MAY carry explicit routing inputs such as normalized workflow node directory, manifest/binding data, and validator hints. The router SHALL only read documented inputs and SHALL NOT infer routing authority from Markdown prose, process globals, or hidden mutable state.

The returned result SHALL classify routing into exactly one of:

- `next` - a next node exists
- `terminal` - the current node ends the flow without a next node
- `no_transition` - no matching branch exists
- `invalid_input` - the caller supplied an invalid current node ref or outcome
- `config_error` - the transition data, supported suffix, or supplied context is malformed

When `kind` is `next`, the result SHALL include the next node file reference.

The result object SHALL always expose a `next` field. It SHALL be the next node file reference when `kind` is `next`, and SHALL be `null` for `terminal`, `no_transition`, `invalid_input`, and `config_error`.

The detailed router result SHALL be preserved by consumers that need diagnostics. `check.next` is a convenience mirror for downstream MD flow, not the only surviving representation of routing truth.

`currentNodeRef` and returned next node references SHALL be canonical relative node file references under the workflow node directory. The router SHALL reject empty refs, normalize path separators to the project canonical form, and SHALL NOT accept gate keys, phase keys, or frontmatter ids as routing identifiers.

#### Scenario: Successful chain lookup returns next

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called and the chain has a matching entry
- **THEN** the result SHALL have `kind: 'next'`
- **AND** the result SHALL include the next node file reference

#### Scenario: Terminal lookup returns terminal

- **WHEN** `resolveNodeTransitionDetailed('transitions.fsm.json', 'phases/phase-final.md', 'passed', context)` is called and the table maps that branch to `null`
- **THEN** the result SHALL have `kind: 'terminal'`

#### Scenario: Missing branch returns no_transition

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'failed', context)` is called and no `failed` branch exists
- **THEN** the result SHALL have `kind: 'no_transition'`

#### Scenario: Invalid inputs return invalid_input

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', '', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'invalid_input'`

#### Scenario: Malformed routing data returns config_error

- **WHEN** the transition table or supplied context is structurally invalid
- **THEN** the result SHALL have `kind: 'config_error'`

#### Scenario: Unsupported suffix returns config_error

- **WHEN** `resolveNodeTransitionDetailed('transitions.yaml', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'config_error'`

## MODIFIED Requirements

### Requirement: Detailed node-result router dispatches by file suffix

`resolveNodeTransitionDetailed(path, currentNodeRef, outcome, context)` SHALL route by `path` suffix:

- `.chain.json` -> `loadChain()` + `resolveTransition()`
- `.fsm.json` -> `loadFSM()` + `resolveTransition()`

The detailed router SHALL NOT accept gate-key routing as a public contract and SHALL NOT expose the retired `askNext(path, gate, state)` API.

#### Scenario: Chain suffix uses chain backend

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the chain backend SHALL produce the detailed routing result

#### Scenario: FSM suffix uses FSM backend

- **WHEN** `resolveNodeTransitionDetailed('transitions.fsm.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** the FSM backend SHALL produce the detailed routing result

#### Scenario: Retired askNext contract is absent

- **WHEN** a developer searches for the accepted router contract
- **THEN** there SHALL be no public `askNext(path, gate, state)` contract in this capability

#### Scenario: Retired chain tracker contract is absent

- **WHEN** a developer searches for the accepted chain tracker contract
- **THEN** there SHALL be no public `createChain(pathOrDef, trace?)` contract in this capability

#### Scenario: Canonical fileRef is accepted

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-wave0.md', 'passed', context)` is called
- **THEN** `currentNodeRef` SHALL be treated as the canonical routing identity

#### Scenario: Invalid fileRef is rejected

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'wave0-complete', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'invalid_input'`
