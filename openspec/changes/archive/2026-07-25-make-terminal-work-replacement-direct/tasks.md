## 1. Establish Contract Coverage

- [x] 1.1 Validate the selected verification plan before target edits and capture fresh disposable-bundle baseline bytes for the parent work-unit index, manifest, queue, and trace used by the replacement cases.
- [x] 1.2 Add focused unit coverage for DEW-006 and AGQ-001: classify failed/abandoned eligibility, exact record/manifest/terminal-history snapshot agreement, deterministic parent-derived queue identity, every listed copied queue-item contract field, and all five required replacement-lineage fields.
- [x] 1.3 Add focused unit negative and idempotence coverage for DEW-006: timed-out, submitted, claimed, missing or mismatched snapshot, conflicting lineage, and already-terminal successor all return a distinct no-path result without authority mutation; queued and in-flight successors return their different existing checkpoints without a sibling demand.
- [x] 1.4 Add integration coverage for DEW-006 and AGQ-019 in a fresh temporary bundle: `replace` creates one ordinary queue demand and one replacement trace event without a work ID, envelope, result, receipt, cache, ledger, completion, or parent-history mutation; a normal exact-role probe and `claim` then allocate the fresh work ID, while in-flight idempotence reports the existing work for reconstruction/polling rather than a second claim.
- [x] 1.5 Add CLI-contract integration coverage for DEW-006 and CLE-001: new and idempotent replacement emit one parseable stdout JSON document with exit 0, structured no-path refusal is non-zero and non-mutating, and diagnostics are reserved for invocation or runtime faults.
- [x] 1.6 Add Markdown integration coverage for RWP-015: Wave0 and Wave1 route `fail_and_replace` through terminalization and `replace`, then use a new or queued successor for exact-role probe and normal claim or reconstruct/poll an in-flight successor, while prohibiting equivalent-card reconstruction, filesystem discovery, terminal-status rewrites, and automatic claim.

## 2. Implement The Deterministic Replacement Transition

- [x] 2.1 Implement AGQ-001 and AGQ-019 queue-item lineage validation and construction for a replacement demand, preserving the snapshot's assignment contract while allowing only a fresh queue identity, ordinary queue state, and the five required parent-attempt lineage fields.
- [x] 2.2 Implement DEW-006 lifecycle replacement resolution inside the existing work-unit transaction: read direct terminal authority, verify exact snapshot agreement, distinguish queued versus in-flight idempotence from conflicting or terminal successors, admit one derived demand through normal queue admission, and write one durable `work_unit_replacement_created` trace only for a new demand.
- [x] 2.3 Extend `operate-work-unit` with the DEW-006 `replace <bundle> --work-id <id>` command, structured success/no-path results, existing stdout/exit conventions, and a location-correct next action: probe/claim with no work ID for a queued demand, or reconstruct/poll with only the existing work ID for an in-flight successor.
- [x] 2.4 Preserve DEW-006 and AGQ-019 boundaries in implementation: keep timed-out and actor-spawn retry paths unchanged; do not create a receipt, result, cache, ledger row, completion, queue-health override, raw queue edit, automatic claim, or sibling successor.

## 3. Align Agent-Facing Recovery Guidance

- [x] 3.1 Update the candidate/dry-submit feedback for DEW-006 so the eligible `fail_and_replace` disposition names terminalization followed by `operate-work-unit replace`, rather than manual enqueue of an equivalent assignment.
- [x] 3.2 Update Wave0 and Wave1 Phase guidance for RWP-015 to use a new or queued replacement demand only through the existing exact-role probe and normal claim, or to reconstruct/poll an already-in-flight successor, then resume the ordinary queue-drain loop.
- [x] 3.3 Update `DPT_FRAMEWORK/COMMANDS.md` for DEW-006 and CLE-001 with the `replace` invocation, eligibility/no-path boundaries, output/exit behavior, no-new-work-ID-until-claim rule, and the in-flight idempotence exception that reports an already-allocated ID only for reconstruction/polling.

## 4. Verify And Release

- [x] 4.1 Run the selected unit and integration assets, including terminal replacement, work-unit CLI, and Wave replacement-guidance coverage; retain failures as real evidence and do not substitute fabricated actor artifacts.
- [x] 4.2 Run `node openspec/governance/check-verification-routing.mjs --change make-terminal-work-replacement-direct --mode assets` and resolve every routing or asset-placement failure.
- [x] 4.3 Update `CHANGELOG.md` for v0.49 and synchronize the `DPT_FRAMEWORK/RUN.md` version banner with that release entry.
- [x] 4.4 Run `node openspec/governance/check-project-reqs.mjs` and confirm PASS with 0 duplicate, 0 orphan, 0 unregistered, and 0 reusedRetired requirements.
- [x] 4.5 Run `node openspec/governance/check-project-specs.mjs` and confirm PASS with 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
