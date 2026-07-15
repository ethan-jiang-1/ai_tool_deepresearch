# Gate Bypass Authority Audit — 只读调查 plan

## 一句话

**盘点框架里所有"绕过确定性 gate 权威"的口子（synthetic degraded pass、脚本重建文件被 gate 按形状接受、…），判定哪些合法、哪些 erosive——只读，不提修法。**

## 为什么需要（背景）

BUG-090 / BUG-091 已定性为 cross-version skew，由 `bundle-version-skew-advisory` change 处理"偏移可见性"。但两个 bug 的**末端伤害**是同一句（BUG-091 原文）："synthetic degraded pass **破坏 gate 的权威性**"。也就是说：

- gate 检查的是 **projection 的形状**（文件存在/格式/计数），不是 **authority/provenance**（文件是否经合法 submit/materialization 路径产出）。
- 所以脚本重建的、形状对但没走合法路径的 reference，gate 也认；"synthetic degraded pass" 之类的 escape hatch 让操作者能静默绕过确定性 gate。

`bundle-version-skew-advisory` 只治了"偏移不可见"（症状层），**没碰这个常驻口子**（根因）。这份 plan 就是去把根因摸清——但**先只读盘点，不猜修法**。

按 `evolution-simple-reliable-control`：同一事实不留第二份 blocking validator、不留两个 success authority、recovery 不靠隐藏 fallback 树。本 audit 的产出是用来判断"哪些口子违反了这条"的证据，**不是**直接添机制。

## Scope（只读，DO 只做这些）

1. **枚举 escape hatch 全景**：grep + 读 gate/inspect/reentry 代码，列出所有"能让 bundle 在不满足 content gate 的情况下推进"的路径——`synthetic degraded pass`、degraded/limitation 标记、脚本可注入的 projection（reference / index / cache 被 gate 当 authority）、手工改 ledger/status、`legacy_unbound` 类语义、retry/terminalize 路径。
2. **逐口子判定**：每个口子回答三问——
   - 它保护/绕过的是 **deterministic authority**，还是只是 presentation？
   - 它是**显式、可审计**的恢复动作，还是**静默**的第二成功路径？
   - 去掉它会不会让真·降级场景无路可走（即它是否合法）？
3. **产出**：一张表（口子 → 位置 file:line → 合法/erosive → 证据），写成调查备忘。erosive 的标注"违反 single-truth-path"，但**不在本 plan 提修法**。

## DON'T（本 plan 不做）

- **不提修法、不改代码、不发 change。** 修法等盘点结论出来后，按证据**逐 surface** 单独走 OpenSpec（gradual convergence，不 big-bang）。
- 不为"兼容老 bundle"加 migration / `legacy_unbound` / delta-gating（那是 BUG-091 自带的错路）。
- 不在没证据前假设某个口子是 bug。

## 根本不做

- 不重写 gate provenance 模型。
- 不把 projection 反向提升为 authority（那会加重问题）。

## 关联

- BUG-090 / BUG-091：触发本 audit 的表象（已按 skew 关闭）。
- `bundle-version-skew-advisory` change（CMI-007 / RRD-011）：症状层处理，与本 audit 并行不冲突。
- `evolution-simple-reliable-control`：One Truth Path / Anti-Patterns（"以兼容为名永久保留两个 success authority"）。
- memory: `bug-090-091-version-skew-closure`、`contract-lineage-aware-feedback`。

---

## 调查结果 (2026-07-16) — 只读盘点，不提修法

### 头条结论

真正 erosive 的口子**只有一个**：`countReferences` 把 `reference/` 下分类为 `phase_owned_projection` 的文件**按存在 + isCountable 形状**计数，不要求它经由合法 submit 产出——**这就是 BUG-090 脚本重建 reference 能过 gate 的机制**。其余口子要么合法且 bounded，要么 detected-not-enforced。BUG-091 点名的 "synthetic degraded pass" 经查是 **bounded、可审计的疲劳救济**（只放过 count-floor 类数量规则、≥3 次见证 attempt、全程标注 degraded），不是静默洞。

### 口子清单

