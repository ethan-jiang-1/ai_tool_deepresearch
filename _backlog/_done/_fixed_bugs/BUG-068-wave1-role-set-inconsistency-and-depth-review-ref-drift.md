# BUG-068 — Wave1 gate 要求的 shape 与 delegated 契约/文档不一致：合法 role 被下游 gate 拒且不可恢复、depth-review ref 示例带多余斜杠

| 属性 | 值 |
|------|-----|
| ID | BUG-068 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P1（Gap 1 不可恢复，需整只 supplementary work unit 修一个 role 字符串）+ P2（Gap 2 文档/validator 漂移） |
| 来源 | `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（exploratory_map，5 topics，wave1 gate 首次失败 13 条规则） |
| 相关 Bug | [[BUG-066]]（envelope schema ↔ validator 漂移）、[[BUG-060]]（sub-agent/Engine contract 系统性 mismatch）——本 bug 是同一族的 wave1 实例 |
| 影响文件 | `schema/gate_definitions/gate-wave1-complete.definition.json`（`wave1_work_unit_output_coverage.output_selectors.roles`）、`engine/work-unit-envelope.mjs` / work-unit `output_contract.allowed_roles`、`engine/work-unit-submit.mjs`（submitted 不可改）、`workflows/nodes/phases/phase-wave1.md`（§3.2.2 depth-review 示例）、`workflows/nodes/phases/subagent-dpt-evidence-extractor.md`（role↔path 未强制） |

---

## 0. 一句话核心诊断

**Wave1 gate 对 delegated 产出的形状有硬性要求（output_files 的 role 必须是 evidence_summary/question_list、depth-review 的 work-unit ref 必须与 ledger 逐字相等），但这些要求既没写进 sub-agent 契约，又与文档示例相矛盾；更糟的是 role 一旦提交就不可恢复——submit 接受"合法但错误"的 role，gate 却在下游拒绝，而 submitted work unit 无法用修正后的 role 重新提交。**

---

## 1. Gap 1（P1）：合法 role 被下游 gate 拒绝，且提交后不可恢复

### 现象
- work-unit `output_contract.output_files.allowed_roles` = `["reference","evidence_summary","question_list","other"]`——`other` 是**被明确允许**的 role。
- 但 `gate-wave1-complete.definition.json` 的 `wave1_work_unit_output_coverage.output_selectors.roles` = `["reference","evidence_summary","question_list"]`——**不含 `other`**。
- 于是：sub-agent 把 `artifacts/wave1/{topic}/evidence-summary.md` 声明为 role `other`（契约说合法）→ `operate-work-unit submit` **通过** → wave1 gate `wave1_work_unit_output_coverage` **失败**：
  ```
  Delegated output lacks submitted work-unit coverage or projection backing: artifacts/wave1/02_.../evidence-summary.md
  ```
- 本 run 中 topic 01 的 sub-agent 恰好用了 `evidence_summary`/`question_list`（通过），topic 02–05 用了 `other`（失败）——**同一契约、同一提示、不同 sub-agent 选择，结果分裂**。

### 三重缺陷
1. **契约自相矛盾**：`allowed_roles` 广告了一个下游 gate 会拒绝的 role（`other`），且没有任何地方规定"evidence-summary.md 必须是 role `evidence_summary`、question-list.md 必须是 `question_list`"。`subagent-dpt-evidence-extractor.md` 与生成的 `task.md` 都没有 role↔path 绑定说明。
2. **submit 无早期校验**：`validateOutputFiles` 只检查 role ∈ allowed_roles，不检查"必需 path 是否用了 gate 认可的 role"。错误在 submit 时静默通过，直到 wave1 gate 才爆发。
3. **提交后不可恢复**：`work-unit-submit.mjs` 中 `record.status === 'submitted'` 时，若 result 内容不同则抛 `different-content duplicate submit rejected`（line ~314-320）。即：**改一个 role 字符串都无法重提**，只能新开一只 supplementary work unit 重新走 claim→submit，即使研究文件早已真实产出。修一个 label 的代价是一整轮 delegated 生命周期。

### 复现
1. wave1 sub-agent 把 evidence-summary.md / question-list.md 声明为 role `other`（合法）。
2. submit 通过。
3. 跑 `check-gate-wave1-complete` → `wave1_work_unit_output_coverage` FAIL。
4. 尝试改 result.json 的 role 再 submit 同一 work_id → `different-content duplicate submit rejected`。

### 修复方向
- **契约一致性**：要么把 `other` 从会阻断的路径上移除 / 让 coverage gate 接受 `other`；要么在 `output_contract` 里显式声明"required output path → required role"绑定，并写进 `subagent-dpt-evidence-extractor.md` 与生成的 `task.md`（"evidence-summary.md MUST be role `evidence_summary`"）。
- **submit 早拦截**：`validateOutputFiles` 在必需路径用了 gate 不认可的 role 时，直接 reject（或 auto-normalize role 并记 `silent_degradation`，与 [[BUG-060]] 的 autofill 哲学一致），把错误从"下游 gate"提前到"submit"。
- **可恢复性**：允许对 `submitted` 单元做**受限的元数据修正重提**（仅 output_files.role 之类非证据字段变化时），避免为一个 label 重跑整只 work unit。

---

## 2. Gap 2（P2）：depth-review `reviewed_work_unit_refs` 文档示例带多余斜杠，与 exact-match validator 冲突

### 现象
- `phase-wave1.md` §3.2.2 depth-review 最小 shape 示例（line 158）：
  ```yaml
  reviewed_work_unit_refs:
    - "_work_units/wave1/<work_id>/"      # ← 带尾部斜杠
  ```
- 但 submitted ledger 的 `work_unit_ref` 字段是 **`_work_units/wave1/wu-w1-b000-deep-i0001`（无斜杠）**。
- `wave-depth-contracts.mjs` 用 `submittedRefs.has(ref)` 做**逐字精确匹配**（line ~378）。照文档示例写（带斜杠）→ 5/5 topic 全挂：
  ```
  [depth_review_contract] FAIL: ... reviewed work-unit ref is not submitted: _work_units/wave1/wu-w1-b000-deep-i0001/
  ```

### 修复方向
- 统一格式：把 `phase-wave1.md` 示例改成无尾斜杠 `_work_units/wave1/<work_id>`；或让 validator 在比较前对两侧做 `replace(/\/$/,'')` 规范化（更稳健）。
- 加测试：depth-review 示例中的 ref 形态必须与 ledger `work_unit_ref` 生成规则一致。

---

## 3. 归属边界（诚实声明，避免误报）

本 run 中 `source_url_present`（markdown 链接）与 `key_findings_non_empty`（`## Key Findings` 后需 `**`/编号）两条 gate 失败，经核对**不是**框架 bug：`subagent-dpt-evidence-extractor.md` §3 输出模板本就规定了 `## Source URLs` 用 `[Title](url)` markdown 链接、Key findings 以 `**机制理解**:`/`**趋势观察**:` 开头——与 gate 正则一致。是本次 run 的**自定义 sub-agent 提示词偏离了 role spec 模板**所致，已就地修正，不计入本 bug。（记录此边界，符合"claim 必须对照代码核实"的复盘纪律。）

---

## 4. 与 [[BUG-066]] / [[BUG-060]] 的关系

三者同一族：**"gate/downstream 要求的形状 ≠ delegated 契约所声明/文档所示范的形状"**，且缺少常态化的"契约一致性"测试。BUG-066 是 result.json 字段层；本 bug 是 output_files.role 与 depth-review ref 格式层。建议统一做一个"envelope/contract ↔ gate rule ↔ phase-doc 示例"三方一致性测试套件，把这类漂移在 CI 拦截，而不是让 Agent 在真实 run 里逐条踩坑逆向修复。
