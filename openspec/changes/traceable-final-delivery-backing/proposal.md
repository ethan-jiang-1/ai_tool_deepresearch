## 为什么

`BUG-199` 记录了一份已合法进入 Final 的报告：它呈现了声称有证据支撑的研究结论，却没有任何可追溯的证据引用。该事件并非一个小小的 `reference/` 目录问题：`reference/` 是读者投影，而失败或未提交的 Wave1 产物只能作为诊断材料。当前 Final 持久化命令可以把任意字节持久写入 `final/`，却没有在交付前将已声明的发现绑定到已提交证据的契约。

原始事件位于
`_backlog/bugs/BUG-199-synthesis-no-evidence-citations.md`；其系统性路线与准入事实位于
`_backlog/plans/bug-187-199-systemic-remediation-plan.md` 的 C3 部分。

## 变更内容

- **对新持久化的 Final Markdown 报告是破坏性变更：**引入一个有边界、读者可见的 `Evidence Map` 小节。每一行声明一个 Final 关键发现及其一个或多个证据支撑面链接。此映射是交付声明，不是新的证据账本或内容质量裁决。
- 新增 `final-delivery-backing` capability。其纯 Engine evaluator 只解析指定的 Evidence Map 小节，校验其小型结构契约，以目标报告为基准安全解析每个声明链接，并且只证明每个引用有合法的已提交支撑。
- 为 `operate-artifact-persistence.mjs` 增加 `persist-final-report` operation。它在合格的 Final Markdown staging report 进入既有 crash-safe persistence workspace 前先进行评估；通过时再把 payload 交给既有 CAS/atomic persist path。通用 `persist` 将拒绝安全的 Final Markdown report target，并返回唯一可直接重跑的命令，防止 Phase Agent 静默跳过 backing check；不安全或 malformed target 继续按既有 configuration error 处理。
- 只接受两类支撑：当前已提交、带证据意义的直接输出（`source_yaml` 或 `evidence_summary`），以及被现有 authority classifier 判定为拥有已提交或 Phase-owned submitted backing 的 `reference/` 路径。filesystem-only、failed、unsubmitted、unsafe、missing、final-output、cache-only、finding-index-only 和 synthesis-only 路径一律 fail closed。现有 submitted ledger 与 reference classifier 仍然是权威。
- 更新 Final 和 persistence 的 Agent guidance：Agent 写入 Evidence Map、使用 `persist-final-report`、只修复被报告的 staging row 或 backing path，并重跑同一 operation；不引入 user prompt、Final Gate、Final trace event、post-delivery loop 或 report-wide citation scanner。
- 在 apply 期间将已实现的 framework behavior 作为 **v0.70** 发布，包括 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` banner。

### 语义精度、控制与责任

一个 **Final key-finding declaration** 回答一个有界的读者问题：“对这个明确交付的发现，我可以检查哪个已提交证据面？”它保留会改变答案的区别：直接已提交证据与有已提交支撑的 consumer projection；合法支撑与只存在于磁盘的诊断产物；结构可追溯性与语义充分性。读者可以在 map row 和其解析出的已提交支撑处停止推理，或者获得诚实的 unavailable 结果，而无需重建 `reference/`、cache 或 work-unit history。

该 declaration 不是证据权威。**reference** 仍然是读者可见的 projection，**submitted ledger row** 仍是由 Engine 写入的 provenance authority。Final key-finding declaration 可以链接到一个合法 reference projection，但只有当既有 resolver 能抵达 submitted backing 时，该链接才能通过。它绝不会把失败 attempt、裸 cache path、Wave2 finding/index 或磁盘文件变成 evidence authority。

最短合法闭环是：

```text
Agent 写入一份 Final Markdown staging report 及其 Evidence Map
  -> persist-final-report 解析声明行并解析 submitted backing
  -> 既有 crash-safe persist 提交完全相同的 bytes
  -> Agent 交付既有 Final artifact
```

这在真实写入点补上一个缺失的确定性 acceptance boundary，并用一个直接 evaluator 取代隐含的、仅靠 Agent 遵守的 citation convention。它刻意不增加第二个 ledger、Final Gate、report-wide scanner、semantic claim validator、watcher、retry tree 或 lifecycle state。Agent 选择 key findings 并判断 backing 是否在实质上充分；Engine 检查 map shape、link/path safety 和 submitted provenance；普通 Final delivery 路径不要求用户作出新决定。

## Capabilities

### 新增 Capability

- `final-delivery-backing`：有边界的 Final key-finding declarations，以及持久化前的确定性 submitted-backing check。

### 修改的 Capability

- `artifact-persistence-recovery`：Final Markdown report persistence 经由新的 pre-persist backing check 路由，同时保留既有的 single crash-safe workspace 与 CAS/recovery behavior。
- `content-delivery-phase-content`：Final guidance 要求读者可见的 Evidence Map 和唯一合法的 Final-report persistence command，不改变 Final terminal semantics。

## 影响

- Framework code：一个 Zod contract 和纯 Final-backing evaluator，以及 `operate-artifact-persistence.mjs` 的 operation dispatch。
- Framework guidance：`phase-final.md`、`persist-artifact.md` 和 command inventory 中的新 command path 文案。
- Domain vocabulary：apply 会在 `CONTEXT.md` 中增加狭义的 Final key-finding declaration 与 Final backing 含义；它们不替代既有的 reference、submitted ledger row 或 projection 定义。
- Verification：为 zero map rows、malformed map rows、missing/unsafe/unsubmitted references、valid direct evidence、valid submitted-backed projections、failure 时不产生 pre-commit write，以及结构合法但其 semantic adequacy 仍在 Engine judgment 之外的 map，增加 focused unit 和 CLI/Markdown integration tests。fixture tests 不会声称真实 Actor 行为。
- Governance/release：change-root `verification-plan.yaml`、`FDB-001` 与 `FDB-002` 可追溯性、feedback-lifecycle reviews，以及 v0.70 release notes。不增加依赖。
