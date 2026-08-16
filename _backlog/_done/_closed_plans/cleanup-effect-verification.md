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

---

# Part II: Recovery Opacity (M1–M10) + Authority Drift (B1–B5) + Routing Friction (H1–H8)

> Provenance: 与 Part I 同一 2026-08-16 coding-agent review session。file:line 均经写作时工作树核验(§7 嵌套审计项除外,已逐条标注)。落地须走 guidance-drift-cleanup-machine-guards.md 中的 OpenSpec change。


## 7. M — RUN.md 恢复指令与代码对照(10 处)

| # | 指令侧 | 代码/spec 侧 | 判定 |
|---|---|---|---|
| M1 | `RUN.md:32` "Normal `submit` accepts claimed attempts only and **rejects terminal attempts**" | `engine/work-unit-submit.mjs:1201-1223`:同 hash 重复 submit 返回 `duplicate:true`(成功);`delegated-work-units/spec.md:545-555`、`agent-output-declaration/spec.md:126-130` 明文允许幂等重复。仅不同内容重复才拒绝 | **冲突**。措辞应为 claimed-only + 同 hash 幂等 |
| M2 | `RUN.md:36` "read its structured `attempt_disposition`" | `attempt_disposition` 只由 dry-submit(`work-unit-submit.mjs:1800`)与 inspect(`work-unit-inspect.mjs:220`)发出;submit 拒绝(`recordSubmitRejection` `work-unit-submit.mjs:963-1087`)、late-submit 拒绝(`work-unit-submit.mjs:414-456`)、transaction 阻塞(`work-unit-transaction.mjs:399-409`)、recover 结果都没有该字段 | **超额**。5 个反馈面只有 2 个发该字段 |
| M3 | `RUN.md:36` "`repair_kind` names that operation" | `repair_kind` 值为下划线:`recover_transaction`(`work-unit-transaction.mjs:270`)、`recover_declaration`(`work-unit-supersession.mjs:751`);CLI 动词为连字符:`recover-transaction`/`recover-declaration`(`cli/operate-work-unit.mjs:34-35`)。映射未在任何文档声明 | **暗号**。对比 `supersede` 两处拼写一致 |
| M4 | `RUN.md:38` "Read the returned predecessor `work_id`, predecessor `queue_item_id`, transaction ID, and `successor_queue_item_id`" | `supersedeWorkUnitAttempt` 顶层只有 `work_id`/`queue_item_id`/`relation`/`successor`/`lineage`(`work-unit-supersession.mjs:873-885`);`tx_id` 与 `successor_queue_item_id` 嵌套在 `relation` 内(`:826-836`),successor 位置在 `successor.queue_location`(`:561-637`) | **嵌套未写清**。4 个字段有 2 个不在顶层 |
| M5 | `RUN.md:36` "rerun the preserved … or **Gate checkpoint**" | 各 recovery 结果的 `rerun` 字段从不指 gate CLI;gate 是 per-node CLI,需要 `--current-node`(`framework-runtime-boundary.md:215,220-226`)。"Gate checkpoint" 无法从反馈重建 | **未定义术语**(另见 B2) |
| M6 | `RUN.md:16` "唯一允许的前置澄清是 **pre-pipeline routing exception**" | 该词只在 `agent-command-surface/spec.md:208` 定义;RUN.md 引用但无指针 | **上下文内无定义**(定义在下一层,从入口不可达) |
| M7 | `RUN.md:36` "`busy` separates caller … and `journal_disposition`" | 基本吻合(`work-unit-transaction.mjs:297-314`);但 `journal_disposition` 是裸字符串(`started|committed|rolled_back|suspect|legacy_failed|unknown`,`:194-208`),不是有界枚举 | 基本干净;RUN.md 暗示了结构化概念 |
| M8 | `RUN.md:30` "Final … **不是第三个 checkpoint**" | `start-research.md:75` 称 Final "terminal lifecycle delivery **but deliver-first interactive**";`phase-final.md:103-141` 支持 presentation feedback | **指引内部措辞漂移**(另见 B4) |
| M9 | `RUN.md:34` "`actor_execution` … does not authenticate a physical writer" | 一致:`work-unit-attempt-disposition.mjs:31-32` 显式 `physical_actor_authenticated:false`、`liveness_proven:false` | 干净 |
| M10 | `RUN.md:36` "after a successful or idempotent result, rerun the preserved … checkpoint" | `recoverWorkUnitTransaction` 返回 `{ok,changed,idempotent,disposition,journal_ref}`(`work-unit-transaction.mjs:654-707`),**无 rerun 字段**;重跑完全依赖调用者"保留原命令" | 干净但脆弱:恢复结果是死胡同,除非调用者自己记住了原命令 |

