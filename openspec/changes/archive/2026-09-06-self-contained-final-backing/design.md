# Design: Self-Contained Final Backing

## Context

用户裁决（2026-09-06）：最终交付单元（`final/final_vN.md` + `final/final_vN/`）必须自包含——主报告 Evidence Map 的 backing 只能指向版本归档目录内文件或外部 URL，不得引用 `../artifacts/` / `../reference/`（对外交付不可达）。

现状：`final-delivery-backing` 的 FDB-002 只允许 backing 是已提交 evidence_summary / reference 投影。`final_v4/07-evidence-details.md` 已物化全部 28 条 finding 的结论/数字/口径/外部 URL（自包含明细），但主报告 backing 指向它会被拒。

## Goals / Non-Goals

**Goals:**

- 主报告 Evidence Map backing 可指向同版本 auxiliary 目录内物化明细（`final_v<N>/07-evidence-details.md`）。
- 交付单元（主报告 + 版本目录）自包含：读者无需访问 bundle 内部其它路径即可核验全部结论。
- 既有 direct/reference backing 路径完全保留。

**Non-Goals:**

- 不改变 evidence_summary / reference backing 的既有契约。
- 不允许 backing 指向其它版本目录 / supplementary 目录 / 外部 URL。
- 不做报告质量或语义充分性判断。

## Decisions

### D1: 自包含 backing 的判定 — 版本目录内 + 存在 + 安全文件

- **选择**：在 `evaluateFinalDeliveryBacking` 的 backing 判定循环中，`reference/` 分支之后增加「自包含明细」分支：`resolved.relPath` 匹配 `final/final_v<N>/` 或 `final/final_<feature>_v<N>/`（且 `<N>` 与报告自身版本一致）时，文件存在即接受。
- **理由**：物化明细（07-evidence-details.md）persist 时自身已通过 backing admission（它带 Evidence Map），是同交付单元的一部分；主报告 backing 指向它是「单元内引用」，不引入新的证据权威。
- **版本匹配**：报告 `final/final_v4.md` 只能 backing 到 `final/final_v4/` 内；指向 `final_v3/` 或 `final_v5/` 被拒（不是同交付单元）。

### D2: 07-evidence-details.md 自身也自包含

- 07 明细文件的 Evidence Map backing 也改为**指向自身内容锚点或外部 URL**（不再引用 `../../artifacts/` / `../../reference/`）——使整个交付单元零内部路径引用。
- 具体：07 的 Evidence Map 表保留（persist 机械要求），但 backing 列改为「指向 07 内对应小节锚点」或保留外部 URL 描述；若 persist admission 要求 backing 是链接，则指向 07 自身的 `#W2F-0XX` 锚点（同文件内引用，resolve 后是同文件路径——需验证 admission 是否接受同文件锚点）。

## Semantic Precision

自包含 backing 回答一个有界问题：**主报告的每条结论，读者能否在「主报告 + 版本归档目录」这个交付单元内核验？** backing 指向同版本目录内的物化明细（其中含外部 URL）→ 能。指向 bundle 内部其它路径 → 不能，拒绝。
