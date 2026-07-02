# workflow-node-contract Delta Spec

> req: WNC-008, WNC-009

## ADDED Requirements

### Requirement: Autonomous contract header injection for lifecycle stop:no phases

`assessNode()` SHALL, for manifest lifecycle entry nodes when `stop` is `"no"`, inject a mode contract header into the node's Markdown content after frontmatter parsing and before the first phase body section. The injection SHALL be the first body content the Agent reads after frontmatter, ensuring the Agent cannot miss the autonomous execution contract.

Manifest lifecycle membership SHALL be determined only from `DPT_FRAMEWORK/workflows/manifest.json` (or the manifest colocated with the active `runtime.nodesDir` in tests): a node is lifecycle-covered only when its fileRef exactly matches an entry in `manifest.phases[].node`. Frontmatter fields (`node_type`, `phase`, `gate`, `stop`) are necessary for selecting the header variant, but they SHALL NOT by themselves make a file a lifecycle phase. Filename patterns such as `phase-*.md` SHALL NOT be used as lifecycle authority.

For non-terminal manifest lifecycle phase nodes with `stop: "no"` and `gate` not `null`, the injected header SHALL be an autonomous-mode header and SHALL include:

- A prominent "AUTONOMOUS MODE" declaration
- An explicit statement that this is a non-terminal `stop: no` phase
- Absolute prohibitions: SHALL NOT surface to user, SHALL NOT ask questions, SHALL NOT request confirmation, SHALL NOT report progress, SHALL NOT report idle/no-work state
- Guidance that the phase objective is to complete the current node by repairing/draining/degrading as needed, running the gate, and following gate CLI `check.next`
- Guidance on gate failure: repair and retry autonomously, do not ask the user
- A reference to `shared-silent-execution.md` as the governing behavioral contract

The injected header is a principle-level guardrail. It SHALL NOT replace the phase body's node-specific Stop Behavior, quality rules, queue rules, or gate-fail repair instructions. Each lifecycle node MAY phrase its §8 Stop Behavior differently as long as it preserves the shared autonomous invariants.

For the terminal Final phase (`phase: "final"`, `stop: "no"`, and `gate: null`), the injected header SHALL be a terminal-delivery header and SHALL include:

- A prominent "TERMINAL DELIVERY MODE" declaration
- An explicit statement that this is the terminal Final phase (`stop: no` + `gate: null`)
- A prohibition on questions, confirmation requests, progress reports, A/B choices, and post-delivery feedback loops
- Permission to deliver the final report only after final artifacts have been written to `final/`
- A statement that user feedback after delivery belongs to the HITL2 repair/rerun path, not the Final node

The injection SHALL be separated from the phase body by a horizontal rule (`---`) for visual distinction.

The injection SHALL NOT modify `entry.frontmatter` (already parsed). The injection SHALL target `entry.md` in the content cache, affecting only the Agent-readable Markdown content.

The injection SHALL be deterministic and idempotent — repeated `assessNode` calls on the same node SHALL produce the same result.

If no workflow manifest is available for the active `runtime.nodesDir`, `assessNode()` SHALL skip lifecycle header injection rather than infer lifecycle membership from filename or frontmatter alone. Phases with `stop: "yes"` or without a `stop` field SHALL NOT receive the injection. Markdown relay/sub-agent task surfaces that are not manifest lifecycle phase entries, including `phase-wave2-subagent.md`, SHALL NOT receive the lifecycle autonomous or terminal-delivery header solely because they contain `stop: "no"`.

#### Scenario: non-terminal stop:no phase receives autonomous contract header

- **WHEN** `assessNode()` loads a manifest lifecycle phase node with `stop: "no"` and `gate` not `null`
- **THEN** the returned Markdown content SHALL contain an "AUTONOMOUS MODE" header immediately after the frontmatter block
- **AND** the header SHALL precede the first `# Phase:` heading
- **AND** the header SHALL include explicit prohibitions against surfacing to the user
- **AND** the header SHALL prohibit progress/idle reports and point the Agent back to gate-driven completion

#### Scenario: autonomous header preserves node-specific stop behavior

