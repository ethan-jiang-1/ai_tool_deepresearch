# Design: add-code-impl-registry-guard

## Context

- `check-all.mjs` 通过 `readdirSync` 自动发现同目录全部 `check-*.mjs`（`openspec/governance/check-all.mjs` L36-38），新 checker 文件零注册成本。
- 两个可直接镜像的同构先例：
  - `check-spec-req-ids.mjs`（83 行）：positional projectRoot、`> req:` 头逐 ID 校验、violation 输出 `relpath: <ID> not registered`、exit 0/1/2；
  - `check-project-reqs.mjs` L20：`BUG_ID_RE = /^BUG-\d+$/` 是既有 bug 命名空间排除先例；registry 用 `yaml` 包解析、registry 缺失时 exit 1 `Registry not found`（L321-324）是 fail-closed 先例。
- 「modify 既有 capability + delta 新 ID」的 apply 期机械行为已被 `2026-08-30-align-post-final-recovery-surfaces`（POF-006）验证：plan 模式检查**预期 exit 1 且恰报 `Unregistered IDs: RET-011`**，修复义务 = Apply 期把 ID 同步进 registry 与 main spec，然后 plan 转 exit 0（该 change tasks §1.1/§2.3 原文记录）。`requirement-reservation.yaml` 仅服务 New capability（`requirement-reservation-contract.mjs` L188：`pending = !prefix && !mainExists && allUnregistered`；对 live prefix + 既有 main spec 的 reservation 会判 `reservation_lifecycle_mixed`），故本 change **不创建** reservation 文件。
- 测量基线（2026-08-31）：三代码面合计 644 个 `.mjs`，跨面去重后 404 个唯一 requirement-ID token（各面内计数 255 / 16 / 404），对照 registry 675 条注册 ID，未解析仅 `BUG-018`（`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-serial.mjs` L2、`tests/` 中 1 处；`_fixed_bugs/` 有归属）。

## Goals / Non-Goals

**Goals:**

- 一个 focused checker：`openspec/governance/check-code-impl-ids.mjs`，扫三个代码面的 `@impl` 行，校验 requirement-ID token 解析到 registry。
- 确定性 red/green 契约测试（`tests/governance/code-impl-ids-guard.test.mjs`），含真实树 green 基线。
- delta requirement（RET-011）落地 main spec + registry 同步（Apply 期）。

**Non-Goals:**

- 不建 capability→file 投影目录、不建任何 ID 副本清单（GSK-011 姿态；checker 现场派生）。
- 不校验 `BUG-` token 的存在性或归属（超出 requirement identity 边界，归 `_backlog` bug 流程）。
- 不改任何既有 checker、不改 `check-all.mjs`（自动发现无需改）、不扫 MD/spec 头。
- 不为 checker 引入新依赖；registry 解析只用已批准的 `yaml`。

## Decisions

### D1 扫描面与行规则

覆盖面 = `DEEP_RESEARCH_HARNESS/`、`openspec/governance/`、`tests/` 三目录下递归全部 `*.mjs`（三者即今天携带 `@impl` 的全部 first-party 面：实测 133+11+500 文件；`scripts/` 0 个）。行规则 = 行内含 `@impl` 子串即视为 implementation-tag 行；仅行内 `[A-Z]{3}-\d{3}` token 参与校验（排除 `BUG-`）。理由：与 config.yaml 约定（「实现代码中用 `// @impl <REQ-ID>` 标注」）的字面形状一致；三面枚举显式列出（镜像 RET-010 显式枚举 prose 面的写法），新增 first-party 代码面时按 lifecycle 扩展本 requirement，而非 checker 私自扩面。`openspec/changes/`、bundle 路径、归档路径一律不在覆盖面。

**备选被拒**：扫全部 `.mjs` 的所有 ID token（含非 `@impl` 行）——会把注释散文、字符串、测试 fixture 文本全部卷入，假阳性不可控；CLS-080 C1 的教训是 prose 手写引用才是漂移源，`@impl` 行是约定明确的标注面，收窄到标注面是 shortest legal loop。

### D2 registry 解析与违例判定

