## Why

当前 Harness 仍把只含 `RUN_BUNDLE.md`、只含 `BUNDLE_MAP.md` 或只含
`START_FROM_HERE.md` 的历史目录作为 continue、inspect 或 reentry 的成功/非阻塞
输入。新 writer 已只生成 `BUNDLE_ENTRY.md` 与 `BUNDLE_MAP.md`，但 reader、playbook、
fixture 和 accepted specs 仍维护旧入口优先级，迫使 Agent 在每次回到 bundle 时重建历史
兼容矩阵。

用户已在
[`_backlog/plans/current-contract-signal-cleanup/changes/C3-drop-legacy-bundle-entry-compatibility.md`](../../../_backlog/plans/current-contract-signal-cleanup/changes/C3-drop-legacy-bundle-entry-compatibility.md)
确认 policy A：历史 Markdown 可以由人直接打开，但 current Harness 不执行、不升级、
不迁移，也不把旧入口当作 current run bundle。本 change 将这个决定收敛成一个唯一的
current-entry contract 和一个可复用的 deterministic rejection boundary。

## What Changes

- **BREAKING** 将 current operational bundle entry 固定为同一 bundle root 中同时存在
  `BUNDLE_ENTRY.md` 与 `BUNDLE_MAP.md`。`BUNDLE_ENTRY.md` 是进入/委托卡，
  `BUNDLE_MAP.md` 保持 passive navigation map；后者不能在前者缺失时成为第二个入口。
- **BREAKING** 令 `inspect-bundle.mjs` 成为唯一公开的 current-entry rejection owner。它
  对 only `RUN_BUNDLE.md`、only `BUNDLE_MAP.md`、only `START_FROM_HERE.md`，或任一
  current-pair 文件缺失的目录，在所有 modes（默认、`--summary`、`--timeline`、`--log`）
  都先返回同一 scoped `unsupported_current_entry_contract` failure，退出码为 `1`，且不
  输出该历史目录的 inspect/log/timeline data。
- 为 inspector、reentry、instantiation Gate 和 file observability 提供同一个纯 current-entry
  predicate，直接检查 selected directory 的两个当前 root files。`check-reentry` 将该结果
  映射为现有 structured blocker/inspect/advice surface 和退出码 `1`，不是 caller-invalid
  的 code `2`，也不伪称为既有 `missing_contract`。
- 重写 existing-bundle routing：显式提供的 reachable bundle candidate 先经过 continuation
  preflight；只有 current pair 通过后才能成为 current run bundle root 并进入 `COMMANDS.md`。
  旧目录失败后停止，不能回落到 `RUN.md`、新建 bundle、旧 entry、map-only entry 或另一个
  human-only Harness command。
- 让 instantiation Gate 同样要求并复用 current pair；完整 current pair 中额外存在的
  `RUN_BUNDLE.md` 或 `START_FROM_HERE.md` 仅是 non-authoritative historical debris，不
  形成第二条 success path。
- 移除 legacy entry/map 作为 positive or compatibility-success guidance、fixture behavior 和
  accepted main-spec behavior。`bundle-start-from-here` 的全部 BUS requirements 已是 retired
  identity；Apply 将按整 capability retirement 方式删除其 current main-spec directory、
  catalog row，并保留 registry/archive 历史。
- 不增加 migration CLI、auto-upgrade、version router、compatibility adapter、legacy manifest
  marker，或额外的 human-only inspect mode。人仍可使用普通文件工具直接阅读历史 Markdown；
  这不属于 Harness operational contract。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent/agent-command-surface`: change ACS-005 so continuation admits only a
  verified current entry pair and stops on the common rejection boundary.
- `bundle/bundle-map`: change BUM-003 through BUM-005 so the map remains
  passive, the pair is required for current entry, and legacy map names do not
  preserve an operational path.
- `bundle/bundle-start-from-here`: retire the all-retired BUS capability from
  current accepted specs while preserving its archive and registry identity.
- `bundle/cmd-bundle-instantiation`: change CMI-003 so every inspector mode
  enforces the same current-entry preflight.
- `bundle/file-observability`: change FIO-005 so root-file observation shares
  the current-pair conclusion and treats extra legacy files as debris only.
- `bundle/run-entry`: change RUE-006 so root/Harness routing preflights an
  explicit bundle candidate instead of advertising historical entry fallback.
- `engine/logging-conventions`: change LOC-005 so observable inspector modes
  cannot bypass the current-entry check.
- `engine/runtime-reentry-debuggability`: change RRD-002, RRD-005, RRD-006,
  and RRD-007 so reentry rejects a non-current entry before runtime diagnosis
  without treating it as invocation/configuration failure.
- `research/pre-research-gate-implementation`: change PRG-001 and PRG-004 so
  the instantiation Gate checks the same current pair through its declared
  deterministic checker route.
- `verification/integration-tests`: change INT-001 to cover current-pair
  success and legacy-only rejection at the actual inspector boundary.
- `verification/test-fixtures`: change TEF-001 so the canonical-source-linked inspector follows
  the same current-only contract.
- `workflow/workflow-directory-contract`: change WDC-004 so only the pair is
  part of the current operational bundle-entry topology.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agent-command-surface` | `openspec/specs/agent/agent-command-surface/spec.md`, `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` | Modify | ACS-005 currently promises `BUNDLE_ENTRY.md -> RUN_BUNDLE.md -> BUNDLE_MAP.md`; that is externally observable Agent routing and must become current-pair-only. |
