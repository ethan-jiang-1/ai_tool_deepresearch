# Design: 2026-09-01-slim-rwg-requirements

## Context

RWG 三条巨无霸均为「散文段 + 场景」线性排布。`assemble-delta.mjs` 按顶层块切分（松散列表/引用块/编号列表并入前属单元），段落前缀 + 场景序号区间双重映射归组，内容行逐字节守恒（唯一豁免：M3 已知替换行，脚本内置显式留痕）。

## Goals / Non-Goals

**Goals:**

- 3→7 拆分；场景 51 全数保留；M3 措辞精确化（唯一文本改写，行为零变更）。
- REMOVED（M3 替换后）与 ADDED 内容多重集合全等（脚本强制）。

**Non-Goals:**

- 不改 gate definition JSON（`per_topic_ref_md_count_floor` 的声明保持原样——M3 只对齐 spec 措辞使两者不再互斥）。
- 不动 header `> req:`；不触碰其他 spec。

## Decisions

1. **块A 二分**：gate 规则集主体（provenance/depth/reference-format/backing/floor/index）| focus-coverage 降级边界（P7-P8 + 4 场景）。
2. **块B 二分**：CLI 规则族与 typed semantic_sections | 共享纯收敛结果（inspect/gate 同源）。
3. **块C 三分**：闭合契约链与真值型权威 | 收敛分类与前置根短路 | adapter 单一 target 级操作与有界 direct-output。
4. **设计评审三连**：semantic precision — 7 标题各对应一个有界问题；simple reliable control — 纯结构（M3 只消除措辞互斥）；helper-oriented — 无变化。

## Risks / Trade-offs

- [场景区间映射错位] → 序号闭区间 + 总数断言（declared == actual，逐块强制）。
- [M3 替换行定位漂移] → 按 marker 子串定位整行替换；若 C2 已改动该行则脚本因 marker 未命中而失败（安全默认）。

## Migration Plan

纯 spec 结构变更，git revert 即完全回滚。

## Open Questions

无。
