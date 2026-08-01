# Known Issues Found During 2026-08-01 Light Run

## Issue 1: `verdict_mode: all` + Agent retry → 误报 FAIL

**影响 cases**：202（已确认），302（疑似）

**根因**：Claude 执行 playbook bash steps 时，gate 首次 attempt 可能失败（fixture 状态不对、gate check 逻辑变更等），Claude 自主修复后 retry 成功。但 `recordCheck` 每次调用都会在 trace 里追加一条 check event。`verdict_mode: all` 要求全部 check 通过，中间 `passed: false` 导致整体 FAIL。

**case-202 trace**：
```
setup-ready:          false → retry → true
witnessed-seed-topics: false → retry → true
seed-topics-ready:    false → false → retry → true
```
7 个 check，3 个 false → FAIL。

**case-302 trace**：
```
wave2-complete:       true
case-302-rerun-mechanism: false
```
2 个 check，1 个 false → FAIL。待确认是 retry 问题还是 rerun mechanism 真坏了。

**修复方向**：
- 短期：受影响 case 改 `verdict_mode: last`
- 长期：考虑在 `recordCheck` 中去重（同 gate 覆盖前值），或让 playbook 用 `set -e` 避免部分执行

## Issue 2: Timeout — Marathon 级 case 超 600s

**影响 cases**：224（601s），235（4795s）

**根因**：supervisor 默认 `--timeout 600000`（10min）。wfn-wave1/wave2 的 happy-and-fail cases 涉及完整 workflow chain（instantiation → multiple gates → wave execution），claude 执行时间超过 10min。

**case-235 特殊**：elapsed 4795s（80min），远超 supervisor timeout。说明 supervisor timeout 后 claude 进程没被立即 kill，继续跑了很久。

**修复方向**：
- Marathon 级 case 需要 `--timeout 900000`（15min）或更长
- 检查 supervisor 的 abort signal 传递是否有效

## Issue 3: `health=ISSUES`（5 cases）

**影响 cases**：71, 73, 161, 213, 214

**现象**：native PASS，但 health check 返回 ISSUES。health profile 是 `light` 或 `standard`。

**待查**：每个 case 的 health report 具体报了什么。

## Issue 4: Budget 不足导致误报 ERROR（v1 only）

**影响 cases**：73（$1.01 > $1 cap），181（$1.02 > $1 cap）

**根因**：v1 用了 `--max-total-budget-usd 1`，Standard 级 case 实际成本 $0.93–$1.56。

**修复**：v2 改为 $5/case 后不再出现。建议按速度档设 budget：Sprint $2，Standard $3，Marathon $6。
