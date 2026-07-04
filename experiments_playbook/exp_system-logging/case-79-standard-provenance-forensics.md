---
schema: command-experiment/v1
experiment: system-logging
case: case-79-standard-provenance-forensics
weight: light
case_goal: "验证 provenance-forensics-guide.md 的 6-tier 判决矩阵 + SDC-002 tier9：每 tier 在真实 disposable bundle 上经 production `runProvenanceForensics` 路径产出预期诊断集合；lifecycle/run.log 经 `log-event.mjs` 写入。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-79_forensics
trace: dpt_disp_case-79_forensics/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。每个 tier 使用独立 disposable bundle（经 `new-disposable-bundle.mjs` 创建），bundle 内使用标准 `_subagents/wave_00/slot_00/` 结构（SDC-001/002）。**全部 tier 在真实 bundle 文件系统上运行**：调用 production `runProvenanceForensics()`（与 wave gate 同路径）；需要 run.log 信号时 **必须** 经 `DPT_FRAMEWORK/cli/log-event.mjs` 写入（与 sub-agent 生产路径一致），禁止手写 run.log 行格式。tier 脚本按矩阵注入受控 provenance 信号（sound / staged-not-committed / lazy-forgery 等），裁决来自真实函数返回值 + trace `check` 事件。

## Reality Distance Ledger

| Distance Type | Declaration |
|---------------|-------------|
| Runtime context | 1 主 bundle + 9 tier disposable bundle（`new-disposable-bundle.mjs`）；标准 `_subagents/wave_00/slot_00/`（tier 9 为 SDC-002 受控违规：artifact 故意放在 `_fixtures/`） |
| Framework path | `runProvenanceForensics()` + `log-event.mjs` — 与 production gate / sub-agent logging 同 CLI |
| Signal setup | tier 脚本在 bundle 上写入 matrix 所需 provenance 信号（dispatch/beacon/trace/status/result）；这是 forensics 矩阵实验的受控输入，不是 mock 框架 |
| Sub-agent search | 本 case scope 是 forensics 判决矩阵，不 spawn 搜索型 sub-agent；run.log lifecycle 仍走 `log-event.mjs` |
| External calls | 无 |
| Verdict source | 主 bundle `rb_trace.jsonl` 的 `check` 事件 + `runProvenanceForensics` 返回值 |
| Log 验收 | 每个 tier bundle 的 **`_logs/run.log`**（必读）；tier1 应有 `log-event` 写的 `relay_commit_done`/`work_done`；tier4 **不应有** `] INFO relay_commit_done` |

# case-79-standard-provenance-forensics

验证 `provenance-forensics-guide.md`（RPG-010）的 6-tier 判决矩阵与 `runProvenanceForensics`（RPG-007..013）的行为一致：每 tier 注入对应信号 → 产出预期诊断集合；sound 链 → silent。这是 plan §10 判断手册的可运行验证形式。

## Expected Runtime Path

1. 创建主 bundle `[MAIN/SHELL]`
2. 对 9 tier 各建 bundle + matrix 信号 + forensics `[MAIN/SHELL]`
3. **Agent 抽样读 tier1/tier4 的 `_logs/run.log`** `[MAIN]`
4. checks 写入主 bundle `rb_trace.jsonl` → verdict `[MAIN/SHELL]`
5. 清理（PASS 才清理）`[MAIN/SHELL]`

---

## Step 1: 创建主 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs forensics --case case-79 --force)
echo "B=$B"
```

---

## Step 2: 创建 9 个 tier bundle + matrix 信号 + 断言

每个 tier 创建一个独立 disposable bundle，在 bundle 内使用标准 `_subagents/wave_00/slot_00/` 结构写入 matrix 所需 provenance 信号；run.log 经 `log-event.mjs` 写入；调 production `runProvenanceForensics`，结果写入主 bundle trace。

```bash
B= # populated from Step 1

cat > "$B/_run_tiers.mjs" << 'JS'
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runProvenanceForensics } from '../DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';
import { recordCheck } from '../experiments_env/shared/wff-playbook-utils.mjs';
import { runLogHasRelayCommitDone, runLogHasRelayCommitMissing } from '../experiments_env/shared/run-log-lifecycle-utils.mjs';

const UUID  = '11111111-1111-4111-4111-111111111111';
const root  = process.argv[2];       // main bundle
const repo  = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const newBundle = join(repo, 'experiments_env', 'shared', 'new-disposable-bundle.mjs');
const logCli = join(repo, 'DPT_FRAMEWORK', 'cli', 'log-event.mjs');

