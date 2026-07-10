## 1. Shared Evaluation Boundary

- [ ] 1.1 实现 IOC-005、CHI-001、RWG-018：增加最小 structured finding/projection helper，支持 blocking/advisory/diagnostic-only、去重和一个 nearest repair，并用 focused unit tests 锁定输出。
- [ ] 1.2 实现 IOC-001、RWG-018：从 Wave0 formal gate 抽出显式纯 artifact/provenance evaluator，让 gate wrapper 复用它且保持 handoff、routing、attempt、trace/checkpoint 行为不变。
- [ ] 1.3 实现 IOC-002、CHI-001、RWG-018：从 Wave1 formal gate 抽出显式纯 evaluator，并用局部 guard 在 depth-review 等 parent 失败时短路依赖检查。
- [ ] 1.4 实现 IOC-003、CHI-001、RWG-018：从 Wave2 formal gate 抽出显式纯 evaluator，并在 finding parent/required field 失败时短路 enum、handoff、eligibility、backing 等派生检查。

## 2. Inspect Reuse And Diagnostics

- [ ] 2.1 实现 IOC-001、RWG-018：将 `inspect-wave0-output.mjs` 改为调用 Wave0 evaluator，返回 `{ check, inspect, advice }`、保持 exit code 0/1/2，并验证零 gate/status/trace/checkpoint 副作用。
- [ ] 2.2 实现 IOC-002、CHI-001、RWG-018：将 `inspect-wave1-output.mjs` 改为调用 Wave1 evaluator，保留 direct authority/provenance blockers，并把无害 whitespace/list-style 差异降为 tolerant/advisory。
- [ ] 2.3 实现 IOC-003、CHI-001、RWG-018：将 `inspect-wave2-output.mjs` 改为调用 Wave2 evaluator，确保缺失 finding 字段只生成一个 primary repair target，且同 bundle 与 formal gate 的 shared rule ids 一致。
- [ ] 2.4 实现 IOC-005、CHI-001、RWG-018：补充 regression cases，验证 blocking 不被标为 diagnostic-only、presentation preference 不阻断、多个独立根因仍分别可行动。

## 3. Producer Contract And Drift Guards

- [ ] 3.1 实现 RWP-016：更新 Wave0/Wave1/Wave2 与 seed-topic/shared guidance，写清 canonical path/role/ref/field/enum，并在 completion evidence 与 formal gate 前加入对应 side-effect-free inspect。
- [ ] 3.2 实现 RWP-016、RWG-018：修正 Wave1 output role、`reviewed_work_unit_refs[]`、Wave2 finding field-count/enum 和 return-map navigation 漂移，不在 Markdown 中复制 validator 逻辑。
- [ ] 3.3 实现 RWG-018、IOC-005、CHI-001：更新 gate-rule audit/static guards，为每个 in-scope blocking rule 记录 producer、authority、shared checker、diagnostic 和 test guard，并确认 presentation-only rule 不再 blocking。

## 4. Version And Verification

- [ ] 4.1 实现 IOC-001、IOC-002、IOC-003、IOC-005、RWG-018、RWP-016、CHI-001：更新 `CHANGELOG.md`，新增 `v0.17` 条目，概括同源 Wave checks、短路根因和 presentation tolerance。
- [ ] 4.2 实现 IOC-001、IOC-002、IOC-003、IOC-005、RWG-018、RWP-016、CHI-001：同步 `DPT_FRAMEWORK/RUN.md` 版本横幅与 `v0.17` 最新条目。
- [ ] 4.3 验证 IOC-001、IOC-002、IOC-003、IOC-005、RWG-018、RWP-016、CHI-001：运行三个 Wave gate/inspect、gate-rule audit 和相关 Markdown integration tests，确认 formal gate authority、exit code 与副作用无退化。
- [ ] 4.4 治理 IOC-001、IOC-002、IOC-003、IOC-005、RWG-018、RWP-016、CHI-001：核对 reused requirement registry 与新增 `@impl` 标注后，运行 `node openspec/governance/check-project-reqs.mjs`，必须达到 0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired。
- [ ] 4.5 治理 IOC-001、IOC-002、IOC-003、IOC-005、RWG-018、RWP-016、CHI-001：运行 `node openspec/governance/check-project-specs.mjs`，必须达到 0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader。
