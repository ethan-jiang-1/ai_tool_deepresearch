# Repository-History Analysis: Recurring Failure Modes and Whether the Current System Actually Fixes Them

> Provenance: 2026-08-16 coding-agent review session（用户要求评估"agent 老是做不对"与历次清理的实际效果）。本文件由一个历史挖掘子代理生成，file:line 均经写作时工作树核验；随行建议的修复清单以对话结论为准，落地须另走 OpenSpec change。

> Scope: full git history (678 commits), root `CHANGELOG.md` (662 lines), `docs/adr/0001–0005`, `openspec/changes/archive/` (204 archived changes), and current-tree verification (read-only; no `_backlog/`, `node_modules/`, `.env/`, `_temp/`, or run-bundle dirs were opened).
> Method: `git log` classification + targeted current-tree inspection. All `file:line` references verified against the working tree at time of writing.

---

## 1. Commit-Pattern Table (678 commits)

Classification is first-match-wins; several commits legitimately combine two intents (e.g. `chore(openspec): archive X + sync specs` counts as governance bookkeeping). A looser keyword count is shown in parentheses where materially different.

| Pattern | Count | Representative commits |
|---|---|---|
| `fix-*` (repair/reconcile) | 39 | `9105a2243` repair regression contract tests · `e6163b973` repair agent guidance contract drift · `4163fbdd7` repair delta-format pollution in prod specs · `13eb4e442` fix stale `next_gate` · `5bb67cb52` playbook drift |
| `harden-*` | 49 | `c44441b95` harden stop:no contract · `4d37ac124` harden relay pipeline · `f4484b802` harden agent authored contracts · `fce01a752` harden timeout preflight · `1da6e39d9` harden bundle creator args |
| `align-*` (subject-initial only; keyword `align` appears in 29) | 7 | `446cfb89a` align regression fixtures · `c732e1013` align standard health scope · `6ab8804db` align fixture runner with FAIL-fix round · `ed128cb18` align current guidance contract guards |
| `retire-*` / stale / legacy / deprecate | 30 | `3ce1c9dae` retire legacy `DPT_FRAMEWORK` alias · `2a5cd0d7d` retire stale abstract gate fsm · `ffea0c9da` retire transaction v1 history · `ed0d00c79` retire gate content dedup contract · `07d963abc` retire historic reference reader policy |
| `sync` (specs/docs) | 33 | `6dc9cef73` spec-reality-sync (18 specs) · `6de6c4217` sync main spec req headers · `c1380f609` sync delta specs to main · `96f3d2fb3` sync specs from archived change |
| `revert` (pure) | 0 | only one revert-flavored commit: `700a6e2cf` "revert double `_logs/` from overzealous sed replacement" (filed under fix) |
| `redo`/rework (repair/restore/recalibrate/rebaseline) | 38 | `e926530c4` restore wave depth contracts · `2fccdaa34` repair-rerun-added-topic-bootstrap · `57063a5f9` restore section-scoped seed projection contract · `39f6e989e` rebaseline capability taxonomy · `0d6c7fc57` restore deterministic regression baseline · `fe06ad342` rework source URL validation |
| governance bookkeeping (archive / backlog / close / docs-record) | 203 | the single largest class — `_backlog` plan/bug bookkeeping plus `chore(openspec): archive … + sync delta specs to main` pairs (~90 archive+sync pairs) |
| `propose`/refine change artifacts | 74 | `feat(openspec): propose …` + `refine …` pairs that typically precede every implementation |
| `feat`/implement | 118 | implementation commits, mostly paired with a preceding propose/refine/apply chain |
| `chore`/maint | 31 | dep bumps, gitignore, skill locks, nvm (`4bd87c717` Node 20→22) |
| `docs` (standalone) | 24 | reading-scope, CONTEXT.md, guidance topology |
| tests/experiments (fixture-led) | 7 strict (`fix(experiments)`/`fix(tests)` counted in fix) | `b12c77d7b` repair case-164 contract · `40d822e15` repair case-52 · `fe7c4e6d7` update 10 cases for evidence-extraction |
| other | 25 | raw one-word commits (`6a8bc7d73 update`, `bad4c146c update`), `.codex`/`.codewhale` setup |

