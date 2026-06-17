# Tasks: prototype-subagent

## 0. Real-subagent realignment

- [x] 0.1 Record final real-subagent decision in `docs/feedback/final_real-subagent.md`
- [x] 0.2 Rewrite `docs/architect/todo-prototype-subagent.md` around native LLM subagents, Parent Relay, and `result.json`
- [x] 0.3 Update OpenSpec proposal/design/specs to remove Node process proof from real acceptance

## 1. Preserve Engine-owned slot foundation

- [x] 1.1 Keep Engine-owned wave/slot dispatch semantics under `_subagents/wave_NN/`
- [x] 1.2 Keep deterministic slot lifecycle statuses: `pending`, `running`, `done`, `failed`
- [x] 1.3 Keep partial-failure-tolerant merge semantics
- [x] 1.4 Keep all-slots-failed routing through existing repair semantics

## 2. Project-level role agents

- [x] 2.1 Add `DPT_FRAMEWORK/command_playbook/setup-real-subagents.md` to prepare project-level role-agent definitions
- [x] 2.2 Register `setup-real-subagents` in `DPT_FRAMEWORK/COMMANDS.md`
- [x] 2.3 Register `CSE-001` in `DPT_FRAMEWORK/req-registry.yaml`
- [x] 2.4 Use the setup command to define Claude Code project agents in `.claude/agents/*.md` for v1 roles: `dpt-source-intake`, `dpt-source-diagnostic`, `dpt-claim-verifier`, `dpt-evidence-extractor`
- [x] 2.5 Use the setup command to define Codex project agents in `.codex/agents/*.toml` where supported for the same v1 roles
- [x] 2.6 Document Codex app path using the same DPT role-agent taxonomy plus per-slot dynamic prompt
- [x] 2.7 Add v1.5 role placeholders for `dpt-topic-scout` and `dpt-synthesis-reviewer` without wiring them into v1 experiments

## 3. Dynamic slot contract

- [x] 3.1 Extend slot config with `roleAgentKey`, bounded `taskDescription`, optional `modelHint`, and optional `timeoutMs`
- [x] 3.2 Generate `task.md` per slot with no raw WorkflowState, gate internals, repair queue, or unrelated slot output
- [x] 3.3 Generate `result.schema.json` per slot as the strict collection contract
- [x] 3.4 Add slot paths for `result.json`, optional `result.md`, and `_agent.json`

## 4. Parent Relay

- [x] 4.1 Implement parent-side native agent spawn request construction for Claude Code and Codex
- [x] 4.2 Enforce v1 concurrency cap of 3 active subagent slots per wave
- [x] 4.3 Require subagent final response to be strict JSON only
- [x] 4.4 Validate returned JSON against `result.schema.json`
- [x] 4.5 Parent writes `result.json`, optional `result.md`, `_status.json`, and `_agent.json`
- [x] 4.6 Mark slot failed on timeout, spawn failure, non-JSON response, or schema validation failure

## 5. Collect and merge on `result.json`

- [x] 5.1 Update collection to treat `result.json` as the primary machine contract
- [x] 5.2 Treat missing or invalid `result.json` as a failed slot
- [x] 5.3 Keep `result.md` optional and human-readable only
- [x] 5.4 Preserve partial-failure merge and all-failed repair routing

## 6. Runtime trace and audit

- [x] 6.1 Emit `agent_spawn_requested`
- [x] 6.2 Import subagent-written `agent_runtime_started`
- [x] 6.3 Import subagent-written `agent_result_ready`
- [x] 6.4 Emit `agent_result_received`
- [x] 6.5 Emit `result_schema_validated`
- [x] 6.6 Emit `collect_result`
- [x] 6.7 Emit `merge_complete`
- [x] 6.8 Audit that real acceptance is based on subagent-written runtime receipts and validated Parent Relay outputs

## 7. Real experiment family

- [x] 7.1 Rewrite `DPT_FRAMEWORK/command_experiments/subagent/test-simple.md` to use native LLM subagent runtime and Parent Relay
- [x] 7.2 Rewrite `DPT_FRAMEWORK/command_experiments/subagent/test-medium.md` to use native LLM subagent runtime and Parent Relay
- [x] 7.3 Rewrite `DPT_FRAMEWORK/command_experiments/subagent/test-complex.md` to use native LLM subagent runtime and Parent Relay
- [x] 7.4 Refactor `experiments/prototype-subagent/subagent.mjs`, `subagent.test.mjs`, and `trace.mjs` to align with `result.json` / `result.schema.json` / `_agent.json`
- [x] 7.5 Rewrite or retire `experiments/prototype-subagent/subagent-instructions/*.md` from the real path
- [x] 7.6 Verify Codex app path with DPT role subagents plus per-slot dynamic prompt
- [x] 7.7 Verify Claude Code path with explicit named project agents or session dynamic agents

## 8. Legacy execution cleanup

- [x] 8.1 Remove non-runtime execution artifacts from the real experiment surface
- [x] 8.2 Remove non-runtime proof language from the real playbooks and experiment report
- [x] 8.3 Keep the real experiment playbooks and docs focused on native runtime execution
- [x] 8.4 Verify grep audit has no legacy execution residue in the real experiment surface
