<!-- @impl EXA-002, EXA-004, PLR-001 -->

# Agent Experiment Playbook Manifest

This is the single active registration and execution-order authority for command experiments. Agent Experiment Autorun consumes only the bounded table below.

Each row contains one path. Case and experiment identity, native verdict policy, bundle/verdict/health roles, health profile, proof profile, and judge class come from the selected playbook's strict V2 frontmatter. Execution cost comes from the filename. Filesystem discovery is used only to reject unregistered or stale cases.

Heavy filename cost covers either real Agent/Sub-agent work or a long chain; cost does not itself establish a Subject-behavior claim.

<!-- agent-experiment-manifest:v1 -->
| Path |
|---|
| `exp_gate-fork/case-11-light-four-returns.md` |
| `exp_gate-fork/case-12-standard-repair-retry.md` |
| `exp_gate-fork/case-13-standard-full-pipeline.md` |
| `exp_gate-loop/case-21-light-three-returns.md` |
| `exp_gate-loop/case-22-standard-repair-loop.md` |
| `exp_gate-loop/case-23-standard-full-pipeline.md` |
| `exp_workflow-chain/case-31-light-lazy-load.md` |
| `exp_workflow-chain/case-32-standard-dep-cache.md` |
| `exp_workflow-chain/case-33-standard-error-paths.md` |
| `exp_agentic-queue/case-41-light-minimal-path.md` |
| `exp_agentic-queue/case-42-standard-urgent-preemption.md` |
| `exp_agentic-queue/case-43-standard-failure-repair.md` |
| `exp_wff_validation/case-51-standard-happy-path.md` |
| `exp_wff_validation/case-52-standard-fail-repair.md` |
| `exp_wff_validation/case-53-standard-routing-contract.md` |
| `exp_system-logging/case-71-light-unified-envelope.md` |
| `exp_system-logging/case-73-light-startup-log-trail.md` |
| `exp_system-logging/case-74-light-heartbeat-metadata.md` |
| `exp_system-logging/case-75-light-engine-hot-path.md` |
| `exp_system-logging/case-78-standard-fatigue-detection.md` |
| `exp_wff_pre-research/case-101-standard-pre-research-happy.md` |
| `exp_wff_pre-research/case-102-standard-instantiation-production.md` |
| `exp_wff_pre-research/case-103-standard-hitl1-quick-factual.md` |
| `exp_wff_pre-research/case-104-standard-hitl1-exploratory-map.md` |
| `exp_wff_pre-research/case-105-standard-hitl1-claim-verification.md` |
| `exp_wff_pre-research/case-106-light-plan-body-gate.md` |
| `exp_wff_pre-research-repair/case-111-standard-repair-loop.md` |
| `exp_wff_pre-research-repair/case-112-standard-fault-tolerance.md` |
| `exp_wff_pre-research-repair/case-113-standard-review-surface.md` |
| `exp_wff_pre-research-repair/case-114-heavy-hitl1-manual-review.md` |
| `exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` |
| `exp_wff_wave-gates/case-123-standard-wave2-synthesis.md` |
| `exp_wff_wave-gates/case-124-standard-seed-topics-boundary.md` |
| `exp_wff_delivery/case-131-standard-delivery-full-chain.md` |
| `exp_wff_delivery/case-132-standard-hitl2-decision.md` |
| `exp_wff_delivery/case-133-standard-hitl2-rerun.md` |
| `exp_wff_delivery/case-134-standard-delivery-repair.md` |
| `exp_wff_delivery/case-135-standard-readiness-precheck.md` |
| `exp_wff_wave-chain/case-151-standard-waves-full-chain.md` |
| `exp_wff_wave-chain/case-152-standard-wave-repair-loop.md` |
| `exp_wff_wave-chain/case-153-standard-wave-fault-tolerance.md` |
| `exp_evidence-extraction/case-161-light-complete-cache-trails.md` |
| `exp_evidence-extraction/case-162-standard-gate-reentry-cache-coverage.md` |
| `exp_evidence-extraction/case-163-heavy-rerun-add-real-cache-trail.md` |
| `exp_wff_topic-rewrite/case-181-light-hitl1-topic-rewrite-vague.md` |
| `exp_wff_topic-rewrite/case-182-light-hitl1-topic-rewrite-detailed.md` |
| `exp_wfn_seedtopic/case-201-standard-seedtopics-queue-loop.md` |
| `exp_wfn_seedtopic/case-202-light-setup-to-seedtopics-transition.md` |
| `exp_wfn_seedtopic/case-203-light-nn-prefix-naming.md` |
| `exp_wfn_wave0/case-211-heavy-wave0-happy-path.md` |
| `exp_wfn_wave0/case-212-heavy-gate-fail-repair.md` |
| `exp_wfn_wave0/case-213-light-happy-and-fail.md` |
| `exp_wfn_wave0/case-214-light-timeout-progress-lease.md` |
| `exp_wfn_wave1/case-221-heavy-batch-subagent.md` |
| `exp_wfn_wave1/case-222-heavy-gate-fail-repair.md` |
| `exp_wfn_wave1/case-223-heavy-subagent-failure.md` |
| `exp_wfn_wave1/case-224-light-happy-and-fail.md` |
| `exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md` |
| `exp_wfn_wave2/case-232-heavy-finding-triage.md` |
| `exp_wfn_wave2/case-233-heavy-gate-fail-repair.md` |
| `exp_wfn_wave2/case-234-heavy-subagent-search.md` |
| `exp_wfn_wave2/case-235-light-happy-and-fail.md` |
| `exp_wfn_rerun/case-301-light-chain-dual-exit.md` |
| `exp_wfn_rerun/case-302-light-rerun-node-happy-path.md` |
| `exp_wfn_rerun/case-303-light-normal-path-unchanged.md` |
| `exp_wfn_rerun/case-304-light-gate-fail-max-count.md` |
| `exp_wfn_rerun/case-305-light-indeterminate-no-transition.md` |
| `exp_wfn_rerun/case-306-standard-two-round-delta.md` |
| `exp_reentry-debuggability/case-307-light-clean-reentry.md` |
| `exp_reentry-debuggability/case-308-light-stale-queue-blocker.md` |
| `exp_reentry-debuggability/case-309-light-drift-detection.md` |
| `exp_file-observability/case-310-light-orphan-reference.md` |
| `exp_file-observability/case-311-light-file-explanation.md` |
| `exp_file-observability/case-312-light-wave2-action-add.md` |
| `exp_reentry-debuggability/case-313-light-canonical-recovery-incident.md` |
| `exp_reentry-debuggability/case-314-light-artifact-persistence-crash-recovery.md` |
| `exp_reentry-debuggability/case-315-light-canonical-topic-state-recovery.md` |
| `exp_reentry-debuggability/case-317-light-post-final-recovery.md` |
| `exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` |
| `exp_engine-boundary/case-401-light-full-boundary.md` |
| `exp_engine-boundary/case-402-light-complete-reject.md` |
| `exp_engine-boundary/case-403-light-work-unit-authority.md` |
| `exp_engine-boundary/case-404-standard-queue-boundary.md` |
| `exp_engine-boundary/case-405-light-trace-single-sink.md` |
| `exp_engine-boundary/case-406-heavy-real-subagent-boundary.md` |
| `exp_engine-boundary/case-407-light-actor-preflight-fallback.md` |
| `exp_autonomous-research-hardening/case-601-standard-wave0-fail-stays-in-phase.md` |
| `exp_autonomous-research-hardening/case-602-standard-status-drift-return-to-legal-phase.md` |
| `exp_autonomous-research-hardening/case-603-standard-surfacing-intent-abort.md` |
| `exp_autonomous-research-hardening/case-604-heavy-real-subagent-write-before-return.md` |
| `exp_autonomous-research-hardening/case-605-heavy-bundle-containment-real-subagent.md` |
| `exp_autonomous-research-hardening/case-606-light-continuation-cues.md` |
| `exp_iterative_interaction/case-711-heavy-hitl1-natural-acceptance.md` |
| `exp_iterative_interaction/case-712-heavy-hitl2-natural-rerun.md` |
| `exp_iterative_interaction/case-713-heavy-user-initiated-turn.md` |
| `exph_workflow-foundation/case-901-heavy-topic-rewrite-agent.md` |
| `exph_workflow-foundation/case-951-heavy-topic-rewrite-ai-judge.md` |
<!-- /agent-experiment-manifest -->

Selection preserves this order. No filter selects autorun-compatible Light cases. Exact `--case` selects one full identity; `--group` may combine with one filename cost tier; `--all` selects every autorun-compatible case while excluding real-human manual cases. Cases 901-949 require bounded Interactive execution and actual human judgment; their co-located +50 AI-judge pairs remain separate evidence.
