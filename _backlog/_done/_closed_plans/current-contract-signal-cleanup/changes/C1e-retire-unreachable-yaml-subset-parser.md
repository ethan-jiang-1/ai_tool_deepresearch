# C1e: Retire the Unreachable YAML-Subset Parser

> Candidate change: `retire-unreachable-yaml-subset-parser`
>
> Planned execution batch: dashboard item 13 `retire-unreachable-yaml-subset-parser` (standalone after prior C1 slices diverged)
>
> Status: governed-archived as `2026-08-14-retire-unreachable-yaml-subset-parser`; implementation/archive commit `513186872`
>
> Risk: L1

## One question

May `workflow-chain.mjs` delete its private `parseYAMLSubset()` implementation
when the only active frontmatter parser is `parseFrontmatter()` and it already
uses the approved `yaml` package?

This is a dead private helper question. It is **not** a proposal to remove the
current JSON-or-YAML frontmatter contract.

## Verified Boundary Before Apply

- Before apply, `parseYAMLSubset()` was a non-exported function in
  `DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs`.
- Before apply, a whole-repository symbol search found only its definition. No production
  code, test, playbook, or accepted main spec calls it.
- The exported `parseFrontmatter()` attempts JSON, then parses YAML with the
  approved `yaml` package. YAML 1.2 also accepts JSON, so these are two parse
  attempts for one current input contract, not version compatibility.
- `tests/engine/workflow-chain.test.mjs` protects JSON and YAML frontmatter
  behavior through `parseFrontmatter()`; it does not import or name the helper.

## Applied Scope

Deleted the unreachable helper and its stale comment. Preserved the exported
frontmatter API, its error shape, JSON input, YAML input, schema validation,
and all workflow-node loading behavior exactly as they are.

## Risks and non-goals

- Do not replace the `yaml` parser with the old handwritten subset parser.
- Do not remove JSON input or relabel YAML input as historical compatibility.
- The nearby test comment called the fallback a "YAML subset parser"; apply
corrected that wording only to describe the actual `yaml` parser, without
weakening its behavior assertion.

## Proposal gate

- [x] Private-definition-only reference search is complete.
- [x] Current parser contract and focused test owner are identified.
- [x] Global Coverage Gate is closed.
- [x] Pre-apply fresh reference scan found no use beyond the definition across
  current Harness, tests, accepted specs, experiments, and guidance.
- [x] Proposal preserves the existing characterization test for both JSON and
  YAML frontmatter before deleting the helper.

## Expected verification

```bash
node --test tests/engine/workflow-chain.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

## Result

- [x] Removed only the unreachable private helper and corrected its stale test
  comment; the exported JSON-first, package-backed YAML parser remains intact.
- [x] Focused parser suite passed 39 / 39; workflow-package validation,
  OpenSpec/governance checks, closeout review, and governed archive passed.
