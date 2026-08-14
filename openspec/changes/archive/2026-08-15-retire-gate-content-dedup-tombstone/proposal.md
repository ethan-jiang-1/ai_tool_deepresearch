## Why

`engine/gate-content-dedup` 已不再有当前 Harness 实现、Gate、输入 reader 或
Agent guidance authority：其九个 `GAC-*` ID 已全部在 registry 标为
`[DEPRECATED]`。但它仍占据 accepted main spec 和 capability catalog 的 current
入口，迫使读者分辨一个不存在的能力，降低 current-contract 的信噪比。

清噪计划的 C7 复核（`_backlog/plans/current-contract-signal-cleanup/changes/C7-rewrite-main-specs-as-current-state.md`）确认它是唯一已证明的 pure-retired
main-spec residual。此前的归档 change
`correct-retired-content-dedup-catalog` 只纠正了 tombstone catalog 文案；这次在
current-only policy 下完成下一步：退役整个 live discovery entry。历史仍由 registry
和 archive 保存，而不继续伪装成当前 contract。

## What Changes

- **BREAKING（内部 accepted-contract 导航）**：删除 live
  `engine/gate-content-dedup` main spec 和 `openspec/specs/README.md` 中的同名
  catalog row；当前 spec tree 不再把 content-dedup 暴露为 capability。
- 将 registry 的 `GAC` prefix 改为 `gate-content-dedup # all entries deprecated; no spec directory`，保留
  `GAC-001` 至 `GAC-009` 的原始描述和 `[DEPRECATED]` 状态，并将该历史组置入
  retired no-spec-directory 区。ID 不删除、不复用。
- 不改变任何 Harness/Engine/CLI、schema、Gate、run bundle、Agent guidance、测试
  runtime behavior，或 active quality/provenance/ledger/source/reference/handoff
  owner。不增加 alias、tombstone main spec、migration、fallback、version reader 或
  replacement capability。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/gate-content-dedup` | its accepted `spec.md`; catalog row; `GAC-001..009` registry group; C7 card; current Harness/test/guidance scan | Modify | The whole capability is retired; removal delta is required to delete its live main-spec and catalog identity through governed registry retirement. |
| `governance/requirement-traceability` | accepted deprecation-without-deletion requirement; `check-project-reqs.mjs`; retired `BUS`/`FOR` precedents | Verify-only | It already owns the no-spec-directory registry form; this change follows it without changing governance behavior. |
| `engine/gate-state-machine` | accepted spec and current Harness gate surfaces | Verify-only | It remains the active Gate owner; it must not regain content-dedup behavior or change in this cleanup. |
| `research/evidence-extraction` | accepted spec and current source/reference surfaces | Verify-only | It remains an active current-quality neighbor; no source/reference behavior changes here. |
| `agent/agent-testing` | accepted AGT metrics requirement and its explicit retired-heuristic prohibition | Verify-only | It preserves a current negative test-metric boundary; it is not a replacement GAC capability and its requirement must remain unchanged. |
| `verification/verification-routing` | accepted routing spec and existing retired-heuristic hygiene test | Verify-only | Existing integration coverage proves inactive heuristic surfaces remain absent; no taxonomy or proof route changes. |

### New Capabilities

无。

### Modified Capabilities

- `engine/gate-content-dedup`：退役整个已失效 capability 的 live main-spec/catal​​og
  identity；九个 retired registry IDs 继续只作历史追溯。

## Impact

- Target edits only: `openspec/specs/engine/gate-content-dedup/spec.md`,
  `openspec/specs/README.md`, and `openspec/governance/req-registry.yaml`.
- 不会修改 `DEEP_RESEARCH_HARNESS/`、`tests/`、`CONTEXT.md`、routing docs 或 accepted
  active-capability requirements。C8 的旧 Markdown assertions / fixture current-profile
  问题明确不属于本 change。
- 有界读者问题是：「当前系统是否提供 content-dedup Gate capability？」Apply 后答案是
  明确的「否」；需要历史 ID 时只查 registry/archive，需要现行 quality behavior 时查
  active work-unit、ledger、cache、provenance、source/reference 与 handoff owners。
- 用户已决定只保留 current contract；Agent 执行受控 metadata 清理，Engine 不新增 verdict、
  state、permission 或 runtime authority。
