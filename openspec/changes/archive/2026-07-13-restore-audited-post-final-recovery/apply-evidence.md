# Apply Evidence: restore-audited-post-final-recovery

This ledger records implementation targets, proof commands, and residual boundaries for C5.

## Apply Target Manifest

| Surface | Disposition | Owner / Boundary |
|---|---|---|
| Post-final operation | Add one `post-final-recovery` helper and one `operate-post-final-recovery.mjs` CLI with `inspect|apply|recover` | Closed action `post_final_rerun`; no generic override or state-seed |
| Durable recovery state | Add one `_diagnostics/post-final-recovery/<operation-id>/` prepared workspace and one `post_final_reentry` event class | Workspace owns only request/profile/event staging; event is appended through the existing trace owner |
| Bundle identity | Extract and reuse one pure bundle-basename normalizer | No UUID bundle registry or identity token |
| Routing | Reuse HITL2 `rerun` transition and workflow manifest status window | No Final outgoing edge or C5-local routing table |
| Entry/status | Extend existing handoff parser, `enter-phase`, and `advance-status` | C5 does not write `rb_status.json`; existing owners retain node/status writes |
| Topic mutation | Extend only the existing C3 authorization witness adapter | C3 remains the only topic registry/seed/layout writer |
| Reentry | Extend existing read-only status/recovery projections | No repair controller, watcher, daemon, retry tree, or persisted lifecycle mode |
| Agent guidance | Add one legal post-final rerun chain | User owns new semantics/risk and host-only approval; Agent owns remaining mechanical execution |
| Explicitly rejected | Generic override/state-seed, verified-human token, Final loop, second request ledger, second topic owner, addendum success namespace | Out of scope and unavailable |

Paired-direction review:

- `guidelines/evolution-simple-reliable-control.md`: one evaluator, one workspace, one event, existing transition/status/topic owners, one nearest action per stage.
- `guidelines/evolution-helper-oriented-agent.md`: request metadata records semantics but does not create permission; after the semantic/risk decision the Agent performs retained request, apply/recover, entry, status sync, audit, and rerun work.

## BUG-078 Apply-Before Characterization

Recorded before target implementation on 2026-07-13.

1. Production `check-reentry` on the incident-shaped terminal Final fixture grouped one canonical root and returned `sanctioned_path_status: missing_contract` with no mutation:

```bash
node --test --test-name-pattern='groups an incident into one blocking canonical root' tests/integration/cli/check-reentry.test.mjs
```

Result: PASS; the fixture proves terminal `readiness_passed → none`, current Final node, a registry-external durable topic, and no hand-written success authority.

2. Production `enter-phase` on a real minimal terminal bundle rejected the old predecessor route:

```text
requested node "phases/phase-hitl2.md" is not authorized by latest deterministic handoff;
latest check.next is "phases/phase-final.md" from readiness-passed
```

This establishes that the accepted latest readiness→Final gate/load exists while neither stale HITL2 entry nor predecessor-gate advice can reopen the run.

## Threat Model Assertions

- The retained request is semantic/audit input plus optimistic concurrency, not verified caller identity or a permission token.
- Host permission and approval remain external to the framework.
- A malicious actor with the same OS principal and arbitrary bundle-write/command execution capability is outside C5's claimed defense.
- C5 rejects unsupported action, stale/wrong lineage, wrong bundle identity, partial workspace, route/rule drift, and unauthorized lifecycle shapes without fabricating authority.

## Verification Ledger

