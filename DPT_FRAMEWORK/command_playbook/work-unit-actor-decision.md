# Work-Unit Actor Decision

Use one visible decision loop. Do not claim work merely to test whether an actor can run.

1. Run `operate-work-unit inspect <bundle>` and read the queue-front intended delegated role.
2. Perform one small real native probe for that exact role.
3. Run the existing claim checkpoint with the normalized observation and explicit actor class.

Available normal actor:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count 5 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent
```

Missing or inconclusive observation allocates nothing:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count 5 --actor-outcome unknown --actor-source not_observed --actor-role-key dpt-source-intake --actor-reason observation_required --execution-actor delegated_subagent
```

Classified unavailable actor with explicit single fallback:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim <bundle> --phase wave0 --count 5 --actor-outcome unavailable --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_capacity_unavailable --execution-actor phase_agent_fallback
```

The Phase Agent executes the returned fallback task inside its normal work-unit envelope and runs dry-submit/formal submit before another fallback claim. If a normal spawn fails before progress, run `fail --reason actor_spawn_unavailable:<reason_code>`, make a fresh probe, and claim a new attempt. Ask the user only for an external host/account/permission action the Agent cannot perform; `human-directed` is not availability evidence or permission.
