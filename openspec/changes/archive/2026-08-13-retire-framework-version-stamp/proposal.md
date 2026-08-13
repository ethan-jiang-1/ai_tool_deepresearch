## Why

新建 run bundle 仍会把根 `CHANGELOG.md` 的内部 `v0.x` 标题写入
`rb_plan.md#/framework_version`，但当前 Engine、Gate、CLI、迁移和执行路径均不读取该字段来
选择行为。它把历史标题误投影为运行时兼容事实，并阻塞已获批准的 C2c 版本治理收口。

本 change 落实
[`C2b` 决策卡](../../../_backlog/plans/current-contract-signal-cleanup/changes/C2b-retire-framework-version-stamp.md)
中用户已确认的 bounded policy：停止为新 bundle 生成 stamp；旧 bundle 的未知 plan
frontmatter 继续按当前通用 plan-mutation 语义读取和写回，既不迁移也不拒绝。

## What Changes

- 从 `DEEP_RESEARCH_HARNESS/` 删除 `framework_version` 的唯一 writer chain：版本读取 helper、
  instantiator import/call/template replacement，以及 `rb_plan.md.tmpl` 中的 placeholder/字段。
- 移除 `bundle/cmd-bundle-instantiation` 的 CMI-007 正向 requirement 和关联的专属 unit/
  instantiation assertions；将 requirement registry 中的 CMI-007 标记为 retired，永不复用。
- 以已有 canonical topic-state 的 plan-mutation 路径验证通用 preservation boundary：一个旧
  bundle 已携带的 `framework_version` 仍可 parse 并在正常 current mutation 中 round-trip，
  但该名称不再是新输出或正向 contract。此 change 不为该行为新增专属 compatibility rule。
- 将 focused tests 改为验证两个 current facts：新 bundle 不含 `framework_version`，以及
  任意既有未知 plan frontmatter 键仍受通用 preservation boundary 保护。
- **BREAKING（新 bundle artifact shape）**：新建 `rb_plan.md` 不再包含
  `framework_version`。没有 version router、迁移命令、auto-upgrade、compatibility adapter、
  schema tightening 或旧 bundle rejection 替代它。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bundle/cmd-bundle-instantiation`: 删除新 bundle 在创建时必须写入
  `framework_version` 的 CMI-007 contract。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `bundle/cmd-bundle-instantiation` | `openspec/specs/bundle/cmd-bundle-instantiation/spec.md`、`DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`、`rb_templates/rb_plan.md.tmpl`、instantiation/version focused tests | Modify | CMI-007 是唯一要求新 bundle 从 `CHANGELOG.md` 写入 `framework_version` 的 accepted contract；其 writer chain 和正向 tests 必须同一 change 移除。 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md`、`schema/contracts/plan.mjs`、`engine/helpers/canonical-topic-state.mjs`、`canonical-topic-state-contract.test.mjs` | Verify-only | `CanonicalPlanSchema.passthrough()` 与 `structuredClone(parsedPlan)` 后的 YAML render 是既有 current plan-mutation behavior；C2b 只将其测试从具体 stamp 改为任意未知键，不新增或扩张它的 accepted compatibility contract。 |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md`、`openspec/config.yaml`、C2c active proposal | Verify-only | C2b 不改变现行 version choreography；Apply 必须暂时遵守它，随后由已 planning-complete 的 C2c change 删除该 governance contract。 |
| `bundle/run-entry` | `openspec/specs/bundle/run-entry/spec.md`、`DEEP_RESEARCH_HARNESS/RUN.md`、C2c active proposal | Verify-only | C2b 仅按现行 VEM rule 同步一次既有 banner，不修改 entry contract；C2c 独占 banner removal。 |
| `verification/verification-routing` | accepted verification-routing spec、focused test layout | Verify-only | 本 change 只为现有 unit/integration test assets 选择证明路线，不改变 taxonomy、checker 或 proof permission。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` 的 transaction-v1 wording | Excluded | `framework-version inference` 在该 spec 中禁止 transaction recovery 推断；它不读取 bundle stamp，属于 C6 的 retained-transaction policy。 |

## Impact

Apply 将删除一个 Harness helper，修改 bundle instantiator 和 plan template，删除其专属 unit
test，调整 focused integration tests，更新两个 accepted specs 和 requirement registry，并在当前
仍有效的 VEM-001--VEM-004 下进行一次必要的历史 changelog/banner 同步。不会添加依赖、状态、
CLI、Gate、schema discriminator、migration、version router 或 runtime fact family。

新 bundle reader 的有界问题是“哪些字段是当前 plan contract 所必需的”；答案止于现有
canonical plan fields（包括 `topic_registry_version`），不含没有 decision reader 的 release
stamp。旧 bundle reader 的有界问题是“当前 plan mutation 是否能安全保留未拥有的既有键”；答案
止于 canonical topic-state 的 generic preservation boundary，不推断任何版本语义。

用户已经批准删除新 writer 的 policy；Agent 在 Apply 中执行已批准的机械删除、spec/test 同步和
必要治理步骤；Engine 不新增 version verdict、permission 或 compatibility decision。该 change
减少一个 root-history -> writer -> artifact 的控制链，而不创建 replacement control。

**Versioning:** C2b requires **v0.90** under the still-accepted VEM-001--VEM-004
rule. Its Apply tasks therefore add one concise v0.90 history entry and synchronize the
current `RUN.md` banner before archive. This is an interim lifecycle obligation, not a
new release or compatibility authority: C2c is already planning-complete, explicitly
depends on C2b's governed archive, and will remove the internal version choreography
without creating another target version.
