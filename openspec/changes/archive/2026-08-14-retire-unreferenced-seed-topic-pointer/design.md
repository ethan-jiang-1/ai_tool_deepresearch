## Context

See [proposal.md](proposal.md) for the approved retirement rationale. The
target is a standalone shared Markdown file with an empty dependency/context
list. It only redirects an Agent to owners that are already named by current
phase and template/playbook guidance. It is absent from the workflow manifest
and is not reached by the package validator's manifest or explicit
`requires`/`suggested_context` resolution.

The current Seed Topics dependency closure deliberately remains unchanged:
`phase-seed-topics.md` loads `shared-return-map-authoring` and
`templates/seed-topic-template`; the latter and the phase body route packet,
authorization, repair, and rerun work to `operate-topic-state.md`.

## Goals / Non-Goals

**Goals:**

- Remove one unregistered compatibility reading path.
- Leave the current dependency closure and direct authoring owners explicit and
  intact.
- Prove both the removed path's absence and the retained workflow package's
  consistency.

**Non-Goals:**

- Changing phase loading, manifest membership, shared return-map rules, seed
  rendering, topic-state mutation, Gate behavior, CLI behavior, bundle formats,
  or Agent-flow semantics.
- Adding a replacement pointer, alias, dynamic shared-file discovery, migration,
  fallback, state, check, or recovery path.

## Decisions

### Delete exactly the unreferenced pointer

Apply deletes only
`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-seed-topic-authoring.md`.
No file is moved and no text is copied into another shared file. Keeping a
tombstone or forwarding file would leave the obsolete reader question alive and
compete with the current direct owners; both alternatives are rejected.

### Preserve the loaded current closure

The manifest and every phase frontmatter remain unmodified. In particular,
`shared-return-map-authoring.md` is protected because the Seed Topics phase
loads it and it owns a separate current return-map rule. The template and
playbook retain their existing document-shape and packet/apply/repair roles.
This separation prevents a dead compatibility pointer from being confused with
a current shared dependency.

### Verify static absence plus existing package consistency

Apply first repeats the exact pointer file/ID/scope scan across current
supported surfaces. It then deletes the file, proves no unexpected current
reference remains, and runs the existing workflow-package validator. No new
runtime test or validator is introduced: this change has no new deterministic
claim, and the existing validator already directly checks manifest and explicit
dependency resolution. The static loader evidence is
`resolveDependencyClosure()` in `engine/workflow-chain.mjs`: it recursively
reads only the selected node's frontmatter `requires`; it does not enumerate
the shared directory. Existing workflow-chain and package-validator tests use
synthetic packages, so they remain regression context rather than claimed
proof that this particular current pointer has no caller.

### Constitutional review

The reader question is bounded: "Where does a current Agent obtain seed-topic
authoring guidance?" Removing the unused pointer makes the normal stop direct:
follow the loaded shared return-map guidance where applicable, the template for
document shape, and the playbook for packet/apply/repair. No new concept,
projection, state, or view is introduced.

This is a net simplification. It removes one duplicate reading path and adds no
control loop, check, branch, retry, or fallback. The user decided that the
unsupported path should be retired; the Agent performs the authorized deletion
and evidence collection; the Engine retains its existing manifest/dependency
validation verdict and gains no authority.

## Risks / Trade-offs

- [A manual user of the obsolete pathname can no longer open it] -> This is the
  approved unsupported-path boundary; direct current owners remain unchanged.
- [An undiscovered current loader or documentation link could break] -> Repeat
  the scoped exact-identity scan before deletion and prove manifest/phase
  dependency closure is unchanged after deletion.
- [The cleanup could accidentally remove the loaded return-map contract] ->
  protect `shared-return-map-authoring.md`, the template, and the playbook in
  the task list and diff review.

## Migration Plan

No bundle data or runtime migration is needed. During Apply, delete the one
file and run the selected absence/package checks. Before archive, inspect the
bounded diff to confirm protected current owners did not change. Before archive
the rollback is a source-control revert of this single deletion; no runtime
state, receipt, trace, or bundle content is restored or mutated.
