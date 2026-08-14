# Harness Candidate-Cluster Inventory

> Scope: all 227 tracked `DEEP_RESEARCH_HARNESS/` files, using the complete
> per-file record in `harness-assets.md`. Audited 2026-08-13.

This is the semantic cross-check for the file inventory. It answers a different
question from a keyword scan: every version/history/fallback-looking cluster
must have exactly one disposition. `P`, `R`, `F`, and `H` use the vocabulary in
`README.md`; `C#` points to the bounded card that owns a possible future change.

| Cluster | Evidence surface | Classification / owner | Why it is not an unclassified deletion target |
| --- | --- | --- | --- |
| Internal release number, banner, and creation stamp | `framework-version.mjs`, instantiation writer/template, `RUN.md` | C2b / C2c | The writer-only `framework_version` stamp and release choreography are distinct policy decisions; current schema discriminators are excluded. |
| Old bundle entry and map names | continuation playbook, `inspect-bundle`, reentry, file observability, root docs/templates | C3 | Old-only entries still have positive or non-blocking current paths. C3 must choose one future rejection owner; no deletion is implied today. |
| Old research-access envelope | profile schema, HITL1 reader, adapter, profile guidance | C4a | No current writer emits it, but accepted readers/generic validators still give it a defined consequence. |
| Legacy mutable plan and migration | plan schema, canonical topic state, rerun guidance | C4b | This is separate from current `previous_layouts[]` lineage, which stays protected. |
| Reference metadata and old topic binding | topic layout, reference index, Gate readers, reference guidance | C5a | Current writers still allow a legacy binding form, and a lossless one/all/subset replacement is not yet chosen. |
| Retained experiment v1 reports/audits | experiment contract, run strategy, supervisor | C5b | Historic observations currently influence selection/prediction; this is a policy decision, not dead parsing. |
| Explicit assignment markers v1/v2 | work-unit schema, resolver, validation, guidance | C6a | New claims write v3; recorded old attempts retain immutable output interpretation. |
| Markerless submission and hash mirrors | submitted-ledger reader, declaration recovery, supersession, provenance | C6b | New claims write the marked fingerprint; old tuple readers still affect recovery, supersession, and safety diagnostics. |
| Missing actor provenance | work-unit ledger schema/projections, submit/inspect/gate guidance | C6c | `legacy_unrecorded` is a truthful current safety projection, never a default real actor. |
| Transaction v1 journal | transaction schema, mutation preflight, inspect, supersession evidence | C6d | Unfinished journals must remain visible as a fail-closed blocker; committed ones can be historical acceptance evidence. |
| Unreferenced shared seed pointer | `shared-seed-topic-authoring.md` | C1b | No manifest, `requires`, explicit reader, test, or accepted-spec consumer was found. |
| Stale abstract Gate FSM | `schema/contracts/gate.mjs`, barrel, docs/tests/spec | C1c | The current transition chain is elsewhere; this small stale surface has its own delete/rewrite gate. |
| Unimplemented fork-repair promise | `workflow/fork-repair-converge` accepted spec | C1d | The spec promises symbols absent from the current implementation; retiring a product promise needs a separate decision. |
| Unreachable handwritten YAML subset parser | private helper in `workflow-chain.mjs` | C1e | The actual current JSON-or-YAML parser uses `yaml`; only the private helper definition remains. |
| Archived case-ledger validator/export | host-tools experiment contract plus one archive-path test | C1f | The archived migration ledger is not runtime authority. Whether its fixed corpus count is still a current invariant needs a bounded decision. |
| Fresh queue `bundle_name` initialization | queue template/schema/CLI/spec/tests | P, C9a disposition | This is a current instantiation-to-first-operation binding transition with failure atomicity; it is not old-queue support. |
| Known-ID topic-slug resolution | `operate-queue`, queue-input-validation spec/tests | P, C9b disposition | It is an explicit, closed current validation fallback whose output is checked against canonical Topics; it does not select an old contract. |
| JSON-to-YAML frontmatter parse path | workflow chain, workflow-node specs/tests | P | JSON is a YAML 1.2 subset. The parser accepts one current frontmatter format contract, not multiple historical formats. |
| Local error/recovery fallbacks | cache, Gate helpers, queue lifecycle, actor policy, post-final recovery | P / R | These branches handle current failure and recovery semantics. They do not consume a prior schema/version as a successful alternative. |
| Current schema/version literals | queue, trace, direct-output, receipt, profile, transaction v2, work-unit v3 | F / P | A discriminator that validates the one current writer contract is not release-version compatibility. |
| Historical guidance/diagnostic wording | root docs, file observability, provenance guide, workflow shared docs | P / R with C3-C6 adjacency | These surfaces either route an active reader or expose a safety diagnostic. C7/C8 later decide wording only after behavior settles. |
| Empty placeholders and trace template | `.gitkeep`, empty trace template | F | Directory/template mechanics, not contract compatibility. |

## Result

- Every broad-scan cluster has a primary family/disposition above.
- No cluster remains `unresolved`.
- The table does **not** approve any candidate for proposal. C1b-C1f and C2-C6
  still require their own card gates and, where noted, a user policy decision.