| `bundle/bundle-map` | `openspec/specs/bundle/bundle-map/spec.md`, `DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_ENTRY.md.tmpl` | Modify | BUM-003 through BUM-005 currently retain legacy map/entry success semantics despite the current writer's pair. |
| `bundle/bundle-start-from-here` | `openspec/specs/bundle/bundle-start-from-here/spec.md`, `openspec/governance/req-registry.yaml`, `openspec/changes/archive/2026-07-04-retire-stale-main-specs/` | Modify | All BUS identities are retired and the current tombstone still promises diagnostic success for the behavior this change removes; whole-capability retirement is the honest current-spec outcome. |
| `bundle/cmd-bundle-instantiation` | `openspec/specs/bundle/cmd-bundle-instantiation/spec.md`, `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` | Modify | CMI-003 owns inspector structure and exit behavior, including the current legacy-map success path and flag bypass. |
| `bundle/file-observability` | `openspec/specs/bundle/file-observability/spec.md`, `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` | Modify | FIO-005 currently calls old root files compatibility and must instead consume the pair conclusion without changing evidence/ledger authority. |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`, root/Harness `AGENTS.md` and `CLAUDE.md`, `DEEP_RESEARCH_HARNESS/RUN.md` | Modify | RUE-006 owns the explicit existing-bundle route and currently advertises legacy entry resolution before new-run routing. |
| `engine/logging-conventions` | `openspec/specs/engine/logging-conventions/spec.md`, `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` | Modify | LOC-005 promises observable modes that currently return before structural checks; the common entry preflight changes that observable contract. |
| `engine/runtime-reentry-debuggability` | `openspec/specs/engine/runtime-reentry-debuggability/spec.md`, `DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs` | Modify | RRD requirements own reentry's structured read-only verdict and its old `START_FROM_HERE.md` fallback advice. |
| `research/pre-research-gate-implementation` | `openspec/specs/research/pre-research-gate-implementation/spec.md`, `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-instantiation-complete.definition.json`, `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs` | Modify | PRG-001 omits `BUNDLE_ENTRY.md`; the Gate must consume the same direct pair predicate rather than keep a weaker entry shape. |
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md`, `tests/integration/cli/inspect-bundle.test.mjs` | Modify | INT-001's complete-bundle meaning changes from map-compatible structure to a current entry pair, requiring positive and explicit rejection coverage. |
| `verification/test-fixtures` | `openspec/specs/verification/test-fixtures/spec.md`, `tests/fixtures/DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` | Modify | TEF-001 describes the source-linked inspector's legacy-entry compatibility; the link must resolve to the canonical CLI, without an independently authored fixture copy. |
| `workflow/workflow-directory-contract` | `openspec/specs/workflow/workflow-directory-contract/spec.md` | Modify | WDC-004 still describes legacy root files as bounded entry/map compatibility; its current-root topology must no longer make them operational. |
| `engine/cli-exit-code-conventions` | `openspec/specs/engine/cli-exit-code-conventions/spec.md`, `DEEP_RESEARCH_HARNESS/cli/README.md` | Verify-only | The existing convention already permits normal code `1` for validation failure and reserves code `2` for invocation/configuration error; no new global exit taxonomy is needed. |
| `verification/experiment-shared-infra` | `openspec/specs/verification/experiment-shared-infra/spec.md`, `experiments_env/shared/new-disposable-bundle.mjs` | Verify-only | The current disposable writer already emits the pair and no legacy entry; it is a regression consumer, not a behavior owner to modify. |
| `engine/cli-inspect-output-conventions` | `openspec/specs/engine/cli-inspect-output-conventions/spec.md` | Excluded | Its accepted requirements concern reference metadata inspection, not bundle-entry admission or the public bundle inspector. |

## Impact

Primary implementation surfaces are `inspect-bundle.mjs`, `check-reentry.mjs`,
the instantiation Gate definition/checker, file observability, entry routing, and
their focused tests/fixture copy. Root/Harness entry documents and the affected
accepted specs will be synchronized in the same Apply slice; archives and historic
bundle directories remain untouched.

The direct Source of Record is the selected explicit directory's two root-file
facts: both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` exist. The new pure predicate
answers one bounded question for an Engine/Agent reader: "may this directory enter
the current Harness operational path?" It preserves the distinctions that matter:
current pair, incomplete/old-only shape, and current pair plus historical debris.
It deliberately does not judge research state, current phase, human readability,
or historical content. A reader can stop at its result rather than reconstructing
precedence across four Markdown names.

The shortest legal loop is `direct root files -> shared predicate -> one public
inspector rejection or current continuation`; reentry and the instantiation Gate
reuse the predicate instead of recreating fallback logic. This removes three
positive legacy branches, legacy migration advice, and flag-specific bypasses. It
does not add state, migration, retry, compatibility adapter, or a second command.

The user has already made the compatibility policy decision. The Agent will make
the approved code/spec/test/guidance edits and run deterministic verification. The
Engine decides only the filesystem-based current-entry verdict; it does not decide
whether historical Markdown is useful, alter it, or grant a continuation/reentry
path because a human asked for one.