// ---- tier signal builders (real bundle I/O + production CLIs) ----
function createTierBundle(tierName) {
  const name = `forensics_t79_${tierName}`;
  const out = execSync(`node "${newBundle}" "${name}" --case "case-79-${tierName}" --force`, {
    encoding: 'utf-8', stdio: 'pipe', cwd: repo,
  });
  // new-disposable-bundle prints the path on the last line (after validate-bundle)
  const lines = out.trim().split('\n');
  return lines[lines.length - 1].trim();
}
function slotDir(b) {
  const d = join(b, '_subagents', 'wave_00', 'slot_00');
  mkdirSync(d, { recursive: true });
  return d;
}
const wj = (f, o) => writeFileSync(f, JSON.stringify(o, null, 2));
function trace(b, events) {
  for (const e of events) appendFileSync(join(b, 'rb_trace.jsonl'), JSON.stringify(e) + '\n');
}
function emitLog(bundle, msg, detail) {
  execSync(`node "${logCli}" --bundle "${bundle}" --level info --msg "${msg}" --detail '${JSON.stringify(detail)}'`, {
    encoding: 'utf-8', stdio: 'pipe', cwd: repo,
  });
}
const codes = (findings) => findings.map((f) => f.code);

// sound: full consistent chain (tier 1 baseline) — all artifacts inside _subagents/wave_00/slot_00/
function sound(b, opts = {}) {
  const { nonce = UUID, status = 'done', spanMs = 5000, lifecycle = true, traceNonce } = opts;
  const tn = traceNonce === undefined ? nonce : traceNonce;
  const sd = slotDir(b);
  // Relay slot artifacts under _subagents/wave_00/ (SDC-001)
  wj(join(b, '_subagents', 'wave_00', 'dispatch.json'), {
    wave: 'wave-0', waveIndex: 0, created: '2026-07-03T00:00:00.000Z', concurrencyCap: 8,
    slots: [{ key: 'src', slotIndex: 0, roleAgentKey: 'dpt-source-intake', taskDescription: 'x', receipt_nonce: nonce }]
  });
  wj(join(sd, '_beacon.json'), { bundle_dir: b, log_cli: logCli, slot_key: 'src', receipt_nonce: nonce });
  wj(join(sd, '_status.json'), { status, updated: '2026-07-03T00:00:00.000Z' });
  wj(join(sd, 'result.json'), { slotKey: 'src', roleAgentKey: 'dpt-source-intake', status, summary: '', evidenceCount: 1, references: [], confidence: 0.5, notes: [] });
  wj(join(sd, '_agent.json'), {
    slotKey: 'src', roleAgentKey: 'dpt-source-intake', platform: 'claude-code', runtimeMode: 'project-agent',
    runtimeAgentId: 'a1', spawnedAt: '2026-07-03T00:00:00.000Z',
    completedAt: new Date(Date.UTC(2026, 6, 3, 0, 0, 0, spanMs)).toISOString(), status, validationOk: true
  });
  trace(b, [
    { event: 'slot_create',             key: 'src', receiptNonce: tn },
    { event: 'dispatch_create',         slots: [{ key: 'src', receiptNonce: tn }] },
    { event: 'agent_runtime_started',   key: 'src', receiptNonce: tn },
    { event: 'agent_result_ready',      key: 'src', receiptNonce: tn },
    { event: 'agent_result_received',   key: 'src', receiptNonce: tn },
    { event: 'result_schema_validated', key: 'src', receiptNonce: tn },
  ]);
  emitLog(b, 'relay_commit_done', { slotKey: 'src' });
  if (lifecycle) {
    emitLog(b, 'work_done', { kind: 'work_done', receipt_nonce: nonce, slotKey: 'src', roleAgentKey: 'dpt-source-intake' });
  }
}

const checks = [];
const tierBundles = {};
function expect(name, got, ok) {
  recordCheck(join(root, 'rb_trace.jsonl'), { gate: name, passed: ok, detail: `codes=[${got.join(',')}]` });
}
function expectLog(tierName, bundlePath, { mustHave = [], mustNotHave = [] }) {
  const logPath = join(bundlePath, '_logs', 'run.log');
  const log = existsSync(logPath) ? readFileSync(logPath, 'utf-8') : '';
  for (const s of mustHave) {
    const passed = s === 'relay_commit_done' ? runLogHasRelayCommitDone(log)
      : s === 'relay_commit_missing' ? runLogHasRelayCommitMissing(log)
      : log.includes(s);
    recordCheck(join(root, 'rb_trace.jsonl'), { gate: `log-${tierName}-has-${s}`, passed, detail: logPath });
  }
  for (const s of mustNotHave) {
    const passed = s === 'relay_commit_done' ? !runLogHasRelayCommitDone(log)
      : s === 'relay_commit_missing' ? !runLogHasRelayCommitMissing(log)
      : !log.includes(s);
    recordCheck(join(root, 'rb_trace.jsonl'), { gate: `log-${tierName}-no-${s}`, passed, detail: logPath });
  }
}

