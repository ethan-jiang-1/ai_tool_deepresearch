## Why

当前 `ProfileSchema` 同时接受 direct-sample current observation 和已无 current
writer 的 URL/fetch/search/access-boundary envelope。这个双轨输入让 HITL1 为
历史边界投影专用 repair，同时让所有共享 profile reader 继续把旧格式视为
可读的 current runtime truth。来源：
`_backlog/plans/current-contract-signal-cleanup/changes/C4a-retire-legacy-research-access-envelope.md`。

用户已确认 current-only policy：`research_access` 保持全局 optional；旧
envelope 仅通过既有 `ProfileSchema` invalid boundary 拒绝，HITL1 复用
`profile_schema_valid` / `missing_contract`，不引入 legacy-specific taxonomy。

## What Changes

- **BREAKING** 删除 `ProfileSchema` 的 `LegacyResearchAccessSchema` union branch。
  当前合法形状仅为缺失字段、`{ status: unprobed }`，或完整 direct-sample
  `available` / `unavailable` observation。
- **BREAKING** 旧 URL/fetch/search/candidate/source-class/access-boundary profile
  不再通过任何 current profile schema reader；不迁移、不升级、不从旧字段推断
  current observation。
- HITL1 保留 `profile_schema_valid` 为 schema-invalid profile 的最早根因，并
  移除 legacy `access_boundary` owner projection；有效 current direct-sample
  `unavailable` 继续不是 adapter-failure diagnosis。
- 同步 current Agent guidance、accepted specs、fixtures 和 tests，使旧 envelope
  仅作为显式 rejection coverage，而不是成功样本。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/schema-core`: ProfileSchema 的 `research_access` 可接受形状从
  current-plus-legacy union 收敛为 optional current-only union。
- `research/pre-research-gate-implementation`: HITL1 schema failure 与 feedback
  不再识别、投影或 route legacy access-boundary envelope。
- `research/research-access-adapter`: selected adapter 保留 current
  executor-scoped canary/permission contract，但不再拥有 legacy boundary-location
  到 repair owner 的映射。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/schema-core` | catalog 与 `openspec/specs/engine/schema-core/spec.md` 的 `Six Zod contracts` | Modify | 它直接拥有 `ProfileSchema` 的 legacy acceptance 和 no-field compatibility 行为。 |
| `research/pre-research-gate-implementation` | catalog 与 HITL1 rule/feedback requirements | Modify | 它直接承诺 HITL1 对 legacy boundary 的 special feedback。 |
| `research/research-access-adapter` | `research-access-adapter/spec.md` 与 `host_tools/lib/research-access-adapter.mjs` | Modify | requirement 与 implementation 仍承诺 schema-valid legacy boundary 的 owner mapping；该 positive legacy consumer 必须随 envelope 一起退出。 |
| `research/research-styles` | `research-styles/spec.md` | Verify-only | style writer 继续保留 schema-valid unrelated profile facts；不拥有旧 envelope acceptance。 |
| `research/post-final-recovery` | `post-final-recovery/spec.md` | Verify-only | 它消费完整 ProfileSchema 的既有 contract boundary，不增加 recovery behavior。 |

## Impact

- Target code: `schema/contracts/profile.mjs`, HITL1 Gate checker and its
  definition/guidance only where it mentions legacy envelope behavior.
- Verification: schema, HITL1, style-preservation, shared-validator and recovery
  regressions; one explicit legacy rejection boundary per affected reader class.
- No new dependencies, commands, state, migration, profile writer, provider
  selection, permission, or topic-plan behavior.
