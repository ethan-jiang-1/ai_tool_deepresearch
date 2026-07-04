# Research Wave Experiments (delta)

> req: RWE-001

## MODIFIED Requirements

### Requirement: Wave0 happy-path + fail playbook

`experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md`（或同目录 successor case）SHALL 提供 playbook，验证 Wave0 的 foundation reference collection 路径（包含 pass 和 fail 分支）。

该 playbook SHALL：
- 通过 `experiments_env/shared/new-disposable-bundle.mjs` 创建 disposable bundle
- 前置运行 validate-bundle 和 inspect-bundle
- 写入 fixed seed topics 到 `rb_plan.md` 的 topic registry
- 通过 queue + relay driver 写 schema-valid reference metadata 到 `artifacts/wave0/{topic}/source.yaml`，更新 `reference/_INDEX.md`
- 运行 `check-gate-wave0-complete.mjs` → 验证 pass
- 再故意移除一个 topic 的 metadata → 验证 gate fail（inspect 指向缺失 topic）
- 再清空 `rb_plan.md` 的 `topic_registry` → 验证 gate fail（inspect 指向空 registry），证明 topic 集合 source of truth = registry 而非磁盘扫描
- 再写入数量达标但 schema 不合格的 reference metadata（如缺少必填字段 `url`）→ 验证 `count_floor` pass 但 `schema_valid` fail，gate 整体 fail——证明 count_floor ⊕ schema_valid 的 AND 交互
- 再写入 registry 有 3 个 topic 但故意漏写 1 个 topic 的 `artifacts/wave0/{topic}/source.yaml` → 验证 `{topic}` 占位符展开后精确指出缺失的 topic
- 从 `_trace.jsonl` 给出最终 verdict

#### Scenario: Wave0 pass and fail both trace-backed

- **WHEN** the Wave0 playbook completes all branches
- **THEN** each branch SHALL record verdict evidence in `_trace.jsonl`
- **AND** pass and fail outcomes SHALL be distinguishable from trace alone

#### Scenario: Malformed YAML fails schema_valid

- **WHEN** `artifacts/wave0/{topic}/source.yaml` 中存在无法 parse 的 YAML
- **THEN** `schema_valid` rule fail，inspect 给出 parse error detail
