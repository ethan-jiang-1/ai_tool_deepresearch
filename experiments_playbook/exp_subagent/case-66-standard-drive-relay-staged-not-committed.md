---
schema: command-experiment/v1
experiment: subagent
case: case-66-standard-drive-relay-staged-not-committed
weight: light
case_goal: "验证 drive-relay-slot stage 真跑、故意不 commit 时，runProvenanceForensics 仅 emit relay_commit_missing（plan §10 tier-4），且不触发 provenance_chain_inconsistency（RPG-012 carve-out）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-66_staged
trace: dpt_disp_case-66_staged/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable bundle 中执行。**必须**调用 production `drive-relay-slot stage`（产生真实 `dispatch.json`、`_beacon.json`、staging trace）；**故意不调用** `commit`。Verifier 经 production `runProvenanceForensics()` 裁决 tier-4，check 写入 `rb_trace.jsonl`。禁止 mock、禁止手写 slot 文件冒充 engine 产出、禁止用 console output 代替 trace 裁决。

## Reality Distance Ledger

| Distance Type | Declaration |
|---------------|-------------|
| Runtime context | 真实 disposable bundle + `_subagents/wave_01/slot_00/`（SDC-001） |
| Framework path | `drive-relay-slot stage` + `runProvenanceForensics()` — 与 production 同路径 |
| Agent actor | **无** — tier-4 测 staging/commit 分界；本 case 只 stage |
| External calls | 无 |
| Verdict source | `rb_trace.jsonl` 的 `check` 事件 + forensics 返回值 |
| Log 验收 | **`_logs/run.log`**（必读）：应有 staging + `WARN relay_commit_missing`；**不应有** `] INFO relay_commit_done` |

# case-66-standard-drive-relay-staged-not-committed

验证 **staged-not-committed**（plan §10 tier-4）：driver 已 staging，但 commit 路径未走 → 只 RPG-008，**非** driver 缺失、**非** 懒手糊。

## Expected Runtime Path

1. 创建 bundle → validate + inspect → `drive-relay-slot stage` `[MAIN/SHELL]`
2. **不** `commit` / **不** `merge` `[MAIN/SHELL]`
3. **Agent 读 `_logs/run.log`**，确认 tier-4 信号 `[MAIN]`
4. tier-4 checks 写入 `rb_trace.jsonl` `[MAIN/SHELL]`
5. 从 `rb_trace.jsonl` 裁决 PASS/FAIL `[MAIN/SHELL]`
6. 清理（PASS 才清理）`[MAIN/SHELL]`

---

## Step 1: 创建 bundle + stage [MAIN/SHELL]

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs staged --case case-66 --force)
echo "B=$B"

node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"

node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage "$B" --wave 1 \
  --slot-index 0 --role dpt-source-intake --key source_intake \
  --task "Tier-4 staging-only: do not commit in this case." \
  --platform claude-code | tee "$B/_stage.json"
```

→ 预期：`ok: true`，`_subagents/wave_01/slot_00/_beacon.json` 与 `dispatch.json` 存在，`_status.json` 为 `pending`。

---

## Step 2: Agent 读 run.log [MAIN]

```bash
B= # populated from Step 1
echo "=== _logs/run.log ==="
cat "$B/_logs/run.log"
```

**Agent 目视确认**：

| 预期 | 含义 |
|------|------|
| `slot_create` + `relay_spawn_requested` | driver staging 真跑 |
| `] WARN relay_commit_missing` + `source_intake` | tier-4 RPG-008 已落 log |
| **不应有** `] INFO relay_commit_done` | 故意不 commit — 若出现 INFO commit 行则 case 失败 |

---

## Step 3: tier-4 checks → rb_trace.jsonl [MAIN/SHELL]

```bash
B= # populated from Step 1

cat > "$B/_verify_tier4.mjs" << 'JS'
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runProvenanceForensics } from '../DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';
import { recordCheck } from '../experiments_env/shared/wff-playbook-utils.mjs';
import {
  filterLifecycleLines,
  runLogHasRelayCommitDone,
  runLogHasRelayCommitMissing,
  splitRunLogLines,
} from '../experiments_env/shared/run-log-lifecycle-utils.mjs';

const dir = process.argv[2];
const tracePath = join(dir, 'rb_trace.jsonl');
const waveDir = 'wave_01';
const slotKey = 'source_intake';
const runLog = existsSync(join(dir, '_logs', 'run.log')) ? readFileSync(join(dir, '_logs', 'run.log'), 'utf-8') : '';
const runLines = splitRunLogLines(runLog);

function record(gate, passed, detail) {
  recordCheck(tracePath, { gate, passed, detail });
}

const beacon = join(dir, '_subagents', waveDir, 'slot_00', '_beacon.json');
const dispatch = join(dir, '_subagents', waveDir, 'dispatch.json');
record('staging-dispatch-exists', existsSync(dispatch), 'dispatch.json from drive-relay-slot stage');
record('staging-beacon-exists', existsSync(beacon), '_beacon.json from drive-relay-slot stage');
record('log-has-rpg008-warn', runLogHasRelayCommitMissing(runLog, slotKey),
  'run.log carries relay_commit_missing diagnostic');
record('log-no-commit-done', !runLogHasRelayCommitDone(runLog),
  'run.log must NOT have production relay_commit_done (staged-not-committed)');
record('log-no-subagent-lifecycle', filterLifecycleLines(runLines).length === 0,
  `${filterLifecycleLines(runLines).length} lifecycle lines (expect 0 — no sub-agent spawn)`);

const findings = runProvenanceForensics(dir, 'wave1', 'wave1-complete');
const codes = findings.map((f) => f.code);

record('tier4-only-rpg008', codes.length === 1 && codes[0] === 'relay_commit_missing',
  `codes=[${codes.join(',')}]`);
record('tier4-no-rpg012', !codes.includes('provenance_chain_inconsistency'),
  'RPG-012 carve-out holds on staged-not-committed');
record('provenance-tier-4', codes.length === 1 && codes[0] === 'relay_commit_missing',
  'plan §10 tier-4: driver has staging; investigate commit path — not lazy hand-fake');
console.log('Recorded tier-4 checks to rb_trace.jsonl');
JS
node "$B/_verify_tier4.mjs" "$B"
```

→ 预期：checks 写入 `$B/rb_trace.jsonl`。

---

## Step 4: 从 trace 裁决 [MAIN/SHELL]

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.verdict('$B/rb_trace.jsonl'))"
```

→ 预期：`PASS`

---

## Step 5: 结果解读 [MAIN/SHELL]

| Check | 证明 |
|-------|------|
| `staging-dispatch-exists` / `staging-beacon-exists` | `drive-relay-slot stage` 真跑，非手糊目录 |
| `tier4-only-rpg008` | forensics 只报 commit 缺失 |
| `tier4-no-rpg012` | 与 case-79 tier-4 carve-out 一致 |
| `log-no-subagent-lifecycle` | 无 sub-agent — lifecycle 计数应为 0 |
| `provenance-tier-4` | plan §10：查 commit 路径，**非**「driver 没装」、**非** BUG-019 懒手糊 |

**PASS 含义**：staging 痕迹与 commit 痕迹可被 forensics 分开 — relay 可观测性在负向路径也成立。

---

## Cleanup [MAIN/SHELL]

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

cleanup 前会自动把 verdict 摘要追加进 append-only 的 `experiments_playbook/exp_verdicts.jsonl`（PASS 可审计，销毁不丢证据）。

```bash
B= # populated from Step 1
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.cleanup('$B',{caseId:'case-66'}))"
```
