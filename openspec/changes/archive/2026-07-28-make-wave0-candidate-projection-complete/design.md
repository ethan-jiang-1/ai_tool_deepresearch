## Context

`RRM-007` 已把 Seed Topic projection 变成 inspect 与 formal gate 共用的
readiness result，但 Wave0/1 共用 `collectEligibleWorkUnitProjection()` 的
`work_id` row 集。这个抽象对 Wave1 合适：一个 submitted row 是其 projection
identity；对 Wave0 不够：一个 `wave0_source_intake` row 的 result-declared direct
output 是 `source.yaml` array，其中每个 schema-valid array element 都是独立的
reader navigation candidate。当前 evaluator 只把 `work_id` 放进 `validWorkIds`，
所以一个 entry 可掩盖同一 source array 的其余 elements。

`result_hash` 的边界同样重要：它绑定 accepted result 的结构化 declaration，
不绑定 `source.yaml` bytes。故 Wave0 candidate 不是永久提交快照里的 ID，而是每次
检查时由当前、已认证 declared output 重新导出的 projection coordinate。这个差异
必须在 Engine、文档和测试中保持一致。

现有 direct sources 与写入 seam 已经存在：

```text
current submitted Wave0 row + hash-bound result-declared source.yaml output
  -> neutral direct-output result (validated_array_length only)
  -> candidate coordinates 1..validated_array_length
  -> shared Seed Topic readiness evaluator
  -> retained Wave0 Projection Packet
  -> existing operate-topic-state apply
  -> same Wave0 inspect / formal gate
```

这里的 candidate coordinate 是 reader-facing navigation fact，不是新的 source
authority。submitted work-unit/index/manifest/result/output binding 与
`source.yaml` 继续是 authority；Seed Topic entry 或 deferred disposition 只满足
既有 return-map evaluator 的 projection coverage，不生成 evidence、receipt、cache
trail、reference 或第二套 Gate/source authority。

## Goals / Non-Goals

### Goals

- 让 current eligible Wave0 result-declared, schema-valid `source.yaml` array
  的每个 element 都有 exact `<work_id>/<1-based ordinal>` navigation coverage
  或 identity-bound deferred disposition。
- 让 inspect 和 formal Wave0 gate 消费同一个 candidate-level evaluator result，
  保持 parent-first diagnostic 与 same-check repair。
- 在 neutral direct-output contract 成功后仅暴露 `validated_array_length`，让
  Wave0 count-floor 与 candidate reader 共用同一 parser/schema verdict，移除
  Wave adapter 的第二条 YAML read/parser path。
- 使 template、Wave0 closeout 和 command playbook 对 ordinal 的含义一致，且
  单一 packet 可 upsert 同一个 work-id 的多条 candidate entries。
- 通过真实 production submit -> packet writer -> inspect/gate seam 证明行为，
  不把 source array matching 复制到 test fixture。

### Non-Goals

- 不新增 `candidate_id`、source catalog、source-array lifecycle、CLI、writer、
  queue kind、receipt、index 或 persistent state，也不把 source-array bytes/hash
  伪装成 result-hash 已经拥有的 snapshot 事实。
- 不改变 source acceptance、source/floor policy、shared reference ownership、
  Wave1/Wave2 projection identity、degradation、ledger、status 或 routing。
- 不 bulk-migrate historical Seed Topics，也不把 raw Markdown patch 变成 repair
  path。
- 不以 deterministic contract 为名增加 deterministic E2E 或 Agent-flow canary。

## Decisions

### 1. Use current declared-output ordinal as the only Wave0 candidate identity

For one current submitted Wave0 source intake whose authenticated declared
output currently passes `wave0.source-metadata-array.v1`, define:

```text
candidate coordinate = <work_id>/<1-based ordinal in current declared source.yaml>
Wave0 Seed Topic entry_id = the same coordinate
```

The coordinate is collision-free across current work units and preserves
duplicate URLs as distinct candidates. It is intentionally neither a durable
candidate ID nor a source URL hash, title slug, generated ID, or a new field in
`source.yaml`. `result_hash` authenticates the result declaration, not those
source bytes, so a later same inspect re-evaluates the current direct output
and may derive a different current coordinate set. A valid Wave0 candidate
entry must carry its exact coordinate in entry-local `entry_id`; a bare exact
`work_id` in `refs` remains secondary provenance only and cannot cover a
candidate. A deferred entry is valid only through the existing `defers` /
`deferred` / `refs: none` / limitation form plus that exact entry ID.

