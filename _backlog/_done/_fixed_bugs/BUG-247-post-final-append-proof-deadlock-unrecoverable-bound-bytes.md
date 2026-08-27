# BUG-247: post-final 追加证明 witness 绑定的瞬时字节态不可复原——primary_series basis 无 structural fallback，合法越带重组后 C5 永久死锁（数据层不可修）

- **Severity**: blocker（本 bundle rerun 预算 3/10 完全不可达；`operate-post-final-recovery inspect` 永久 `blocked: accepted_lineage_drift`；字节内容与运行时状态均无合法修复路径，必须改 Harness）
- **Phase**: post-final recovery（C5 `post_final_rerun` 之后的再次 reentry：`inspect` → `newer_final_inventory_drift` → `accepted_lineage_drift`）
- **报告日期**: 2026-08-27
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **直接触达的 Engine 源码**:
  - `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`
    - `proveNewerFinalAppend(...)`（line 481-515：exact-match 枚举 `finalRemovalPrefixes` 的累计移除前缀；`primary_series` basis 分支在无 exact match 时**直接 `matched:false`**，只有 `whole_tree` basis 有 legacy structural fallback）
    - `finalRemovalPrefixes(...)`（line 456-469：retained 集合只能是 {base..vk}，k=0..N）
    - `inspectNewerFinalStage(...)`（line 568-594：阻塞裁决点 `newer_final_inventory_drift`）
    - `inspectPostFinalHandoffStage(...)`（line 600+：事件选择 + `finalLineageExists` 校验）
  - `DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs`
    - `inspectInternal(...)`（line 366-367：`!active.ok` 且 reason_code 不在 `['missing_event','superseded_event']` 豁免名单 → blocked）
    - `applyPostFinalRecovery(...)`（line 486-496：`verdict !== 'eligible'` 原样返回 blocked——apply 被 inspect 硬门控，无绕过）

## 摘要

C5 事件（`post_final_reentry`）把 `previous_final.final_inventory_sha256` 绑定为**绑定时刻** primary 系列字节的 digest（BUG-236 引入的 `primary_series` basis）。绑定之后，final/ 发生了一次**语义合法、通道越权**的重组（`_scripts/fix-final-renumber-v0v1v2.mjs`：删 dup v1、v2→v1/v3→v2 改名、重写全部内部版本引用，含 base `final.md`），随后 V2/V3/V4 经 publisher 正常追加。

`proveNewerFinalAppend` 只接受「retained 前缀字节 == 绑定态字节」的 exact match。绑定态的字节在重组中已被改写且**任何现存副本都未保留**（见「真实证据」7380 组合穷举），因此：

1. 当前 5 个候选 retained digest 全部 ≠ witness；
2. **闭集论证**：retained 集合只能是 {base..vk}（k=0..4），其 digest 由现存不可变字节决定；未来任何 publisher 追加只增加新 revision、从不改既有字节——**可能的 retained digest 集合永远封闭在这 5 个值**。死锁是永久的，与未来操作无关。

`whole_tree` basis 对同类问题（绑定后字节漂移）已有 legacy structural fallback（代码注释明言 "Byte-level verification … is impossible without per-file prior hashes"），**`primary_series` basis 从未获得等价 fallback**——basis 迁移（BUG-236）未闭合，是本 bug 的直接框架缺口。

## 真实证据（2026-08-27 实测）

**1) 阻塞现场**：

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs inspect \
  --bundle dpt_rb_chinese-ai-inference-chips-vs-nvidia
