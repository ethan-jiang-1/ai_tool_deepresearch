> req: PRG-001, PRG-004

## MODIFIED Requirements

### Requirement: Instantiation complete gate rule set

`gate-instantiation-complete.definition.json` SHALL 定义当前 contract 下的 instantiation rules。

规则 SHALL 覆盖：
- bundle dir 存在
- bundle 目录名合法，且可用于 production run (`dpt_rb_*`) 或 disposable experiment (`dpt_disp_*`)
- `BUNDLE_ENTRY.md`
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
- `rb_status.json#/current_mode == execution`
- `rb_status.json#/current_gate == setup_ready`
- `rb_status.json#/next_gate == seed_topics_ready`

The instantiation gate SHALL require the same-root `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` current-entry pair for newly instantiated bundles. It SHALL consume the shared current-entry predicate and SHALL NOT treat `RUN_BUNDLE.md`, `START_FROM_HERE.md`, or a map-only root as an alternative rule or migration path.

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

#### Scenario: Missing bundle entry fails

- **WHEN** a newly instantiated bundle lacks `BUNDLE_ENTRY.md`
- **THEN** the gate SHALL return `passed: false`
- **AND** inspect/advice SHALL identify the missing current entry pair rather than a legacy fallback

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

### Requirement: Gate CLI evaluates instantiation rules from definition

`check-gate-instantiation-complete.mjs` SHALL load `gate-instantiation-complete.definition.json`, traverse the declared rules, and execute real deterministic checks.

The checker SHALL consume the same shared current-entry predicate as inspection, reentry, and file observability before or while evaluating the declared pair rule. It SHALL not encode a weaker map-only check or add a legacy compatibility branch.

The implementation SHALL support:
- `file_exists`
- `dir_exists`
- `pattern_match`
- `status_value`

The implementation SHALL reuse `gate-helpers.mjs`:
- `parseGateCliArgs`
- `loadGateDefinition`
- `validateNodeGateBinding`
- `resolveRouting`
- `buildGateResult`
- `emitGateResult`

#### Scenario: CLI evaluates complete instantiation rule set

- **WHEN** any rule in the definition fails
- **THEN** the CLI SHALL return `passed: false`
- **AND** it SHALL NOT hardcode pass

#### Scenario: Gate fails on incomplete current pair

- **WHEN** an otherwise valid bundle lacks `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`
- **THEN** the CLI SHALL return `passed: false` through the declared current-entry rule
- **AND** it SHALL not treat a legacy entry/map file as a successful substitute