**Most-churned areas** (file-touches over full history, computed from `git log --name-only`):

| Area | Touches | Notes |
|---|---|---|
| `openspec/changes/` | 3920 | change artifacts dominate — the OpenSpec lifecycle itself is the busiest surface |
| `_backlog/` | 2199 | plan/bug bookkeeping (not read, per repo rule) |
| `DPT_FRAMEWORK/` (legacy alias) | 1845 | engine/workflows/cli/schema before rename; retired by ADR 0003 |
| `openspec/specs/` | 1048 | spec churn ≈ half of framework churn — specs chased code repeatedly |
| `tests/integration` · `tests/engine` · `tests/schema` | 769 · 500 · 106 | regression fixtures repeatedly repaired after contract changes |
| `DEEP_RESEARCH_HARNESS/` engine · workflows · schema · cli | 153 · 98 · 59 · 56 | post-rename framework |
| `openspec/governance/` | 156 | checkers/finalizer — the eventual structural response |

**Spec families most re-churned**: `agentic-queue`, `research-wave-gate-implementation` (wave gates), `wave1-intake` / `wave2-synthesis` / `subagent-*`, `seed-topic-materialization`, `content-delivery-*`, `transition/status` chain, bundle-entry contracts (`START_FROM_HERE.md` → `BUNDLE_MAP.md` → `RUN_BUNDLE.md` → `BUNDLE_ENTRY.md`).

---

## 2. Recurring Failure Modes (with evidence)

### FM-1 — Spec/README/phase-prose drift against code ("guidance vs spec vs code" reconciliation)
Accepted specs and Agent-facing docs repeatedly described paths, layouts, gate rules, or capabilities that no longer existed in code, and each cleanup was itself followed by more drift.

- `2026-07-04-spec-reality-sync/proposal.md`: "**15 处 spec 与框架现状失配**（8 处 HIGH）：wave0 产物路径仍写已废弃的 `reference/<topic>/source.yaml`、cache 布局仍写 `_cache/search-results/` 与 `_cache/waveN/slot_MM/`、gate 规则清单与 gate definition JSON 严重不完整…这正是 subagent 痼疾反复出现的根因之一。"
- `2026-06-24-align-specs-with-guidelines-charter/proposal.md`: `guidelines/` 已把术语收敛，但 `openspec/specs/` 和 `DPT_FRAMEWORK/` 仍残留旧称呼（`main-agent` 角色名、`target` 字段、不存在的 `gate-definition.mjs` contract）。
- `2026-06-19-fix-fsm-runtime-stale-ref/proposal.md`: 上一个 fix 之后，`workflow-fsm-runtime` spec 的 Purpose 仍写着 "VM 沙箱、MD 执行属于 workflow-chain"——而 workflow-chain 也不再做 VM 沙箱了。**一个 stale reference 传染下一个。**
- `2026-06-19-fix-workflow-chain-md-agent-readable/proposal.md`: `workflow-chain.mjs` 曾用 `node:vm` 沙箱自动执行 MD 里的 JS code block，直接违背"MD 是给 Agent 读的"宪章原则。
- `4163fbdd7` (2026-06-17): "repair delta-format pollution in prod specs" —— delta headers 泄漏进 main specs。
- Changelog v0.7: "Retired historical content-similarity and URL-shape heuristics… in favor of ledger, provenance, hash, cache"; v0.61: "rich references now use canonical YAML frontmatter… legacy bullet metadata remain readable through one shared reader"; v0.62: "marker ghosts fail at the seed Gate, while legacy body history remains read-compatible".

### FM-2 — Agent-guidance / operation-doc drift (the "keep doing things wrong" surface)
Agent-facing instructions (entry docs, READMEs, AGENTS.md/CLAUDE.md, phase docs) diverged from current contracts, or pointed Agents at the wrong surface.