registry 用 `yaml` 包 parse（同 `check-project-reqs.mjs`），registered 集合 = 匹配 `/^[A-Z]{3}-\d{3}$/` 的 key（`prefixes:` 映射块自然被过滤）。判定 = `registered.has(id)`：`[DEPRECATED]` 条目仍在 registry（「只增不删」规则），代码历史标注引用 deprecated ID 视为可解析（镜像 RET-010 deprecated scenario），但不授予 live authority。registry 文件缺失 → exit 1 fail-closed（不做 vacuous pass；镜像 `check-project-reqs.mjs`）。覆盖面目录不存在 → 跳过该面（isolated-fixture tolerance，测试用 tmpdir fixture 只建必要子树）。

### D3 CLI 形状与输出契约

`node openspec/governance/check-code-impl-ids.mjs [projectRoot]`：≤1 个 positional（多于此 exit 2，同 `check-spec-req-ids.mjs`）。violation → stderr `check-code-impl-ids: N violation(s):` + 每条 `  <repo-relative-path>: <ID> not registered in req-registry.yaml (register via lifecycle or correct the @impl tag)`，exit 1；clean → stdout `check-code-impl-ids: clean (S files, K @impl lines, M tokens validated).`，exit 0。输出即修复坐标（file + token + 二选一修复方向），不含语义建议——semantic repair 归 Agent。

### D4 测试 fixture 的自扫描转义约束（关键）

checker 在真实树上的 green 基线测试会把测试源文件自身纳入扫描。因此 `tests/governance/code-impl-ids-guard.test.mjs` 源码**不得出现字面 `@impl <未注册ID>` 序列**（否则真实树 green 用例自红）。fixture 内容一律用字符串拼接构造 tag 行（如 `'@imp' + 'l ' + 'ZZZ-999'`），并在测试文件头部注释声明该转义约定。此约束同时保证未来维护者新增用例时不会无意引入自违例。

### D5 与聚合入口的接线

零接线改动：文件名遵循 `check-*.mjs` 命名即被 `check-all.mjs` 自动发现。测试用 spawn `check-all.mjs` 并断言输出含本 checker 的 PASS 行，锁定「聚合入口确实跑到它」这一端到端事实，防止未来 check-all 改动静默丢面。

### 数据结构 / 状态机说明

- 无新持久化数据结构，无 schema 变更：checker 的全部输入是既有 registry（YAML mapping）与代码文件行；不引入 Zod schema（无跨字段约束可校验；两个同构先例 checker 均无 schema）。若未来需要校验 registry 形状，归 `check-project-reqs.mjs` 的既有职责，不在本 checker 重复。
- 无状态机：单遍读扫 + 集合判定，无隐藏 transition。

### Constitutional triad 记录（按 design rules 顺序）

1. **Abstraction as Semantic Precision**：新覆盖面的有界问题、保留区别与停止点已在 proposal「Semantic-Precision Reflection」给出；不发明新术语，复用 `@impl` 标注 / governance check / aggregated governance health entry 既有词汇。
2. **Simple Reliable Control**：direct Source of Record 是既有 registry；最短闭环是 violation → 修复 → rerun 同一 check；net simplification = 用 1 个派生 checker 关闭 1 条无防护漂移路径，不新增目录/流程/依赖（对照：被拒绝的「派生投影表」方案会新增永久 reader-facing view，违反本方向，已在 proposal 排除）。
3. **Helper-Oriented Agent**：确定性 verdict（token 是否解析）归 checker；修复语义（改正 tag vs 走 lifecycle 注册）归 Agent；本 change 不新增 user decision 点，不创造 permission。

## Risks / Trade-offs

- **假阳性把合法历史标注判红**：deprecated ID 判定为可解析（D2）缓解；若未来出现「registry 删除旧 ID」的需求，会与本「只增不删」规则冲突——那是 registry 自身规则的既有约束，本 checker 不新增该风险。
- **`@impl` 行内非 ID 文本误提取**：仅提取 `[A-Z]{3}-\d{3}` 形状 token 且排除 `BUG-`；实测全仓 675 token 仅 1 个 bug token，形状碰撞率可忽略；即使出现，修复路径明确（改注释写法或注册）。
- **测试转义约束被未来维护者破坏**：D4 以测试文件头部注释 + 真实树 green 用例双保险；违反时真实树用例立即红，反馈闭环最短。
- **check-all spawn 测试的耗时**：聚合入口已在 finalizer 与 `npm run governance:check` 常规运行，耗时预算与既有 governance 测试同级；若未来聚合入口显著变慢，属 check-all 自身议题，不在本 change 范围。

## Open Questions

（无。D1-D5 均有测量或先例证据支撑；无待用户裁决的语义分叉。）
