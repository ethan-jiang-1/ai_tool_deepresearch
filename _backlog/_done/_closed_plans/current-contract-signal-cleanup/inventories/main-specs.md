# Accepted Main-Spec Inventory

> Scope: all 85 accepted `openspec/specs/**/spec.md` files, audited
> 2026-08-13. This is a current-owner classification, not a request to rewrite
> a specification merely because it contains a historical word.

`P` means the spec still owns/protects current behavior; `R` means it records a
current rejection or safety boundary; `H` means history/tombstone material that
remains only under an explicit current governance owner. A `C#` suffix names a
narrow fact which a later card may change. Every row has one disposition.

## Agent (15 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `agent/agent-command-surface` | P + C3 | Current Agent command audience and entry routing; C3 owns only old bundle-entry success fallback. |
| `agent/agent-context-routing` | P + C8 | Current Charter/Context routing contract; C8 may reduce wording coupling only after runtime decisions settle. |
| `agent/agent-output-declaration` | P + C6b | Current ledger authority; markerless recovery is a bounded historic-reader policy, not a removable generic phrase. |
| `agent/agent-testing` | P + C1f/C5b | Current experiment proof surface; archive-ledger coupling and retained observation policy are separately bounded. |
| `agent/agentic-queue` | P + C6b/C9a/C9b | Current queue state, atomicity, and identity contracts; historical rows and initialization are protected until separate decisions. |
| `agent/cmd-subagent-environment` | P | Current real-subagent setup boundary; no compatibility candidate. |
| `agent/delegated-work-units` | P + C6a/C6b/C6c/C6d | Primary current work-unit lifecycle owner; every historic reader is split into a distinct C6 card. |
| `agent/hitl-ux` | P | Current user-decision contract; terminology references are not legacy runtime support. |
| `agent/local-deepseek-claude-launcher` | P | Current fail-closed launcher boundary; provider compatibility is an active configuration contract, not version history. |
| `agent/queue-input-validation` | P + C9a/C9b | Current explicit queue identity/slug validation including bounded first-operation and known-ID behavior. |
| `agent/subagent-directory-contract` | P | Current bundle-root work-unit directory contract. |
| `agent/subagent-dispatch` | P | Current Engine claim/prompt handoff contract. |
| `agent/subagent-node-contract` | P | Current generated task/result contract; fallback wording concerns current fetch behavior. |
| `agent/subagent-runtime-logging` | P + C6c | Current actor receipt binding; historic missing-actor projection belongs only to C6c. |
| `agent/work-unit-provenance-gate` | R + C6b/C6c/C6d | Current provenance/safety verdict owner; historic tuple readers must remain explicit until policy is selected. |

## Bundle (9 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `bundle/artifact-persistence-recovery` | P | Current crash-safe persistence and recovery semantics. |
| `bundle/bundle-data-isolation` | P | Current selected-run-bundle isolation boundary. |
| `bundle/bundle-map` | P + C3 | Canonical map/entry topology; C3 owns diagnostic treatment of legacy entries. |
| `bundle/bundle-start-from-here` | H + C3/C7 | Pure legacy/tombstone spec remains until C3 changes behavior and C7 handles the current catalog/spec presentation. |
| `bundle/cache-raw-web-content` | P | Current cache/provenance contract; degraded capture is current evidence semantics. |
| `bundle/cmd-bundle-instantiation` | P + C2b/C3 | Current bundle creator; its creation stamp and old-entry inspection clauses have separate owners. |
| `bundle/file-observability` | R + C3/C4b/C5/C6 | Current diagnostic/rejection boundary; it cannot be removed with the formats it observes. |
| `bundle/reference-flat-format` | P + C5 | Current reference writer/index contract; historic binding reader policy is C5. |
| `bundle/run-entry` | P + C2c/C3 | Current Harness entry; release choreography and existing-bundle route are separate policies. |

## Engine (15 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `engine/check-inspect-feedback` | P | Current check/inspect/advice and recovery-owner distinction. |
| `engine/cli-exit-code-conventions` | P | Current coarse process exit contract. |
| `engine/cli-inspect-output-conventions` | P + C5 | Current inspect projection; reference legacy/advisory wording follows C5's reader decision. |
| `engine/cli-phase-transition` | P | Current deterministic transition CLI contract. |
| `engine/framework-engine` | P | Current Engine/module boundary and YAML/JSON parser ownership. |
| `engine/gate-content-dedup` | H + C1a/C7 | Retired tombstone material; C1a removed its misleading catalog status, C7 later decides current-spec removal. |
| `engine/gate-fork-router` | P | Current experiment-supported Gate helper. |
| `engine/gate-skeleton` | P | Current Gate definition/diagnostic contract; repair fallback is current malformed-input handling. |
| `engine/gate-state-machine` | C1c | Stale abstract FSM promise tied to the inactive `gate.mjs` surface. |
| `engine/logger` | P | Current structured diagnostic logger. |
| `engine/logging-conventions` | P | Current trace/log separation. |
| `engine/runtime-reentry-debuggability` | R + C3/C4b/C5/C6 | Current reentry diagnostics; historic records remain explicit evidence/rejection inputs. |
| `engine/schema-core` | P + C4b/C6 | Current schema foundation with deliberately bounded historic unions. |
| `engine/trace-writer` | P | Current trace authority; `v1` literal is a current discriminator. |
| `engine/transition-table` | P | Current transition-chain source of record. |

