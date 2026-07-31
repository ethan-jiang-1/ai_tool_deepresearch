# Evidence A — OpenSpec session 生命周期与挂载点

> 来源：Explore agent 对 repo 的只读勘察；2026-07-30 按 OpenSpec 1.7.0 当前安装与 repo surfaces
> 再核实并纠正。结论性事实，非推测。

## 多个潜在入口（版本并不完全一致）

- **Slash commands**：`.claude/commands/opsx/{propose,explore,apply,archive,sync,update}.md`，每个
  `allowed-tools: Bash(openspec:*)`——只能调 `openspec` CLI。
- **Skills**：`.claude/skills/openspec-*/SKILL.md`（六个），与 command 近乎同体（command 119 行 vs skill
  123 行，skill 多一个 YAML metadata）。`/opsx:*` command 解析到 skill。行为上 command≈skill。
- **Codex surfaces**：`.codex/skills/openspec-*` 是 1.7 形状，与 `.claude/skills` 仅有调用语法差异；
  `.codex/prompts/opsx-*` 仍是较旧形状。
- **通用 agent surfaces**：`.agents/skills/openspec-*` / `source-command-opsx-*` 仍有 1.3-era 副本，
  apply/archive 没有 `operationGuidance` 处理。它们是否由具体 harness 选中取决于 skill discovery，不能
  假设只有 `.claude` 一条路径。
- **`openspec` CLI**（`/Users/bowhead/.nvm/.../bin/openspec`）：`new change`、`status --json`、
  `instructions <id> --change … --json`、`list --json`、`store list --json`、`validate`、`archive`。
  注意：**archive skill 不 shell out 到 `openspec archive`**，它自己 `mv`（`archive.md:142`）。

OpenSpec 官方 README 明确要求用 `openspec update` 重新生成 agent instructions。因此这些生成 adapter
不能承载 repo-specific guardrail 的完整单一真相。

## 各 phase 做什么

| Phase | 读 | 写 | 校验 |
|---|---|---|---|
| propose | `openspec status`、`instructions <id>` | `proposal.md`、`specs/<cap>/spec.md`(delta)、`design.md`、`tasks.md` | 仅 file-existence（`status`）。**无语义/node 检查** |
| explore | `openspec list`、`config.yaml` | “MAY create artifacts”——只捕获思考 | 无 |
| apply | `status`、`instructions apply`、contextFiles；1.7 flow 还读取可选 `context` / `operationGuidance` | 代码编辑 + 翻转 `tasks.md` 的 `- [ ]`→`- [x]` | 当前 config 无 operation guidance；完成仍只“suggest archive”，无自动 checker |
| archive | 1.7 flow 先读 `instructions archive` 的可选 `context` / `operationGuidance`，再读 status、tasks、delta-vs-main | 可选 inline sync，然后 raw `mv` | artifact/task 只 warning；**无 governance check、无 strict validate、无 npm test** |

## `openspec/config.yaml`

- `:1` `schema: spec-driven`。当前主体是一个大 `context:` 块 + `rules:` 块。
- OpenSpec 1.7 project-config schema 原生支持 `operations.apply.guidance` 与
  `operations.archive.guidance`。CLI 会把它们动态返回为 `operationGuidance`；**当前 config 尚未声明
  `operations:`**。
- operation guidance 是自动 prompt injection，不是 hook/command execution；它不能自己运行 checker。
- `rules.tasks`（`:197-204`）：把两个 checker 注入 tasks.md（见 `01`）。
- `:104-107`：verification routing 是“repo lifecycle discipline, **not an OpenSpec-native artifact gate**”。

历史统计说明这两个 config surface 强度不同（完整证据见 `E`）：accepted verification-routing 之后创建并
归档的 34 个 committed change 中，34/34 都收到两个 project-check task；只有 8/34 落下
`verification-plan.yaml`。因此 `rules.tasks` 是已证明的 artifact-generation push seam；宽泛 `context:`
中的 custom-artifact 要求不是。

