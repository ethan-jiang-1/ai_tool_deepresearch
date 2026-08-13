# C3: Drop Legacy Bundle-Entry Compatibility

> 候选 change：`drop-legacy-bundle-entry-compatibility`
>
> 状态：audit coverage closed; current-only reject policy confirmed; rejection-owner design enters proposal planning
>
> 风险：L3

## 要解决什么

当前 bundle entry 实际支持多个成功路径：`BUNDLE_ENTRY.md`、legacy `RUN_BUNDLE.md`、map-only `BUNDLE_MAP.md`，以及 diagnostic `START_FROM_HERE.md` fallback。这个兼容矩阵出现在 Harness README/RUN/AGENTS/CLAUDE/COMMANDS、continue playbook、CLI 与 tests 中。它让 Agent 必须在每次 reentry 时记住历史 precedence。

## 已验证事实

| Surface | Current behavior |
|---|---|
| Agent guidance | 明确写 `BUNDLE_ENTRY.md -> RUN_BUNDLE.md -> BUNDLE_MAP.md`，并接受 `START_FROM_HERE.md` deprecated fallback |
| `continue-run-bundle.md` | 依此顺序读取；旧 entry 仍可启动后续操作 |
| `inspect-bundle.mjs` | old-only `RUN_BUNDLE.md`、map-only、`START_FROM_HERE.md` map-only 都可通过 structure check，并只输出 compatibility diagnostics |
| `check-reentry.mjs` | 为 `START_FROM_HERE.md` 给 deprecated compatibility advice |
| Tests | 正向断言 legacy RUN_BUNDLE 与 START_FROM_HERE 行为 |
| New writer | 新 bundle 不生成 `RUN_BUNDLE.md` 或 `START_FROM_HERE.md` |

## Producer -> Reader -> Consequence Closure

| Shape / fact | Producer or owner | Current reader / positive consequence | Classification |
|---|---|---|---|
| `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` | `instantiate-run-bundle.mjs` writes both; `BUNDLE_ENTRY.md.tmpl` delegates to the map and `COMMANDS.md` | entry template, current routing, fresh-bundle tests, and file observability | protected current semantic: retain both files and their distinct roles |
| `BUNDLE_MAP.md` | current template and instantiation gate definition | gate requires the map for a new bundle; map provides layout/reentry pointers only | protected current semantic: it is a passive map, never a second operation entry |
| `RUN_BUNDLE.md` without `BUNDLE_ENTRY.md` | no current writer | `continue-run-bundle.md` selects it and proceeds to `COMMANDS.md`; `inspect-bundle.mjs` exits 0; file observability calls it `expected`; tests assert its success | bounded cleanup candidate: legacy positive entry path |
| `BUNDLE_MAP.md` without `BUNDLE_ENTRY.md` / `RUN_BUNDLE.md` | can occur in historic bundles; no current writer emits this incomplete entry shape | continuation guidance falls through to it and proceeds; `inspect-bundle.mjs` exits 0 and calls it passive navigation; entry-contract tests assert success | bounded cleanup candidate: map-only positive entry/inspection path despite the map's passive role |
| `START_FROM_HERE.md` without `BUNDLE_MAP.md` | no current writer | `inspect-bundle.mjs` exits 0; `check-reentry.mjs` and file observability advise migration; tests assert the non-failing legacy behavior | bounded cleanup candidate: old map compatibility; preserve only an honest rejection explanation if policy removes it |
| `BUNDLE_ENTRY.md` requirement enforcement | no single current reader owns it today | instantiation gate requires only `BUNDLE_MAP.md`; `inspect-bundle.mjs` accepts map-only; `check-reentry.mjs` does not validate an entry at all | unresolved design boundary, not evidence that the entry card is optional: a future proposal must choose the single check/rejection owner |

The legacy paths are not merely human-readable historical Markdown. Current
guidance turns them into a route to `COMMANDS.md`; current CLI/tests treat the
same shapes as successful or non-blocking. Conversely, direct human reading of
a historical file is outside that positive Engine/Agent continuation contract.

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

## Closed Findings And Deferred Decisions

The actual current contract has two separate gaps, both requiring a later
explicit decision rather than a speculative cleanup edit:

1. **Compatibility policy:** whether old-only bundles may remain successful
   through current `continue`, `inspect`, or reentry diagnostics.
2. **Rejection owner:** which existing command owns the one current-entry
   predicate. `missing_contract` means an unavailable Engine capability and
   `invalid_input` means bad invocation; neither is an established reusable
   code for a valid-but-old bundle shape. `inspect-bundle.mjs` currently has
   only text plus exit 0/1, while the continuation playbook has no machine
   result at all. A proposal must not pretend that a shared
   `unsupported_current_contract` taxonomy already exists.

The Global Coverage Gate is closed. This card records the decision surface but
does not create an OpenSpec proposal until the user chooses its policy.

## Policy Decision (Confirmed)

对 only `RUN_BUNDLE.md`、only `START_FROM_HERE.md` 或 only `BUNDLE_MAP.md`
的旧目录，`inspect-bundle` 应该怎样处理？

| Choice | 结果 | 风险 |
|---|---|---|
| A. current-only reject（已确认） | `continue` rejects old-only shapes; the selected deterministic owner returns one explicit current-contract failure; humans may still read Markdown directly | 清晰、无第二入口；会 change historic-directory inspection/reentry outcomes and requires an honest cross-surface diagnostic design |
| B. human-only inspect | `continue` 拒绝，但另设非 Engine 的文本 inspection mode | 容易又把 map-only 误解成可运行 entry；需要额外命令/边界 |

用户已于 2026-08-13 确认 A。它符合“当前 Engine 不执行、不升级、不迁移
历史 bundle”，也不需要发明一个延续旧 contract 的专用观察模式。proposal
仍须明确唯一 rejection owner 与跨 `continue`、`inspect`、reentry 的一致诊断。

## Proposal 前的 Go / No-go

- [x] Current writer and current map roles are separated: `BUNDLE_ENTRY.md` is minimal navigation entry; `BUNDLE_MAP.md` is passive navigation, not operation authority.
- [x] Direct reader matrix is closed: guidance, inspect, reentry advice, file observability, fixture copy, accepted specs, and positive tests all have an owner-based classification above.
- [x] Fixture matrix is closed: current complete, only `RUN_BUNDLE.md`, only `START_FROM_HERE.md`, and only `BUNDLE_MAP.md` all touch a compatibility path; a future proposal must turn the latter three into explicit boundary tests.
- [x] Enforcement gap is identified: the current instantiation gate requires `BUNDLE_MAP.md` but not `BUNDLE_ENTRY.md`; inspector/reentry do not share a current-entry predicate.
- [x] User chose A: legacy-only bundle shapes are current-contract rejects; direct human Markdown reading remains outside the operational contract.
- [ ] Proposal identifies one direct rejection owner and a bounded diagnostic shape; do not misuse existing `missing_contract` or `invalid_input`, and do not create divergent legacy outcomes across continue/inspect/reentry.
- [ ] Proposal synchronizes `bundle-start-from-here` and all affected accepted specs with the actual behavior, including the copied inspector fixture, rather than leaving a tombstone that still promises success.

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
- [ ] one owner-defined rejection boundary replaces all legacy fallback advice without inventing a second operational entry.
- [ ] current docs/tests no longer demonstrate legacy entry as a success case.
