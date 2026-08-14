# C7: Rewrite Main Specs as Current State

> 候选 change：`rewrite-main-specs-as-current-state`
>
> Planned execution batch: dashboard item 14 `finalize-current-contract-presentation`, combined with C8 residual cleanup
>
> 状态：deferred until dashboard items 09-13 archive; behavior changes sync their own specs incrementally
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
| `bundle-start-from-here` 和 `gate-content-dedup` 是 pure-retired main specs | 最明显的 catalog/spec noise candidates |
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
- [ ] Dashboard items 09-13 先提供实际 runtime disposition并同步各自 main specs；否则该卡只做 inventory，不写 residual delta。
- [ ] 创建 per-spec inventory，列出 requirement owner、behavior evidence、classification 和 action。
- [ ] 对 residual set 逐项证明 owner/action；不以“85 份都重写”为目标。
- [ ] 任何 wording-only test 都要解释其保护的是 routing/authority 还是只是段落文本。

## Verification

```bash
node openspec/governance/check-project-specs.mjs
node openspec/governance/check-project-reqs.mjs --mode plan
node openspec/governance/check-project-reqs.mjs --mode archive --change <change>
```

加上受影响 domain 的 focused behavior tests；main spec rewrite 不能只跑 Markdown grep。

## 何时算完成

- [ ] pure-retired main spec count is zero, unless an accepted governance owner explicitly requires a minimal live negative boundary.
- [ ] remaining historical wording has per-hit current-contract justification.
- [ ] catalog, main specs and executable behavior agree on every changed capability.
- [ ] archived changes—not current specs—carry migration history.
