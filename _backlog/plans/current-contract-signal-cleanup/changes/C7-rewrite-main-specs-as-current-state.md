# C7: Rewrite Main Specs as Current State

> Archived change：`2026-08-15-retire-gate-content-dedup-tombstone`
>
> Completed execution batch: dashboard item 18; intentionally split from C8
>
> 状态：governed-archived and committed (`b0e7d4e96`)
>
> 风险：L2-L3

## 要解决什么

accepted main specs 应该描述“现在可观察到的系统 contract”，而不是在每个 capability 里保存 change migration 叙事、历史版本、废弃 capability 的永久说明。现在审计到 85 份 main spec、约 26,757 行，其中 46 份有明显历史过渡措辞；有 13 个 retired requirement ID 仍出现于 main specs。

这不再计划成一次覆盖 85 份 specs 的独立大改写。Dashboard items 09-13 各自
同步其行为 delta；item 14 只处理收口后仍有证据证明是纯 narration、pure-retired
catalog/spec noise 或 contradictory wording 的 residual set。

这项工作放在后面，因为在 C3-C6 尚未决定前，过早删除 spec 中的 legacy wording 只会让 main spec 与 runtime 更不一致。

## 已验证事实

| Fact | 解释 |
|---|---|
| retired IDs 有 registry 级 tombstone 语义 | registry 历史不应被删除或复用 |
| `gate-content-dedup` 是剩余 pure-retired main spec | `bundle-start-from-here` 已由 C3 退役；GAC 是唯一当前可执行 residual |
| main spec 中含有明确 current rejection 规则 | 不能把每个 `legacy` token 都当作纯历史删掉 |
| governance traceability spec 已规定 current surface 如何谈 retired terms | 清理必须遵守现有 hygiene contract，而非自创关键词扫描规则 |

## 目标 contract

一份 main spec 只应表达：current observable behavior、稳定 rejection boundary、仍有效的 invariant，以及到真正 owner 的必要引用。它不应该负责：叙述旧架构、保存已完成 change 的过程、证明 archived test 历史，或为已经消失的 capability 占一个永久 “current” 目录。

## 影响面

| Layer | 可能改动 |
|---|---|
| Specs | `openspec/specs/**/spec.md`，优先 pure-retired / contradictory / history-heavy files |
| Catalog | `openspec/specs/README.md` capability descriptions and cross-links |
| Registry/governance | requirement prefixes/retired IDs；可能只变 main-spec occurrence，不变 registry tombstone |
| Tests | spec-format and wording assertions；可能有 fixture contract tests 固定旧措辞 |
| Documentation | only where current docs duplicate obsolete spec wording |

## 分类方法

每个历史命中先归类，不能用 regex 直接删：

| 类别 | 处理 |
|---|---|
| 当前拒绝边界 | 保留，但改写成 current observable failure，而非 migration narration |
| 当前 invariant 的历史来由 | 只保留 invariant；理由移到 archived change 或必要 ADR |
| 纯完成史 / pre-C wording | 删除 |
| retired capability tombstone | 让 registry/archive 保留历史；current main spec/catalo​​g 通常移除 |
| 不存在的 architecture/API | 删除或改为真实 current owner |

## 风险与 Go / No-go

- 任何删掉 requirement 的动作都要遵守 requirement registry 的 archive/sync route；不能手工让 ID 变 orphan。
- 不能用“字数下降”作为 done condition。若 current behavior 尚存在，必须先留在 owner spec。
- [x] Dashboard items 09-17 已提供实际 runtime disposition并同步各自 main specs；现在重验 residual set，不以历史 inventory 直接写 delta。
- [x] 重新核验 residual set：`gate-content-dedup` 是唯一 current main-spec/catal​​og pure tombstone；所有 GAC IDs 已 deprecated，当前 runtime/guidance 无正向 authority。
- [x] C7/C8 merge gate failed：registry/spec retirement 与 routing guards/current-profile fixtures 不共享 owner、consumer/test 或 rollback boundary。
- [x] 创建 standalone `retire-gate-content-dedup-tombstone` planning artifacts；不以“85 份都重写”为目标。
- [x] 完成 strict/planning governance checks 与三轮 `polish-openspec-change`；registry retired-tail position、governance/test proof boundary、`agent/agent-testing` negative metric owner 均已复核。
- [x] 用户授权 `APPLY`；完成 9 / 9 tasks、closeout review 与 governed archive。live `engine/gate-content-dedup` spec/catalog entry 已移除，GAC-001..009 仅保留为不可复用的 retired registry/archive history。
- [x] focused hygiene integration（1 / 1）、workflow-package、strict OpenSpec、archive requirement/project-spec/taxonomy/discovery、verification-routing/semantic-closure 以及 delta/main re-comparison 全部通过；Harness、runtime guidance、tests 与 C8 surfaces 无 target diff。

## Verification

```bash
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
node openspec/governance/check-project-reqs.mjs --mode archive --change <change>
```

加上受影响 domain 的 focused behavior tests；main spec rewrite 不能只跑 Markdown grep。

## 何时算完成

- [x] pure-retired main spec count is zero for the independently proven GAC residual；不保留 live negative-boundary tombstone。
- [x] changed GAC historical identity is justified only in the registry/archive，not a current main spec。
- [x] catalog、main specs 与 executable behavior一致：current surfaces 无 `engine/gate-content-dedup` capability，GAC IDs 保留为 deprecated history。
- [x] archived change—not current specs—carries the retirement rationale and migration history。