- **WHEN** a manifest lifecycle `stop: "no"` phase has phase-specific §8 Stop Behavior
- **THEN** the injected header SHALL act as a shared guardrail rather than a replacement template
- **AND** the implementation SHALL NOT require all phase bodies to use identical Stop Behavior wording
- **AND** phase-specific quality, queue, and gate repair instructions SHALL remain authoritative within the autonomous boundary

#### Scenario: final phase receives terminal delivery header

- **WHEN** `assessNode()` loads the Final phase with `phase: "final"`, `stop: "no"`, and `gate: null`
- **THEN** the returned Markdown content SHALL contain a "TERMINAL DELIVERY MODE" header immediately after the frontmatter block
- **AND** the header SHALL precede the first `# Phase:` heading
- **AND** the header SHALL permit final report delivery after final artifacts are written
- **AND** the header SHALL prohibit questions, confirmation requests, A/B choices, and post-delivery feedback handling

#### Scenario: stop:yes phase does not receive injection

- **WHEN** `assessNode()` loads a `stop: "yes"` phase node
- **THEN** the returned Markdown content SHALL NOT contain the autonomous or terminal-delivery contract header
- **AND** the content SHALL be the unmodified phase body

#### Scenario: relay sub-agent surface does not receive lifecycle header

- **WHEN** `assessNode()` or a future loader reads `phase-wave2-subagent.md`
- **THEN** the returned Markdown content SHALL NOT contain the lifecycle autonomous or terminal-delivery contract header
- **AND** lifecycle stop:no coverage SHALL NOT be inferred from filename alone

#### Scenario: manifest is the lifecycle membership source

- **WHEN** a Markdown file has phase-like frontmatter including `stop: "no"` but its fileRef is absent from `manifest.phases[].node`
- **THEN** `assessNode()` SHALL NOT inject the lifecycle autonomous or terminal-delivery contract header
- **AND** the implementation SHALL NOT infer lifecycle membership from filename, directory, `phase`, `gate`, or `stop` fields alone

### Requirement: Universal silent execution dependency for lifecycle stop:no phases

Every manifest lifecycle phase node with `stop: "no"` in its frontmatter SHALL include `shared/shared-silent-execution` in its `requires` array. Manifest lifecycle phase nodes are exactly the fileRefs listed in `manifest.phases[].node`; relay/sub-agent task surfaces and other phase-like Markdown files outside that manifest set are not lifecycle phase nodes for this requirement. This ensures the full silent execution behavioral contract is loaded into the Phase Agent's context before the phase body is read, via the existing dependency resolution closure mechanism in `resolveDependencyClosure()`.

The `requires` array SHALL be used for this dependency — `suggested_context` is insufficient because it does not guarantee the dependency is loaded before the phase body.

Lifecycle phases covered: instantiation, setup, seed-topics, wave0, wave1, wave2, readiness, rerun, final. Final is covered by the dependency requirement but uses terminal delivery semantics in the injected header. Relay/sub-agent task surfaces such as `phase-wave2-subagent.md` are outside this requirement even if their frontmatter contains `stop: "no"`; their behavior is governed by relay/sub-agent contracts.

#### Scenario: Every lifecycle stop:no phase requires shared-silent-execution

- **WHEN** a manifest lifecycle phase node frontmatter declares `stop: "no"`
- **THEN** its `requires` array SHALL include `shared/shared-silent-execution`
- **AND** `resolveDependencyClosure()` SHALL include `shared-silent-execution.md` in the load plan before the phase body

#### Scenario: relay sub-agent surface is outside universal silent dependency

- **WHEN** `phase-wave2-subagent.md` declares `stop: "no"` but is not a manifest lifecycle phase entry
- **THEN** WNC-009 SHALL NOT require it to include `shared/shared-silent-execution`
- **AND** its required context SHALL remain governed by the relay/sub-agent specs

#### Scenario: stop:yes phases are not required to load silent execution

- **WHEN** a phase node frontmatter declares `stop: "yes"`
- **THEN** its `requires` array MAY omit `shared/shared-silent-execution`