## change 产物 & 出现时机

active `make-canonical-topic-state-projections-coherent/` 当前已有完整 planning artifacts、
`verification-plan.yaml` 和 26 个 tasks，处于 apply 中。本轮先后观察到 17/26 与 22/26，说明进度是易变
runtime snapshot；proposal 必须重新读取 `openspec list --json`。早期“mid-propose、尚无 tasks/plan”的
快照已过期。

archived（如 `2026-07-30-converge-artifact-contract-evaluators/`）：上述 + `tasks.md` +
`verification-plan.yaml`（schema `verification-routing/v1`）+ `apply-target-manifest.md`（apply 期写，
声明 added/modified/removed control surface）+ 可选 `apply-evidence.md`。

`verification-plan.yaml` 形态：`schema_version`、`change`、`test_classes{}`、`claims[]`（每项
`id/statement/test_class/proof_subject/asset{kind,path}/execution_profile/verdict_authority`），
由 `verification-routing-contract.mjs` Zod-parse。

## 自动触发能力（区分 prompt push 与 executable check）

- **无 `Makefile`**（repo 外无）。
- **无 pre-commit / git hook**（`.git/hooks/` 仅 `*.sample`）。
- **无 `hooks` 块**（无 `.claude/settings.json`；`settings.local.json` 仅权限 allowlist）。
- **无 `npm test`/`node --test`** 在任何 command/skill 内。
- `package.json:7` `test` 跑 governance checker 测试，但用的是 **synthetic temp fixture**
  （`tests/integration/governance/check-project.test.mjs:11-24` 起 `mkdtempSync`），**不碰真实 specs/active change**，
  且 session 生命周期里无自动 `npm test`。
- governance obligation 今天通过 `config.yaml` rules → tasks.md 的送达很可靠；checker 的实际执行仍由
  apply Agent 发起，archive 不复核。committed history 中已有带未完成 governance task 的归档实例。
- **已有但未使用的自动 prompt push**：OpenSpec 1.7 `operations.apply/archive.guidance`。它适合触发
  semantic review / 调用 repo command，但自身不构成 machine gate。

## 挂载点排序（“不需人记得”程度）

1. **`config.yaml` artifact rules + `operations.apply/archive.guidance`**：跨 current 1.7 Claude/Codex
   skills 的原生事件 push；适合 advisory feedback，但不能独立 hard-stop。
2. **`openspec/governance/` finalizer 包装 native archive**：真正消除“忘跑 checker”的 deterministic seam；
   Agent sync/re-compare 与 project preconditions 通过后，才调用 OpenSpec 自己拥有的
   validation/collision/move；由 operation guidance 和 root instructions 路由，见 `08`。
3. **`AGENTS.md` / `CLAUDE.md` 相同短 block**：跨 session/bootstrap fallback；不承载完整 checklist。
4. **SessionStart/Claude hook**：能自动执行但 Claude-only、每 session 噪声大；仍不推荐。
5. **package/pre-commit/CI**：只在出现绕过证据后作为更强外层，不是第一版主 loop。

## 现存的 transition 能力与缺口

当前 1.7 `.claude` / `.codex` archive flow 在选中 sync 后会重新比对 delta/main，不一致拒绝 raw `mv`；
skip-sync 路径仍绕过。另一个更深但未被 skill 使用的 surface 是原生 `openspec archive`：它自己执行 delta
apply、rebuilt-spec validation、collision 和 move，并可返回 JSON；但它在 collision/move 前写 specs，且无
side-effect-free dry-run。无提示 spec update 又需要 `--yes`，而 `--yes` 同时会放行 incomplete tasks。`08`
因此让 repo finalizer 在 Agent sync/re-compare 与 marker/tasks/project governance 闭合后调用
`openspec archive --json --skip-specs`，不再手写 move，也不引入写后回滚。
