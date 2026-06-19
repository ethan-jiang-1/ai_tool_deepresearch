> req: GSK-001, GSK-004

## MODIFIED Requirements

### Requirement: Gate CLI skeleton shape

每个 `check-gate-<name>.mjs` SHALL：

1. 解析 `--bundle <path>`（必选）、`--transitions <path>`（可选，默认 `DPT_FRAMEWORK/workflows/transitions.chain.json`）、`--non-interactive`（可选 boolean）
2. 加载对应的 `gate-<name>.definition.json`
3. 遍历 rules，执行 check，收集 inspect/advice
4. 调用 `askNext(transitionsPath, gateName, state)` 获取 next_node（state 为 `'passed'` 当所有 rule pass，否则 `'failed'`）
5. 输出 `{ check: { passed, gate, next }, inspect, advice }` JSON
6. `passed=true` → exit(0)，`passed=false` → exit(1)

**不再接受 `--next` flag**——路由查询由 `askNext()` 内部完成。

#### Scenario: Gate CLI queries chain for next

- **WHEN** `check-gate-instantiation-complete.mjs --bundle dpt_rb_x` 被调用且所有 rule pass
- **THEN** output 的 `check.next` SHALL 由 `askNext(TRANSITIONS_PATH, 'instantiation-complete', 'passed')` 提供
- **AND** SHALL NOT 接受 `--next` CLI flag

#### Scenario: Gate CLI returns next=null when chain has no match

- **WHEN** gate CLI 调用 `askNext(TRANSITIONS_PATH, gateName, 'failed')` 且 transition table 中无 `failed` entry
- **THEN** output 的 `check.next` SHALL 为 `null`

#### Scenario: Non-interactive mode still queries chain

- **WHEN** `check-gate-wave0-complete.mjs --bundle x --non-interactive` 被调用
- **THEN** output SHALL 包含 `check.next`（通过 `askNext(TRANSITIONS_PATH, 'wave0-complete', 'passed')` 获取），而非通过 CLI flag
