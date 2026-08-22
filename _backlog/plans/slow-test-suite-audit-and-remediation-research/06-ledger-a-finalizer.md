# 06 — Ledger A: Governance Finalizer + Archive

> Source: subagent analysis (31829aa2), 2026-08-22. All anchors verified current.

File: `tests/integration/governance/change-feedback-finalizer.test.mjs` (556
lines, 6 cases) + `change-feedback-loop-archive.test.mjs` (323 lines, 1 case).

## 1. short-circuits every governance checker through the production CLI
- file:line: `tests/integration/governance/change-feedback-finalizer.test.mjs:354` (body 354–453)
- measured: 69.226s (rank 1)
- assertion: the production finalizer CLI returns the exact ordered `root.code`/checker-`id` prefix for each governance boundary reached via progressive fixture repair (requirement → main-spec → taxonomy → discovery → routing → semantic-closure), each as a distinct subprocess invocation.
- authority: `openspec/governance/finalize-change-archive.mjs:finalizeChangeArchive` (CLI main 526–558). Ordered short-circuit facts: `requirement_governance_failed` :362 (`check-project-reqs.mjs`), `main_spec_governance_failed` :368 (`check-project-specs.mjs`), `capability_taxonomy_failed` :379, `capability_discovery_failed` :391, `verification_routing_failed` :401, `semantic_closure_failed` :412.
- mutation: must NOT change production short-circuit ordering; each blocker returns `checks` as a prefix of the full chain and records only the first failing checker + `root.code`/owner. No hand-authored gate/status/transition/verdict.
- neighbors: same file :455 (reservation), :338 (early block), :512 (static `SUPPORTED_ENTRY_SURFACES`); archive twin :303 (success row).
- disposition: **Restructure (P0)**.
- evidence: replacement map where every old `root.code`/`checks`-prefix row is covered by a direct in-process checker matrix + a named retained production finalizer sentinel proving CLI short-circuit. Plan: "Do not replay an ever-longer prior checker prefix merely to reach each checker."
- cost drivers: `createGovernanceFixture` :98 = 2 subprocesses (`openspec init` :101, `openspec new change` :105) + 9 script copies (:80–96). Six `runFinalizer(root)` calls (:356,:363,:386,:403,:436,:445); each replays all prior checkers. Cumulative checker-borne launches ≈ 39–41 + 2 init/new.

## 2. delivers feedback marker task instructions and operation guidance for a fresh change
- file:line: `:250` (body 250–327)
- measured: 22.718s (rank 3)
- assertion: for a freshly generated change, `openspec instructions proposal/tasks` project exactly one `openspec-feedback:` marker rule (plan-review and closeout-review, `- [ ]`), and `instructions apply/archive` project `operationGuidance` entries matching the repo's `change-feedback-loop.md` guidance schema.
- authority: external CLI `@fission-ai/openspec` `instructions` command (`dist/commands/workflow/instructions.js`, 480 lines — in-process projection, confirmed no child_process); guidance content from `openspec/config.yaml` + `openspec/operations/change-feedback-loop.md` (:313 read).
- mutation: must NOT change guidance templates / `FEEDBACK_MARKERS` / semantic-closure rule wording that assertions match.
- neighbors: same file :329 (temporary-root guidance, rank 12). No other suite asserts `openspec instructions ... operationGuidance`.
- disposition: **Restructure (P0/P0.5)** — static guidance assertions need not each launch OpenSpec; keep one projection sentinel.
- evidence: one generated-change projection (single CLI sentinel) proves delivery; static text rows (marker regexes, `change-feedback-loop.md` read, semantic-closure substrings) move to direct in-process assertions.
- cost drivers: `createGeneratedFeedbackChange` :65 = 2 subprocesses (init :68, new :70) + 1 file copy; four `openspec instructions --json` calls (:252,:255,:281,:284), each a fresh Node process. Confirms finding 2/P0.5: 4 separate process startups for guidance rows; each `instructions` run is in-process (no nested subprocess). Splitting text rows from one projection sentinel removes 3 of 4 launches.

