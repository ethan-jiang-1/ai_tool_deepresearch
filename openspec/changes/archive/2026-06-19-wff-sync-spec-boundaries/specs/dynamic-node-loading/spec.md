## RENAMED Requirements

- FROM: `### Requirement: Nodes are resolved from a registry at runtime`
- TO: `### Requirement: Nodes are resolved by explicit file reference at runtime`

- FROM: `### Requirement: Nodes can be added or removed without breaking existing in-flight state`
- TO: `### Requirement: Nodes can be added or removed as Markdown files without changing loader control flow`

- FROM: `### Requirement: Node key maps to a pre-built MD file`
- TO: `### Requirement: Node file reference maps to Agent-readable Markdown`

## MODIFIED Requirements

### Requirement: Nodes are resolved by explicit file reference at runtime

The workflow loader SHALL resolve a Markdown node from an explicit node file reference and a configured node directory supplied by runtime state, function parameter, or CLI argument. It SHALL NOT require a process environment variable and SHALL NOT resolve to executable Step instances.

The loader SHALL parse frontmatter, resolve the dependency closure declared by `requires`, read the needed Markdown files, and return parsed Markdown/frontmatter for the Agent to read.

#### Scenario: Agent requests a known node file

- **WHEN** `assessNode('phases/phase-wave0.md', state, runtime)` is called with `runtime.nodesDir` pointing at the workflow node directory
- **THEN** the loader resolves that file under `runtime.nodesDir`
- **AND** it returns the parsed Markdown/frontmatter for Agent consumption

#### Scenario: Unknown node file

- **WHEN** `assessNode(fileRef, state, runtime)` is called and `fileRef` does not exist under `runtime.nodesDir`
- **THEN** the loader throws an error naming the missing file reference

### Requirement: Nodes can be added or removed as Markdown files without changing loader control flow

The node loader SHALL allow adding, removing, or renaming Markdown node files as data/content changes under the configured node directory. Adding a node SHALL NOT require adding executable branch logic to the loader.

#### Scenario: New Markdown node added

- **WHEN** a new Markdown node file is added under the configured node directory
- **THEN** the loader can resolve it when the caller passes its file reference
- **AND** existing node files are unaffected

### Requirement: Node file reference maps to Agent-readable Markdown

The runtime SHALL resolve a node file reference to a corresponding Markdown file under the configured node directory. `assessNode()` is the entry point that loads a node: it resolves the dependency closure, parses frontmatter from each Markdown file, and returns the parsed results for the Agent to read and decide on actions. The Engine SHALL NOT execute any code blocks in the Markdown; the Markdown body is Agent-readable content only.

#### Scenario: Engine loads and returns MD for Agent to read

- **WHEN** `assessNode(fileRef, state, runtime)` is called with a node file reference
- **THEN** it reads the corresponding Markdown file resolved relative to `runtime.nodesDir`
- **AND** it parses frontmatter, resolves dependencies, and returns the result with the Markdown body accessible for Agent consumption
- **AND** it SHALL NOT execute any JS code blocks found in the Markdown content

#### Scenario: MD without code blocks is normal

- **WHEN** a node Markdown file contains no fenced JS code block
- **THEN** the Engine loads and returns the Markdown normally without error