### 恢复面心智模型(一行版,供 C2 改写决策表用)

```text
happy path: queue demand item -> claim(分配 work_id+envelope) -> 子代理产出 -> dry-submit(只读预检)
  -> submit(锁内重校验+canonicalize+写 ledger 行+清 delegated_in_flight) -> gate 读 ledger
recovery:
  busy             = 锁被他人持有,等待后重跑同一命令(区分 caller vs holder 坐标)
  suspect_transaction = 锁/日志残缺;仅当唯一未锁 v2 journal 且 repair_kind=recover_transaction 时
                        跑 recover-transaction --tx-id;否则 missing_contract
  recover-declaration = 已 submit 的 ledger 行可精确重建时优先(幂等,不收新内容)
  supersede        = 提交后漂移且不可声明重建时;建 fresh successor,从 successor 普通位置继续,
                     绝不复活 predecessor、绝不手改 ledger/index/status/queue/lock/journal/hash
  late-submit      = 唯一终态恢复:timed_out + 有效候选 + 该 queue_item_id 无替补时,audited 接受
  timeout-preflight = 只读预检,recommended_action: submit|repair|wait|timeout|inspect|block;--force 例外
  missing_contract = 无合法恢复路径的直接停止边界
```

---

## 8. B — 权威分层漂移(5 处,同事实在多层表述不一)

| # | 事实 | 漂移证据 | 最易被误信的一层 |
|---|---|---|---|
| B1 | 停止授权 | 指引 `DEEP_RESEARCH_HARNESS/README.md:138` 与 `openspec/guidance/models/agentic-queue-mechanism.md:234` 称合法值为 `final_delivery / decision_blocker / empty_queue_after_refill`;但 `engine/queue-manager-core.mjs:57` 枚举 4 值,`syncQueueHealth`(`:98-113`)只写 `empty_queue_after_refill`/`unauthorized_continue_required`,前两个**全仓无赋值点**;accepted spec `agentic-queue/spec.md` 对该状态**沉默**;归档 change 已退役相关旧规则。agent 实际看到的值不在指引的"合法值"列表里 | README:138(指引) |
| B2 | "Gate" 的确切含义 | `CONTEXT.md:47` 一行 gloss"Engine checkpoint";`framework-runtime-boundary.md:206-218` 说 Gate 文件有 **5 个 surface/3 类含义**(transition 表、definition JSON、engine、CLI wrapper、runtime status);`RUN.md:36,38` 又把 "Gate checkpoint" 当可重跑对象 | RUN.md 恢复段(反馈里无 gate 重跑坐标) |
| B3 | "DEEP_RESEARCH_HARNESS 只读" | 根 `AGENTS.md`/`CLAUDE.md` 说的是 **OpenSpec 生命周期**规则(apply 前代码只读);`DEEP_RESEARCH_HARNESS/README.md:43,57-68` 说的是 **运行时**规则(run 内容不写回框架)。同一句"只读"两种 scope,各层都不提另一层 | 看哪份先读哪份 |
| B4 | "HITL1/HITL2 是唯一交互点" | spec `hitl-ux` 说两个交互决策点;`RUN.md:30` 说 Final 不是第三个 checkpoint;`start-research.md:75` 又说 Final "deliver-first interactive";`phase-final.md` 支持 presentation feedback。三种边界措辞 + Final 的真实张力 | `start-research.md:75`("deliver-first interactive" 不在 spec) |
| B5 | "tests 只在 tests/" | 根 `AGENTS.md`/`CLAUDE.md` 加了 spec 不拥有的"never inside harness"禁令 + 重复 typo(`tests/engine/, tests/engine/`);且 `verification-routing/spec.md:209-213` 明确要求知识面"引用而非复制"路由契约——AGENTS.md 属于复制。仅信 spec 的 agent 找不到该禁令 | AGENTS.md:58(既有 typo 又有复制) |

---

## 9. H — 路由摩擦与阅读税热点(8 处)

