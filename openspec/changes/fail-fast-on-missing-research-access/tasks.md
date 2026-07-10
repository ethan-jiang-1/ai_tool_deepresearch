## 1. Profile Authority And Writer

- [x] 1.1 实现 SCO-002：在 `ProfileSchema` 增加 optional legacy-compatible、strict discriminated `research_access` branches，并在 `rb_profile.yaml.tmpl` 默认写入 `status: unprobed`。
- [x] 1.2 验证 SCO-002：扩展 profile/schema/template/instantiation regressions，覆盖 missing legacy field、strict unprobed、valid available、invalid timestamp、non-HTTP(S) URL、non-success available、valid unavailable、missing reason 和 unavailable success claim。
- [x] 1.3 实现 RES-002：将 `apply-research-style.mjs` 从字段 allowlist serializer 收敛为完整 parsed profile 的语义保真写回，只替换 `research_profile` 与 `research_style_params`。
- [x] 1.4 验证 RES-002：扩展 `tests/schema/research-styles-computation.test.mjs`，确认 HITL1 style apply 与 rerun recompute 都保留 root must-answer、HITL decisions、rerun fields 和 available/unavailable `research_access`。

## 2. HITL1 Probe Contract

- [x] 2.1 实现 WNC-001：将 `phase-hitl1.md` frontmatter 改为 `search_policy: capability_probe_only`，并更新 consistency validator 的合法 policy 与 HITL1 expected inventory；其他 phase policy 不变。
- [x] 2.2 实现 PRP-002、PRP-005：更新 HITL1 9-section body、固定执行顺序、neutral search + first usable URL + 至多一次 fetch 边界、available/unavailable 字段、保留用户 choices 的 same-probe repair 和 no-evidence 写入禁令。
- [x] 2.3 验证 WNC-001、PRP-002、PRP-005：扩展 consistency-validator 与 Markdown/static tests，确认 `stop: yes`、`capability_probe_only`、visible checklist、at-most-one search/fetch、first-usable selection、real-tool wording、same-check repair 和 no-evidence boundary 可达且自洽。

## 3. Fail-Fast Gate And Fixtures

- [x] 3.1 实现 PRG-002：仅在 `gate-hitl1-recorded.definition.json` 增加普通 `field_value` rule 检查 `research_access.status == available`；保持 `ProfileSchema` 为 observation 唯一结构 validator，不新增 check type/CLI/inspect/degraded route。
- [x] 3.2 验证 PRG-002：扩展 HITL1 gate integration tests并更新 `tests/schema/gate-rule-audit.test.mjs` inventory，覆盖 available pass、missing/unprobed fail、unavailable stay-at-HITL1、fake available schema fail、failure advice 和 no Setup authorization。
- [x] 3.3 回归 PRG-002：系统性更新 `tests/`、`experiments_playbook/` 与共享 helper 中所有预期 HITL1 pass 的 deterministic profile fixtures，加入 synthetic valid observation；保留 missing/unprobed negative cases，并明确 fixture 不证明真实 Agent capability。

## 4. Real Canary And Release

- [x] 4.1 验证 SCO-002、PRP-002、PRP-005、PRG-002：新增 `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` 并登记 `RUN_EXPS.md`；实际执行 dynamic search + real fetch，available 时 gate pass，honest unavailable 时 gate fail/no Setup，两个分支都检查无 evidence leakage，禁止 mock/fixed URL/hardcoded PASS。
- [x] 4.2 实现 SCO-002、RES-002、WNC-001、PRP-002、PRP-005、PRG-002：更新 `CHANGELOG.md`，新增 `v0.18` 条目，说明 HITL1 real probe、profile observation、writer preservation 与 reused field-value fail-fast gate。
- [x] 4.3 实现 SCO-002、RES-002、WNC-001、PRP-002、PRP-005、PRG-002：同步 `DPT_FRAMEWORK/RUN.md` 版本横幅与 `v0.18` 最新条目，并保留 Change3 `v0.19` 的后续顺序。

## 5. Verification And Governance

- [x] 5.1 验证全部需求：先运行 profile schema/template/style-writer、consistency-validator、HITL1 Markdown、HITL1 gate、gate-rule audit 与 chain/lifecycle focused tests，再运行完整 regression suite；不得用 controlled canary 替代 deterministic regressions。
- [x] 5.2 治理 SCO-002、RES-002、WNC-001、PRP-002、PRP-005、PRG-002：核对 reused requirement registry 与新增/修改 `@impl` 标注后，运行 `node openspec/governance/check-project-reqs.mjs`，必须达到 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired。
- [x] 5.3 治理全部 delta specs：运行 `node openspec/governance/check-project-specs.mjs`，必须达到 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader。
