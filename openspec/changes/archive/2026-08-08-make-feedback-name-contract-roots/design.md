# Design: make-feedback-name-contract-roots

## Context

见 proposal.md — Why。本 change 把"确定性规则存在但 Agent 看不见"的五个摩擦点
（BUG-206/207/208/210/211）收敛为一条契约：**Engine feedback、schema 显示与
Agent-facing 指引必须点名确定性契约根**。约束：不改变 evaluator 合法接受/拒绝集合；
不新增控制层；Markdown 控 Agent Flow、JS 控确定性 checkpoint 的边界不变。

## Goals / Non-Goals

**Goals:**
- 泛化错误（YAML parse、cross-field constraint、finding not current）能直接读出
  缺失/出错的契约事实。
- `operate-topic-state schema` 输出足够构造合法 apply packet。
- 指引/模板把隐藏规则（YAML 引号、canonical 文件名推导、depth-review 同步、
  finding currentness）写清楚。

**Non-Goals:**
- 不改 `markdown-semantic-sections.mjs` / evaluator 合法集合（BUG-205 归 Change 2）。
- 不改 queue CLI drain 语义（BUG-209 归 Change 2）。
- 不改 seed 物化行为、不新增 HITL/controller/lifecycle。
- 不重写整个 feedback surface，只补"点名缺失事实"这一义务。

## Decisions

### D1 — feedback 点名缺失事实：在 CHI-005 加统一义务，各 surface 自行实现

选择在 `engine/check-inspect-feedback` 增加一条横切 requirement（CHI-005），要求
"泛化 parse/validation/evaluator 失败必须点名缺失/出错的契约事实 + write surface +
同一 checkpoint rerun"。各 surface（frontmatter 错误、topic-state apply、wave1
convergence）按各自错误路径实现。
- **替代 A（逐 surface 修 message 而不加统一 requirement）**：缺一个可追踪的横切
  契约，未来新 surface 会再次退化。否决。
- **替代 B（新增专用"错误命名"service）**：过度控制层，违反 net-simplification。否决。

### D2 — schema 显示按 wave 展开 source_identity

`operate-topic-state schema --context wave_projection` 的 `apply_seed_projection`
form 增加 per-slot 的 source_identity 说明：wave0/wave1 用 `submitted_work`，
wave2_judgment 用 `finding`（含 `entry_id === finding_id`）。在 schema 输出层派生，
不改底层 writer 校验逻辑。
- 替代：让 Agent 读 engine 源码找 `finding` 形式——正是 BUG-207 的根因，否决。

### D3 — reference 引号：文档化 + 错误点名，不改解析器接受集合

`accepted :warning:` 保持需要引号；`shared-reference-template.md` 把引号约束写成
显式规则，frontmatter parse 错误点名 key/value。不改 YAML 解析器去接受裸
`:warning:`（那会掩盖真实的 mapping 语法错误）。
- 替代（接受裸值）：放宽 YAML 语法处理，风险 > 收益，否决。

### D4 — depth-review 同步：反馈点名，不改自动推导

reference-floor-deficit 反馈先检查 depth-review 是否含已提交 supplementary work
unit；缺则点名该更新。保持 `reviewed_work_unit_refs` 是 Phase-owned 过程证据（可由
Agent 决定 review 范围），不自动并入所有 submitted rows。
- 替代（自动并入所有 submitted rows）：剥夺 Agent 的 review 选择权，且改变现行为
  面更大。否决。

### D5 — canonical 文件名：指引文档化 + inspect 每 candidate 发目标

`phase-wave1.md` §3.2.2 与 `shared-reference-template.md` 记录 locator 推导规则
（`{slug}-{host+path token}-{12-hex}`）；wave1 inspect 对每个未闭合 materializable
candidate 输出 exact canonical path + backing refs。复用既有 `canonicalWave1ReferencePath`，
不加第二 locator。

## Risks / Trade-offs

- **[反馈改动面广] →** 各 surface 改动独立、可单测；CHI-005 作为唯一横切义务，逐
  surface 落实现有错误路径。
- **[schema 显示与底层校验漂移] →** 由同一 writer 契约（CTS）生成显示，schema 输出
  单测锁住两种 source_identity forms。
- **[引号文档化仍可能被 Agent 忽略] →** 错误信息点名 + 模板显式规则双保险。
- **[depth-review 同步依赖 Agent 手动更新] →** 反馈点名 + rerun 同一 inspect 形成闭环；
  若持续遗漏可后续评估自动推导（独立 change）。

## Migration Plan

- apply 阶段按 tasks 顺序改 feedback/schema/guidance；不引入迁移期兼容层（这些
  契约无持久化格式变化）。
- rollback：单个 commit 可逆；各 surface 改动独立回退。

## Open Questions

无——均为已接受契约的可见性修正，无需要用户决定的新语义。
