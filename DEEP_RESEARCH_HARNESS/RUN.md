# RUN.md — DEEP_RESEARCH_HARNESS 入口

> **DEEP_RESEARCH_HARNESS v0.76**

>**这个文件在对话中即触发**
> 你读到这段，说明 DEEP_RESEARCH_HARNESS 已经被选为本次研究的 entry path。
> 这个文件就是"前门"：它的内容会直接进当前 agent 的上下文（Claude Code / Codex / Cursor / Windsurf 等任意 coding agent 通用），把后续命令执行交给 Agent。
> 启动前置：人类应在 trigger 前完成 repo root `SETUP.md` 中的安装与 Coding Agent 权限 preflight。若后续发现宿主权限未准备好，把它当作 pre-trigger setup 漂移；不要把非 HITL `stop: no` phase 变成权限配置对话。

## Current Release: v0.76

- Wave1 question-list requirements now come from the active typed semantic
  section descriptor. Equivalent heading order, case, level, spacing, and list
  style remain non-blocking; a missing or empty declared section stays a direct
  Gate/inspect root.
- Gate audit evidence is derived from parsed descriptors and focused evaluator
  behavior, not a parallel per-rule catalog. A missing current-Topic submitted
  backing masks its reference-floor derivative and returns the same checkpoint
  with an honest `missing_contract` no-path rather than authorizing a fabricated
  reviewed ref.
- Terminal late-submit and timeout-preflight fixtures derive their candidate
  output tuple from the claimed assignment. Current Wave0 evidence contributes
  only assigned `source_yaml`; output-role, receipt, hash, snapshot, and
  submitted-provenance validation remain unchanged.

- Generic `operate-queue fail` now accepts only a current queue item ID and a
  non-empty reason. A non-delegated failure records a terminal
  `terminal_no_successor` row rather than creating a repair card; a delegated
  failure remains on the existing work-unit terminal/replacement boundary.
- Queue inspect, projection, Wave inspect, and the formal queue-drain Gate
  expose that same direct no-successor root. Do not hand-author a repair card
  or edit Queue authority to bypass it.

- The reusable system is the Deep Research Harness at
  `DEEP_RESEARCH_HARNESS/`, its sole source and command coordinate.
