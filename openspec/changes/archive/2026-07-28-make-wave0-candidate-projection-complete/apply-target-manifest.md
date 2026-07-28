# Apply Target Manifest: Wave0 Candidate Projection Completeness

## Admission Record

- Change: `make-wave0-candidate-projection-complete`
- Required pre-edit check:
  `node openspec/governance/check-verification-routing.mjs --change make-wave0-candidate-projection-complete --mode plan`
- Current proposal position: planning artifacts are complete; no framework code,
  test, or runtime bundle has been edited by this change.

This manifest is an implementation ownership aid, not a runtime authority. The
accepted capability specs and their direct bundle facts remain authoritative.

## Added Or Consolidated Control Surfaces

| Surface | Planned target | Direct Source of Record | Responsibility boundary |
| --- | --- | --- | --- |
| Wave0 direct-output cardinality and count-floor reuse | `DPT_FRAMEWORK/engine/helpers/direct-output-contract.mjs`, `DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs` | Current bytes of one Engine-resolved direct target under closed `wave0.source-metadata-array.v1` | Adds only successful `validated_array_length`; the Wave0 count floor consumes the cached direct result. It does not return raw/decoded bytes or retain a second parsed YAML map. |
| Wave0 candidate projection reader | `DPT_FRAMEWORK/engine/work-unit-projection.mjs` | Current eligible `wave0_source_intake` row, validated manifest exact `(path, source_yaml, direct_contract)` tuple, hash-bound validated result/output declaration, and a passed direct-output result | Produces exact `<work_id>/<array ordinal>` coordinates or one direct parent root. It does not treat `result_hash` as source-byte snapshot authority, parse YAML, scan artifacts, or expose a source catalog. |
| Wave0 candidate branch of shared readiness | `DPT_FRAMEWORK/engine/helpers/return-map.mjs` | Candidate reader result plus parsed current Seed Topic | Reuses the existing entry parser/field validation and returns exact candidate coverage findings to both inspect and formal gate. It does not write packets or reparse source YAML. |
| Wave0 ordinal guidance | `canonical-topic-state.mjs`, Seed Topic template, shared authoring cue, `operate-topic-state` playbook, and Phase Wave0 closeout | Existing packet grammar plus current result-declared source-array coordinate | Tells the Agent what ordinal means and to use packet -> writer -> same inspect. It is not a packet schema, mutation authority, permanent source snapshot, or second writer. |

## Avoided Or Removed Complexity

| Avoided surface | Reason |
| --- | --- |
| Persistent `candidate_id`, source catalog or new lifecycle | `<work_id>/<array ordinal>` identifies a current projection candidate without new state, migration, or writer. |
| Second YAML parser or `return-map` filesystem scan | The direct-output module owns parsing; candidate/readiness consumers receive only validated cardinality after authenticated output selection. |
| Wave count-floor reread/second parsed source map | The Wave adapter reuses its successful direct-output result rather than calling `readYamlArraySafe` after schema validation. |
| Candidate-specific CLI, writer, Gate rule, controller, watcher, retry tree, or queue kind | The existing packet writer, inspect and formal-gate consumption already provide the legal same-check loop. |
| Separate Wave1/Wave2 identity change | Only Wave0's source-array shape differs; their existing direct row/finding forms remain untouched. |

## Requirement Traceability

| Requirement | Planned implementation and proof ownership |
| --- | --- |
| `RRM-003` | Wave0 authoring/template/playbook cue and static guidance contract. |
| `RRM-007` | Candidate reader, shared readiness evaluator, Wave0 inspect/gate and focused unit/integration tests. |
| `RWG-018` | Direct-output validated cardinality, Wave0 count-floor reuse, strict candidate reader boundary, and focused direct-contract/integration proof. |
| `STM-001` | Rendered Wave0 card/template structural wording and parity contract. |
| `RWP-016` | Wave0 closeout sequence and same-inspect guidance. |

All five IDs already exist in `openspec/governance/req-registry.yaml`. No new
requirement ID is allocated for a helper, coordinate, test fixture, or Markdown
cue.