| # | 热点 | 证据/数字 |
|---|---|---|
| H1 | 入口选择规则在 **9 个 surface** 近逐字重述 | 根 AGENTS/CLAUDE:26、harness AGENTS/CLAUDE:21、README.md:29、RUN.md:44、COMMANDS.md:79-81、start-research.md:79、continue-run-bundle.md:7-40;英/中版已有措辞漂移 |
| H2 | propose 链强制 1,716-2,378 行预读 | 主导项是 963 行 `req-registry.yaml`(纯数据,已被 `check-project-reqs --mode plan` 机器检查)与 662 行演化三原则 |
| H3 | "非权威…then stop" 的路线没有具体下一跳 | `openspec/README.md:49-52`、`CONTEXT.md:68-74` 只说到"用 accepted spec/生命周期",不指具体文件或命令 |
| H4 | skill 死路径 | `.agents/skills/source-command-opsx-{apply,archive}/SKILL.md` 引用不存在的 `guidelines/change-feedback-loop.md`;真实文件在 `openspec/operations/` |
| H5 | 四个顶层 harness 文档环形路由 | README→RUN→COMMANDS→RUN→README,无终止权威;答案在四份里各自复制 |
| H6 | 术语缺口 | `CONTEXT.md` 0 次出现 "hint";`hints[]`/`repair_kind` 是每个 phase §7 的主反馈面;三坐标模型(repo_command_root/framework_root/current_run_bundle_root)只在 harness README:54-58 定义 |
| H7 | phase 闭包重复注入 | 11 个 phase 各自 requires 1-4 个 shared 文件;一整轮约 **6,950 行** 闭包、其中 **约 2,600 行是重复共享散文**(unique 仅约 4,300) |
| H8 | shared-gate-rules 重复陈述 | `verification-routing/spec.md:209-213` 禁止知识面复制路由契约;`shared-gate-rules.md`(43 行)与各 phase §7、`shared-repair-guidance.md`(57 行)重复同一 repair loop |

### 表面尺寸(2026-08-16 实测)

| 面 | 文件 | 行 |
|---|---|---|
| openspec/ 非归档 | 109 | 35,108(其中 specs 28,736) |
| openspec/changes/archive/ | 1,636 | 153,851 |
| DEEP_RESEARCH_HARNESS 文档 | 63 | 7,090 |
| 引擎代码 | 35 | 13,544(work-unit-submit.mjs 单文件 2,430) |
| CLI 代码 | 24 | 5,024 |
| tests | 267 文件 | 67,924 |
| phase+shared nodes 否定规则 | — | **340 处**"禁止/不得/MUST NOT/do not" |

### 每条任务的强制预读

charter+CONTEXT = 174 行起步;研究入口 7 跳 643 行;提案 8-11 跳 1,716-2,378 行。

---

## 10. 第一手核验清单(2026-08-16,本会话亲手验证)

- `COMMANDS.md:55` 把 validate-workflow-package exit-code 漂移**记录在案而未修**:header 声明 exit 2,代码只有 `process.exit(0/1)`(`cli/validate-workflow-package.mjs:33,36`)。
- 根 `AGENTS.md` ≡ `CLAUDE.md` 仅标题行不同;harness 对同样,且各带"改时两份一起改"注——无守卫测试。`canonical-harness-vocabulary-contract.test.mjs:48` 已有 harness 对的等价断言先例。
- 无 `.github/`、无 `.husky/`、无 `core.hooksPath`、无活动 git hook(2026-08-16 验证)。
- `tests/engine/static-regression.test.mjs` 用 14 个泄漏模式 + 25 个白名单例外正则,**冻结** stop:no 的否定句本身。
- `engine/helpers/continuation-cue.mjs` 是系统内最短反馈环的正确实现(5 个封闭枚举、一个 next_action)——C2 的模板参照。
- `tests/integration/cli/exit-code-convention.test.mjs` 已有 CLI exit-code inventory——C3 内容漂移检查器的胚胎。
- 会话期间用户已归档 `iterate-final-delivery-in-place`(提交 `860f65234`、`d65544d3f`),工作树除本 plan 文件外干净。

## 11. 修复映射(哪条进哪个 change)

| 证据 | Change |
|---|---|
| B1/B2/B3/B4/B5、H1/H4/H5/H6、typo、exit-code 方向决定、AGENTS≡CLAUDE 守卫、RA-M1/RA-M2/RA-M4/RA-L1(§13) | **C1 repair-current-guidance-contract-drift** |
| M1-M10、恢复面心智模型、五个反馈面统一、repair_kind 对齐、supersede 压平、RUN.md 决策表;候选:RA-M3/RA-M5/RA-L2/RA-L3/RA-L4(§13,propose 时确认行为 vs 文档) | **C2 make-work-unit-recovery-feedback-direct** |
| H2(registry 查询)、H8(防重复陈述)、内容漂移 checker、pre-commit 决定项 | **C3 add-doc-code-drift-guards** |
| H7(2,600 行重注入) | **C4 dedup-phase-closure-loading(deferred)** |
| RA-L5(quarantine 刻意状态) | 不改 |

