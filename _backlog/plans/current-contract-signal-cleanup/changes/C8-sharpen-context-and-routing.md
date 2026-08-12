# C8: Sharpen Context and Routing

> 候选 change：`sharpen-context-and-routing`
>
> 状态：deferred until C7
>
> 风险：L1-L2

## 要解决什么

`CONTEXT.md` 目前只有 74 行，且已有明确非权威边界。它不是主要噪声源；真正风险是它以及 root/Harness instructions 被 tests 固定成特定句子、链接和顺序，导致每次当前 contract 演进都要保持历史措辞。应在 runtime/spec 清理完成后，压缩为最少的术语和 authority pointers。

## 已验证事实

| Surface | 当前价值 | 风险 |
|---|---|---|
| root `CONTEXT.md` | 清楚区分 Agent / Markdown / Engine / run bundle / Source of Record | 删太多会让 Agent 混淆 authority boundary |
| root `AGENTS.md` | 给出 Charter-first、OpenSpec phase gate、Deep Research routing | 改错会突破治理或路由错误 |
| Harness `AGENTS.md`/`CLAUDE.md`/README/RUN/COMMANDS | 当前含 legacy bundle-entry guidance | C3 后应同步，不能单独先改成与 CLI 不符 |
| Markdown tests | 多处匹配 literal link/wording/order | 容易把文案当行为 contract |

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
- [ ] C7 后重新枚举 docs 中实际的 current owner links，删掉只指向 retired/currently removed surfaces 的链接。
- [ ] 每个拟改 Markdown test 先分类为 behavior/routing/wording-only。
- [ ] 以 agent task 的真实读取路径进行 reviewer walkthrough：Charter -> Context -> task owner，而不只是运行 regex。

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

- [ ] `CONTEXT.md` 仍能让新 Agent 分清 authority 与 runtime boundary，但不复制 specs/playbooks。
- [ ] all current routing docs only name current success routes.
- [ ] remaining literal Markdown assertions protect a meaningful routing/authority fact.
- [ ] no doc becomes a shadow behavior spec.
