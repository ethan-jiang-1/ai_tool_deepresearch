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
| 1. Governance and characterization | requirement registry, apply target manifest, apply-before incident evidence | `node openspec/governance/check-project-reqs.mjs`; strict scenario-preservation audit; BUG-078 focused test and production CLI characterization | Pending implementation checks; generic maintenance/debug state-seed remains out of scope |
