# C1c: Retire the Stale Abstract Gate FSM

> Candidate change: `retire-stale-abstract-gate-fsm`
>
> Planned execution batch: dashboard item 10 `retire-inactive-contract-surfaces`
>
> Status: decision card; internal API-removal approval pending
>
> Risk: L2

## One Question

Should the stale eight-state `schema/contracts/gate.mjs` table and its exported
internal API stop being presented or retained as a supported contract?

## Verified Boundary

The file itself states that it is not used by any runtime path and omits current
HITL1, seed-topic, and rerun transitions. Current routing is
`workflows/transitions.chain.json` plus `resolveNodeTransitionDetailed()`.

The five exported stale values are currently consumed only by:

- the `schema/index.mjs` barrel;
- two focused tests that assert the obsolete transition model;
- Harness docs/shared guidance, a non-authoritative model, and accepted specs
  that still call it current or retained-for-compatibility.

Current runtime imports from the schema barrel use other schema exports. No
current Harness runtime import, dynamic import, or package-distribution evidence
uses the stale five exports. The package is private at `0.0.0`; unknown external
callers are not a reason to keep a retired internal API.

## Proposed Current-Only Result

Remove the stale FSM module, its barrel exports, its positive tests, and current
docs/spec wording that present it as a contract. Preserve the real
chain/router/gate-definition behavior and its focused verification.

## Effect And Side Effects

| Effect | Consequence |
|---|---|
| Removes a duplicate, factually stale transition model | Agents and maintainers have one deterministic transition owner. |
| Breaks direct imports of the five old exports | There is no known current consumer; any such import becomes an intentional unsupported internal API. |
| Requires accepted-spec and requirement-registry work | `SCO-003` and `TRT-011` currently describe retention, and routing docs/models must stop calling the table current. |
| Does not alter current Gate execution | Gate CLI routing already uses the chain/router path; the proposal must characterize that path before deleting tests. |

## Policy Decision

The current-only policy favors removal. The only meaningful cost is an explicit
internal import break, not a run-bundle or recovery-format break. The user must
approve that API removal after the global Coverage Gate is complete.

## Proposal Gate

- [x] Static import/export inventory isolates the stale exports from current runtime use.
- [x] Current router owner and stale-test-only consumers are identified.
- [x] Global Coverage Gate is complete.
- [ ] User approves the internal API removal.
- [ ] Proposal gives `SCO-003`/`TRT-011` a governed retirement or replacement route; it does not leave accepted specs claiming a removed file exists.
- [ ] Current chain/router Gate behavior has focused characterization coverage before stale tests are removed.

## Expected Verification

```bash
node --test tests/helpers/md-phase-checks.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
```
