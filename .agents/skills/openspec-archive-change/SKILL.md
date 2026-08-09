---
name: openspec-archive-change
description: Archive a completed OpenSpec change through the governed finalizer.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.8.0"
---

Archive a completed change through the project's governed finalizer.

**Store selection:** If the work lives in a registered standalone OpenSpec store,
run `openspec store list --json` and preserve the selected `--store <id>` flag on
all later OpenSpec commands. Otherwise use the nearest local `openspec/` root.

**Input:** Optionally specify a change name (for example,
`/openspec-archive-change add-auth`). If it is absent, infer it from the current
conversation, auto-select the sole active change, or ask the user to choose among
active changes.

## Steps

1. **Select one active change**

   Announce `Using change: <name>` and preserve that identity through review and
   finalization. Do not substitute a different active change after review begins.

2. **Load archive inputs**

   Run both commands before finalization:

   ```bash
   openspec status --change "<name>" --json
   openspec instructions archive --change "<name>" --json
   ```

   Read the returned context and every applicable operation-guidance entry. Require
   valid operation guidance containing `change-feedback-loop/archive:`. A failed or
   missing instruction lookup stops before finalization and uses the instruction
   command as the rerun coordinate. Before finalization, require exactly one
   `openspec-feedback:plan-review` task and one
   `openspec-feedback:closeout-review` task. An unmarked or malformed selected
   change stops here: add the existing review-marker tasks, then resume Apply; do
   not invoke the finalizer or a native archive command.

3. **Close the Agent-owned work**

   Read `guidelines/change-feedback-loop.md`. Review the selected change-scoped
   actual diff, artifacts, and selected verification evidence. Record each
   actionable finding as an ordinary pending task and keep the closeout marker
   incomplete until no finding remains. Where delta specs exist, complete the
   Agent-owned delta/main sync and re-comparison before finalization. All task and
   review markers must be complete. Review `semantic-closure.yaml` against the
   actual changed surfaces: for `affected`, assess the bounded fact, resolver,
   `established_by`, consumers, and overlap; for `not_applicable`, assess the
   reason. A structural checker result is not semantic-completeness proof.

4. **Run the sole final mechanical transition**

   ```bash
   node openspec/governance/finalize-change-archive.mjs --change "<name>"
   ```

   On a blocked result, repair its named legal root and rerun that command. The
   finalizer owns the deterministic completion checks and the repository archive
   transition; this entry does not provide an alternate success path.

## Guardrails

- Keep the selected change identity stable.
- Do not treat guidance as completion proof.
- Do not finalize while a review marker or ordinary task is pending.
- Do not bypass the governed finalizer.