- `e6163b973` (2026-08-12) "fix: repair agent guidance contract drift" + `7d4a93b17` "propose repair-agent-guidance-contract-drift".
- `4d4863757` "fix(handoff): synchronize entry guidance"; `404801a0a` "fix(routing): harden DPT research entry".
- `c5bfc7e97` (2026-08-03): "replace Where-To-Look with repository reading scope + do-not-read paths" — an explicit admission that the old entry doc over-directed agents.
- `2d374c1e5` (2026-08-10) "centralize project guidance under openspec" + `dce4b35c6` "prune and automate project guidance" — the response to guidance sprawl.
- `ed128cb18` (2026-08-15) "docs: align current guidance contract guards" — guidance files now carry frontmatter guards.
- CHANGELOG v0.58: "Selected DPT research now chooses and reads its continuation or `RUN.md` entry before generic shortcuts" — a routing rule written *after* agents repeatedly skipped the entry contract.

### FM-3 — Stale lifecycle/transition truth (state, templates, chain divergence)
State templates and transition artifacts only partially updated when phases were inserted; and no CLI could write the runtime state gates required.

- `2026-06-26-fix-transition-next-gate-stale-after-seed-topics/proposal.md`:
  - Bug #1: `rb_status.json.tmpl` `next_gate` still `wave0_complete` after `hitl1`/`seed-topics` insertion → **every new bundle died at setup-ready gate**.
  - Bug #2: gates required `rb_trace.jsonl` events + `current_gate`/`next_gate` advancement, and **no CLI could produce any of it** — trace scattered across three unconnected logs (`rb_trace.jsonl`, `_logs/_trace_agq_cli.jsonl`, `_logs/run.log`).
  - Root: "lifecycle 的状态推进（status）与完成留痕（trace）没有统一的 Agent-facing 写入 API."
- CHANGELOG v0.6: "`rb_status.json.current_node` records the loaded phase node"; later CLIs `advance-status.mjs` / `log-event --event` (CPT-001/002) were the fix.
- `2a5cd0d7d` (2026-08-14) "retire stale abstract gate fsm"; `ec9f49681` "remove FSM traces from governance registry and guidelines" — the old abstract FSM kept diverging from the chain table.
- **Bonus redo evidence (the "cleanup breaks things" loop)**: `2026-07-26-repair-retired-spec-validation/proposal.md` — the `retire-stale-main-specs` cleanup left one retired requirement lacking mandatory wording and one **empty tombstone**, which blocked repository-wide OpenSpec validation; a follow-up change had to make the tombstones valid. Similarly `52d1ab048` "repair retired spec validation", and v0.30→v0.90: `8d4d41a1e` stamped `framework_version` into bundles (v0.30), then `ba1aa9ae4` (2026-08-13) retired it ("New run bundles no longer record an internal framework-version stamp") — a feature added and removed within a month. Bundle-entry contracts churned too: `START_FROM_HERE.md` → `BUNDLE_MAP.md` (v0.11) → `RUN_BUNDLE.md` + passive `BUNDLE_MAP.md` (v0.44) → `BUNDLE_ENTRY.md` (v0.73).

---

## 3. ADRs 0001–0005 — what each resolves

**ADR 0001 (keep agent flow Markdown-driven and engine-gated)** — resolves the original architecture confusion: a conventional JS workflow controller would turn semantic work into scripted control and hide the process from the LLM. Decision: LLM+Markdown own semantic research/flow; Engine owns schemas, transitions, receipts, trace, checkpoint feedback — never orchestration or semantic judgment. This is the antidote to the `workflow-chain` VM-sandbox mistake (FM-1).

**ADR 0002 (name the reusable surface "Deep Research Harness")** — resolves overlapping terminology where "the reusable system, its filesystem path, and each research instance" were conflated, making the framework-vs-run-boundary hard to reconstruct. Decision: canonical name Deep Research Harness, physical root `DEEP_RESEARCH_HARNESS/`, run bundle is the mutable per-engagement package and must not name the harness.

**ADR 0003 (retire the legacy harness source alias)** — resolves path drift caused by a second filesystem entry to the same assets (commands/imports/tests/guidance each picking a different spelling). Decision: `DEEP_RESEARCH_HARNESS/` is the sole coordinate; all fallback paths removed; an unreachable bundle coordinate stops continuation instead of rewriting or inferring.