## 3. requires the selected reservation transition while accepting another complete pending reservation
- file:line: `:455` (body 455–510)
- measured: 15.552s (rank 4)
- assertion: `check-project-reqs.mjs --mode archive` refuses when the selected change's own reservation has no registered prefix capability ("remains pending"), yet accepts an independent complete reservation for a different change (`other-change`) without triggering it.
- authority: `openspec/governance/check-project-reqs.mjs` (CLI 28–60; reservation evaluation via `requirement-reservation-contract.mjs:evaluateRequirementReservations`); `requirement_governance_failed` gate at finalizer :362.
- mutation: selected change with unregistered prefix reservation blocked at requirement gate; unrelated pending reservation tolerated (owner-key separation). No global block on all pending reservations.
- neighbors: `check-project-reqs.mjs` exercised via :354 boundary; archive twin :303 passes the same gate successfully.
- disposition: **Restructure (P0)** — direct requirement checker matrix plus one finalizer boundary.
- evidence: direct matrix of `evaluateRequirementReservations` rows covers selected-blocked and other-pending-accepted in-process; retained production finalizer sentinel proves CLI wiring.
- cost drivers: `createGovernanceFixture` (:456) = 2 subprocesses + 9 script copies + `rmSync`; three `runFinalizer` calls (:469,:505) with cumulative nested launches (≈4+5+5). No fixed waits.

## 4. uses native status and blocks the production CLI before validation when closeout is pending
- file:line: `:338` (body 338–352)
- measured: 13.312s (rank 7)
- assertion: with the closeout feedback marker left `- [ ]`, the finalizer CLI exits 1 with `outcome:'blocked'`, `root.code:'review_marker_unmet'`, exact `rerun` string, `checks == ['openspec_status','artifacts']` — real native `openspec status`, blocks at the task-marker gate BEFORE any validation/checker subprocess.
- authority: `finalize-change-archive.mjs:finalizeChangeArchive`: `openspec status` :263, `parseFeedbackTasks` :306, marker-unmet block :318–327; `FEEDBACK_MARKERS` :12.
- mutation: unmet closeout marker stops the chain after status/artifacts prefix and before `strict_validation`; `rerun` string reconstruction (`rerunFor` :141) unchanged.
- neighbors: :250 (marker rule projection), :354 (marker complete). Only early-stop-at-review-marker sentinel.
- disposition: **Restructure (P0)** — retain one early-stop CLI sentinel, remove unrelated fixture startup.
- evidence: keep the one full production-path early-stop sentinel; other marker-invalid/unmet rows via direct `parseFeedbackTasks` matrix; only the single CLI early-stop runs the marker gate.
- cost drivers: `createFeedbackChange` :31 = 2 subprocesses (init :34, new :45) + 7 fixture writes; one finalizer launch (:340) + inner `openspec status` (≈2). Dominant cost is fixture build (init/new).

## 5. receives current operation guidance from a temporary OpenSpec root
- file:line: `:329` (body 329–336)
- measured: 7.803s (rank 12)
- assertion: on a fixture whose `openspec/config.yaml` overrides apply/archive guidance, `openspec instructions apply --json` / `archive --json` return exactly `['change-feedback-loop/apply: review first']` / `['change-feedback-loop/archive: close out first']` (deepEqual) — guidance resolved from the fixture root, not the repo root.
- authority: external `@fission-ai/openspec` `instructions` resolving project `config.yaml` `operations.<apply|archive>.guidance` (platform `core/project-config.js` / `artifact-graph/instruction-loader.js`); no nested subprocess.
- mutation: per-root guidance resolution from `config.yaml` (not cached/global); `deepEqual` identity preserved (no injected defaults).
- neighbors: :250 asserts same `operationGuidance` shape against repo default. Only per-root override test.
- disposition: **Restructure (P0)** — one OpenSpec invocation should project both phase guidance records where possible.
- evidence: a single `instructions` invocation emitting both apply+archive (or broadened `--all`) is the retained sentinel; static rows move to the rank-3 shared projection path.
- cost drivers: `createFeedbackChange` (:330) = 2 subprocesses + config overwrite; two `openspec instructions --json` launches (:331,:332). Foldable into rank-3 projection setup.

