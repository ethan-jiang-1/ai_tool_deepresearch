---
title: Rename Framework to Deep Research Harness
status: active_openspec_change
created: 2026-08-05
change: rename-framework-to-deep-research-harness
---

# Rename Framework to Deep Research Harness

## Decision

The reusable system is the **Deep Research Harness**, rooted canonically at
`DEEP_RESEARCH_HARNESS/`. A **run bundle** is the durable package for one
bounded research engagement; a **research run** is its lifecycle. For any one
operation, the **current run bundle root** is the explicitly selected, resolved
absolute bundle directory, never a global/latest/chat-derived value.

`DPT_FRAMEWORK/` remains one legacy compatibility path to the same Harness.
`dpt_rb_*` and `dpt_disp_*` remain unchanged. New bundles use
`BUNDLE_ENTRY.md`; supplied existing bundles retain ordered entry fallback:
`BUNDLE_ENTRY.md`, `RUN_BUNDLE.md`, then `BUNDLE_MAP.md`.

## Delivery Vehicle

The authoritative implementation plan is the OpenSpec change
[`rename-framework-to-deep-research-harness`](../../openspec/changes/rename-framework-to-deep-research-harness/).
Its [proposal](../../openspec/changes/rename-framework-to-deep-research-harness/proposal.md),
[design](../../openspec/changes/rename-framework-to-deep-research-harness/design.md),
[tasks](../../openspec/changes/rename-framework-to-deep-research-harness/tasks.md),
and [verification plan](../../openspec/changes/rename-framework-to-deep-research-harness/verification-plan.yaml)
are the current planning record.

## Boundaries

- The change moves one source tree and preserves one symlink; it does not add a
  second source tree, prefix grammar, path registry, global current-run state,
  lifecycle state, Gate, or workflow controller.
- Existing production and disposable bundles remain runtime truth and are never
  rewritten by this migration.
- Deterministic verification covers canonical/legacy path compatibility,
  entry-card precedence, and explicit bundle-root resolution. It makes no
  real-Agent behavior claim.

## Re-entry

Resume this plan through the OpenSpec change. Target files remain untouched
until `/opsx:apply` executes the approved task list.
