# Operate Canonical Topic State

Use this playbook only inside the existing legal HITL1 or route-bound HITL2→rerun lifecycle position. It does not create reentry, override, remove, rename or renumber authority.

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

If inspect reports an accepted operation, run its exact command and inspect again:

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs recover --bundle <bundle> --operation-id <id>
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle <bundle>
```

Otherwise retain the approved semantic input outside `_diagnostics/topic-state/`, then apply:

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-input.json>
```

After a committed add changes registry length, run the existing style owner, then inspect again. The Agent performs ordinary commands and reversible owner repair; ask the user only for unresolved semantics, risk or host permission.

Unsupported remove/retire/rename/renumber/path move remains the C3B boundary. Post-final fresh apply remains the C5 boundary. Do not hand-edit registry, seed, status or trace to simulate either capability.
