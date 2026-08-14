## Context

See [proposal.md](proposal.md) for the retirement rationale. The current
frontmatter owner is exported `parseFrontmatter()` in
`DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs`: it attempts `JSON.parse`,
calls the approved `yaml` package only after that parse fails, then validates
the resulting object through `NodeFrontmatter`. The private
`parseYAMLSubset()` implementation is not exported or called by that path.

The focused `workflow-chain` test suite directly characterizes JSON
frontmatter, a valid non-JSON YAML flow mapping, schema rejection, and node
loading. The workflow-package validator separately reads current YAML workflow
nodes through the exported parser. One two-line comment inaccurately describes
the flow-mapping fallback as a subset parser and claims the old helper's result.

## Goals / Non-Goals

**Goals:**

- Remove the unreachable private parser and its misleading explanatory text.
- Preserve the existing exported parser contract through focused regression and
  workflow-package consistency evidence.
- Leave one parser owner for non-JSON frontmatter: `yaml.parse` through
  `parseFrontmatter()`.

**Non-Goals:**

- Changing frontmatter grammar, JSON support, YAML support, schema validation,
  error messages, loader caching, dependency closure, manifest validation, or
  Agent-facing workflow behavior.
- Adding a replacement parser, parser-selection branch, fallback, compatibility
  mode, migration, dependency, state, or new deterministic check.

## Decisions

### Delete the complete private helper without a tombstone

Apply removes the full `parseYAMLSubset()` declaration and makes no call-site
substitution because the helper has no caller. Retaining it with a deprecation
banner, alias, or dormant fallback would leave a second apparent parser owner
and preserve the exact historical ambiguity being retired.

The bounded reader question is: "Which implementation parses non-JSON
workflow-node frontmatter today?" The normal stop remains
`parseFrontmatter()` and its existing `yaml.parse` branch. No new named state,
projection, interface, or architecture is introduced, so the constitutional
design-companion review for changed semantic layers is not applicable.

### Treat the test comment as a projection correction, not a behavior change

The focused test remains in place and continues to exercise the exported
parser. Apply changes only the stale two-line comment so it describes the
package-backed YAML fallback actually used by the test: `{ bad json }` is a
valid YAML flow mapping that parses to an object with no `requires` key.
Rewriting inputs, assertions, or error expectations would exceed this cleanup
and require evidence for a behavioral parser change.

### Use existing direct evidence only

An apply-time exact symbol scan proves no current caller remains. The existing
`tests/engine/workflow-chain.test.mjs` is selected unit evidence for JSON and
valid YAML flow-mapping behavior at the protected exported parser boundary, and
`validate-workflow-package.mjs` reads current YAML workflow nodes as
package-consistency evidence. Neither is presented as proof of Agent behavior,
runtime bundle history, or a new Engine verdict.

This is net simplification: one unreachable implementation and one misleading
comment disappear; no control loop, state, retry, or recovery path replaces
them. The user chose the retirement, the Agent performs the bounded deletion
and verification, and the Engine's existing parser/validation authority does
not change.

## Risks / Trade-offs

- [A missed direct caller could fail after deletion] -> Repeat an exact symbol
  scan across current source, tests, accepted specs, guidance, and experiments
  immediately before target edits; record any finding as ordinary repair work.
- [The deletion could touch the exported parser or change its behavior] ->
  Limit the edit to the private function plus one comment, inspect the scoped
  diff, and run the existing focused unit suite.
- [The cleanup could imply JSON is legacy support] -> Preserve the
  JSON-first/YAML fallback code and tests verbatim; describe both as one current
  frontmatter contract.

## Migration Plan

No bundle data, runtime state, receipt, trace, or user migration exists for
this internal deletion. Apply removes the helper, corrects the comment, and
runs the selected scans/tests/package validation. Before archive, compare the
actual diff with the protected exported parser and loader surfaces. Rollback
before archive is a source-control revert of the bounded edit.