# → verdict: blocked, reason_code: accepted_lineage_drift
#   reason: "newer Final inventory is neither the accepted prior inventory nor a proven immutable canonical append"
```

**2) witness 归属**：rb_trace.jsonl 第 1100 行 `post_final_reentry`（2026-08-26T20:14:10Z，operation `3a55e866`，AMD rerun 的已 apply C5）绑定 `final_inventory_sha256 = 022f9bf82358a047…`（basis `primary_series`）；`_scripts/post-final-rerun-request-amd.json` 的 `expected_final_lineage` 同值（apply 时从 `finalFacts()` 拷贝的当时盘上状态）。

**3) 全部候选 retained digest（用引擎自身 helper、BUG-246 修复后的规范顺序计算）**：

| 移除前缀 | retained | digest（前 16 hex） |
|---|---|---|
| ∅ | base+v1+v2+v3+v4feat | 0a8fb7d94b9a11ba |
| [v4feat] | base..v3 | e24cab41e13b8c33 |
| [v4feat,v3] | base+v1+v2 | 0d1b467511afac3d |
| [v4feat,v3,v2] | base+v1 | 0674e92971a6de3a |
| [v4feat,v3,v2,v1] | base | 3b60d127b22a293a |

无一等于 `022f9bf8…`。

**4) 字节穷举（数据修复不可行性证明）**：对**全部可复原字节代**做组合对撞（集合形状 {base}、{base,v1}、{base,v1,v2}、{base,v1,v2,v3}；来源：staging 原始 publish 源 `S`、01:52 恢复备份 `BK`、现行 C0–C3、逆向 renumber 重构的 `invC0`/`invLanding`/`invAMD`）共 **7380 组合，零命中**。绑定态（20:14 时点的 final/）含有的字节（最可能是 08-26 重组期手写的 `final_v2.md` 或某个中间 v1 变体）在任何现存副本中都不存在。

旁证闭环：`digest({S, S-dup})` 精确重现 `37ab2175dec190e6…`（`_scripts/post-final-rerun-request.json`——一封**从未 apply** 的 request 绑定值，即当时的盘上「base+dup」态）；`BK === inv(renumber BASE_OPS, C0)` 精确成立（备份就是 08-26 重组态 base）。字节史五代（S 原始 → 08-26 重组 BK → 01:52 恢复 S → 11:15 renumber → 现行）全部对上，唯 witness 所属的 20:14 瞬时态不可复原。

**5) 权威模型排除剩余路径**：重写已交付 primary 字节伪造绑定态（违反 no-clobber / publisher 独占）；编辑 append-only trace（伪造审计）；`missing_event`/`superseded_event` 豁免不可达（事件与 lineage 事实真实存在，`finalLineageExists` 对 1092/1097 行恒真）；apply 被 inspect 硬门控（循环）。

## 根因

1. **basis 迁移未闭合**：BUG-236 把 C5 绑定升级为 `primary_series` digest 时，只给 `whole_tree` 留了 structural fallback，`primary_series` 没有——引擎对「绑定后合法重组」零容忍且零补救。
2. **publisher 无重组能力**：框架没有任何 rename/renumber/retire 操作，语义合法的版本整理只能越带手写（本例 renumber 脚本），漂移因此必然发生。
3. **绑定态字节无存档**：C5 事件只存 digest，不存 per-file prior hash（whole_tree fallback 注释已承认），字节一旦漂移即不可证明。

## 期望行为

- 对「绑定后发生过语义合法、有审计记录的 final/ 重组」的 bundle，C5 应存在一条**审计化的恢复路径**（rebind/amnesty 或 structural fallback），使 rerun 预算重新可达；
- 修复后本 bundle `inspect` 应返回 `eligible`（facts.request_bindings 绑定当前 lineage），随后按 playbook 走 apply → rerun。

## 修复方向（供 Harness-fixing Agent）

| 选项 | 内容 | 优点 | 代价 |
|---|---|---|---|
| **A（最小）** | `proveNewerFinalAppend` 为 `primary_series` 增加结构化 fallback（镜像 whole_tree 先例：无 exact match 时接受「retained 系列仍是合法 base+连续 revision」的前缀，返回独立诊断 basis 如 `primary_series_structural_fallback`） | ~10 行；有既有先例与注释背书；直接解锁 | 证明弱（与 whole_tree fallback 同级妥协），应配 advice 警示 |
| **B（最强审计）** | `operate-post-final-recovery` 新增窄 `rebind` 操作：写全新 `post_final_reentry` 事件绑定**当前** lineage，事件内记录 drift 类别 + rationale，保持 append-only | 审计完整；不弱化 proof；可复用 | 新增 CLI/Engine 能力，面较大 |
| **C（防复发，补充）** | publisher 增加重组/收据能力（rename/renumber 操作或 lifecycle 收据事件），消除「只能越带手写」的根因 | 源头治理 | 不单独解锁本 bundle，需与 A/B 组合 |

建议 **A 先行解锁（带独立 basis + warning），C 作为后续必做，B 视演进需要**。本 bundle 即现成测试夹具。

## 最小可复现 / 验证

```bash
# 真实 bundle（修复前 blocked；选项 A 实施后应 eligible）
node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs inspect \
  --bundle dpt_rb_chinese-ai-inference-chips-vs-nvidia

