# Tasks: make-feedback-name-contract-roots

> 实现前先运行 `check-verification-routing.mjs --mode plan`；归档前运行
> `--mode assets`。reference 到 BUG-206/207/208/210/211。

## 0. Feedback-Lifecycle Review Marker

- [x] 0.1 `openspec-feedback:plan-review` — 已按 change-feedback-loop 完成 apply 前 scoped review：每个 requirement 有 owner/可见结果、无 re-entry/time 边界、无新增 check（仅改进既有反馈文本）、verification 证明确定性声明。无待转换 finding。
- [x] 0.2 `openspec-feedback:closeout-review` — 已按 change-feedback-loop 完成归档前 scoped review：审查 change-scoped diff（engine feedback/schema/guidance + 4 测试 + 版本 bump）、5 个 delta requirement 均有实现与测试锚点、writer/reader 期望一致（feedback 点名缺失事实）、verification 证明确定性声明（116+ 测试 PASS + governance checks PASS）。无 open finding。

## 1. Feedback 契约（CHI-005）

- [x] 1.1 实现 CHI-005：在 feedback 构造层增加"点名缺失/出错契约事实"的 helper（key/value、write surface、rerun），供各 surface 复用（`frontmatterParseReason` 为 reference 面实例；wave1/wave2 面见 §3/§5/§6）
- [x] 1.2 单测：泛化 parse 失败反馈点名 key/value；cross-field 失败点名合法 shape；lifecycle-currentness 失败点名缺失事实（`tests/engine/feedback-contract-naming.test.mjs`；wave1/wave2 面测试见 §5/§6）
- [x] 1.3 更新 `engine/check-inspect-feedback` 相关实现，使 CHI-001..004 既有反馈路径不回归（gate-helpers-checks/seed-topic-projection/return-map 既有测试 51 个 PASS）

## 2. Reference frontmatter（REF-010）— BUG-206

- [x] 2.1 在 `shared-reference-template.md` 把 `acceptance_status` 引号约束写成显式规则（`accepted :warning:` 必须加引号）
- [x] 2.2 实现 frontmatter parse 失败时点名 offending key/value（在 reference frontmatter 错误路径）
- [x] 2.3 单测：引号写法通过；裸 `accepted :warning:` 报出点名错误

## 3. Canonical Wave1 locator 可见性（REF-011, WAI-010）— BUG-211

- [x] 3.1 在 `phase-wave1.md` §3.2.2 与 `shared-reference-template.md` 文档化 canonical 文件名推导（`{slug}-{host+path token}-{12-hex}`）
- [x] 3.2 在 wave1 reference-floor inspect 对每个未闭合 materializable candidate 输出 exact canonical target path + backing refs（`materializationWriteTo` 已输出；既有 integration 覆盖）
- [x] 3.3 单测/integration：inspect 对 missing projection candidate 输出 canonical 目标与 backing；Agent 可仅凭反馈物化闭合（wave1-reference-convergence.test.mjs 既有 canonical/legacy/misnamed 用例 PASS）

## 4. Schema 显示 wave 感知（CTS-010）— BUG-207

- [x] 4.1 实现 `operate-topic-state schema --context wave_projection` 按 wave/slot 显示 `source_identity` forms（wave0/1: submitted_work；wave2_judgment: finding + entry_id === finding_id）
- [x] 4.2 integration：schema 输出含两种 forms；按输出构造的 wave2_judgment packet apply 不被隐藏 constraint 拒绝（topic-state-schema-wave-identity.test.mjs PASS）

## 5. Wave1 depth-review 同步反馈（WAI-009）— BUG-210

- [x] 5.1 在 reference-floor-deficit 反馈检查已提交 supplementary work unit 是否在 `depth-review.yaml#reviewed_work_unit_refs`；缺失时点名该更新 + work-unit ref
- [x] 5.2 integration：提交 supplementary 后 depth-review 未更新时，反馈点名同步；更新后同 inspect 收敛（wave1-floor-feedback-names-depth-review.test.mjs PASS）

## 6. Wave2 finding currentness（WTS-012）— BUG-208

- [x] 6.1 在 `shared-schemas.md` finding-index 契约文档化 `created_in_rerun_count`（= 当前 round）与 3 位 `W2F-\d{3}` id 格式
- [x] 6.2 在 wave2_judgment apply 反馈点名缺失/不匹配的 currentness 事实（id 格式 / 缺字段 / 错误 round）
- [x] 6.3 单测：malformed id、缺 `created_in_rerun_count`、错误 round 各给点名反馈（wave2-finding-currentness-feedback.test.mjs PASS）

## 7. 版本 bump 与指引同步

- [x] 7.1 声明并写入 version bump **v0.77**：更新 `DEEP_RESEARCH_HARNESS/RUN.md` banner 与 CHANGELOG
- [x] 7.2 更新受影响的 guidance（shared-reference-template、shared-schemas、phase-wave1）使 REF/CTS/WAI/WTS/CHI delta 与指引一致

## 8. 验证与治理

- [x] 8.1 运行全部受影响单测/integration（tests/ 下新增或更新的用例）并 PASS
- [x] 8.2 运行 `node openspec/governance/check-verification-routing.mjs --change make-feedback-name-contract-roots --mode assets`
- [x] 8.3 运行 `node openspec/governance/check-project-reqs.mjs` 与 `check-project-specs.mjs` 并 PASS
- [x] 8.4 更新 `_backlog/bugs/README.md`：BUG-206/207/208/210/211 标记为 closed/fixed 归属本 change
