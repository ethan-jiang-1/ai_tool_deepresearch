# Engine Tests

Engine tests cover framework logic that can be exercised without driving a full research run.

Run this layer with:

```bash
node --test tests/engine
```

Use focused file runs while editing one contract:

```bash
node --test tests/engine/command-contract-docs.test.mjs
```

`command-contract-docs.test.mjs` is a static regression suite for the command-surface hardening contract: Agent-facing command audience, HITL1/HITL2 interaction boundaries, Final delivery wording, exit-code documentation, and phase handoff terminology.
