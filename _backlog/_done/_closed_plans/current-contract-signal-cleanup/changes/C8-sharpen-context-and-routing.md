# C8: Sharpen Context and Routing

> Archived change：`2026-08-15-align-current-guidance-contract-guards`
>
> Completed execution batch: dashboard item 19
>
> 状态：governed-archived and committed (`9030fa785`)
>
> 风险：L2-L3

## 要解决什么

`CONTEXT.md` 目前只有 74 行，且已有明确非权威边界。它不是主要噪声源；真正风险是它以及 root/Harness instructions 被 tests 固定成特定句子、链接和顺序，导致每次当前 contract 演进都要保持历史措辞。C7 已完成 pure-retired spec/catalog 清理；C8 现在只处理仍然存在的 current routing/doc guards 与 fixture profile 事实，并且必须先逐项分类，再压缩为最少的术语和 authority pointers。

## 已验证事实

| Surface | 当前价值 | 风险 |
|---|---|---|
| root `CONTEXT.md` | 清楚区分 Agent / Markdown / Engine / run bundle / Source of Record | 删太多会让 Agent 混淆 authority boundary |
| root `AGENTS.md` | 给出 Charter-first、OpenSpec phase gate、Deep Research routing | 改错会突破治理或路由错误 |
| Harness `AGENTS.md`/`CLAUDE.md`/README/RUN/COMMANDS | 当前含 legacy bundle-entry guidance | C3 后应同步，不能单独先改成与 CLI 不符 |
| Markdown tests | 多处匹配 literal link/wording/order | 容易把文案当行为 contract |
| work-unit guidance fixtures | 2 个 fixture 在 C6 complete-current profile 后无法创建 envelope | 必须补最小 current profile facts；不能把 fixture failure 当作 wording-only 问题 |

## 目标 contract

| Document family | 应回答 | 不应承担 |
|---|---|---|
| `CONTEXT.md` | 最小术语和 owner distinction | capability behavior、完整操作步骤、当前 runtime facts |
| root `AGENTS.md` | repo safety、phase gate、何时去哪里找 authoritative owner | 冗长 glossary 或 legacy compatibility matrix |
| Harness entry docs | current entry/routing | 多代入口 fallback 教程 |
| tests | authority/routing behavior | 某个具体同义词、段落顺序或链接显示文本 |

## 影响面

`CONTEXT.md`、root `AGENTS.md`、Harness entry documents/command playbooks、Markdown contract tests、accepted guidance-constitution / routing specs；必要时 `writing-for-agents` 的写作准则。

## 风险与 Go / No-go

- 不把 `CONTEXT.md` 误删成无用 slogan。每条保留/删除都问：去掉后 Agent 会把哪两个 current concepts 混淆？
- 不改变 Deep Research selected-bundle routing 的硬 gate，直到 C3 的 behavior 已 archive。
- 不把 ADR 设为普遍必读；继续按需读取。
- [x] Dashboard items 09-18 已 archive；重新枚举 docs 中实际的 current owner links，定位只指向 retired/currently removed surfaces 的链接。
- [x] Merge gate 复核失败：C7 仅退役 accepted-spec/registry identity；C8 会影响 current docs/tests，并含 profile fixture risk，必须独立 lifecycle。C7 已于 2026-08-15 archived，不能借其 scope 删除或弱化 C8 guards。
- [x] 每个拟改 Markdown test 已分类为 behavior/routing/wording-only。
- [x] 已确定 `work-unit-direct-output-guidance` 与 `work-unit-receipt-guidance` fixture 所需的最小 complete-current actor profile；未改变 Engine profile requirement。
- [x] 已按 agent task 的真实读取路径完成 reviewer walkthrough：Charter -> Context -> task owner，而不只是运行 regex。

## Verification

```bash
node --test tests/integration/md/canonical-harness-vocabulary-contract.test.mjs
node --test tests/integration/md/dpt-research-entry-routing-contract.test.mjs
node --test tests/integration/md/continue-run-bundle-contract.test.mjs
node openspec/governance/check-project-specs.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

实际文件集合以 C3/C7 的 archive 状态为准；不保留已经删除 legacy path 的旧 test 名称只为让测试列表看起来稳定。

## 何时算完成

- [x] `CONTEXT.md` 仍让新 Agent 分清 authority 与 runtime boundary，但不复制 specs/playbooks。
- [x] all current routing docs only name current success routes.
- [x] remaining literal Markdown assertions protect a meaningful routing/authority fact.
- [x] no doc becomes a shadow behavior spec.