// tier 1: sound → silent
{ const b = createTierBundle('t1'); tierBundles.t1 = b; sound(b);
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  expect('tier1-silent', codes(f), codes(f).length === 0);
  expectLog('t1', b, { mustHave: ['relay_commit_done', 'work_done', UUID] }); }

// tier 2: real failure (status=failed) → silent
{ const b = createTierBundle('t2'); tierBundles.t2 = b; sound(b, { status: 'failed' });
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  expect('tier2-silent', codes(f), codes(f).length === 0); }

// tier 3: observation gap (no lifecycle) → only RPG-011
{ const b = createTierBundle('t3'); tierBundles.t3 = b; sound(b, { lifecycle: false });
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  expect('tier3-only-rpg011', codes(f), codes(f).length === 1 && f[0].code === 'lifecycle_events_missing'); }

// tier 4: staged-not-committed → only RPG-008 (carve-out: NOT RPG-012)
{ const b = createTierBundle('t4'); tierBundles.t4 = b; sound(b, { status: 'pending' });
  const tp = join(b, 'rb_trace.jsonl'); writeFileSync(tp, '');
  trace(b, [{ event: 'slot_create', key: 'src', receiptNonce: UUID }, { event: 'dispatch_create', slots: [{ key: 'src', receiptNonce: UUID }] }]);
  const rp = join(b, '_logs', 'run.log'); if (existsSync(rp)) unlinkSync(rp);
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  const c = codes(f);
  expect('tier4-only-rpg008', c, c.length === 1 && c[0] === 'relay_commit_missing');
  expectLog('t4', b, { mustNotHave: ['relay_commit_done'], mustHave: ['relay_commit_missing'] }); }

// tier 5: lazy hand-fake (no dispatch, non-UUID nonce) → RPG-007
{ const b = createTierBundle('t5'); tierBundles.t5 = b; sound(b, { nonce: 'nonce-src-1783064202829' });
  unlinkSync(join(b, '_subagents', 'wave_00', 'dispatch.json'));
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  expect('tier5-rpg007', codes(f), codes(f).includes('provenance_nonce_mismatch')); }

// tier 6a: determined hand-fake (missing result_schema_validated) → RPG-012
{ const b = createTierBundle('t6a'); tierBundles.t6a = b; sound(b);
  const tp = join(b, 'rb_trace.jsonl');
  const lines = readFileSync(tp, 'utf-8').split('\n').filter(Boolean).filter((l) => !l.includes('"result_schema_validated"'));
  writeFileSync(tp, lines.join('\n') + '\n');
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  expect('tier6a-rpg012', codes(f), codes(f).includes('provenance_chain_inconsistency')); }

// tier 6b: fast span, chain consistent → only RPG-009
{ const b = createTierBundle('t6b'); tierBundles.t6b = b; sound(b, { spanMs: 100 });
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  const c = codes(f);
  expect('tier6b-only-rpg009', c, c.length === 1 && c[0] === 'agent_timestamp_span_suspicious'); }

// RPG-013: every diagnostic carries slotKey + wave
{ const b = createTierBundle('t5b'); tierBundles.t5b = b; sound(b, { nonce: 'nonce-src-1' });
  unlinkSync(join(b, '_subagents', 'wave_00', 'dispatch.json'));
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  const allTagged = f.length > 0 && f.every((x) => x.slotKey && x.wave === 'wave_00');
  expect('rpg013-tagged', codes(f), allTagged); }

// tier 9: external relay path invisible (SDC-002) — artifacts only under _fixtures/, empty _subagents wave
{ const b = createTierBundle('t9'); tierBundles.t9 = b;
  const ext = join(b, '_fixtures', 'external', 'slot_00');
  mkdirSync(ext, { recursive: true });
  wj(join(ext, 'result.json'), { slotKey: 'src', roleAgentKey: 'dpt-source-intake', status: 'done', summary: '', evidenceCount: 1, references: [], confidence: 0.5, notes: [] });
  wj(join(ext, '_status.json'), { status: 'done', updated: '2026-07-03T00:00:00.000Z' });
  mkdirSync(join(b, '_subagents', 'wave_00'), { recursive: true });
  const f = runProvenanceForensics(b, 'wave0', 'wave0-complete');
  const externalExists = existsSync(join(ext, 'result.json'));
  const canonicalMissing = !existsSync(join(b, '_subagents', 'wave_00', 'slot_00', 'result.json'));
  expect('tier9-sdc002-external-invisible', codes(f), codes(f).length === 0 && externalExists && canonicalMissing); }

