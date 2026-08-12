# C3: Drop Legacy Bundle-Entry Compatibility

> 候选 change：`drop-legacy-bundle-entry-compatibility`
>
> 状态：discovery complete; one user-visible inspection policy decision pending
>
> 风险：L3

## 要解决什么

当前 bundle entry 实际支持多个成功路径：`BUNDLE_ENTRY.md`、legacy `RUN_BUNDLE.md`、`BUNDLE_MAP.md`，以及 diagnostic `START_FROM_HERE.md` fallback。这个兼容矩阵出现在 Harness README/RUN/AGENTS/CLAUDE/COMMANDS、continue playbook、CLI 与 tests 中。它让 Agent 必须在每次 reentry 时记住历史 precedence。

## 已验证事实

| Surface | Current behavior |
|---|---|
| Agent guidance | 明确写 `BUNDLE_ENTRY.md -> RUN_BUNDLE.md -> BUNDLE_MAP.md`，并接受 `START_FROM_HERE.md` deprecated fallback |
| `continue-run-bundle.md` | 依此顺序读取；旧 entry 仍可启动后续操作 |
| `inspect-bundle.mjs` | old-only `RUN_BUNDLE.md`、map-only、`START_FROM_HERE.md` map-only 都可通过 structure check，并只输出 compatibility diagnostics |
| `check-reentry.mjs` | 为 `START_FROM_HERE.md` 给 deprecated compatibility advice |
| Tests | 正向断言 legacy RUN_BUNDLE 与 START_FROM_HERE 行为 |
| New writer | 新 bundle 不生成 `RUN_BUNDLE.md` 或 `START_FROM_HERE.md` |

## 目标 contract

```text
selected explicit bundle directory
          |
          +-- BUNDLE_ENTRY.md + BUNDLE_MAP.md --------> current Engine/guidance path
          |
          +-- old-only entry --------------------------> explicit unsupported-current-contract result
```

人工打开历史文件仍允许；“人能读 Markdown”不等于 `continue`、`inspect` 或 Engine 继续把它当 current run bundle。

`BUNDLE_MAP.md` 是 passive navigation map，不是 operation entry。它不能在
`BUNDLE_ENTRY.md` 缺失时悄悄变成第二条 continue/inspect success path。

## 影响面

| 层 | 可能改动 |
|---|---|
| Root/Harness instructions | `AGENTS.md`、Harness README/AGENTS/CLAUDE/COMMANDS/RUN |
| Playbook | `command_playbook/continue-run-bundle.md`、`start-research.md` |
| CLI | `check-reentry.mjs`、`inspect-bundle.mjs`，以及任何 entry resolver |
| Specs | `bundle/run-entry`、`bundle/bundle-map`、`runtime-reentry-debuggability`、`file-observability`、legacy BUS disposition |
| Tests | entry-contract、continue playbook, inspect/reentry, instantiation, gate-instantiation tests |

## 风险与不可碰项

- `BUNDLE_MAP.md` 当前是 passive map，不等同于 operation entry；proposal 必须说清 `BUNDLE_ENTRY.md` 缺失时究竟是拒绝还是 map-only inspection，而不能隐式把 map 再变成成功入口。
- `START_FROM_HERE.md` 当前更像 diagnostic evidence。删除 advice 后，reentry failure 要仍能解释缺少哪个 current artifact。
- root `AGENTS.md` 的 Deep Research routing 是 repo-level instruction；其变更需要特别小心，不能让普通 research 路由失效。

## 唯一未决 policy

对 only `RUN_BUNDLE.md`、only `START_FROM_HERE.md` 或 only `BUNDLE_MAP.md`
的旧目录，`inspect-bundle` 应该怎样处理？

| Choice | 结果 | 风险 |
|---|---|---|
| A. current-only reject（推荐） | `inspect` 与 `continue` 都非零，给出统一 structured unsupported-current-contract diagnostic；人仍可直接读 Markdown | 清晰、无第二入口；会改变历史目录的 CLI inspection 结果 |
| B. human-only inspect | `continue` 拒绝，但另设非 Engine 的文本 inspection mode | 容易又把 map-only 误解成可运行 entry；需要额外命令/边界 |

推荐 A。它符合“当前 Engine 不执行、不升级、不迁移历史 bundle”，也不需要
发明一个延续旧 contract 的专用观察模式。

## Proposal 前的 Go / No-go

- [x] 唯一 entry predicate 已调查：`BUNDLE_ENTRY.md` + `BUNDLE_MAP.md`；map 是 navigation artifact，不是 entry。
- [ ] 选择并复用一个现有 error taxonomy；不要在 continue、inspect、reentry 各造不同的“legacy”成功/失败语义。
- [x] fixture matrix 已调查：current complete、only `RUN_BUNDLE.md`、only `START_FROM_HERE.md`、only `BUNDLE_MAP.md` 当前都触及 compatibility path；proposal 要将后三者转为明确边界测试。
- [ ] 用户选择 A 或 B；这是 user-visible contract decision。
- [ ] 将 `bundle-start-from-here` tombstone spec 的删除/迁移与真实 behavior 同一步 sync，避免 catalog/spec/runtime 分叉。

## 验证

```bash
node --test tests/integration/deep-research-harness-entry-contract.test.mjs
node --test tests/integration/cli/inspect-bundle.test.mjs tests/integration/cli/check-reentry.test.mjs
node --test tests/integration/md/continue-run-bundle-contract.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

## 何时算完成

- [ ] New and continued current bundles use one documented entry topology.
- [ ] legacy-only bundle cannot enter a positive Engine/continue path.
- [ ] one clear rejection diagnostic replaces all legacy fallback advice.
- [ ] current docs/tests no longer demonstrate legacy entry as a success case.
