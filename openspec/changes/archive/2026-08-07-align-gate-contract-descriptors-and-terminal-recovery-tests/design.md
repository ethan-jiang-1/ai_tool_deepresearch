## Context

Wave1 currently has an internal mismatch: its definition describes
`question_list_has_four_sections` as ordered `pattern_match`, while the
evaluator detects it through a rule-ID special case and semantic heading
reader. The live behavior is tolerant, but definition metadata, audit and
future maintainers cannot derive that fact from one source.

The depth-review reader already treats submitted work-unit declarations as
authority and masks dependent checks for bad refs, but it does not yet prove
the exact no-submitted-row case. Separately, the terminal test candidate writes
an unassigned output role before reaching late-submit/timeout preflight, so its
six red failures do not isolate any terminal hash/snapshot behavior.

## Goals / Non-Goals

**Goals:**

- Make the question-list semantic-section contract declarative, schema-valid
  and evaluator-dispatched by descriptor type.
- Make active Gate audit use parsed descriptor plus behavioral evidence, not a
  contradictory permanent inventory.
- Preserve submitted-evidence root-first behavior and prove the exact absent
  submitted-work case.
- Make terminal test candidates follow the immutable assignment contract before
  exercising the real preflight/late-submit path.

**Non-Goals:**

- No relaxed output-role, ledger, hash, snapshot, receipt, or provenance rule.
- No Markdown grammar registry, duplicate parser, generic Gate evaluator, or
  new persisted Gate verdict.
- No claim that a JS fixture proves Agent/sub-agent behavior or host liveness.

## Decisions

### 1. A typed descriptor, not a rule-ID exception or regex migration layer

The Wave1 question-list rule will use an active definition shape conceptually
equivalent to:

```json
{
  "id": "question_list_has_four_sections",
  "check": "semantic_sections",
  "target": "artifacts/wave1/{topic}/question-list.md",
  "required_sections": [
    "Topic Investigation Targets",
    "Question Reconciliation",
    "Emergent Question Protocol",
    "Exploration / Exploitation Decision"
  ]
}
```

The Gate-definition Zod schema validates `semantic_sections` with a non-empty,
unique `required_sections` array and rejects the incompatible `pattern`/
`negate` fields for that descriptor. Existing `pattern_match` rules retain their
own schema. The evaluator dispatches from `rule.check` and receives the parsed
section names; it reuses the existing semantic heading reader and normalizer.
There is no fallback by rule ID and no second regex parser.

This descriptor answers the bounded evaluator question “are the named required
sections present and non-empty?” It preserves missing/empty semantic content
while deliberately collapsing presentation-only differences. The evaluator can
stop there and return one root; it does not claim prose quality or persist a
new status.

**Alternative considered:** leave `pattern_match` metadata and document that
one named rule is special. Rejected: metadata would remain a competing truth
path and every new consumer would need historical knowledge.

### 2. The audit is derived, not a maintained per-rule catalog

The active audit reads the current definition, validates its descriptor fields,
checks supported dispatch, and relies on targeted evaluator/Gate regressions to
prove behavior. Its conflicting catalog-required scenarios are removed. This
preserves the useful static questions (definition parse, stable identity,
supported check) without claiming that a second document can be kept current
as behavior authority.

**Alternative considered:** introduce a richer permanent mapping for every
rule, producer and test. Rejected: it repeats facts already available in parsed
definitions and structured findings, and it would drift independently.

### 3. Absent submitted evidence is a prerequisite/no-path, never a ref edit

The existing depth reader remains ledger-first. When no
`reviewed_work_unit_refs[]` entry resolves to a submitted current-topic row, it
will emit one binding root and mask source-claim/cache/novelty/depth derivatives.
It must not offer a YAML edit that fabricates a ref, treat a filesystem
directory as submitted, or turn an unassigned role into evidence. It may expose
an already-existing legal submitted-work/replacement operation; if it cannot
prove one, it returns `missing_contract` and the same Wave1 checkpoint.

The direct authority is the submitted ledger plus the claimed assignment and
manifest bindings. The depth review is a consumer projection, not an authority
writer. This is a local root-first adjustment, not a new Gate state or retry
controller.

### 4. Terminal candidates derive role/path from the claimed assignment

The terminal test helper will read the current claimed record/assignment
contract and build its candidate output entries from the declared required
output tuple. For the current Wave0 source-intake assignment that is the
assigned `source_yaml` path/role; the test no longer hard-codes `reference`.
This preserves the test's target: real late-submit and timeout-preflight
behavior after candidate admission, including any remaining genuine
hash/snapshot failure.

**Alternative considered:** add `reference` to Wave0 allowed roles or bypass
output validation in terminal fixtures. Rejected: it changes production
provenance semantics solely to satisfy stale test setup.

### 5. Responsibility and control shape stay short

The loops are:

```text
parsed definition -> semantic evaluator -> Wave inspect/Gate -> same checkpoint
submitted ledger/assignment -> depth root or no-path -> same Wave checkpoint
claimed assignment -> candidate -> real terminal preflight/late-submit result
```

The Engine owns deterministic parsing, selection, validation and verdicts. The
Agent owns content repair at existing writer boundaries. The user decides only
new semantic work or risk/permission matters. The design adds no generic
repair, controller, user-run pipeline or fabricated evidence.

## Risks / Trade-offs

- [Descriptor validation rejects malformed legacy definition] -> migrate the
  one active rule atomically with strict schema/audit regression; other pattern
  rules remain unchanged.
- [Heading normalizer accepts too much] -> tests cover equivalent presentation
  plus missing/empty section as a direct failure; the descriptor does not judge
  prose quality.
- [No-submitted root accidentally hides an independent direct error] -> mask
  only dependent evidence/depth symptoms and retain independently evaluable
  roots through existing structured findings.
- [Fixture alignment appears to “fix” all terminal bugs] -> rerun all six red
  tests; any remaining red result becomes the only basis for a narrower Engine
  investigation.

## Migration Plan

1. Add descriptor-schema/audit and Gate red/green tests before changing the
   Wave1 definition/evaluator dispatch.
2. Replace the one definition's regex fields with the typed descriptor and
   remove the special rule-ID branch, then prove inspect/Gate parity.
3. Add the no-submitted-evidence depth regression and preserve existing
   dependent-root masking tests.
4. Change terminal candidate construction to derive the assignment tuple;
   rerun the six affected terminal/preflight cases before considering any
   production contract modification.
5. Run the selected verification plan, release `v0.76` after Change A, and
   sync accepted specs only in the approved lifecycle.

No runtime bundle migration is needed: Gate definitions are framework assets
and runtime evidence remains strict. Rollback restores the prior definition and
evaluator only; it never rewrites ledgers, receipts, hashes or assignment
snapshots.

## Open Questions

None. The exact reusable helper name is an implementation detail; descriptor
fields, evaluator meaning, root order and no-path behavior are settled here.
