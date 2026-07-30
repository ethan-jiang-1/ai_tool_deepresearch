# 05 — 后续 OpenSpec change 的 provisional 形状（草稿，非 change）

> 这只是**草稿**，不是 OpenSpec change。真正创建须经 `/opsx:propose`，按 propose→explore→apply→archive
> 走。本文件给那个 propose 提供起手素材。
>
> **已被 `08` 取代为最终 change sketch。** 本文件只保留较早的 narrow hard-floor 方案。它遗漏了
> OpenSpec 1.7 `operations.apply/archive.guidance`、多 harness adapter 漂移、semantic finding→tasks
> 回路，以及“prompt step + 裸 `mv`”无法做真实 deterministic_e2e 的问题。不要按本文件单独 propose。

## 候选 change id

`enforce-governance-gates-at-archive`

最终候选改为 `establish-openspec-change-feedback-loop`（见 `08`）；本 ID 只代表其中的 hard-floor 子集。

## 一句话目标

让 propose→explore→apply→archive 链在 archive 的 `mv` 之前**无条件**跑三个现有 governance checker，
非零即 stop——把“靠人记得跑”变成“不可逆接缝上的确定性发生”。

## 可能触碰的 capability（须 propose 时确认）

- **`requirement-traceability`（RET）**——强候选：`RET-006` 本就写“Check script compliance as **hard
  gate for archive**”。这个 change 是把那条 requirement 从“声明”变成“真实在 archive skill 里 enforce”。
- **`verification-routing`（VER）**——`config.yaml:104-107` 已声明“apply tasks SHALL run
  `check-verification-routing.mjs --mode assets` before archive”，但只是 task 文本。本 change 把它抬到
  archive skill 的无条件 gate。
- **可能新增一条窄 requirement** 描述 archive skill 的 unconditional pre-`mv` gate 行为。
- **`guidance-constitution` / GCO-007 / GCO-003`：不触碰。**（这是与 Tier-B 的关键区别——本 change 不打宪法战。）

> **TBD（propose 时第一件要确认的事）**：哪个 capability “owns” archive lifecycle 行为？registry 里没有
> 显式的 "openspec-workflow/archive" capability；archive skill 是 `.claude/` artifact，不被某个 capability
> spec 直接 govern。propose 时 `grep -rl "opsx:archive\|/archive" openspec/specs/` 确认归属，或决定新增一条
> 窄 capability。不要假设。

## 主要 apply 编辑（仅草图）

1. ~~在多个 `.claude` Markdown adapter 中复制 gate~~。最终方案改为 `openspec/governance/`
   finalizer 拥有 project preconditions 并包装 native OpenSpec archive；adapter 只保留受测试保护的薄调用。
2. 用 OpenSpec 1.7 `operations.archive.guidance` 做 primary dynamic injection，并用
   `AGENTS.md` / `CLAUDE.md` 相同短 block 做跨 harness fallback/router。
3. delta spec：在 `requirement-traceability` 和/或 `verification-routing` 下加/改 requirement，把
   “archive 前 governance check 必须 PASS 且无条件”写成可追溯的 `> req:`。
4. 不改三个 checker 脚本的逻辑。
5. tasks.md 保留 `config.yaml:197-204` 注入的两条收尾 task（它们现在是 early 反馈层），并新增一条
   “验证 archive gate 在 skipped-sync 路径上也触发”的 task。

## 验证（verification-plan.yaml 草图，四 test class）

- `unit`：直接测 finalizer 的 change-root/path/check-result 组合；不再模拟 prompt 文本。
- `integration`：跑三个 checker 对一个构造的违规 change，确认各自非零退出。
- `deterministic_e2e`：构造一个 active change → 故意留 pending task 或 checker failure → 调 finalizer →
  断言目录不移动；全通过时才移动。另以 integration 真实调用
  `openspec instructions apply/archive --json`，证明 operation guidance 被注入。
- `agent_flow_e2e`：**不需要**。这是确定性 lifecycle 行为，不是 Agent/host 能力；按 verification-routing
  纪律，不要为它伪造 agent_flow 证据。

## 自应用

最终 change 自己归档时，必须经它引入的 finalizer——这是第一次真实端到端 dogfood。prompt 中声称
“已运行”不算；native OpenSpec archive 必须由 production finalizer 实际调用。

## 明确不做（防 scope creep）

- 不引入 `semantic_objects[]` / 对象卡机器检查（Tier-B，被 GCO-007 禁）。
- 不引入派生消费边界检查（Tier-A，条件性 Phase-2）。
- 本早期 hard-floor 草图不改 `config.yaml.rules.tasks` 文本结构；最终 `08` 已根据历史接入证据修正为：
  用该 proven seam 生成带稳定 marker 的 plan/closeout review tasks。
- 不加 `.claude/settings.json` SessionStart hook（S7：不可移植、误报疲劳）。
- 不碰 git hook / CI（超出本轮；若日后要更强再议）。

## 与 C2–C5 的排程建议

原建议是作为 C0/meta 前件先行；该草稿形成时 C2 已进入 apply，且最终机制范围已扩大。实际排程以 `08` 的
`establish-openspec-change-feedback-loop` proposal 为准，不再声称 C2 必然能在自己的 archive 前吃到尚未实现的 gate。