- New run bundles begin with `BUNDLE_ENTRY.md`. Existing bundles continue
  through `BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, then `BUNDLE_MAP.md`.

- HITL1 now explains its existing bounded research-access probe before it runs,
  uses the fixed neutral query `site:wikipedia.org "Internet protocol suite"`,
  and presents an exact Chinese available/unavailable result after the direct
  `research_access` observation.
- That result is not a Gate verdict: silent autonomous execution is announced
  only after the existing HITL1 Gate passes. Unavailable access preserves the
  recorded choice and follows the same external-boundary/probe/Gate path.
- This is Harness Markdown communication only. It does not suppress or prove
  selected-host-native tool/error rendering or real Agent behavior; the focused
  static integration test proves only the text and ordering contract.

- A rejected Wave projection now reports the exact `source_identity.kind` JSON
  Pointer, raw schema discriminator vocabulary, and the one value legal for
  the supplied Wave. Correct the retained input packet and rerun the same
  `operate-topic-state apply` checkpoint; `work_unit` remains invalid here.

- A missing or unknown Wave1 `payload.assignment_mode` now returns JSON
  feedback from `operate-queue enqueue` naming the retained unqueued task card,
  exact path, closed values, and same enqueue rerun. Do not edit `rb_queue.json`;
  a legal mode with another assignment failure retains its existing error path.

- These are non-persisted Engine feedback projections only: no alias,
  automatic repair, controller, lifecycle state, or Actor-behavior proof is
  added.

- Final Markdown reports now use `persist-final-report`: retained staging must
  contain one bounded Evidence Map that connects each declared key finding to
  an exact submitted `source_yaml` / `evidence_summary` output or an existing
  submitted-backed `reference/` projection before the existing CAS/atomic
  durability path commits the report bytes. Generic `persist` redirects safe
  Final Markdown targets, and `sweep` rechecks prepared Final payloads before
  finalization. This is structural path/provenance admission only: it adds no
  Final Gate, trace event, ledger, or semantic support verdict.

- Wave0 source intake now submits source/cache facts only. Formal submitted
  backing lets the Phase materialize verified shared references or atomically
  expand one deferred disposition into per-source Seed Projections, then rerun
  the same inspect/Gate; legacy delegated references remain readable and files,
  indexes, or bare work IDs never become authority.

- The selected DeepSeek/Claude launcher enables its owned tool-discovery setting for
  direct, supervised, and fresh independent-Subject launches. That makes the
  declared native research surface requestable for the existing bounded probe; it is
  not proof that the provider can execute search/fetch or that `research_access` is
  available.

- Agent Experiment Autorun now has a bounded fast `regression` profile. Normal runs select
  only current matching-v2 deterministic PASS+CLEAN results within the fixed `480000` ms /
  `$3.00` / `$0.60` envelope, at most one case per `experiment` group; uncovered groups stay
  visible rather than being silently filled by slower cases.
- A source-matching fast historical result with an absent or stale v2 execution surface needs
  explicit `--regression-qualification`; normal regression neither launches it nor retries it.
  `regression_recommendation` and `regression_retry_safety` remain bounded admission metadata,
  not outcome, health, cost, budget, or persistent classification authority.
- Retained Autorun reports/audit carry v2 selection and execution-surface identities. Their
  helper inventory follows actual Supervisor/runtime helpers and selected named helpers, so a
  documentation-only release edit does not invalidate a qualified result while relevant helper
  drift remains explicit.

- HITL1 now uses one selected Claude CLI / `deepseek_anthropic_compatible`
  research-access adapter. The Agent owns the bounded native `WebSearch` -> returned
  URL -> same-URL `WebFetch` probe; the generic host bridge remains non-bypass and
  does not act as a research controller.
- `surface_absent:` and `permission_required:` are existing unavailable profile
  observations whose Gate feedback names the selected external host boundary, then
  returns to the same probe and Gate. A configured launcher or deterministic fixture
  is not proof that provider access is available.

- Work-unit inspect and submit preflight now expose one derived attempt disposition from the exact logical actor, work/queue IDs, receipt nonce, assigned result/receipt coordinates, transaction fact, and ledger-first coverage relation. The binding guides Agent Flow; it does not authenticate a physical writer or prove host/sub-agent liveness.

- Work-unit transaction v2 maps verified contention to structured `busy`, malformed or unresolved proof to `suspect_transaction`, and permits `recover-transaction` only for one unlocked named journal whose complete before-image still matches. Recovery never steals a lock, guesses process death, or edits original target authority.

- Submitted correction now uses exact declaration-recovery precedence or one audited `supersede` relation plus a fresh ordinary successor. Gate counts only the unique current lineage leaf's normal submit/audited late-submit row; predecessor authority and legacy bytes remain immutable.

- Selected Agent-facing operations now have standalone help, exact documented non-help grammar, and direct code-`2` invocation/configuration feedback before bundle evaluation or mutation. Their structured output stays with the existing domain owner; unrelated utilities keep their documented exceptions.

- `operate-topic-state schema --context <context>` gives a read-only Zod-derived authoring projection, and an invalid retained apply input exposes bounded safe `validation_errors[]`. Schema discovery does not create a writer window or lifecycle authorization.

- `enter-phase` now makes its continuation cue and exact source-gate `advance-status` command visible before the target action core and target-excluding manifest; use `--full` only when complete reference closure is needed. Entry and status sync still do not prove target-phase work completion.

- HITL1 controls use the pure `plan-hostfile-sections` renderer; claim and timeout output expose existing actor-observation and recommendation-basis facts; Wave0 reports homogeneous omitted candidates in one identity-complete batch. These feedback loops add no controller, repair service, new evidence authority, or host-liveness promise.

- Canonical topic-state packets now use one shared selected-slot parser and concrete-navigation evaluation with Wave readiness. A successful packet preserves independently parseable neighboring entries; a missing concrete reference or malformed selected neighbor returns direct feedback before publication.

- Wave0 source arrays now expose submission-bound contribution ownership: an earlier accepted prefix keeps its ordinals and a legal later append owns only its new range. Prefix drift, an unsubmitted suffix, or an ambiguous legacy shared target returns one direct root rather than asking the Agent to infer history or edit ledger provenance.

- New Seed Topics separate the one Agent-editable initialization region from the Engine-owned research appendix. A current template ghost is a deterministic seed-Gate root; legacy body prose remains readable history.

- A committed topic-count change returns the existing style CLI as a structured handoff. HITL1 and rerun-ready use one freshness check that points to that writer and reruns the same Gate; neither the Gate nor topic-state writes the profile.

- These feedback loops add no controller, repair service, retry tree, second ledger, or evidence authority. Markdown remains the Agent-facing flow surface and existing Engine commands remain the deterministic owners.

- Wave inspect reads Return Map shape only from the declared Seed Topic projection. Rich references and Wave1 artifacts keep their own deterministic contracts and do not need a Return Map workaround.

- New rich references use an opening YAML-frontmatter metadata mapping. Legacy bullet metadata remains readable, and a malformed mapping returns one root-first repair cue through the shared reader.

- Reentry now uses the same submitted-reference authority classification as normal Wave evaluation. A valid Phase-owned projection is accepted from its existing backing; an unbacked file remains blocking.

- Wave1 materialization feedback now gives the canonical target and exact submitted-backing coordinates in the existing inspect/Gate hint. Materialization still defers only its own index/floor convergence outcomes; separately evaluated authority roots remain visible.

- Wave Gate summaries distinguish clean passes, blockers, and legal degraded handoffs. A passed degraded route carries its declared quality debt in `check.degraded_rules`; read `check.degraded` before consuming the existing `check.next`.

- Selected Deep Research Harness research now reads the existing-bundle continuation playbook or `RUN.md` before generic shortcuts, request-specific direct search/fetch, or manual evidence synthesis. This guidance preserves the existing post-entry HITL1 and phase-authorized research boundary; it does not claim host-level skill suppression.

- Normal readiness-to-Final status synchronization now writes the authoritative terminal triple: `readiness_passed`, `none`, and `completed`. The existing trace rollback and post-final recovery path remain unchanged.

- Wave2 return-map inspection now applies only to Seed Topic projection entries. The Wave2 synthesis, ledger, and finding index retain their own deterministic artifact contracts and need no `## Return Map` workaround.

