## 0. Apply Entry Review

- [x] 0.1 @impl FOR-001 `openspec-feedback:plan-review` - Before the first target edit, read current feedback-loop Apply guidance and review proposal, complete retirement delta, design, semantic closure, verification plan, `FOR-001` registry entry, catalog row, and the protected repair-loop/Gate-router/conditional-node owners. Record every actionable finding as an ordinary pending task with its owner, smallest repair, and independently observable done condition; complete only when none remains and plan-mode requirement, verification-routing, and semantic-closure checks pass.

## 1. Retire The False Capability

- [x] 1.1 @impl FOR-001 - Delete the live `openspec/specs/workflow/fork-repair-converge/` main spec. In `req-registry.yaml`, retain `FOR-001` with `[DEPRECATED]` and change `FOR` to `fork-repair-converge # all entries deprecated; no spec directory`. Done when the archived delta preserves the history, `FOR` does not resolve to a live main spec, and no live main spec presents `convergeRepair()` or `sharedRepairStep` as current behavior.
- [x] 1.2 @impl FOR-001 - In `openspec/specs/README.md`, remove the `workflow/fork-repair-converge` row and only the `capability:workflow/fork-repair-converge` Related entries links in the `engine/gate-fork-router`, `workflow/conditional-nodes`, and `workflow/repair-loop` rows. Preserve those three accepted main-spec files and every other catalog row. Done when the live catalog has neither the retired row nor any link to it, and a protected-surface comparison shows no change to those three main specs.

## 2. Verification And Closeout

- [x] 2.1 @impl FOR-001 - Run the scoped absence/protection scans, `node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs`, `git diff --check`, strict change validation, plan-mode requirement governance, verification-routing plan/assets checks, semantic-closure plan/assets checks, capability discovery, and project-spec checks. The absence scan SHALL allow the retired `FOR`/`FOR-001` registry history while proving the live spec directory and catalog row/links are absent; the protection scan SHALL show the three named adjacent main specs and every runtime source unchanged. Record only actual deterministic evidence; no Agent-runtime or new Engine behavior is claimed.
- [x] 2.2 @impl FOR-001 - Confirm the three removed delta requirements are reflected by the absent live main spec, the exact retired `FOR` prefix and `FOR-001` registry history, and catalog cleanup at the four named rows. Recheck that no unaffected current requirement is removed or rewritten.
- [x] 2.3 @impl FOR-001 `openspec-feedback:closeout-review` - Before archive, read current feedback-loop Archive guidance and review the scoped actual diff, protected current contracts, registry retirement, catalog cleanup, selected evidence, and semantic-closure reason. Add and close ordinary repair tasks for every finding; complete only when no actionable finding remains.

## 3. Archive Preconditions

- [x] 3.1 @impl FOR-001 - Compare the removed delta requirements with the retired live capability and run `node openspec/governance/check-project-reqs.mjs --mode archive --change retire-unimplemented-fork-repair-contract`. Done when it reports zero duplicate, orphan, unregistered, or reused-retired IDs.
- [x] 3.2 @impl FOR-001 - Run `node openspec/governance/check-project-specs.mjs`. Done when it reports zero delta-header-in-main, missing-purpose, missing-requirements, and missing-requirement-header findings.
- [x] 3.3 @impl FOR-001 - After all prior tasks and review-created repair tasks are complete, mark this archive-transition task complete immediately before invoking `node openspec/governance/finalize-change-archive.mjs --change retire-unimplemented-fork-repair-contract`. If finalization fails, restore this task to unchecked and repair its named root.
