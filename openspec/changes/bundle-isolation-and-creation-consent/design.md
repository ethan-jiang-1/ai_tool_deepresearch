# Design: bundle-isolation-and-creation-consent

## Context

见 `proposal.md` Why。两个被钻的空子都没有可执行契约：BUI-001/002 只管文件系统路径，
CMI-005 + playbook 明文指示静默 collision 改名。本设计把 Charter 既有原则
（current run bundle 是唯一 runtime truth；语义/权利决定归用户）投影为两个
确定性检查，不新增 lifecycle 状态、不新增命令面。

## Goals / Non-Goals

**Goals**

- 创建器在文件系统副作用前完成 sibling 预检与拒绝（fail-fast，与 CMI-008 同型）。
- inspect/audit 对 bundle 内容中的跨 bundle 引用给出与 BUI-002 同型的诊断
  （cleanup/blocker 分级），只诊断不修复。
- playbook 文本把"静默改名重试"换成"stop and ask user"。

**Non-Goals**（proposal Excluded 之外的设计级边界）

- 不做语义级引用判定（"历史报告"这类措辞不进机器判定；机器只认 `dpt_rb_*`
  路径/身份 token，语义引用靠 playbook 规则与 Agent 执行）。
- 不维护 workspace 级"active bundle registry"——不引入新的持久全局状态。

## Decisions

### D1: sibling 预检放在创建器 CLI 内，而非 playbook 约定

- **选择**：`instantiate-run-bundle.mjs` 在 argv 解析后、任何 mkdir/写文件前，
  `readdirSync(targetDir)` 过滤 `dpt_rb_*`；对每个 sibling 读取其 `rb_status.json`
  的 `current_node`/`state` 判定是否 Final。
- **为何不选 playbook-only**：v2 事件证明 prose 约束挡不住 autonomous execution
  疲劳（同 bundle 的 49 次 gate 失败后绕过就是先例）。Engine verdict 是 Charter
  指定的 deterministic trust root。
- **为何不选全局 registry**：最短合法闭环——一次 readdir + 一次 status 读取即可
  判定，无需新增跨 run 持久状态；registry 会引入第二真相源与失效问题。

### D2: "名字接近"的机器判定 = kebab 前缀关系

- **选择**：requested name 去掉 `dpt_rb_` 前缀后，与 sibling name 互为
  前缀（`glm-5-3-deepseek-v4-domestic-chips` 是
  `glm-5-3-deepseek-v4-domestic-chips-v2` 的前缀）即 name-similar；
  另加"sibling 非 Final"独立触发。两者任一命中即需 ack。
- **备选放弃**：编辑距离/模糊匹配——引入阈值语义，违反 semantic precision
  （读者无法回答"多近算近"），且前缀关系已覆盖本事件形态（`-v2`、`-fix`、
  `-rerun` 等派生名）。
- **状态判定**：`rb_status.json` 存在且 `current_node` 指向 Final 节点（或无
  status 文件的 archive 形态）视为 Final；读取失败视为非 Final（fail-closed）。

### D3: `--acknowledge-existing-bundle <name>` 是唯一放行通道

- **选择**：ack 参数必须逐名指出被预检 flag 的 sibling；不存在、非 flagged、
  重复 → 与 CMI-008 同型的 argv 错误，零文件系统副作用。ack 不写入 bundle
  任何内容（不成为 durable state），只存在于本次进程调用。
- **user decision / Agent execution / Engine verdict**：用户决定"是否再建"；
  Agent 派生名称、呈现局面、携带 ack 重跑（普通授权执行）；Engine 判定
  sibling 存在/相似/状态与 ack 有效性。三层无交叉。
- **备选放弃**：交互式 prompt（CLI 向用户提问）——CLI 无对话通道，且会制造
  mid-pipeline 阻塞；同意发生在 Agent 与用户的对话层，CLI 只验证 ack 形态。

### D4: 内容扫描复用 BUI-002 的诊断管线

- **选择**：新增一个纯函数扫描模块（建议 `engine/helpers/cross-bundle-reference-scan.mjs`，
  输入 bundle root + 内容文件集合，输出 `{file, citedBundle}` 列表），
  `inspect-bundle.mjs` 与 `audit-phase-status.mjs` 调用并按既有 cleanup/blocker
  分级投影。匹配规则：正则 `dpt_rb_[a-z0-9][a-z0-9-]*` 且 token ≠ 本 bundle 名。
- **为何不进 gate 规则**：gate 是 lifecycle 权威，会阻塞合法 run；诊断先行的
  反馈闭环与 repo-root leak（BUI-002）一致——发现 → Agent 语义修复 → 复检。
- **semantic-precision**：有界问题是"这个文件是否引用了另一个生产 bundle 的
  身份"；不判定措辞语义（"历史报告"），不猜意图；正常停止点 = 命中清单为空
  或报告完毕。
- **Source of Record**：跨 bundle 引用事实的 SoR 是 bundle 内容文件本身；
  诊断输出是投影，不是第二真相源。

### D5: playbook 改写保持 CMI-005 命名自主性不动

- `instantiate-run-bundle.md` 第 1 步（定名）文本保留；第 2 步 collision 段
  改为："报错停止 → 向用户呈现 sibling 局面与三个合法去向（继续 / accepted
  recovery reopen / 用户同意后带 ack 新建）"；删除"collision-safe 名称后重试"。
- `continue-run-bundle.md` Entry Selection 的 stop 清单已有 "creating a bundle"
  禁项，只补一句同向指针（创建同意由 CMI-010 拥有），不重述规则（避免第三处
  restatement 违反该节自身声明的 single canonical statement 原则）。

## Risks / Trade-offs

- [预检把"确实想要 v2"的合法场景变慢一步] → 一步显式 ack 换取知情权，符合
  Helper-Oriented Agent；合法路径仍是最短的（用户说"建"→ Agent 带 ack 重跑）。
- [前缀判定可能漏掉非前缀的近似名（如换词序）] → "非 Final sibling" 独立
  触发已覆盖大部分；漏网者由用户对话层兜底，机器判定只承诺前缀关系。
- [内容扫描误报（引用自己名字/教学示例）] → 排除本 bundle 名 token；其余
  命中只是 diagnostic，Agent 可语义解释并修复措辞。
- [ack 被滥用为机械绕过] → playbook 明文要求 ack 之前必须有用户明确表达；
  ack 参数本身在 run.log/诊断中可见，事后可审计（与 D3 的进程级事实一致）。

## Migration Plan

1. 引擎侧先行：创建器预检 + ack（可独立上線，立即阻止新 v2 类事件）。
2. 诊断侧：扫描模块 + inspect/audit 接入（对存量 bundle 首跑即产出
   cleanup 级诊断，不阻塞）。
3. playbook 文本改写（与 1 同一 change 内完成）。
4. 回滚：三处改动互相独立，任一处 revert 不破坏其余（预检 revert 只回到
   当前行为；诊断 revert 只少一类诊断）。

## Open Questions

无。前缀判定与 ack 形态都可在 apply 中按测试反馈微调，不影响 spec。