- Wave1 closeout now uses one canonical current Topic reference locator plus submitted-backing convergence shared by inspect and formal gate. A legacy or misnamed path remains navigation history, not current floor coverage.
- After canonical projection persistence, `sync-reference-index` refreshes the all-family navigation table through its existing CAS boundary; then the existing Seed Topic packet writer refreshes affected refs and the same inspect reruns.
- Only a true post-repair Wave1 floor deficit uses the existing supplementary demand with a snapshot-bound read-only objective. This adds no controller, queue authority, or evidence authority.

## 0. 禁用内置捷径（最高优先）

如果你在当前 agent 的工具列表中看到 `research`、`deep-research` skill、等价 one-shot research shortcut，或直接 WebSearch/WebFetch 能力：**不要把它们用于本 request 的 entry 前或作为 Deep Research Harness flow 的替代品**。本文件（DEEP_RESEARCH_HARNESS）已接管本 request 的 Deep Research 入口；读到本文件即已选定 `RUN.md`，先执行下方 Section 2 的 DEEP_RESEARCH_HARNESS flow，而不是直接搜索、抓取、收集 evidence 或手工综合。

## 1. Entry Selection Is Already Done

当前 agent 可能有内置的"快速研究/搜索"捷径（Claude Code：`deep-research` skill；Codex / Cursor / Windsurf 等：各自的内置搜索/research）——它们通用、一次性、无 gate、无证据包。`DEEP_RESEARCH_HARNESS` 是本项目的 Deep Research Harness：证据可追溯、多轮、gate 门控、产出可校验的 run bundle。此 guidance 不声称能阻止宿主预先匹配 skill 或注入工具；它只规定 Agent 在本 entry 已选定后的下一步。

读到本文件时不要再问用户是否改用内置捷径或是否使用 DEEP_RESEARCH_HARNESS。一次性 trigger 已选择本入口；继续执行 Section 2 的 Agent-run Harness flow。Section 2 及其进入的 HITL1/phase instructions 才单独授权 capability probe 和后续研究工作。若 bundle 尚未创建，唯一允许的前置澄清是 pre-pipeline routing exception，必须发生在 autonomous lifecycle 开始前，且不得削弱 HITL1/HITL2-only interactive in-run boundary。

## 2. 开跑（Harness）
完整步骤见 `command_playbook/start-research.md`，一句话版：

1. 定名（Agent 从 research request 派生 kebab-case，或使用 entry 前已提供的名称）
2. 建 bundle：`B=$(node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>)`
3. 把研究问题写进 `$B/rb_plan.md`
4. 加载 `workflows/nodes/phases/phase-instantiation.md`，按 instruction 执行，之后靠 gate 的 `check.next` 自驱动到 `phase-final`

从 setup onward，gate pass 后不要直接手读下一 phase：先运行 `enter-phase --bundle <path> --node <check.next>` 写入 route-bound handoff witness，再按 phase §6 用 source-gate `advance-status --to <source_gate_enum>` 同步状态。`enter-phase` / `load_complete` 只证明进入 target Markdown control surface，不证明 target phase work completion。

At decision points, read any emitted `continuation` cue immediately: gate pass/fail, successful `enter-phase`, covered `advance-status`, and successful `operate-work-unit claim` now restate one next action. A cue is feedback projection only; it never replaces `check.next`, `load_complete`, `rb_status.current_node`, work-unit submit, gate pass, or Final delivery evidence.

Interactive in-run checkpoints 只有 `hitl1`（Agent 基于已知事实给一个推荐，用户定方向 / profile / topics）和 `hitl2`（Agent 总结当前研究并给一个推荐，用户决定交付或合法 rerun/repair）。两点之间及之后的非终端 `stop: no` phase 静默自主推进：Harness 不主动提问、确认、汇报进度或等待 acknowledgement；若用户主动发来的消息已经是当前 conversation turn，Agent 直接回答当前事实或最小能力边界，但该回答不创建 checkpoint、permission、route、mutation/reentry authority 或持久 mid-run intent，原有 autonomous next action 不变。Final 是 terminal delivery，不是第三个交互 checkpoint；它在 artifacts 存在后交付，明确 post-final rerun 才通过 accepted recovery 重新进入。