## 12. "不变量简报"候选清单(C1 交付物草稿)

C1 新增的 onboarding 基线约 15 条,每条都应是可机器验证或可直接指向单一
真相源的陈述。候选(propose 时收敛):

1. Agent 供判断,Engine 供确定性裁决,Markdown 供流程——三者不互替(Charter)。
2. 运行时真相只在显式选中的 current run bundle root,裸路径都相对它解析。
3. `DEEP_RESEARCH_HARNESS/` 在 run 期间只读;代码写入只发生在 OpenSpec apply。
4. 停止授权以 `queue-manager-core.mjs` 枚举为准(`empty_queue_after_refill` =
   drain 后停止;`unauthorized_continue_required` = 继续;另两个是保留值)。
5. submit 只接受 claimed;同 hash 重复 = 幂等成功;delegated 完成只看 submitted
   ledger 行,不看文件系统存在。
6. work-unit 恢复遵守"同一 checkpoint 重跑"或"显式 terminalize + 新路径",
   绝不手改 ledger/index/status/queue/lock/journal/hash。
7. 反馈的第一动作看 `hints[]`/`attempt_disposition`/`repair_kind` 的 closed
   enum,不猜字段名;repair 后重跑同一 checkpoint。
8. HITL1/HITL2 是仅有的 in-run 交互点;Final 是 terminal delivery,接受
   presentation feedback 但不成为第三个 checkpoint。
9. 入口选择:显式 existing bundle candidate 先验证同根 BUNDLE_ENTRY+BUNDLE_MAP
   pair,缺一即 `unsupported_current_entry_contract`;否则读 RUN.md。
10. 测试四类 `unit/integration/deterministic_e2e/agent_flow_e2e` 以
    `verification-routing` spec 为准;JS 测试只在 `tests/`,框架目录不放测试。
11. Node >=20、纯 ESM、无 TypeScript/Python;依赖只有 `zod`/`yaml`。
12. trace 是真相、log 是解释;pass/fail 从 `rb_trace.jsonl` 判,不从 console。
13. 反馈不创造权限:Engine 说 missing_contract 就停,不手写 authority、不建
    平行路径。
14. 术语正典:queue_item_id = demand、work_id = attempt、submit = 唯一正常
    完成边界;main-agent/sub-agent 只作 wire 值。
15. 每轮行动只做 feedback 给的"一个下一步"(continuation cue / check.next),
    不主动发起提问、汇报或等待(非 HITL 的 stop:no phase)。

## 13. Reentry 面追加发现(2026-08-16,已全部经第一手复核)

来源:测试子代理的 working-tree 一致性审计最终报告。**勘误记录**:本会话先前
错误声称审计引用坐标"不存在"——实际是路径缩写,真实文件在
`DEEP_RESEARCH_HARNESS/engine/helpers/` 下;以下条目均已按真实坐标复核。

**RA-M1(spec 文本陈旧,真):** HITL1 search policy。accepted spec
`openspec/specs/workflow/workflow-node-contract/spec.md:13,23` 写
`capability_probe_only`;实际 phase 与 validator 用
`direct_retrieval_probe_only`(`workflows/nodes/phases/phase-hitl1.md:9`;
`engine/consistency-validator.mjs:324`)。两值都在 `VALID_SEARCH_POLICIES`
(`:384`),所以什么都不失败——spec 文本过时且无人强制。→ C1。

**RA-M2(spec-vs-spec 优先级冲突 + 代码跟随 POF-001,真):**
- `openspec/specs/engine/runtime-reentry-debuggability/spec.md:386-396`(RRD-008)
  要求 1. artifact-persistence workspace → 3. C5 workspace;
- `openspec/specs/research/post-final-recovery/spec.md:68-74`(POF-001)要求
  C5 优先。
- 代码实测:`engine/helpers/post-final-recovery.mjs:354-359` 先短路 accepted
  post-final(C5)workspace,后查 `_diagnostics/artifact-persistence`——即跟随
  POF-001,与 RRD-008 相反;`engine/helpers/recovery-contract.mjs:139-141`
  的 artifact 分支在两个 workspace 并存时不可达。
→ C1(propose 时决定哪份 spec 是真相,并让另一份指向它)。