**ADR 0004 (capability catalog reuse-first and non-authoritative)** — resolves the risk that a discovery catalog becomes a second behavior source, silently overriding accepted specs. Decision: catalog is an Agent-facing projection that routes to candidates but never decides fit, authorizes implementation, or replaces the main spec; proposals must record candidates considered and why reuse failed; each row states a Markdown/Agent vs Engine/Node control boundary instead of a vague `mixed`.

**ADR 0005 (two-level capability paths as canonical identity)** — resolves ambiguous flat leaf names (related behavior indistinguishable) and the danger of unbounded hierarchies. Decision: exactly one `domain/capability` identity (`agent|engine|bundle|research|workflow|verification|governance`), shared by main specs, active deltas, requirement registry, and catalog; a move is a synchronized identity migration. This is why `openspec/specs/` today is a clean 7-domain tree.

---

## 4. Archived drift/staleness changes (6 read in depth)

**2026-06-24 align-specs-with-guidelines-charter** — `guidelines/` had re-converged role vocabulary (`Phase Agent`, `Sub-agent`, `Agent actor`) but `openspec/specs/` and `DPT_FRAMEWORK/` still carried old names (`main-agent` as concept role, legacy `target` field) plus verified runtime fact drift (`rb_queue.json`; a `gate-definition.mjs` contract that never existed). Fix: careful, evidence-anchored prose alignment across specs, framework READMEs, phase Markdown, and playbooks — while explicitly *not* touching wire values (`targets.controller: "main-agent"`), schema enums, or archives, and deferring any wire migration to a separate change. Notably the change fixed stale prose *about* `gate-definition.mjs` — a contract that today is real (`DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs`, GSK-001/011), while `gate.mjs` no longer exists.