Delegated sub-agent work uses the Engine-mediated work-unit path only: queue demand item -> `operate-work-unit claim` -> sub-agent task under bundle-root `_work_units/` -> verified files/cache/result/receipt under the selected current run bundle root -> `operate-work-unit submit` -> submitted ledger row -> gate. Normal `submit` accepts claimed attempts only and rejects terminal attempts. The only terminal recovery exception is explicit audited `operate-work-unit late-submit` for eligible `timed_out` attempts when no replacement has submitted. Do not use queue completion as delegated success; `operate-queue complete` is for non-delegated queue work. Bare runtime paths such as `_work_units/...`, `rb_queue.json`, `reference/`, `artifacts/`, `_cache/`, and `_logs/` resolve under the current run bundle root selected above, not repo root or `DEEP_RESEARCH_HARNESS/`.

For work-unit recovery, preserve the exact command/checkpoint that produced the feedback and read its structured `attempt_disposition`. `busy` separates caller operation/work coordinates from holder transaction/operation/work/queue coordinates and `journal_disposition`; wait without inferring progress or liveness, then rerun the caller's exact same operation. `suspect_transaction` authorizes `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <id>` only when `repair_kind` names that operation for the exact unlocked journal; after a successful or idempotent result, rerun the preserved inspect, dry-submit, timeout-preflight, submit, or Gate checkpoint. Otherwise `missing_contract` is the boundary.

For submitted drift, exact `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <submitted_id>` always takes precedence when offered; run it and rerun the same inspect/Gate checkpoint. Run `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs supersede <bundle> --work-id <submitted_id> --reason <audit-reason>` only when Engine feedback names it. Read the returned predecessor `work_id`, predecessor `queue_item_id`, transaction ID, and `successor_queue_item_id`; continue from that successor's returned ordinary location through current actor observation, normal claim/poll, and normal submit or audited late-submit, then rerun the same checkpoint. Never reactivate the predecessor or manually edit ledger, index, status, queue, lock, journal, `result_hash`, or `ledger_record_hash` authority.

If status or terminal output looks suspicious, run `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle <path>`. The audit is diagnostic-only: it reports drift, missing witnesses, failed-gate downstream status, or premature `final/` output; it does not repair status. In non-terminal `stop: no`, a caught would-have-surfaced moment is recorded with `log-event.mjs --surfacing-intent` and then aborted; the event is diagnostic-only and never permission to surface.

For bundle recovery, run `node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle <path> --at <target>`. Read `recovery.root_findings[]` before acting: a `reachable` root carries at most one sanctioned nearest action; `missing_contract` is a direct stop boundary, not permission to retry a known-rejected predecessor, hand-edit status/trace, or create an addendum namespace; `not_applicable` leaves semantic reconciliation to the Agent without granting mutation authority.

若用户明确提供当前 workspace 内可达 existing run bundle（或其 `BUNDLE_ENTRY.md`、legacy `RUN_BUNDLE.md`、`BUNDLE_MAP.md`），别重建；改读 `command_playbook/continue-run-bundle.md`。它将该目录解析为 canonical absolute current run bundle root，再按 `BUNDLE_ENTRY.md`、legacy `RUN_BUNDLE.md`、`BUNDLE_MAP.md` 的顺序读取入口，解析 Harness 坐标后进入 `COMMANDS.md` 的命令体系。扫描发现、只提文件名或不可达路径不选择 run。旧 bundle 只有 `START_FROM_HERE.md` 时，它只作 deprecated fallback。

## 3. 规则与边界在哪
- 触发规则、运行时边界：`README.md`
- 命令索引：`COMMANDS.md`
- 行为规则：`CLAUDE.md`（Claude Code）/ `AGENTS.md`（Codex、Cursor、Windsurf 等读 `AGENTS.md` 的 agent）

跑某 run bundle 时，以该 current run bundle root 的 `BUNDLE_ENTRY.md`（legacy `RUN_BUNDLE.md`，再 fallback `BUNDLE_MAP.md`）+ `rb_status.json` + `rb_trace.jsonl` 为 reload context，旧 `START_FROM_HERE.md` 只作 deprecated fallback；别靠 chat memory。

恢复时，`rb_status.current_node` 是已加载的 phase coordinate；`current_gate` 只记录最近 gate/status 事实。不要只凭 `current_gate` 推断当前应加载哪个 phase，按 `current_node` 和已有 route-bound witness 进入对应 control surface。