| # | 口子 | 位置 (file:line) | 机制 | 判定 |
|---|------|------|------|------|
| 1 | **疲劳 degraded pass** | `cli/gates/check-gate-wave1-complete.mjs:115-147` (`maybeDegradedHandoff`)；`check-gate-wave0-complete.mjs:113` (`DEGRADATION_ELIGIBLE_RULE_IDS`) | ≥3 次 attempt 后，若**仅** allowlist 内规则失败，gate 返回 `passed:true + degraded:true`。Wave1 allowlist=`{per_topic_ref_md_count_floor}`；Wave0=`{shared_ref_count_floor, per_topic_count_floor}`。任一非 eligible（runtime/结构/provenance）规则失败则**不**降级（`[degraded_not_eligible]`） | **合法 (bounded)**。只放过数量 floor，不放过 authority/provenance/结构；全程 `degraded_reason`+`degraded_rules`+`degradation_attempt_count` 入 trace，advice 明示 "not a clean pass"。BUG-091 反对的是**滥用**它当常规拐杖，非其存在 |
| 2 | **手工改 status 绕过** | `engine/helpers/phase-status-audit.mjs:354,368` (`manual_bypass_suspected`)；`cli/advance-status.mjs:131` (`validateSourceGateStatusSync`) | `rb_status.json` 是可写文件；人可直接改 `current_gate`/`next_gate` 跳过 gate。advance-status 本身要求 witnessed handoff，但挡不住直接编辑文件 | **半 erosive / 已知限**。框架**事后检测**（`manual_bypass_suspected`）但不物理强制。风险取决于该检测是否在 HITL/reentry 真被查阅 |
| 3 | **projection 被当 authority 计数** ⚑ | `engine/helpers/ref-count.mjs:204-285` (`countReferences`, ledger 模式) | 主路径读 submit 声明 `role:reference`（有 provenance）；但**第二路径**扫描 `reference/`，凡 `classifyReferenceAuthority==phase_owned_projection` 且 `isCountable`（accepted source_url 等）的文件**按存在计数**——不要求经 submit。脚本重建（BUG-090 临时修复）即走此路满足 floor | **EROSIVE（真根因）**。gate 把 projection 按形状当 countable authority，无法区分合法产出 vs 脚本注入。但 `isCountable` 要求 accepted source_url，纯 shell 不算——软肋是"脚本用 cache 真实 URL 重建出 accepted 形状的 reference" |
| 4 | `--explain-file` 标记 non-authoritative | `engine/helpers/file-observability.mjs:416` | `log-event.mjs --explain-file` 把 projection 声明为 non-authoritative | **合法（诚实机制）**。是"声明它不是权威"而非"假装是"。低风险（未深核，语义清晰） |
| 5 | bootstrap/exceptional 前进 | `cli/advance-status.mjs` (`BOOTSTRAP_STATUS_WINDOWS` / `synchronized_initial_profile`) | 初始化/bootstrap 边界下允许前进 | **合法 (bounded)**。仅 init 边界 |

### 精确化的根因（比先前假设更准）

先前假设"根因 = gate 查形状不查 provenance + synthetic degraded pass"。**盘点修正**：synthetic degraded pass (#1) **不是** erosive（bounded 可审计）；真正 erosive 的是 **#3——`countReferences` 对 `phase_owned_projection` 文件按存在计数**。两者常被混为一谈，但修法完全不同：

- **#1** 若要收紧 → 改 fatigue 门槛 / eligibility（小）。
- **#3** 若要修 → 把 reference 计数从"存在+形状"改成"submit-provenance 绑定"（真设计变更）。**陷阱**：WAI-008/REF-008 明确 reference 是 **Phase-owned projection**（合法地不经 sub-agent submit），所以"必须经 submit 才算"会误伤合法的 Phase Agent materialization。#3 的真正设计题是：**如何区分"合法 Phase-owned materialization"与"脚本注入"**——这本身就是个未解的设计问题，不在本审计范围。

### 不在本审计提修法（守 plan 的 DON'T）

本审计只产出上表 + 判定。若日后要动 #3，是**独立 scoped change**，且必须先回答上面的"合法 Phase-owned 投影 vs 脚本注入"区分题。本审计完成；plan 可按 `_done` 流程归档，或保留待 #3 fix 立项。
