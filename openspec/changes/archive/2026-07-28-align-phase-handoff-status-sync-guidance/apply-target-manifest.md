# Apply Target Manifest: Align Phase Handoff Status-Sync Guidance

## Admission Record

- Change: `align-phase-handoff-status-sync-guidance`
- Required pre-edit check:
  `node openspec/governance/check-verification-routing.mjs --change align-phase-handoff-status-sync-guidance --mode plan`
- Current proposal position: planning artifacts are complete; no framework code,
  test, or runtime bundle has been edited by this change.

## Retained And Avoided Control Surfaces

| Surface | Planned target | Source of Record | Responsibility |
| --- | --- | --- | --- |
| Generic normal handoff guidance | `command_playbook/start-research.md` | Existing gate `check.next`, route-bound load, and source-gate transition contract | Add the omitted ordering instruction only. |
| Lifecycle entry witness | Existing `enter-phase` | `load_complete` and `rb_status.current_node` | Retained unchanged. |
| Lifecycle status synchronization | Existing `advance-status` | `rb_status.json` and `phase_transition` | Retained unchanged. |
| Documentation regression | `tests/engine/command-contract-docs.test.mjs` | Source Markdown | Assert the public sequence and boundaries. |

Avoided: new state, command, schema, writer, validator, automatic repair,
controller, host watcher, retry path, or user interaction authority.

## Requirement Traceability

| Requirement | Planned implementation and proof ownership |
| --- | --- |
| `CPT-008` | Complete the generic normal-handoff instruction and statically assert the required order and lifecycle distinctions. |

No new requirement ID or registry change is required.