This is the semantic-precision level required by the change. The closeout Agent
can answer one bounded question per candidate, and a future reader can stop at
the canonical Seed Topic entry or explicit limitation. The coordinate says
nothing about semantic quality, source acceptance, or whether a rich reference
must exist.

**Rejected: persist a new `candidate_id`.** It duplicates identity already
expressible by a submitted work ID plus an ordered, schema-valid source array;
it would add writer, migration and compatibility obligations without a current
counterexample that ordinal identity cannot represent.

**Rejected: use URL/title matching.** Duplicate URLs and mutable display text
would collapse distinct submitted facts and make callers reimplement matching
heuristics.

### 2. Let the direct-output module own parsing and bounded cardinality

`RWG-018` already assigns bounded read, UTF-8/BOM handling, YAML parsing and
`ReferenceMetadataArraySchema` evaluation to `evaluateDirectOutputTarget()`.
This change extends only its successful Wave0 result:

```js
{
  passed: true,
  snapshot_meta: {
    // existing bounded snapshot metadata
    validated_array_length: 2,
  },
  roots: [],
}
```

`validated_array_length` exists only after the top-level array and every entry
pass `ReferenceMetadataArraySchema`; it is a non-negative integer and carries
neither entries nor raw/decoded bytes. A failed direct result has its normal
root and no usable length. The module continues to select neither a work-unit
nor a target: adapters authenticate/select the target first.

The Wave0 schema route retains each successful direct result in its existing
direct-result map. Its `per_topic_count_floor` route consumes that same
`validated_array_length` rather than calling `readYamlArraySafe` or retaining a
second parsed `sourceData` map. This removes the current duplicate read/parser
path while preserving the independently owned count-floor verdict.

### 3. Put candidate authority behind one deep projection module

Add a narrow Wave0-only module at the existing work-unit projection seam,
tentatively named `collectEligibleWave0CandidateProjection()`. Its interface is
the only source-array shape that `return-map` needs:

```js
{
  passed: boolean,
  candidates: [{ work_id, topic_uid, topic_slug, source_ordinal, entry_id }],
  root_findings: [...],
  warnings: [...]
}
```

For each candidate-producing row, the module SHALL establish this exact chain
before it evaluates a direct output:

1. current eligible normalized submitted declaration with kind
   `wave0_source_intake`, its exact canonical topic binding, and its current
   rerun count;
2. a validated manifest whose assignment contract has exactly the required
   tuple `(path, role: source_yaml,
   direct_contract: wave0.source-metadata-array.v1)` for that row;
3. a validated current result whose `hashValue(result)` equals the accepted
   ledger/index `result_hash`, followed by `validateOutputFiles()` showing that
   this exact tuple is declared in `output_files`; and
4. `evaluateDirectOutputTarget()` on that tuple's declared safe regular path,
   consuming only a passed `snapshot_meta.validated_array_length`.

It then derives ordinals `1..validated_array_length` in submitted-row and
ordinal order. Raw source metadata never leaves the neutral direct-output
module: callers need identity coverage, not a second source catalog. The module
does not parse YAML, scan an artifact directory, select an optional output, or
accept an orphan file.

If registry, submitted row, manifest tuple, result hash/declaration, source
path, or direct-output result is unusable, the module returns one direct parent
root and no derived candidates. An empty valid array produces an empty candidate
set; existing source-output/floor contracts remain responsible for whether that
submitted work may complete. This intentional current evaluation is not a
backdoor data migration: a changed direct output is reconsidered only when the
same inspect/gate path is run.

This is a deep module: its small interface gives the readiness evaluator all
candidate coverage it needs while hiding ledger/index/manifest/result/output/YAML
complexity. It creates locality for the Wave0-only interpretation instead of
adding a generic candidate framework or forcing every caller/test to learn the
same binding chain.

**Rejected: parse `source.yaml` in the candidate reader or `return-map.mjs`.**
That would mix submitted authority resolution and Seed Topic parsing, violate
`RWG-018`'s neutral parser ownership, and make future source-output consumers
duplicate the same safety checks.

**Rejected: extend every generic eligible row with optional candidates.** It
would make the Wave1/Wave2 reader interface phase-dependent and expose source
array mechanics to callers that cannot use them.

### 4. Replace only the Wave0 coverage branch of the shared evaluator

`evaluateSeedTopicProjectionReadiness()` SHALL call the candidate module for
Wave0 and retain `collectEligibleWorkUnitProjection()` for Wave1. Wave2 remains
finding-index based. For a usable Wave0 topic family, the evaluator shall:

1. derive current candidate coordinates for that topic;
2. validate entry-local field/navigation/deferred structure using the existing
   parser and validator;