**RA-M3(blocked 被投影成 reachable,真·行为缺陷):**
`openspec/specs/engine/runtime-reentry-debuggability/spec.md:124-125,451-452`
要求 no-match "SHALL block";但 `engine/helpers/recovery-contract.mjs:145-148`
对 `verdict: blocked` 的 post-final inspection 不匹配任何分支,落入
`currentFinalOwnerAction()` + `blocker: null`;`:178-191` 以
`reachable = Boolean(postFinalAction)` 把该 root 标为 `reachable`——block 只
活在下游 advisory 字段 `cli/check-reentry.mjs:974` 的 `post_final_recovery`。
→ C2 候选(反馈/投影说真话;确认为行为修复后纳入)。

**RA-M4(命令存在但文档漏登记,真):** `persist-final-report` 已实现
(`cli/operate-artifact-persistence.mjs:29,121-131`)且被 spec 要求
(`openspec/specs/bundle/artifact-persistence-recovery/spec.md:117`),但
`COMMANDS.md` 全文与 `command_playbook/persist-artifact.md` 零出现。→ C1。

**RA-L1:** `COMMANDS.md:50,165` 的 `publish-final-report --bundle --source
[--feature]` 缺 `operate-artifact-persistence.mjs` 前缀,复制即失败。→ C1。

**RA-L2:** sweep 的 `operation_not_prepared` advice 无条件说 "retry persist"
(`engine/helpers/artifact-persistence.mjs:1029-1035`),对 primary-publication
workspace 不可执行;`persist-artifact.md:84-86` 明说 primary 不得 retry
generic persist。advice 与 playbook 冲突。→ C2 候选(advice 真话)或 C1
(若只改 playbook 措辞,先定谁对)。

**RA-L3:** `--feature` 在 `persist`/`persist-final-report` 上被静默接受并忽略
(`operate-artifact-persistence.mjs:90-141`),文档却把 `--feature` 限定在
`publish-final-report`。→ C2 候选(调用契约严格化)或 C1(文档承认现状)。

**RA-L4:** zero-append 与 proven-append 阶段(`handoff-helpers.mjs:481-500`)
投影出字节一致的 `current_owner phases/phase-final.md` 动作
(`engine/helpers/post-final-recovery.mjs:339,342`),而 spec
(`runtime-reentry-debuggability/spec.md:326-327,442-446,460-464`)要求 summary
区分 delivery-pending 与 refinement——区别只存在于 advisory stage 字段。
→ C2 候选(投影真话)。

**RA-L5(有意为之,不改):** 冻结的 quarantine case-137 仍命名
`persist-final-report` 且 frontmatter id 不符——按 CDE-003 无证据归档的刻意
状态,不是活跃 surface。→ 不改。

**RA-L6(= 第一手核验清单的已知漂移):** `COMMANDS.md:55` 记录的
validate-workflow-package exit-code 漂移再次确认(`cli/validate-workflow-package.mjs:33,36`)。

**RA-M5(升级:确认 medium,legacy load 不可识别):** pre-contract 时代的 Final
`load_complete` 只有 `{entry, plan, ts}` 三字段(在 `0edb58310^` 直接核验:
`DPT_FRAMEWORK/engine/workflow-chain.mjs:674` at that commit);四字段 binding
(`handoff_source_attempt_index/gate/node/target_node`)正是 `0edb58310`
(harden-phase-handoff-witnessing)引入的。因此存在真实历史群体:它们的 Final
load 由裸 loader 写出。当前 `handoff-helpers.mjs:192-206` 的 `findBoundLoad`
要求四字段齐全 → 这类 load 不可见 → `evaluateFinalEntryAdmission`
(`:697-763`)落入 first-entry 分支,对 single-legacy-primary bundle 报
"first Final entry requires an empty primary inventory; found legacy"
(`:723-727`),且 admission/reentry summary 均无 legacy 检测路径。
spec 侧 `cli-phase-transition/spec.md:139-143` + `:224-228` **无条件**要求
pre-contract bundle 保持可读——代码结构上无法满足。受影响边界:仅
pre-0edb58310 的 load 且该 bundle 经 C5 rerun 回到 Final 时触发;是否仍有
存活 bundle 无法验证(run 历史在范围外目录)。
→ C2 候选(propose 时二选一:实现 legacy-load 识别,或把 spec 保证收窄到
post-0edb58310 load 并记录迁移边界)。

**教训记录(已修正):** 嵌套审计的引用是**路径缩写**(`engine/helpers/` 前缀
被省略),不是不存在。本会话第一次复核时只查了 `engine/*.mjs` 顶层,得出了
错误结论并写进了本文件——已于本行修正。复核规则不变:任何未经第一手
复核的 file:line 不得直接写进 change 依据。