// Write tier bundle paths for cleanup
writeFileSync(join(root, '_logs', '_tier_bundles.json'), JSON.stringify(tierBundles, null, 2));

const tracePath = join(root, 'rb_trace.jsonl');
const lines = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean);
const checkLines = lines.map((l) => JSON.parse(l)).filter((e) => e.event === 'check');
const failed = checkLines.filter((c) => c.passed !== (c.expected ?? true));
console.log(JSON.stringify({ checks: checkLines.length, passed: checkLines.length - failed.length, failed: failed.length }));
if (failed.length) { console.log('FAILED:', failed.map((c) => `${c.gate} (${c.detail})`).join('; ')); process.exit(1); }
console.log('ALL PASS — tiers + log samples recorded to rb_trace.jsonl');
JS
node "$B/_run_tiers.mjs" "$B"
```

→ 预期：9/9 tier checks PASS（tier1/2 silent、tier3 只 RPG-011、tier4 只 RPG-008、tier5 RPG-007、tier6a RPG-012、tier6b 只 RPG-009、RPG-013 全带 slotKey+wave、tier9 SDC-002 external invisible）。

---

## Step 3: Agent 抽样读 tier run.log [MAIN]

Step 2 完成后，读 tier1（sound）与 tier4（staged-not-committed）的 log：

```bash
B= # main bundle from Step 1
T1=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$B/_logs/_tier_bundles.json','utf8')).t1)")
T4=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$B/_logs/_tier_bundles.json','utf8')).t4)")
echo "=== tier1 run.log ===" && cat "$T1/_logs/run.log"
echo "=== tier4 run.log ===" && cat "$T4/_logs/run.log"
```

**Agent 目视确认**：

| tier | run.log 预期 |
|------|----------------|
| t1 | `relay_commit_done`（INFO 行）+ `work_done` + UUID nonce |
| t4 | `relay_commit_missing`（WARN 行）；**无** production `relay_commit_done` |

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

| Check | 对应 tier | 证明 |
|-------|-----------|------|
| `tier1-silent` | 1 真·sound | S0✓ S3✓ done → 所有诊断 silent |
| `tier2-silent` | 2 真·失败 | 链在但 status=failed → silent（verdict 区分于 tier1） |
| `tier3-only-rpg011` | 3 观测缺口 | 链在、done、无 lifecycle → 只 RPG-011 |
| `tier4-only-rpg008` | 4 staged-not-committed | staging✓ commit✗ status≠done → 只 RPG-008（carve-out：不触发 RPG-012） |
| `tier5-rpg007` | 5 懒手糊 | 无 dispatch + 非 UUID nonce → RPG-007 |
| `tier6a-rpg012` | 6 认真手糊 | 漏 result_schema_validated → RPG-012 |
| `tier6b-only-rpg009` | 6 子 case | 链自洽但 span<1s → 只 RPG-009（验证"RPG-009 单独不足判伪造"） |
| `rpg013-tagged` | RPG-013 | 所有诊断带 slotKey + wave_00 |
| `tier9-sdc002-external-invisible` | SDC-002 | relay artifact 仅在 `_fixtures/`，`_subagents/` 无 slot → forensics silent，canonical path 缺失 |

**PASS 含义**：6-tier 判决矩阵 + SDC-002 tier9 与 production `runProvenanceForensics` 行为一致——run.log 信号经 `log-event.mjs` 落地；按 `provenance-forensics-guide.md`，下一个 coding agent 拿 bundle 证据即可据矩阵判决 BUG-019。

**Scope 边界**：本 case 验证 forensics 判决矩阵，不 spawn 搜索型 sub-agent；matrix tier 的 provenance 信号是实验受控输入，但裁决路径与 production gate 相同。

---

## Cleanup

**PASS 才执行。FAIL 时保留 bundle 现场供排查。**

```bash
B= # populated from Step 1

# Remove tier bundles
for d in $(node -e "const b=require('$B/_logs/_tier_bundles.json'); console.log(Object.values(b).join(' '))"); do
  rm -rf "$d"
done

# Remove main bundle
rm -rf "$B" && echo "Cleaned up all bundles"
```
