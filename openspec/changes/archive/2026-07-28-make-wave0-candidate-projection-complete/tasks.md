## 1. Apply Admission And Direct-Fact Contract

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --change make-wave0-candidate-projection-complete --mode plan` before target edits; reconcile any plan failure in the change root. Done when the plan-mode verdict passes. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 1.2 Re-read the current submitted output/direct-output seam and reconcile `apply-target-manifest.md` with actual ownership before code edits. Done when it names the authenticated result-declared `source_yaml` tuple, says `result_hash` binds result JSON rather than source bytes, and infers no candidate authority from an artifact scan. (RRM-007, RWG-018)
- [x] 1.3 Preserve existing requirement traceability and add no registry ID unless an accepted requirement genuinely expands beyond RRM-003/RRM-007/RWG-018/STM-001/RWP-016. Done when spec deltas, `@impl` annotations, tasks, and registry ownership agree. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)

## 2. Neutral Direct Output And Wave0 Candidate Reader

- [x] 2.1 Extend the closed Wave0 direct-output contract so a schema-valid success exposes only non-negative `snapshot_meta.validated_array_length`; remove the Wave adapter's `readYamlArraySafe`/second parsed-source count route and consume the cached direct result for `per_topic_count_floor`. Done when invalid direct output has no usable cardinality or raw/decoded data exposure, and existing count-floor ownership remains unchanged. (RWG-018)
- [x] 2.2 Extend `tests/engine/helpers/direct-output-contract.test.mjs`. Done when it proves valid-array cardinality, malformed/schema-invalid no-cardinality behavior, and the public direct result does not expose array entries or raw/decoded bytes. (RWG-018)
- [x] 2.3 Add the narrow current-Wave0 candidate reader beneath the existing eligible work-unit projection seam. Done when it authenticates only a current eligible `wave0_source_intake` row, exact manifest `(path, source_yaml, wave0.source-metadata-array.v1)` tuple, hash-bound validated result/output declaration, then derives ordered `<work_id>/<1-based source.yaml ordinal>` coordinates from `validated_array_length` without parsing YAML. (RRM-007, RWG-018)
- [x] 2.4 Extend `tests/engine/work-unit-projection.test.mjs`. Done when it proves production-style declared-output binding, duplicate URL position preservation, current-round/UID filtering, empty valid array behavior, result-hash/tuple/direct-output parent-root short-circuiting, and no test-local YAML/source matcher. (RRM-007, RWG-018)

## 3. Shared Readiness And Wave0 Gate Truth

- [x] 3.1 Change only the Wave0 branch of the existing projection-readiness evaluator to consume candidate coordinates. Done when exact valid entry IDs or identity-bound deferred entries cover one candidate each; bare work IDs, generic prose, anonymous dispositions, and out-of-range/malformed identities do not. (RRM-007)
- [x] 3.2 Preserve one root-first evaluator result for Wave0 inspect and formal gate, retaining Wave1/Wave2 identity behavior. Done when an invalid parent/local structural root masks derived candidate omissions, formal gate neither invokes inspect nor reparses source YAML, and the existing packet writer remains the sole writer rather than gaining a candidate validator. (RRM-007, RWG-018)
- [x] 3.3 Extend `tests/engine/helpers/return-map.test.mjs`. Done when it proves exact Wave0 candidate omissions/deferred coverage and parent short-circuiting while retaining the existing Wave1 work-id identity behavior. (RRM-007)
- [x] 3.4 Extend focused CLI integration proof through real submit -> public topic-state packet apply -> Wave0 inspect/formal gate. Done when N declared source-array candidates with fewer than N exact entries fail at the named coordinate, then pass after packet upsert or exact deferred disposition; no long multi-wave E2E is added. (RRM-007, RWG-018)

## 4. Agent-Facing Candidate Guidance

- [x] 4.1 Update the Seed Topic Wave0 card descriptor/template and the shared authoring cue to define positive ordinal as the current result-declared `source.yaml` array ordinal, not a permanent result-hash snapshot. Done when document shape remains separate from packet/lifecycle/repair protocol and static contract coverage detects descriptor/template drift. (RRM-003, STM-001, RWG-018)
- [x] 4.2 Update the existing `operate-topic-state` playbook and Wave0 phase closeout. Done when one work ID may contribute multiple packet entries/dispositions, every ordinary repair returns to packet -> writer -> same inspect, and no guidance permits direct seed/source/ledger edits or user-operated routine work. (RRM-003, RWP-016)
- [x] 4.3 Extend the focused Markdown/package contract test. Done when executable card descriptor, template, playbook, and Wave0 phase use the same current candidate-ordinal convention without introducing a second complete template or protocol. (RRM-003, STM-001, RWP-016)

## 5. Release, Verification, And Governance

- [x] 5.1 Run the selected focused unit and integration assets, including direct-output cardinality, the actual source candidate reader, return-map evaluator, public topic-state apply, Wave0 inspect/gate, and guidance contract. Done when the recorded results cover every selected `verification-plan.yaml` claim and no deterministic E2E or Agent-flow claim is fabricated. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 5.2 Update `CHANGELOG.md` for v0.54 with the candidate-granular current Wave0 projection behavior. Done when the entry distinguishes result declaration binding from source-byte snapshot authority and claims no new control plane. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 5.3 Synchronize the `DPT_FRAMEWORK/RUN.md` v0.54 banner with the new CHANGELOG entry. Done when both surfaces name the same release and describe the same bounded behavior. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 5.4 Run `node openspec/governance/check-verification-routing.mjs --change make-wave0-candidate-projection-complete --mode assets`. Done when every selected asset exists at its required route and the checker passes. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 5.5 Run `node openspec/governance/check-project-reqs.mjs`. Done when it reports 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired IDs. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 5.6 Run `node openspec/governance/check-project-specs.mjs`. Done when it reports 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
- [x] 5.7 Archive only after all tasks and required evidence are complete; sync accepted specs and record actual verification results. Done when BUG-132's final disposition and the umbrella plan progress record are updated through their allowed closure workflow. (RRM-003, RRM-007, RWG-018, STM-001, RWP-016)