**2026-07-04 retire-stale-main-specs** — the user instructed: "代码里确实没有了就清理；一旦犹豫、把不准，就别管" (clean only what is truly gone; when unsure, don't). Fix: retired the one-time `seg2node` migration spec (`SEG-001`) — an unused high-confidence case — marked it `[DEPRECATED]` in the requirement registry, kept archives untouched, and explicitly refused to touch specs that still had live anchors. The follow-up `repair-retired-spec-validation` (2026-07-26) had to repair the tombstones this cleanup left (see §2 FM-3).

**2026-06-26 fix-transition-next-gate-stale-after-seed-topics** — the canonical stale-state bug (see §2 FM-3): template `next_gate: wave0_complete` was blessed by the instantiation gate after the chain had grown; and nothing could write the status/trace the gates read. Fix: corrected template + gate definitions + phase docs, added `advance-status.mjs` (chain.json-driven status writer) and `log-event --event` (trace writer), deprecated the abstract FSM in `schema/contracts/gate.mjs`, switched `md-phase-checks.mjs` to `transitions.chain.json` as truth, and added an end-to-end regression that advances 4 gates without hand-editing control state.

**2026-06-19 fix-fsm-runtime-stale-ref** — a one-sentence stale reference: after `fix-workflow-chain-md-agent-readable` removed VM sandboxing from `workflow-chain.mjs`, the `workflow-fsm-runtime` spec's Purpose still attributed VM-sandbox/MD-execution to it. Fix: delete the sentence (non-normative cleanup, no delta spec) — a tiny but emblematic example of drift propagating between adjacent fixes.

**2026-07-04 spec-reality-sync** — the largest reconciliation: 15 spec↔code mismatches (8 HIGH) plus 5 delta-toned specs ("In this change" phrasing that misleads future agents). Fix: aligned 18 capabilities to actual code/gate-JSON/phase-MD (wave0 paths → `artifacts/wave0/{topic}/source.yaml`, cache layout → `_cache/{wave}/{batch}/{scope}/sNN_{slug}/`, gate rule lists → gate JSON, relay-driver model), de-noised temporal wording, and — the one code-side fix — added the missing `trace_event_present` gate rules + CLI dispatcher branches (spec was right, code was missing it).

**2026-06-19 fix-workflow-chain-md-agent-readable** — removed `node:vm` sandbox execution from `workflow-chain.mjs`; `assessNode()` now returns parsed frontmatter+body for the Agent to read, Engine keeps only deterministic duties (schema validation, dependency closure, trace). Breaking by design, aligned with the charter's core split.

---

## 5. VERIFY CLEANUP EFFECT — current-tree verdicts

### FM-1 Spec↔code drift → **cleaned; structure now machine-checked, content still process-checked**

Current-tree evidence:
- `DEEP_RESEARCH_HARNESS/engine/workflow-chain.mjs:9-13` — header states "MD content is Agent-readable — the Engine does NOT execute code blocks"; `grep node:vm` across `DEEP_RESEARCH_HARNESS/` returns **zero** hits. VM-sandbox fix in place.
- `workflow-fsm-runtime` spec is gone from the taxonomy (`openspec/specs/workflow/` lists only live capabilities); `schema/contracts/gate.mjs` gone → `gate-definition.mjs` (`DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs:1`, `@impl GSK-001, GSK-011`).
- Stale wave0 path survives only as negative/migration prose: `openspec/specs/research/wave0-artifacts-directory/spec.md:7` ("原在 `reference/<topic>/source.yaml`" as migration note) and `openspec/specs/bundle/reference-flat-format/spec.md:545` ("SHALL not be directed to create `reference/<topic>/source.yaml`"); live paths are `artifacts/wave0/<topic>/source.yaml` (`research-return-map/spec.md:23`). No `_cache/search-results` or `_cache/waveN/slot_MM` hits in specs.
- Machine check exists for spec *structure/format*: `openspec/governance/check-project-specs.mjs:9-17` rejects `deltaHeaderInMain / missingPurpose / missingRequirements / missingReqHeader`; it is mandated as a hard closing task of **every** change (`openspec/config.yaml` tasks rule) and is executed by the only supported archive route — `finalize-change-archive.mjs` spawns it and *blocks* archive on failure (`openspec/governance/finalize-change-archive.mjs:354-356`, plus `check-project-reqs.mjs` at 340-350, verification-routing at 385-389, semantic-closure at 396-400). The behavior is itself accepted spec: `openspec/specs/governance/requirement-traceability/spec.md:295-296`.
- Retire cleanup verified: `openspec/specs/` has no `seg2node`; `openspec/governance/req-registry.yaml:97` marks the `SEG` prefix "all entries deprecated; no spec directory", `:930` marks `SEG-001 … [DEPRECATED]`.

**Verdict**: fixed and structurally guarded for *format/registry* drift; *content* (path/layout/rule-list prose vs code) drift is not machine-verified — it is caught only by manual audits like spec-reality-sync, then frozen by the format gate once fixed. A future rename/layout change can re-introduce content drift that no checker detects until an agent hits it.

### FM-2 Agent-guidance drift → **cleaned by centralization + authority model; not machine-enforced**

Current-tree evidence:
- All guidance centralized under `openspec/`: `constitution/` (charter + 3 evolution directions), `guidance/models/` (5 mechanism models), `operations/` (3 procedure files), routed by trigger through `openspec/README.md` (control map). The old root `Where-To-Look` is replaced by AGENTS.md/CLAUDE.md "Repository Reading Scope" + explicit do-not-read list (`c5bfc7e97`).
- `CONTEXT.md:12-23` is explicitly non-authoritative ("This file is not a behavior specification…"), with a "Terminology Sources and Authority Boundary" table; the charter's authority table (`openspec/constitution/project-charter.md:48-59`) names one Source of Record per fact class.
- Guidance files carry machine-parseable frontmatter guards: `openspec/operations/change-feedback-loop.md:1-10` (`guideline_id`, `authority: guidance`, `defers_to:` chain to charter/spec/finalizer). `ed128cb18` "align current guidance contract guards" applied this uniformly.
- Dual-file maintenance: `AGENTS.md` and `CLAUDE.md` are byte-identical except the title line (verified via `diff`; only lines 1 and 3 differ: "Codex notes" vs "Claude Code notes"). **In sync today, but nothing automated keeps them so** — no test, no hook, no CI.

**Verdict**: the *surface* is cleaned (single topology, clear authority boundaries, deep-research routing rules in both agent files), but guidance↔spec consistency remains **prose-level by design** ("Guidance explains boundaries and routes readers; it does not grant implementation permission" — charter:41-42). Nothing machine-checks that guidance prose matches accepted specs, and the AGENTS.md/CLAUDE.md duplicate has no automated sync guard.

### FM-3 Stale lifecycle/transition truth → **cleaned AND structurally prevented**

Current-tree evidence:
- `DEEP_RESEARCH_HARNESS/rb_templates/rb_status.json.tmpl:6` — `"next_gate": "seed_topics_ready"` (correct chain head, no longer `wave0_complete`).
- Single transition truth: `DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json`; single status writer `DEEP_RESEARCH_HARNESS/cli/advance-status.mjs`; `log-event.mjs` supports `--event` writing `rb_trace.jsonl` (`@impl CPT-002`, `DEEP_RESEARCH_HARNESS/cli/log-event.mjs:3,61,164`).
- Regression lock: `tests/integration/cli/gate-chain-consistency.test.mjs:1-9` ("advance through 4 gates WITHOUT hand-editing control state" — instantiation-complete → hitl1-recorded → setup-ready → seed-topics-ready).
- Gate definitions now carry the `trace_event_present` rules the CLI can actually dispatch (`schema/gate_definitions/gate-wave{0,1,2}-complete.definition.json` each contain 1; `cli/gates/check-gate-wave{0,1,2}-complete.mjs` each dispatch it) — the spec-reality-sync §G code gap is closed.
- Abstract gate FSM retired (`2a5cd0d7d`); no FSM capability remains in `openspec/specs/workflow/`.

**Verdict**: this failure mode is now *structurally* prevented — one chain.json truth, one status CLI, one trace CLI, an end-to-end test, and gate-definition audits. It is the mode with the strongest machine guard.

---

## 6. What Remains Structurally Unfixed

1. **Spec *content* drift vs code is not machine-checked.** `check-project-specs.mjs` validates structure/format/req-headers only; nothing verifies that prose paths (`artifacts/wave0/…`, cache layouts, gate rule lists) match the current code. The two big reconciliations (spec-reality-sync, align-specs-with-guidelines-charter) were one-off manual audits; the fix is frozen by the format gate but the *next* rename/layout change can silently re-drift with no checker catching it.
2. **No CI / no git hooks / no pre-commit anywhere** (no `.github/`, no `.husky/`, no `core.hooksPath`, no `.pre-commit-config.yaml`). All governance checkers run only inside the OpenSpec workflow (mandated `tasks.md` closing tasks + the archive finalizer). An agent that skips or shortcuts the workflow commits drift undetected — enforcement is process-dependent, not environment-dependent. The checkers are excellent *when invoked*; nothing forces invocation.
3. **AGENTS.md ↔ CLAUDE.md dual maintenance has no automated guard.** Identical today except the title line; a future edit to one file silently desynchronizes the other, which is precisely the class of drift (FM-2) this repo has chased repeatedly. A trivial test (`assert.deepEqual` on the two files modulo title) would close it.
4. **Retirement/cleanup can still break repo-wide validation** (repair-retired-spec-validation, empty tombstones; v0.30 stamp added then removed in v0.90). The format gate now *catches* such breakage at archive time — the failure mode is mitigated but the repair is still a manual follow-up change; there is no pre-apply "retire dry-run" that validates tombstone legality before the removal lands.
5. **Guidance-prose consistency is deliberately unverified** (charter's authority model). The `defers_to` frontmatter makes *authors* declare their authority chain, but no checker confirms the chain resolves to an existing accepted spec — a broken `defers_to` (like the VM-sandbox stale reference) would again propagate silently until an agent misroutes.

### Bottom line
The owner's complaint ("agents keep doing things wrong — vagueness or overload") matches three recurring modes: spec↔code drift, agent-guidance drift, and stale transition/state truth. The third is now genuinely structurally fixed (single truth sources + CLIs + regression tests + gate audits). The first is format-guarded but content-unverified; the second is centralized and well-routed but still prose-only with an unguarded AGENTS.md/CLAUDE.md duplicate. The single highest-leverage structural gap is that **none of the governance checkers are wired into any automated gate** — everything depends on the Agent following the documented workflow, which is the same self-discipline that failed in the past.