| Section | Changed surfaces | Focused proof | Result / Residual risk |
|---|---|---|---|
| 1. Governance and characterization | requirement registry, apply target manifest, apply-before incident evidence | `node openspec/governance/check-project-reqs.mjs`; strict scenario-preservation audit; BUG-078 focused test and production CLI characterization | Focused characterization PASS; final governance rerun pending |
| 2–5. Runtime and Agent flow | post-final evaluator/request/workspace, exact trace append, exceptional handoff/status sync, C3 witness adapter, reentry projection, command guidance | `node --test tests/engine/helpers/post-final-recovery.test.mjs tests/integration/cli/post-final-recovery.test.mjs tests/integration/md/post-final-recovery-contract.test.mjs` plus adjacent C3/CPT/RRD tests | 30/30 C5 focused assertions PASS before final affected/full regression |
| 6. Controlled proof | `case-317-light-post-final-recovery.md` and production runner | `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_reentry-debuggability`; `node experiments_env/shared/run-post-final-recovery-case.mjs --case case-317 --target-dir tests/.test-bundles --cleanup-pass` | 8/8 playbooks PASS; case 317 PASS; disposable bundle removed |
| 8.1–8.2 affected regression | setup identity, trace, handoff, entry/status/audit, reentry, C3A/C3B, rerun gate, command/static contracts | 19 affected test files in one `node --test` invocation | 171/171 PASS; `git diff --check` PASS |
| 8.3 full regression | complete root regression suite | `node --test tests` | First run exposed the new CLI missing from the exit-code inventory; after adding the inventory/runtime sample, final rerun PASS: 1522/1522 |
| 8.4 strict validation | active change artifacts | `openspec validate restore-audited-post-final-recovery --strict` | PASS |
| 8.5 requirement governance | registry plus main/active delta occurrences | `node openspec/governance/check-project-reqs.mjs` | PASS: 530 registered, 53 retired, 0 orphan, 570 occurrences |
| 8.6 spec governance | all main specs | `node openspec/governance/check-project-specs.mjs` | PASS: 73 main specs, 0 violations |

## Controlled Case 317 Proof

The incident-shaped controlled case starts from real byte-valid terminal `readiness_passed → Final` fixture state, then uses production CLIs and real disposable bundle bytes for every new authority:

```bash
node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_reentry-debuggability
node experiments_env/shared/run-post-final-recovery-case.mjs --case case-317 --target-dir tests/.test-bundles --cleanup-pass
```

Recorded result on 2026-07-13:

- Playbook validation: `8 passed, 0 failed`.
- Case 317 verdict: `PASS`.
- Trace proves the prior legal Final lineage, exactly one `post_final_reentry` event, exact event-bound exceptional load and status transition, then a normal rerun-ready descendant handoff.
- Filesystem proves canonical C3 topic registration and seed materialization, stable repeat apply (`unchanged`), no `_cache/addendum/` or `final/addendum/`, and no hand-written success authority.
- `--cleanup-pass` removed the disposable bundle after assertions.

Residual boundary: generic maintenance/debug state-seed and arbitrary human override remain unavailable and are not claimed by C5.

## Final Paired-Direction Scope Audit

Audited from pre-apply baseline `f5f1a66a0` through the final worktree on 2026-07-13:

- One capability prefix (`POF`), one public operation CLI (`operate-post-final-recovery.mjs`), one operation helper, one prepared workspace root, and one event class (`post_final_reentry`). The adjacent reentry-contract module is an immutable parser/schema used by existing owners, not a writer or controller.
- One extracted bundle-basename normalizer is reused by setup and C5. Routing still comes from the existing HITL2 `rerun` transition/manifest; no transition chain, gate definition, or new phase was added.
- Exact event publication calls `appendExactTraceLine` in the existing trace owner. Entry, status synchronization, phase-status audit, reentry projection, and topic mutation remain in their existing owners.
- The C5 helper writes only its prepared workspace, `rb_profile.yaml`, and the exact trace event; it reads but does not write `rb_status.json`, topic registry/seeds, queue/work-unit, ledger/receipt, artifact/reference, or Final bytes.
- The public CLI accepts only `inspect|apply|recover` plus `--bundle`, `--input`, or `--operation-id` in closed combinations. It exposes no caller-chosen route/status/event payload, `--force`, `--override`, `--human-directed`, identity token, or environment-variable bypass.
- No generic override/state-seed, auth service/UUID registry, Final loop, second lifecycle/status/topic/trace owner, request ledger, watcher, daemon, session manager, retry tree, or addendum authority was added.
- The resulting control loop remains direct: inspect one fact set → prepare one retained semantic request → apply or exact recover → reuse existing entry/status/C3/rerun owners → rerun the same nearest checkpoint.
