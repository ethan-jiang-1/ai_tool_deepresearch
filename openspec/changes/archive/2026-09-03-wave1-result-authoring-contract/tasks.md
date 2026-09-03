# Tasks: Wave1 Result-Authoring Contract — Generated Value-Domain Guidance And Dry-Submit Diagnostics

## 1. Regression tests first (red)

- [x] 1.1 Add a failing unit test in `tests/engine/work-unit-validation.test.mjs` ("duplicate accepted claim URL is counted inside an invalid result"): build a source-claims-allowed validation input that already fails an accepted-URL membership root (an `accepted_source_urls[]` entry with no matching accepted claim) while two accepted claims share one normalized URL; assert the repair error also names the repeated URL, its claim count, and the JSON-pointer range; assert a distinct-URL invalid input gains no duplicate enrichment, and a duplicate-only input that otherwise passes keeps passing (run: `node --test tests/engine/work-unit-validation.test.mjs`)
- [x] 1.2 Add a failing unit test in `tests/engine/work-unit-lifecycle.test.mjs` ("generated task states cache/degraded leaf-dir and source_ref value domains"): claim a source-claims-allowed delegated work unit, read its generated task.md, and assert it (a) forbids `<leaf>/page.md` refs and requires declared cache leaf directory paths, (b) forbids slug source_ref and requires assigned output paths / authorized prior output, (c) includes the accepted-and-degraded example with refs drawn from the declared cache trails (run: `node --test tests/engine/work-unit-lifecycle.test.mjs`)
- [x] 1.3 Add a failing integration test in `tests/integration/cli/operate-work-unit.test.mjs` for dry-submit on a claimed wave1 result that already fails an accepted-URL/cache root while carrying 16 accepted claims across 4 distinct URLs, asserting the duplicate-count diagnostic is present and that a result failing only the same root with distinct URLs carries no duplicate enrichment

## 2. Envelope authoring guidance

- [x] 2.1 Update `DEEP_RESEARCH_HARNESS/engine/work-unit-envelope.mjs` `taskMarkdown`「Cache And Source Facts」(~:472-483) so that when `outputContract.source_claims.allowed === true` it emits explicit value-domain bullets: `cache_trail_refs[]`/`degraded_capture_ref` require declared cache **leaf directory** paths (never `<leaf>/page.md`); `source_ref` requires a current assigned output path or an authorized prior submitted output path (never a leaf slug); claim `url` must match the referenced cache leaf `meta.json` recorded url. Verify §1.2 turns green
- [x] 2.2 Add the compact accepted-and-degraded positive example to the same generated section, derived from the assignment's declared cache trails and assigned output paths (one accepted claim via `cache_trail_refs`, one degraded claim via `degraded_capture_ref`, each `source_ref` = an assigned output path). Verify the §1.2 assertions on the example hold and existing envelope text-lock tests still pass

## 3. Dry-submit duplicate-claim diagnostics

- [x] 3.1 Update `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs` `validateSourceClaims` to count accepted claims per normalized URL (reusing the existing source-cache URL normalization) and, after per-claim validation, raise one structured repair error per repeated URL naming the URL, the claim count, and the JSON-pointer range of those claims (additive: no verdict change without duplicates). Verify §1.1 turns green
- [x] 3.2 Verify the CLI-level dry-submit behavior from §1.3 turns green and existing source-claim diagnostics (BUG-242 / DEW-028 messages) remain intact

## 4. Verify + close

- [x] 4.1 Run the affected regression surface: `node --test tests/engine/work-unit-validation.test.mjs tests/engine/work-unit-lifecycle.test.mjs tests/integration/cli/operate-work-unit.test.mjs` plus any envelope/submit text-lock tests; no failures
- [x] 4.2 Register DEW-030 / DEW-031 in `openspec/governance/req-registry.yaml` under `# agent/delegated-work-units` in numeric order, add `@impl DEW-030 / DEW-031` annotations to the touched code, and confirm `openspec validate wave1-result-authoring-contract --strict` plus `node openspec/governance/check-project-reqs.mjs --mode archive --change wave1-result-authoring-contract` agree with the delta header

## 5. Reviews

- [x] 5.1 openspec-feedback:plan-review —— polish passes complete（全变更连贯性 + 风险导向轮次）；所有 finding 已修复，`openspec validate --strict` 与 change-root governance 检查通过。
- [x] 5.2 openspec-feedback:closeout-review —— 对照实际 diff 复核：delta spec（delegated-work-units DEW-030/DEW-031 ADDED）与 engine 修订一一对应（envelope taskMarkdown 值域指引 + 正例、validateSourceClaims 重复 claim 计数）；semantic-closure 坐标与 verification plan 一致；无未关闭 finding。
