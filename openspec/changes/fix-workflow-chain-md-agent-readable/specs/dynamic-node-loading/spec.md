# Dynamic Node Loading — Delta Spec
> req: DYS-001

## MODIFIED Requirements

### Requirement: Node key maps to a pre-built MD file

The runtime SHALL resolve a node key to a corresponding MD file under the configured `NODES_DIR` (e.g., `experiments/prototype-gate-loop/nodes-gate-loop/`), using the key with underscores replaced by hyphens. `assessNode()` is the entry point that loads a node: it resolves the dependency closure, parses frontmatter from each MD file, and returns the parsed results (frontmatter + body) for the Agent to read and decide on actions. The Engine SHALL NOT execute any code blocks in the MD — the MD body is Agent-readable content only.

#### Scenario: Engine loads and returns MD for Agent to read

- **WHEN** `assessNode(fileRef, state, runtime)` is called with a node key
- **THEN** it reads the corresponding MD file (resolved relative to the configured `NODES_DIR`), parses its frontmatter, resolves dependencies, and returns the result with the MD body accessible for Agent consumption
- **AND** it SHALL NOT execute any JS code blocks found in the MD content

#### Scenario: MD without code blocks is normal

- **WHEN** a node MD file contains no fenced JS code block
- **THEN** the Engine loads and returns the MD normally without error — this is the expected case for Agent-readable nodes
