## REMOVED Requirements

### Requirement: Gate transition table covers all states

**Reason**: The eight-state abstract FSM in `schema/contracts/gate.mjs` is not
used by a current runtime path and omits current lifecycle routes. Retaining it
as a live schema-core requirement makes a stale internal API appear to be a
current deterministic contract.

**Migration**: Retire `SCO-003` as `[DEPRECATED]` requirement-registry history.
For current transition behavior, consumers SHALL use the existing
`workflows/transitions.chain.json` source of record through
`resolveNodeTransitionDetailed()`. No compatibility export, adapter, alias, or
version fallback is provided for the retired abstract FSM.
