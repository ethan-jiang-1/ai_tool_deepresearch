# continue-run-bundle

Agent command: reload one explicitly supplied, reachable existing run bundle.
This playbook is navigation and Agent flow; it does not create lifecycle,
Gate, receipt, trace, permission, or mutation authority.

## Entry Selection (canonical)

This section is the single canonical statement of the complete entry-selection
rule. All other entry surfaces (repo-root and Harness behavior files, Harness
README, RUN, COMMANDS, start-research) carry a short pointer to this section
instead of restating the rule.

An explicitly supplied reachable existing bundle candidate (a directory or a
file within it) with continuation, inspection, or maintenance/repair intent
first passes the same-root `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` preflight.
Continuation and inspection intent then follow the Reload Procedure below.
Maintenance/repair intent (修 bundle / 数据修复 / gate 修复 / 残留清理 / 为什么卡住) is
a defined entry intent family: it applies the SAME same-root preflight and stops
at the SAME boundary as continuation (no new stop name), then routes to
`command_playbook/repair-run-bundle.md` instead of the continuation or research
flow. It introduces no second continuation route, no third HITL, no permission
token, and no arbitrary mutation authority. Intent-family wording is navigation
guidance only: the Agent owns semantic classification, and mixed or ambiguous
intent asks the smallest clarification before routing.
A supplied candidate missing either file is `unsupported_current_entry_contract`:
stop without reading it as an operational entry, falling back to `RUN.md`,
creating a bundle, selecting another bundle, migration, upgrade, or a
human-only Harness command.
(注：bundle 创建同意的契约由 `cmd-bundle-instantiation` CMI-010 拥有，
不在本 canonical 节重复；创建行为始终经 CLI sibling 预检与用户显式同意放行。)

With no supplied existing candidate, research, deep-research, investigation,
or report intent with `DEEP_RESEARCH_HARNESS/` selected uses
`DEEP_RESEARCH_HARNESS/RUN.md`. A discovered, bare, or unreachable file does
not select a run. A verified selected bundle directory resolves to the
operation's canonical absolute current run bundle root.

Before the selected entry is read, do not invoke a built-in `research` /
`deep-research` shortcut, perform request-specific WebSearch/WebFetch, or
collect/synthesize evidence manually; the selected entry and its later phase
instructions authorize subsequent legal research work. Direct human reading of
historical Markdown remains outside this operational contract.

## Preconditions

- The user explicitly supplied/opened a reachable existing bundle candidate
  (a directory or a file within it) in
  the selected Deep Research Harness workspace and requested continuation,
  inspection, or maintenance/repair.
- The bundle's creation-time Harness coordinate is navigation text only. Use
  it only when it resolves inside the selected source context.

Do not select a bundle by scanning, a bare filename, chat memory, chronology,
or a copied/unreachable map. If the supplied bundle or selected Harness context
is unavailable, report the selected Harness context as unavailable and stop
before executing any bundle-provided command. Do not rewrite the bundle, scan
for another bundle, create an alternate source path, or infer a replacement
coordinate.

## Reload Procedure

1. Resolve the user-supplied directory (or the containing directory of the
   supplied entry file) to its canonical absolute path. This is the current
   run bundle root for this operation.
2. Verify the same root contains both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`
   before reading either file. If either is absent, report
   `unsupported_current_entry_contract` and stop. Do not read legacy Markdown,
   fall back to `RUN.md`, create or select another bundle, migrate, upgrade, or
   offer a human-only Harness command.
3. Read `BUNDLE_ENTRY.md`, then resolve the rendered Harness relative path from
   that entry. If the
   Harness is not reachable in the selected workspace, report the boundary and
   stop.
4. Read `BUNDLE_MAP.md` in the same current run bundle root for the full
   directory layout.
5. Read `DEEP_RESEARCH_HARNESS/COMMANDS.md` and select the command matching
   the user's stated intent.
6. Lifecycle integrity truth on resume: any engine checkpoint output carrying a
   `DPT_LIFECYCLE_INTEGRITY` block, or any doubt about whether earlier progress
   claims are real, SHALL be resolved by running
   `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <bundle>`
   before continuing. Its closed outcomes (`premature_final_present`,
   `plan_progress_tamper_suspected`, `status_drift`, `manual_bypass_suspected`,
   `missing_witness`, `failed_gate_downstream_status`, post-final stages) name
   the repair; bundle prose such as checked `rb_plan.md## Progress` boxes is
   presentation, not completion evidence. For presentation-only Progress drift
   (a lagging or hand-edited Progress section), the Engine-owned rebuild is
   `node DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs --bundle
   <bundle>`: it recreates the frozen Progress from trace witnesses, adds no
   gate semantics, and does not substitute for the audit.

## Authority Boundary

This playbook only bridges an explicitly supplied current run bundle root
through its static entry and passive bundle map to `COMMANDS.md`. It does not
duplicate lifecycle branching logic, reentry diagnostic procedures, per-node
target selection, or post-final recovery; those decisions belong to
`COMMANDS.md` and the individual CLI tools it references.

The user's continuation wording supplies semantic intent only. It does not
create a third HITL, expand host permission, override an Engine verdict, or
authorize a rerun. `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` do not themselves
select lifecycle work or runtime authority. Historical Markdown may be read
directly by a human outside this Harness operational contract.

When the selected current coordinate is Final, reload the resolved owner rather
than inferring one from chat: an admitted empty inventory needs bundle-base
delivery, an admitted post-ReopenResearchPass zero-append inventory needs the next global
delivery, and a bound current-lineage report may be refined in place. A clean
Final is not a default ReopenResearchPass request; satisfaction is not a runtime fact; and a
primary-looking pre-entry or drifted inventory remains blocked by the entry/
reentry contracts.
