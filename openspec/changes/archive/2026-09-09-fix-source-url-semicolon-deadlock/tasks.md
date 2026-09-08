# Tasks: fix-source-url-semicolon-deadlock

> Specs: `specs/research/evidence-extraction/spec.md` (EEX-001 MODIFIED)、`specs/bundle/reference-flat-format/spec.md` (REF-012 ADDED)、`specs/agent/work-unit-preflight/spec.md` (WUP-007 ADDED)、`specs/research/wave1-intake/spec.md` (WAI-013 MODIFIED)。Design decisions: D1-D5。

## 1. Plan review（先于首次 target edit）

- [x] 1.1 `openspec-feedback:plan-review` — 对 proposal/specs/design/semantic-closure/verification-plan 做一次 review：核对 REF-012/WUP-007 语义边界与 D1 切分规则的可枚举性、WAI-013 与 WUP-007 的权责分工是否如 D5 所述、verification claims 与 test 落点是否一致。done condition：review finding 全部转为本清单普通未完成 task（若有），或明确记录无 finding。

## 2. 共享分隔符 helper（D1/D2）

- [x] 2.1 在 `DEEP_RESEARCH_HARNESS/engine/helpers/reference-url.mjs` 实现并导出 `splitSourceUrls(raw)`：`;` 仅在后随（可选空白）`http(s)://` URL 前缀（大小写不敏感）时切分，path 内裸 `;` 不透明；片段 trim、过滤空段（实现 REF-012 / EEX-001 的切分契约）。验证：`tests/engine/helpers/reference-url.test.mjs`（新建）覆盖：裸 `;` path 整串一段、`; ` + http 切分、`;http` 紧跟切分、`;HTTPS://` 大写前缀切分、`;` 后非 http 不切分、空串/多段混合，`node --test tests/engine/helpers/reference-url.test.mjs` 全绿。
- [x] 2.2 切换 `gate-helpers-checks.mjs` 的 `sourceUrlsFromMetadata`（:92）与 `checkReferenceSourceUrls`（:720）到 `splitSourceUrls`（实现 EEX-001 场景 "Semicolon inside URL path stays one parseable URL" / "Semicolon followed by a URL still splits"）。验证：`tests/engine/helpers/gate-helpers-checks.test.mjs` 新增两场景用例（含 bug 文件的 wealthbriefing `;` URL 作 fixture），全绿；既有 invalid/empty/missing 用例不回归。

## 3. 计数与收敛面（D1/D3）

- [x] 3.1 切换 `ref-count.mjs:117` 的 `split(';')` 到 `splitSourceUrls`（实现 EEX-001 isCountable 契约）。验证：`tests/engine/helpers/ref-count.test.mjs` 新增含 `;` path URL 的 countable 用例，全绿。
- [x] 3.2 Wave1 收敛面验证：`tests/engine/helpers/wave1-reference-convergence.test.mjs` 新增用例——submitted claim URL 含裸 `;` 时 canonical 投影 `url_valid/candidate_binding` 为真、含 `%3B` 时 `canonical_projection_url_unbound`（验证 REF-012 绑定身份场景与 verification claim `projection-binding-raw-semicolon`）。验证：`node --test tests/engine/helpers/wave1-reference-convergence.test.mjs` 全绿。

## 4. dry-submit 反向校验（D4）

- [x] 4.1 在 `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs` 既有 accepted-claim 校验块后实现 claim→index 反向成员校验：accepted claim URL（经 `normalizeUrlForSourceCache` 归一化）不在同行 `accepted_source_urls[]` 归一化集合时 `throwRepeatedEnriched`，`json_pointer: /source_claims/<i>/url`，`details` 携带 `claim_url` 与 `declared_accepted_source_urls`（实现 WUP-007）。验证：`tests/engine/work-unit-validation.test.mjs` 判定表用例（空 index、index 部分覆盖多 claim、claim/index 一致含 fragment、`;` path URL、degraded claim、非 accepted claim 不触发）全绿。
- [x] 4.2 验证 dry-submit/submit 公开 API 行为与坐标（verification claim `dry-submit-reverse-claim-index-check`）：`tests/engine/work-unit-submit.test.mjs` 新增用例——违规候选 dry-submit 拒绝、submit 同 reason 拒绝、诊断含 claim URL 与已声明 index URL、ledger 不追加；合规候选 verdict 不变。验证：`node --test tests/engine/work-unit-submit.test.mjs` 全绿。

## 5. 全量回归与收尾检查

- [x] 5.1 全量回归：`npm test` 全绿（确认 3 处 split 收敛与反向校验无既有行为回归，含 `tests/engine/helpers/gate-helpers-provenance.test.mjs`、`file-observability` 等 `classifyReferenceAuthority` 消费面）。
- [x] 5.2 `openspec-feedback:closeout-review` — archive 前置 closeout review：核对 delta spec 与实现/测试的语义一致性（EEX-001/REF-012/WUP-007/WAI-013 逐条对应）、semantic-closure affected 记录与实际触碰文件一致、review finding 转普通 task。done condition：无未处理 finding，或每条已列为本清单未完成 task。
- [x] 5.3 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change fix-source-url-semicolon-deadlock` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，WUP-007 与 REF-012 已 transition 为 live identity）。
- [x] 5.4 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
