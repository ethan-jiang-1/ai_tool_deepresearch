## 1. Profile Observation Contract

- [ ] 1.1 实现 SCO-002：在 Profile contract 中增加 optional legacy-compatible `research_access` status branches，校验 available URL/fetch success、unavailable reason/timestamp 和 unprobed 不得声明成功事实。
- [ ] 1.2 验证 SCO-002：扩展 schema regression tests，覆盖 missing legacy field、unprobed、valid available、invalid URL、non-success available、valid unavailable 和 missing reason。
- [ ] 1.3 实现 SCO-002：更新 `rb_profile.yaml` template 默认写入 `research_access.status: unprobed`，并更新 template/instantiation tests 确认新 bundle 可解析。

## 2. HITL1 Probe Guidance

- [ ] 2.1 实现 PRP-002：更新 `phase-hitl1.md` execution contract 与 allowed actions，要求一次真实 bounded search+fetch probe，并明确 unavailable 时留在 HITL1、环境修复后重跑。
- [ ] 2.2 实现 PRP-002、PRP-005：更新 HITL1 payload checklist 与 anti-cheating guidance，列出 observation 字段并禁止 probe URL/content 进入 reference、cache、ledger、work-unit output 或 Wave coverage。
- [ ] 2.3 验证 PRP-002、PRP-005：增加 Markdown/static regression tests，确认 `stop: yes`、`capability_probe_only`、visible checklist、real-tool wording 和 no-evidence boundary 可达。

## 3. Fail-Fast Gate

- [ ] 3.1 实现 PRG-002、SCO-002：在 HITL1 gate definition/CLI 增加专用 `research_access_available` rule，missing/unprobed 指向 probe，unavailable 返回 recorded reason，且不产生 degraded Setup route。
- [ ] 3.2 验证 PRG-002、SCO-002：扩展 HITL1 gate integration tests，覆盖 available pass、missing/unprobed fail、unavailable stay-at-HITL1 和 fake available schema failure，并确认失败不授权 Setup。
- [ ] 3.3 验证 PRP-002、PRG-002：新增 Agent-controlled capability playbook，verdict 必须来自实际 search URL 与真实 fetch outcome；工具不可用时预期记录 unavailable，禁止 mock/fixed fixture 冒充 PASS。

## 4. Version And Verification

- [ ] 4.1 实现 SCO-002、PRP-002、PRP-005、PRG-002：更新 `CHANGELOG.md`，新增 `v0.18` 条目，说明 HITL1 real probe、profile observation 和 fail-fast gate。
- [ ] 4.2 实现 SCO-002、PRP-002、PRP-005、PRG-002：同步 `DPT_FRAMEWORK/RUN.md` 版本横幅与 `v0.18` 最新条目，并说明 silent waves 前必须有 available observation。
- [ ] 4.3 验证 SCO-002、PRP-002、PRP-005、PRG-002：运行 profile schema、bundle template、HITL1 gate 和 HITL1 Markdown focused tests，确认 legacy readability 与 fail-fast routing 无退化。
- [ ] 4.4 治理 SCO-002、PRP-002、PRP-005、PRG-002：核对 reused requirement registry 与新增 `@impl` 标注后，运行 `node openspec/governance/check-project-reqs.mjs`，必须达到 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired。
- [ ] 4.5 治理 SCO-002、PRP-002、PRP-005、PRG-002：运行 `node openspec/governance/check-project-specs.mjs`，必须达到 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader。
