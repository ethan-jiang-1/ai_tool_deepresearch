# C1d: Decide the Unimplemented Fork-Repair Contract

> Candidate change: `retire-unimplemented-fork-repair-contract`
>
> Status: product decision required; awaiting user approval
>
> Risk: L2

## One Question

Is multi-fail shared repair convergence a current product commitment that should
be implemented, or an obsolete architecture promise that should leave the main
spec and catalog?

## Verified Boundary

`workflow/fork-repair-converge/spec.md` requires `convergeRepair()` and
`sharedRepairStep`, including deterministic iteration/stall behavior. No current
Harness source, current test, or registered playbook defines or invokes either
API. References outside the main spec are the requirement registry and catalog
cross-links; prototype material is not a current runtime owner.

Current Gate behavior is separately owned by the chain/router and current
repair-loop/gate-fork contracts. Retiring this spec does not authorize changes to
those current contracts.

## Choices

| Choice | Result | Cost |
|---|---|---|
| A. Retire the contract (recommended for current-only signal) | Remove/retire `FOR-001` and its catalog/cross-links; preserve real current Gate/repair contracts | Explicitly abandons this unimplemented architecture promise. |
| B. Keep it as a future promise | No cleanup | The accepted main spec continues to assert APIs that do not exist. |
| C. Implement it | Create a distinct product feature change | Broadens scope beyond signal cleanup and needs independent design/review. |

## Effect And Side Effects

Retiring Choice A changes no current runtime behavior, but it does change what
the project claims to promise. That is why this is a product decision rather
than a mechanical dead-file deletion. Requirement identity/history must remain
traceable through the governed retirement route rather than by deleting registry
data ad hoc.

## Proposal Gate

- [x] No current implementation/caller/test/playbook owner exists.
- [x] Current Gate/repair contracts are identified as protected adjacent behavior.
- [x] Global Coverage Gate is complete.
- [ ] User chooses A, B, or C.
- [ ] If A is chosen, proposal defines the requirement-registry/catalog/spec retirement route and proves no current spec still promises the removed API.

## Expected Verification

```bash
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