## Governance (5 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `governance/change-feedback-loop` | P | Current governed review/archive lifecycle. |
| `governance/guidance-constitution` | P | Current instruction/topology boundary. |
| `governance/requirement-traceability` | P | Current requirement identity; retired IDs remain governed history, not deletion targets. |
| `governance/semantic-fact-closure` | P | Current change closure requirement. |
| `governance/version-management` | C2c | The release-number/changelog/banner choreography is the exact future policy decision. |

## Research (22 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `research/canonical-topic-state` | P + C4b | Current canonical UID/layout lineage and sanctioned legacy-plan migration boundary. |
| `research/content-delivery-experiments` | P | Current delivery experiment surface. |
| `research/content-delivery-gate-implementation` | P | Current HITL2/readiness/final Gate behavior. |
| `research/content-delivery-phase-content` | P | Current delivery phase guidance. |
| `research/evidence-extraction` | P | Current evidence extraction contract. |
| `research/final-delivery-backing` | P | Current final backing boundary. |
| `research/plan-hostfile-sections` | P | Current plan-hostfile projection contract. |
| `research/post-final-recovery` | P + C4b | Current post-final reentry; legacy-plan condition remains owned by C4b. |
| `research/pre-research-experiments` | P | Current pre-research experiment proof surface. |
| `research/pre-research-gate-implementation` | P + C4a/C4b | Current Gate implementation; profile/plan historic readers have explicit C4 owners. |
| `research/pre-research-phase-content` | P + C4a/C4b | Current phase guidance; do not remove the current migration/rejection route prematurely. |
| `research/research-access-adapter` | P + C4a | Current executor/canary boundary; legacy profile envelope reading is the C4a candidate fact. |
| `research/research-return-map` | P | Current return-map guidance owner; it protects the non-pointer portion of shared guidance. |
| `research/research-styles` | P | Current style parameter contract. |
| `research/research-wave-experiments` | P | Current wave experiment proof surface. |
| `research/research-wave-gate-implementation` | R + C5/C6 | Current Gate owner with reference/provenance historic-reader adjacency. |
| `research/research-wave-phase-content` | P + C5/C6 | Current phase guidance; reference and work-unit historical forms are bounded adjacent facts. |
| `research/seed-topic-materialization` | P + C4b | Current canonical seed projection; old mutable-plan migration remains C4b. |
| `research/user-research-controls` | P | Current user-controls snapshot boundary. |
| `research/wave0-artifacts-directory` | P | Current Wave0 artifact directory contract. |
| `research/wave1-intake` | P + C5/C6 | Current Wave1 path; reference authoring and historical submitted-attempt readers are scoped elsewhere. |
| `research/wave2-synthesis` | P + C5 | Current Wave2 output; cross-reference binding policy belongs to C5. |

## Verification (8 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `verification/experiment-agent-autorun` | P + C1f/C5b | Current supervisor/manifest contract; archive ledger and retained observations are distinct bounded facts. |
| `verification/experiment-observability` | P + C5b | Current report/health visibility; retained report reader policy is C5b. |
| `verification/experiment-ref-integrity` | P | Current Engine/Agent provenance proof boundary. |
| `verification/experiment-run-strategy` | P + C5b | Current strategy projection; historic selection observations are C5b. |
| `verification/experiment-shared-infra` | P | Current experiment utility boundary. |
| `verification/integration-tests` | P | Current isolated CLI verification contract. |
| `verification/test-fixtures` | P | Current fixture policy; versioned fixtures are not an old-format runtime reader. |
| `verification/verification-routing` | P | Current proof taxonomy and routing authority. |

## Workflow (11 / 85)

| Spec | Classification | Current owner / action |
| --- | --- | --- |
| `workflow/conditional-nodes` | P | Current deterministic branch transform semantics. |
| `workflow/dynamic-node-loading` | P + C1e | Current Markdown node loader; C1e is only its unreachable private helper. |
| `workflow/fork-repair-converge` | C1d | Unimplemented architecture/API promise; policy decision required before retiring it. |
| `workflow/playbook-runner` | P + C1f/C5b | Current Agent-runner contract; archived baseline and retained selection history have dedicated owners. |
| `workflow/repair-loop` | P | Current repair checkpoint behavior. |
| `workflow/rerun-incremental-node` | P + C4b | Current rerun and layout lineage; `migrate_legacy` is an explicit C4b policy fact. |
| `workflow/rerun-topic-integration` | P + C4b/C5 | Current rerun evidence/reference handling with explicit historic-reader boundaries. |
| `workflow/shared-node-content` | P + C1b/C5/C6 | Current shared guidance contract; C1b only removes an unreferenced pointer, not owned shared content. |
| `workflow/silent-wave-execution` | P | Current silent execution/failure behavior. |
| `workflow/workflow-directory-contract` | P + C3 | Current framework/run boundary and bundle entry topology; legacy entries are C3 only. |
| `workflow/workflow-node-contract` | P | Current workflow-node/frontmatter contract; YAML/JSON format support is one current parser contract. |

## Count Check

| Domain | Specs |
| --- | ---: |
| Agent | 15 |
| Bundle | 9 |
| Engine | 15 |
| Governance | 5 |
| Research | 22 |
| Verification | 8 |
| Workflow | 11 |
| **Total** | **85** |

## Result

Every accepted main spec has an owner-based disposition. The rows marked `C#`
are inputs to later individual decisions; they do not authorize wording or
behavior edits while the corresponding card remains unapproved.

