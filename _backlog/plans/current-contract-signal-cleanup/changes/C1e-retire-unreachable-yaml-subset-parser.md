# C1e: Retire the Unreachable YAML-Subset Parser

> Candidate change: `retire-unreachable-yaml-subset-parser`
>
> Status: bounded L1 candidate; audit coverage complete
>
> Risk: L1

## One question

May `workflow-chain.mjs` delete its private `parseYAMLSubset()` implementation
when the only active frontmatter parser is `parseFrontmatter()` and it already
uses the approved `yaml` package?

This is a dead private helper question. It is **not** a proposal to remove the
current JSON-or-YAML frontmatter contract.

## Verified boundary

- `parseYAMLSubset()` is a non-exported function in
  `DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs`.
- A whole-repository symbol search finds only its definition. No production
  code, test, playbook, or accepted main spec calls it.
- The exported `parseFrontmatter()` attempts JSON, then parses YAML with the
  approved `yaml` package. YAML 1.2 also accepts JSON, so these are two parse
  attempts for one current input contract, not version compatibility.
- `tests/engine/workflow-chain.test.mjs` protects JSON and YAML frontmatter
  behavior through `parseFrontmatter()`; it does not import or name the helper.

## Intended effect

Delete the unreachable helper and its stale comment. Preserve the exported
frontmatter API, its error shape, JSON input, YAML input, schema validation,
and all workflow-node loading behavior exactly as they are.

## Risks and non-goals

- Do not replace the `yaml` parser with the old handwritten subset parser.
- Do not remove JSON input or relabel YAML input as historical compatibility.
- The nearby test comment currently calls the fallback a "YAML subset parser";
if this slice is approved, update that wording only to describe the actual
`yaml` parser, without weakening its behavior assertion.

## Proposal gate

- [x] Private-definition-only reference search is complete.
- [x] Current parser contract and focused test owner are identified.
- [x] Global Coverage Gate is closed.
- [ ] Fresh reference scan still finds no use beyond the definition.
- [ ] Proposal preserves a characterization test for both JSON and YAML
  frontmatter before deleting the helper.

## Expected verification

```bash
node --test tests/engine/workflow-chain.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
