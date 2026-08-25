## Why

用户（仓库 owner）明确决策：**维护 `AGENTS.md` / `CLAUDE.md` 两套文件太头疼，`CLAUDE.md` 只要做成指向 `AGENTS.md` 的 symlink 即可**——每入口目录一个真实文件，改规则只改一份。这与 DSH「borrowing-harness-idea」`09-agents-entry-chain.md` 的 symlink 方案一致（一个事实一个 home，不产生第二份事实）。

现有 `agent/agent-context-routing`（ACR-002 / ACR-004）要求 root 与 Harness 的 `AGENTS.md`/`CLAUDE.md`「两份文件保留 tool-specific identity、正文 byte-identical modulo title lines、由 guard test 强制」。用户的决策改变了这一 accepted behavior：从「两份 + byte-sync guard」改为「一份真实文件 + symlink + 形态检查」。这是 owner 对 tool-identity 取舍的明确决定，经本 change 走 OpenSpec 生命周期落地。

## What Changes

- 根与 `DEEP_RESEARCH_HARNESS/` 两处：`CLAUDE.md` 改为指向同目录 `AGENTS.md` 的 symlink；`AGENTS.md` 第三行 host 名中性化（root: "Coding-agent notes for this repo"；Harness: "Coding agent 读到本文件时…"），使单一文件对两个 host 都成立；Harness `AGENTS.md` 末尾「两份一起改」注改为「`CLAUDE.md` 是 symlink」说明。**BREAKING**（入口文件物理形态：两份 → 一份 + symlink）。
- Modify ACR-002 / ACR-004：从「两份 byte-identical modulo title lines + guard 强制 pair」改为「每入口目录 `AGENTS.md` 是唯一真实文件，`CLAUDE.md` 是解析到它的 symlink，由确定性检查强制形态」。
- 更新 `tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs`：从「两份 body byte-identical」改为「`CLAUDE.md` 是 symlink 解析到同目录 `AGENTS.md`」（shape 断言，保留负例：副本 → fail）。
- 新增 `openspec/governance/check-entry-chain.mjs`（`check-all.mjs` 自动聚合）：强制两处入口目录的 `CLAUDE.md` 为 symlink 且解析到同目录 `AGENTS.md`、`AGENTS.md` 为常规文件。
- **不产出**：不改 `DEEP_RESEARCH_HARNESS/` 运行时/schema/CLI、不加依赖、不动 `.agents/.claude/.codex/skills`。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `agent/agent-context-routing`：ACR-002「Agent-facing entry routes require the project glossary」与 ACR-004「Context routing remains regression-protected」从「两份文件 byte-identical modulo title lines」改为「单一真实 `AGENTS.md` + `CLAUDE.md` symlink + 形态检查」。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md`（ACR-002 第 98–130 行「byte-identical modulo tool-specific title lines…guard test enforce the pair」；ACR-004 第 220–241 行「pairs are each byte-identical modulo title lines」；两个 pair scenario） | Modify | 用户决策把入口文件的「两份 byte-identical + guard」改为「单一文件 + symlink + 形态检查」，这是 ACR 的 observable 行为变化。 |
| `governance/guidance-constitution` | `openspec/specs/governance/guidance-constitution/spec.md`（GCO-008「Root hard-rule surfaces stay synchronized」scenario：root README/AGENTS/CLAUDE 三 surface 在 hard-rule key facts 上同步） | Verify-only | symlink 后 `CLAUDE.md` 读到的就是 `AGENTS.md`，三 surface 同步自动成立；该 scenario 语义不变，`check-entry-chain` 只补「symlink 被替换为副本」的拦截。 |

## Impact

- 目标 surface：根 `CLAUDE.md`（symlink）、`DEEP_RESEARCH_HARNESS/CLAUDE.md`（symlink）、两处 `AGENTS.md` 第三行 + Harness 末尾注、`openspec/specs/agent/agent-context-routing/spec.md`（ACR-002/ACR-004 sync）、`tests/integration/md/agent-behavior-file-pair-sync-guard.test.mjs`（更新）、`openspec/governance/check-entry-chain.mjs`（新增）。
- 无 runtime code、schema、CLI 行为、依赖、外部 API、runtime bundle 变化。

## Direct Source of Record 与 net simplification

- 唯一事实源：入口目录的 standing orders 归 `AGENTS.md` 一份；`CLAUDE.md` 是 symlink（无第二份事实）；symlink 形态的确定性事实由 `check-entry-chain.mjs` 拥有（`check-all.mjs` 聚合）。
- 最短合法闭环：入口文件被改/被替换 → `npm run governance:check`（check-entry-chain）当场 exit non-zero → 修复指向 `AGENTS.md`（改 owning 文件，而非删检查）。
- net simplification：删除两处各一份逐字节副本（约 6.8KB + 4.1KB 重复事实），新增一个约几十行的 checker；「改规则改两份」的摩擦与「两份一起改」的人肉义务一并消除。

## Semantic-precision reflection（reader-facing 变化：入口文件从两份变一份 + symlink）

- **读者/有界问题**：Coding Agent 进入仓库或 Harness 时，读到的入口规则是否单一、权威、不漂移。
- **必须保留的区别**：`AGENTS.md`（唯一真实文件、host-neutral 引导）与 `CLAUDE.md`（symlink、无独立内容）；「改规则只改 `AGENTS.md`」与「两份各自维护」不再并存。
- **正常推理停止点**：`AGENTS.md` 是唯一 home；`check-entry-chain` 对「symlink 被替换为副本」给出确定性 fail；host 名不再是规则内容的一部分。

## 责任边界

- **User decision**：已由用户明确做出（symlink 化、接受 tool-identity 变化），本 proposal 声明为 BREAKING。
- **Agent execution**：symlink 化、中性化文案、更新 guard test、写 checker（ordinary authorized mechanical work）。
- **Engine verdict**：`check-entry-chain.mjs` 对「`CLAUDE.md` 是否为 symlink 解析到 `AGENTS.md`」给出确定性 pass/fail；它不判断入口规则「写得好不好」（语义仍归 review）。
