> req: PRG-001

## MODIFIED Requirements

### Requirement: Instantiation complete gate rule set

`gate-instantiation-complete.definition.json` SHALL 定义当前 contract 下的 instantiation rules。

规则 SHALL 覆盖：
- bundle dir 存在
- bundle 目录名合法，且可用于 production run (`dpt_rb_*`) 或 disposable experiment (`dpt_disp_*`)
- `BUNDLE_MAP.md`
- `rb_plan.md`
- `rb_profile.yaml`
- `rb_status.json`
- `rb_queue.json`
- `rb_trace.jsonl`
- `seed_topics/`
- `reference/`
- `artifacts/`
- `_cache/`
- `final/`
- `_work_units/`
- `rb_status.json#/current_mode == execution`
- `rb_status.json#/current_gate == setup_ready`
- `rb_status.json#/next_gate == seed_topics_ready`

The instantiation gate SHALL require `BUNDLE_MAP.md` for newly instantiated bundles and SHALL NOT require `START_FROM_HERE.md` as part of the current new-bundle gate contract.

命名 contract SHALL 明确：
- production logical name `<name>` 匹配 `[a-z0-9][a-z0-9-]*`
- disposable logical name `<name>` 匹配 `[a-z0-9][a-z0-9_-]*`
- bundle basename 中出现空格、大写或不满足相应模式时 SHALL fail

#### Scenario: All instantiation rules pass
- **WHEN** 合法的 bundle surface 已完整创建
- **THEN** `check-gate-instantiation-complete.mjs` SHALL return `passed: true`

#### Scenario: Missing control file fails
- **WHEN** bundle 缺少 `rb_profile.yaml`
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` / `advice` SHALL 指向缺失文件

#### Scenario: Missing bundle map fails
- **WHEN** a newly instantiated bundle lacks `BUNDLE_MAP.md`
- **THEN** gate SHALL return `passed: false`
- **AND** inspect/advice SHALL identify the missing bundle map

#### Scenario: Invalid bundle name fails
- **WHEN** bundle basename 含空格或不匹配 accepted naming pattern
- **THEN** gate SHALL return `passed: false`

#### Scenario: Disposable experiment name still passes instantiation contract
- **WHEN** bundle basename 为 `dpt_disp_<name>_<hex>`
- **THEN** instantiation gate SHALL 将其视为合法 disposable bundle naming
- **AND** SHALL NOT 因随机 hex suffix 误判为非法

#### Scenario: Status drift fails
- **WHEN** `rb_status.json` 中 `current_gate` 或 `next_gate` 偏离 instantiation 后的 accepted 值
- **THEN** gate SHALL return `passed: false`