## 6. uses the production finalizer to archive a synchronized isolated change
- file:line: `tests/integration/governance/change-feedback-loop-archive.test.mjs:303` (body 303–322)
- measured: 14.598s (rank 6)
- assertion: a fully synchronized fixture archives through the real finalizer (exit 0), `outcome:'archived'`, `change:'demo-change'`, complete 17-checker `checks` order (`FINALIZER_CHECKS` :27), `specs_updated:false`, change moved to `openspec/changes/archive/`, active dir deleted, `mainSpec` byte-identical.
- authority: `finalize-change-archive.mjs` full success chain ending at `openspec archive --json --skip-specs` :447 + post-archive path/identity verification :481–508.
- mutation: native archive success transition, full 17-step ordered checker list, `inside(archivePath, archiveDir)` path constraint, `!existsSync(changeRoot)` cleanup, `specs_updated:false` invariant all unchanged.
- neighbors: exact twin of :354's blocked chain — sole native-archive SUCCESS sentinel.
- disposition: **Retain** (P1) — optimize only setup/prefix cost.
- evidence: unique archive boundary stays a production-path success sentinel; share fixture init only if isolation provably safe (immutable baseline copy, never live shared dir).
- cost drivers: `createCompleteChange` :94 — heaviest fixture: 2 subprocesses (init :97, new :143) + `copyGovernanceClosure` :64–92 (17 scripts + semantic-fact-families.yaml) + 9 subtree symlinks + 4 copies + 12 writes; one finalizer launch (:305) running the FULL chain ≈ 16 nested subprocesses.

## File-level economics

- **Rank 3**: 6 subprocesses (2 init/new + 4 instructions). **Rank 12**: 4 (2 + 2). **Rank 7**: ≈4 (2 + finalizer + status). **Rank 4**: ≈16 (2 + 9 copies + 3 runFinalizer replaying prior checkers). **Rank 1**: ≈39–41 (2 + 6 runFinalizer with cumulative nested launches) — by far the largest. **Rank 6**: ≈18 (2 + full chain).
- **Progressive fixture repair (finding 1, CONFIRMED)**: rank 1 builds ONE fixture and runs the finalizer 6 times (:356,:363,:386,:403,:436,:445), writing one repair between calls. Because the finalizer is a serial short-circuit chain, each launch replays every earlier passed checkpoint — the dominant 69s cost and the exact restructure target.
- **Static-guidance finding (finding 2/P0.5, gauged)**: CONFIRMED as process-start cost, subtler than "per-line launches": rank 3 makes 4 separate `openspec instructions --json` launches, rank 12 makes 2, each a full Node process boot; but `instructions` itself is a pure in-process projector (no child_process). Pure-source assertions (:313 read, :512 `SUPPORTED_ENTRY_SURFACES`, SKILL.md greps) are zero-subprocess. P0.5 = keep one projection sentinel, drop 3–5 redundant launches.
- **Fixed waits**: NONE in either file. All cost is subprocess + fixture-copy startup.
- **Fixture copies**: `copyGovernanceScripts` (9 scripts), `copyGovernanceClosure` (17 files), `createGeneratedFeedbackChange` (1), `createCompleteChange` (multiple). Every case uses a fresh `mkdtempSync` — no cross-case sharing today; the guardrail-safe "share immutable setup" opportunity.
- **Cluster total**: ≈89 subprocess launches for 6 cases; ~69s of ~129s cluster wall driven by rank 1 replay + per-launch startup + copies.

## Open questions (Investigate-flavored)
1. Rank 6 can legally reuse predecessor state only if the FULL synchronized chain is byte-safe to snapshot (it needs complete chain, not the partially-repaired states). Until proven: **Retain** rank 6 as-is.
2. Whether `openspec instructions` can emit apply+archive in one invocation is an external-CLI capability — if unsupported, rank 12 collapses only via the shared rank-3 projection path.
3. Rank 1's direct matrix: several checkers (`check-capability-discovery`, `check-verification-routing`, `check-semantic-closure`) also arm outer subprocesses (e.g. `validate-playbook` at `check-verification-routing.mjs:101`); the direct path must pin those wiring checks or they stay in the retained sentinel.