3. accept only a valid exact `entry_id` coordinate as candidate coverage;
4. emit `return_map_current_candidate_omission` for each uncovered coordinate;
   and
5. keep the existing structural short-circuit: an invalid parent or local
   identity/entry root is reported before dependent omission noise.

No additional validator or Gate rule is introduced. The formal Wave0 contract
continues to consume this evaluator's structured findings directly; it does not
call the inspect CLI or independently read YAML. Current Wave1 acceptance of
its existing work-id/refs identity form remains unchanged. The packet writer
does not gain a second candidate validator: it already accepts multiple entries
per Wave0 update, while inspect/gate remain the one candidate-coverage authority.

The resulting control loop is shorter than the current implied repair path:
one direct candidate set -> one evaluator -> one exact coordinate finding ->
one existing packet writer -> same inspect. It removes the ambiguous success
interpretation that a parent work ID covers an arbitrary source array and
avoids a second coverage checker, fallback or retry tree.

### 5. Keep document shape, packet protocol, and repair ownership separate

The template's Wave0 card will say that the existing positive ordinal is the
1-based ordinal of the current result-declared `source.yaml` array, not a
permanent submitted snapshot. It will not gain packet JSON, lifecycle
authorization or raw edit mechanics. The existing command playbook remains the
one packet protocol and gains the same sentence plus a multi-entry Wave0
example. Wave0 phase closeout will instruct the Agent to read the current
declared source output, create one entry/disposition per candidate in its
retained packet, apply it in the existing Wave0 window, and rerun the same
inspect.

`canonical-topic-state.mjs` owns the rendered card descriptor; the template is
its readable mirror. Both are changed together, while the shared authoring cue,
playbook and closeout point to the same current-coordinate convention without
becoming another template or packet protocol.

The Agent retains semantic ownership of `evidence_meaning`, relationship,
reference choice, status, and limitation. The Engine owns canonical binding,
current eligibility, source-array schema parsing, exact coordinate coverage and
the deterministic verdict. No ordinary repair is delegated to the user; a
missing legal writer/authority remains the named existing owner or
missing-contract boundary.

## Risks / Trade-offs

- **A submitted row has a malformed/missing/unbound source output** -> reuse the
  direct output/authority root and mask candidate omissions; do not turn an
  artifact scan into authority. Focused negative tests must prove this order.
- **The live direct output changes after submit** -> the next same inspect
  honestly derives current ordinals from its result-declared path. `result_hash`
  does not pretend to freeze those bytes; the existing packet -> writer -> same
  inspect loop is the only repair route.
- **A multi-row source array has duplicate URLs** -> ordinal identity preserves
  both rows. Unit coverage must prove that a single entry cannot satisfy both.
- **Existing current Wave0 Seed Topics have only work-id-level entries** -> they
  will fail the new exact coverage check until the Phase Agent legally applies
  candidate entries/dispositions. No bulk rewrite occurs; historical rows remain
  readable and do not become current demand.
- **An entry has a malformed or out-of-range coordinate** -> the existing
  entry-identity structural root wins before coverage omissions. This avoids a
  misleading wall of missing-candidate findings.
- **Wave1 behavior regresses through shared code** -> keep its row reader and
  identity branch unchanged, and lock both Wave0 and Wave1 focused regressions.

## Migration Plan

1. Extend the direct-output contract with validated cardinality and make the
   Wave0 count-floor consume it; add focused direct-contract coverage.
2. Add the narrow candidate projection module and its unit tests, reusing the
   submitted-row reader, hash-bound result/output binding and direct result
   cardinality without another YAML parser.
3. Change only the Wave0 branch of shared readiness and formal-gate consumption;
   add exact coordinate/root-short-circuit and unchanged-Wave1 coverage.
4. Update the Wave0 card descriptor/template, shared authoring cue, command
   playbook and Phase closeout wording without moving protocol into the template.
5. Run focused unit/integration checks through production submit, packet writer,
   inspect and Gate. Update `CHANGELOG.md` and `RUN.md` to v0.54.
6. Archive only after route/assets and project governance checks pass. Existing
   bundles are never automatically mutated; any current projection deficit is
   repaired through the existing packet -> writer -> same inspect loop.

Rollback is a normal source rollback before release. There is no data migration,
new persisted format, or cross-file transaction to reverse.

## Open Questions

No product or user decision blocks proposal. During apply, choose the exact
internal helper names only after re-reading the current code. The fixed
invariants are: authenticate the result-declared required output before direct
evaluation; expose only validated cardinality; and keep YAML interpretation in
the existing direct-output module.
