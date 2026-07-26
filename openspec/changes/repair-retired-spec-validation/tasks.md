## 1. Baseline

- [ ] 1.1 为 BUS-001..003 与 GAC-001..009 运行两份 retired main spec 的定向 OpenSpec validation，确认失败只来自缺少 normative wording 与空 requirement tombstone。

## 2. Retired Spec Repair

- [ ] 2.1 修改 `openspec/specs/bundle-start-from-here/spec.md` 的 retired stop-authorization requirement，使其满足 BUS-001..003 的 non-authority boundary 且包含 SHALL/MUST，不恢复 `START_FROM_HERE.md` 行为。
- [ ] 2.2 为 `openspec/specs/gate-content-dedup/spec.md` 添加 GAC-001..009 的 valid tombstone requirement 和 scenario，不恢复 `content_dedup` runtime/gate behavior。

## 3. Verification

- [ ] 3.1 为 BUS-001..003 与 GAC-001..009 运行两份定向及 `openspec validate --specs`，确认全量 main specs 通过。
- [ ] 3.2 运行 `node openspec/governance/check-project-reqs.mjs` 与 `node openspec/governance/check-project-specs.mjs`，并以 `openspec validate repair-retired-spec-validation --strict` 和 `git diff --check` 验证 change artifacts。
