# Render HITL1 Controls

Use this playbook only after HITL1 has resolved any material conflict with the
existing profile or must-answer owner. This command renders a section; it never
selects a bundle, writes `rb_plan.md`, or grants host-file authority.

For no additional controls, run:

```bash
node DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs render-no-controls
```

For a resolved snapshot saved at one explicit UTF-8 input path, run:

```bash
node DPT_FRAMEWORK/cli/plan-hostfile-sections.mjs render-supplied-controls --input <snapshot-path>
```

Read stdout and write the returned section only at the existing Agent-owned
`rb_plan.md## Constraints > ### User Research Controls` coordinate. The input
path is not retained authority and must not become a later synchronization or
re-read protocol.

`--help`/`-h` exits `0` without reading a snapshot. An unknown subcommand,
missing input, duplicate option, or unreadable/non-UTF-8 snapshot exits `2`
with a structured invocation root. Correct that direct input or report the
missing command surface; do not hand-write a substitute fence or edit an
Engine-owned surface.
