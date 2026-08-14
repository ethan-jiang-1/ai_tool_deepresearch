## Why

`DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs` still contains a private
`parseYAMLSubset()` implementation that no current caller can reach. The actual
frontmatter parser already uses the approved `yaml` package after the JSON
parse attempt, so retaining the handwritten helper creates a false competing
reader path and a stale test comment.

This proposal follows the approved C1e decision in
`_backlog/plans/current-contract-signal-cleanup/changes/C1e-retire-unreachable-yaml-subset-parser.md`:
remove the dead implementation without changing the current JSON-or-YAML
frontmatter contract.

## What Changes

- Delete only the non-exported `parseYAMLSubset()` helper from
  `DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs`.
- Correct the focused test's two-line explanatory comment so it identifies the
  actual `yaml` package fallback and its result rather than a retired subset
  parser.
- Preserve `parseFrontmatter()`'s exported API, JSON-first/YAML fallback,
  schema validation, error boundary, and all workflow-node loading behavior.
- Do not add an alias, fallback, compatibility reader, parser replacement,
  new dependency, state, check, or migration path.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `workflow/dynamic-node-loading` | Accepted main spec; `workflow-chain.mjs`; `tests/engine/workflow-chain.test.mjs` | Verify-only | `DYS-001` protects frontmatter parsing, key preservation, and explicit dependency loading. The exported parser and those observable outcomes remain unchanged. |
| `workflow/workflow-node-contract` | Accepted main spec; workflow package validator | Verify-only | Node metadata and package-consistency contracts do not name or require this private function. |

No accepted requirement changes are needed. This change sets `skip_specs: true`:
it removes unreachable implementation detail and corrects explanatory test text,
without adding, removing, or modifying a capability behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

## Impact

- **Affected code:** one private helper and one test comment.
- **Current behavior:** JSON and YAML frontmatter parsing, validation, error
  reporting, dependency resolution, manifest/package validation, and Agent
  flow remain unchanged.
- **Reader boundary:** the normal stop remains the exported
  `parseFrontmatter()` implementation, which delegates non-JSON frontmatter to
  the approved `yaml` parser.
- **Responsibility:** the user selected retirement; the Agent performs the
  bounded deletion and verification; the Engine retains its existing parser and
  validation verdicts without a new authority or control path.