# 独立复现 witness 不可达（引擎 helper + 现行字节）
node --input-type=module -e '
import { readFinalReportInventory, digestFinalReportPrimarySeriesEntries } from "./DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs";
const inv = readFinalReportInventory("dpt_rb_chinese-ai-inference-chips-vs-nvidia");
const revs = inv.primary_series.primary_entries.filter(e=>e.kind==="revision").map(e=>e.target).reverse();
const primary = new Set(inv.primary_series.primary_entries.map(e=>e.target));
const basis = inv.entries.filter(x=>primary.has(x.path));
for (let n=0;n<=revs.length;n++){
  const rm=new Set(revs.slice(0,n));
  console.log(n, digestFinalReportPrimarySeriesEntries(basis.filter(x=>!rm.has(x.path)), inv.primary_series).slice(0,16));
} // 全部 ≠ 022f9bf8…（witness = trace 第 1100 行事件绑定）
'
```

回归验收：新增「绑定态字节已不可复原 + retained 系列结构合法」的 fixture（可直接以本 bundle 形状构造：base + 数个 revision + witness 指向已不存在的字节组合），选项 A 下 `proveNewerFinalAppend` 应返回 `matched:true, basis:"primary_series_structural_fallback"`。

## 相关上下文 / 接手信息

- **BUG-246**（2026-08-27 已修，顺序不一致）：其修复（retained digest 复用 `digestFinalReportPrimarySeriesEntries`）已确认在位并被本卡证据使用——本卡是**BUG-246 修复后暴露的下一层**：顺序修对之后，witness 本身的字节已不可复原。BUG-246 接手信息中「把字节写回 final.md/final_v1.md 验证 == 37ab2175 … 此层已修复」针对的是一封**从未 apply** 的 request 绑定值；被选中事件的绑定（022f9bf8）所属瞬时态当时已丢失，字节恢复路线就此到头（本卡 7380 组合穷举为证）。
- **BUG-236**（primary_series basis 引入）、**BUG-241**（supersession 断链，已修）：本卡是同一谱系的第三层。
- bundle 内佐证：`rb_trace.jsonl` 第 1100 行（事件）、`_scripts/post-final-rerun-request-amd.json`（同值绑定）、`_scripts/restore-backup-20260827-015236/`（01:52 恢复前备份，= 08-26 重组态 base）、`_scripts/fix-final-renumber-v0v1v2.mjs`（重组变换全文，可逆性已验证：`inv(BASE_OPS) ≡ BK`）。
- **non-goal**：不改动 bundle 交付内容、C5 事件或历史 final 字节；不编辑 append-only trace；修复面只在 Harness（proof fallback / rebind 操作 / publisher 重组能力）+ 回归测试。
- 解锁后操作剧本：`inspect` eligible → 按 `command_playbook/post-final-recovery.md` §2 保留 request（labelled reason）→ `apply` → `enter-phase phase-rerun` → `advance-status --to hitl2_recorded` → `check-reentry --at hitl2_recorded` → rerun#4（挖掘范围见 bundle `_diagnostics/next-dig-list-v4-landing-feedback.md`）。
