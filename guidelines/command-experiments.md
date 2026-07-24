---
guideline_id: command-experiments
suite: deep-research-guidelines
title: Command Experiments Guideline
status: effective
created: 2026-06-17
revised: 2026-07-25
role: constitutional guidance for Agent-driven command experiments
scope: experiments_playbook/*, experiments
authority: guidance
defers_to:
  - guidelines/project-charter.md
siblings:
  - guidelines/project-charter.md
  - guidelines/evolution-abstraction-semantic-precision.md
  - guidelines/evolution-simple-reliable-control.md
  - guidelines/evolution-helper-oriented-agent.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-subagent-mechanism.md
---

# Command Experiments

Command experiments prove Agent-facing mechanisms in real disposable runtime state. Markdown remains the Agent Flow control surface; Agent intelligence performs semantic work; Engine/CLI supplies deterministic checkpoints and durable facts.

This guideline fixes the experiment constitution. It does not define concrete frontmatter fields, CLI flags, schema shapes, case inventories, or report fields. Those belong to accepted specs and executable contracts.

## Position

| Question | Authority |
|---|---|
| Why the experiment exists, what evidence counts, and who owns each action | This guideline |
| Accepted behavior and contracts | the applicable accepted behavior contract and active change context |
| Current schema, CLI, validation, and report behavior | the applicable executable contract and regression evidence |
| Current runnable registration and order | the selected operational context |
| One case's Agent Flow and proof claim | Its Markdown playbook |
| One run's truth | Its explicit case run root and declared bundle roots |

Guidance must not override an accepted spec, executable contract, or runtime fact. When behavior changes, use OpenSpec; do not legislate it into this file.

## Canonical Terms

- **Agent Experiment Autorun**: normal unattended launch model in which a real Agent runtime still executes the experiment.
- **Autorun Supervisor**: deterministic host lifecycle owner. It selects, launches, validates completion, runs health, audits, reports, and applies authorized cleanup.
- **Agent CLI Launcher**: host transport that configures and starts the Coding Agent runtime. It is not the experiment executor.
- **Headless Playbook Agent**: the Coding Agent that executes one Markdown playbook under Autorun.
- **Interactive Playbook Agent**: the user-present Coding Agent used for one-case diagnosis, replay, or real-human judgment.
- **Subject Agent/Sub-agent**: an additional case-owned actor whose semantic behavior is under test.
- **Native playbook completion**: the case-owned, trace-bound completion fact produced at the playbook's verdict boundary.

Do not call Autorun a traditional CLI test, call the Supervisor the brain, or treat the Playbook Agent and Subject Agent as the same actor.

## Launch Model

```text
Normal Agent Autorun
operator/host
  -> Autorun Supervisor
  -> Agent CLI Launcher
  -> Headless Playbook Agent
  -> Markdown Agent Flow
  -> Engine checkpoints (+ optional Subject Agent/Sub-agent)
  -> native completion
  -> Supervisor health/audit/report/authorized cleanup

Interactive diagnosis or human judgment
operator
  -> Autorun Supervisor
  -> Agent CLI Launcher
  -> Interactive Playbook Agent
  -> the same Markdown/Engine/native-completion contract
  -> Supervisor health/audit; runtime preserved
```

Headless and Interactive describe how the Playbook Agent is launched. They are not “script mode” and “Agent mode.” Interactive is a bounded diagnostic/manual path, not a second default batch system.

## Ownership

### Playbook Agent

Owns reading and executing the complete Markdown flow, consuming Engine feedback, choosing authorized repair, performing semantic work assigned to it, invoking required Subject actors, and reaching the native verdict boundary.

It must not skip non-shell Agent steps, replace the playbook with an equivalent script, run post-case health, or clean runtime state.

### Subject Agent/Sub-agent

Owns only the intelligent work explicitly assigned by the case. When the claim concerns Subject behavior, PASS requires independent Subject runtime evidence. Playbook-Agent participation, fixture output, or parent narration cannot substitute.

### Engine/CLI

Owns schemas, deterministic state transitions, gates, receipts, trace facts, and native completion checks. It does not own search strategy, semantic judgment, writing, synthesis, or repair reasoning.

### Autorun Supervisor

Owns host lifecycle, not Agent Flow. It may validate declared completion and health facts, but must not parse arbitrary checks, console prose, or filesystem order to invent a second verdict.

## Evidence Constitution

1. **Real events only.** Runtime files, receipts, trace rows, Agent transcripts, and judge records must come from the execution they claim to prove.
2. **One direct authority chain.** Manifest selects the case; the playbook executes it; runtime trace and files hold facts; native completion binds the case outcome; health remains a separate diagnosis.
3. **Proof distance is explicit.** Fixture-backed cases prove deterministic contracts only. Claims about search, judgment, writing, repair, synthesis, routing, or Sub-agent behavior require the real actor.
4. **Verdict facts are case-owned.** Every verdict-affecting assertion must be durable and machine-checkable. Narrative confidence and console PASS are not evidence.
5. **Human and AI judgment stay distinct.** AI-judge evidence never replaces, completes, or erases a real-human claim. The producer and semantic judge must be separate actors.

A thin deterministic helper may prepare fixtures or derive facts. It must not become a hidden Playbook Agent, fabricate Subject output, publish completion on behalf of the case, or own health/cleanup.

## Runtime Boundary

Each execution has one explicit Supervisor-owned case run root. Its declared direct-child bundle roots contain mutable case truth. Paths cross tool calls through explicit context-bound state, not shell environment, chat memory, cwd inference, “latest run,” or filesystem order.

`.exp-bundles/` contains run-owned state, logs, evidence, audit, and reports only. `DPT_FRAMEWORK/`, `experiments_env/`, and `tests/` remain one repository-root source tree; they are never copied, symlinked, or hardlinked into a run root.

Containment defines mutation and cleanup authority. It is not a security sandbox for hostile playbooks.

## Outcome, Health, And Cleanup

Native outcome, host lifecycle outcome, Agent process status, and bundle health answer different questions and must remain separate.

- Native completion is the only completed-case PASS/FAIL/NOT_RUN authority.
- Missing or malformed completion is an execution error, not an invitation for the Supervisor to reinterpret partial trace.
- Health may report CLEAN, ISSUES, or ERROR without rewriting native outcome.
- Cleanup is explicit host policy, never a playbook verdict step.
- Only an effective clean PASS may be removed, and only after durable outside-root audit/evidence succeeds.
- FAIL, NOT_RUN, lifecycle failure, health issues, and Interactive runs remain available for diagnosis.

The durable audit/report is a projection of these facts, not a new verdict source.

## CI Boundary

Ordinary CI and `node:test` cannot execute `agent_flow_e2e` by themselves. Deterministic fixtures may prove Supervisor selection, launch arguments, isolation, timeout, completion validation, reporting, and cleanup mechanics only.

A CI host may launch Agent Experiment Autorun when it explicitly supplies a real Agent CLI runtime, model credentials, and required tools. In that arrangement CI remains the host; the Playbook Agent remains the executor, and native runtime evidence remains authority.

## Authoring Guidance

Keep one case focused on one proof question. Use the shortest real path that reaches the production contract under test.

- State what the case proves and what it does not prove.
- Keep Agent steps and actor handoffs visible in Markdown.
- Use fixtures only before a clearly named convergence boundary.
- Route post-fixture facts through the same schema, CLI, receipt, gate, and trace path used by production.
- Keep deterministic checks smaller and simpler than the behavior they validate.
- Require real Subject execution when the claim depends on Subject behavior.
- Publish native completion exactly once, then stop.
- Leave health, audit, reporting, and cleanup to the Supervisor.

Reject a design when it needs a second verdict, hidden workflow controller, path guessing, fake Agent evidence, or a cleanup exception inferred from prose.

## Review Questions

Before accepting a command experiment, ask:

1. What exact mechanism claim does this case prove?
2. Which actor owns each verdict-affecting action?
3. Where does any fixture path converge with production?
4. What runtime bytes make the claim auditable?
5. Could generic checks, Playbook-Agent output, or fixture data falsely satisfy an Agent-behavior claim?
6. Is there exactly one native outcome authority?
7. Can the Supervisor validate, preserve, and clean without guessing a path or re-judging the case?

If these answers are unclear, the case is not apply-ready.

## Related Guidance

- [Project Charter](project-charter.md) — project-level authority boundary.
- [Abstraction as Semantic Precision](evolution-abstraction-semantic-precision.md) — establish the bounded mechanism question before adding an experiment surface or verdict concept.
- [Simple Reliable Control](evolution-simple-reliable-control.md) — keep the proof path shorter and simpler than the behavior it validates.
- [Helper-Oriented Agent](evolution-helper-oriented-agent.md) — keep ordinary legal execution with the Agent and escalate only true decisions.
- [Framework Runtime Boundary](framework-runtime-boundary.md) — framework assets versus mutable run truth.
- [Guidelines Index](README.md) — suite entrypoint and reading order.
