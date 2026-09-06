# Self-Contained Final Backing

## Why

最终交付单元（`final/final_vN.md` 主报告 + `final/final_vN/` 版本归档目录）应**自包含**：对外公开时只有这两个面（加外部 URL）可达，主报告的 Evidence Map backing 应指向**版本归档目录内**的物化明细（示例：`final_vN/07-evidence-details.md`——文件名由 Agent 决定，契约不绑定具体文件名），而不是 `../artifacts/` 或 `../reference/`——这些内部路径在对外交付中不可达，读者无法核验。这是框架级能力：任何 bundle 的对外交付都可用「版本目录内明细」作为 backing，不绑定本 bundle 的具体文件。

用户裁决（2026-09-06）：主报告内容只能依赖 `final/final_v4/` 目录内文件或外部 URL，不得引用 bundle 内部其它位置。当前 `final-delivery-backing` 契约只允许 backing 指向已提交 evidence_summary / reference 投影——需扩展为允许指向「版本绑定 auxiliary 目录内的物化明细」。

## What Changes

- **MODIFY** `research/final-delivery-backing`（FDB 系列）：Evidence Map backing 的合法目标扩展——当 backing 解析到 `final/final_v<N>/<file>.md`（版本绑定 auxiliary 目录内，含 unlabelled/labelled 两种）时，若该文件存在且为普通文件，则作为**自包含物化明细**合法接受；不再要求它是指向 `../artifacts/` 或 `../reference/` 的 submitted backing。既有 direct backing（evidence_summary）与 reference 投影的合法路径不变。
- **backing 语义**：`final/final_vN/07-evidence-details.md` 这类物化明细是「同交付单元内自包含引用」——主报告 backing 指向它，读者在主报告 + 版本目录内即可核验，无需访问 bundle 内部其它路径。
- **边界**：只有 `final/final_v<N>/`（版本绑定 auxiliary 目录，与主报告同版本）内文件可作为此自包含 backing；其它 `final/` 下文件（supplementary、其它版本目录）不在此列；指向外部 URL 的 backing 仍不合法（backing 必须是 bundle 内路径或版本目录内明细，外部 URL 走正文链接）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/final-delivery-backing` | `openspec/specs/research/final-delivery-backing/spec.md`（FDB-002 backing 合法目标契约） | Modify | 自包含物化明细 backing 是该 capability 的 backing 合法目标扩展，不另立 capability |
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md`（ARP-005 版本绑定 auxiliary 目录契约） | Verify-only | auxiliary 目录分类已由 ARP-005 背书；本 change 只消费其版本绑定，不改 ARP 行为 |
| `governance/semantic-fact-closure` | `openspec/governance/semantic-fact-families.yaml`（final.submitted-backing-admission 既有族） | Verify-only | 复用既有事实族，不新增事实族 |

## Capabilities

### Modified Capabilities

- `research/final-delivery-backing`：MODIFY FDB 系列——backing 合法目标增加「版本绑定 auxiliary 目录内物化明细」。
