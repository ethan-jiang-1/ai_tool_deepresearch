# Scanner calibration — DWU baseline (task 1.3)

> date: 2026-09-04 | spec: `openspec/specs/agent/delegated-work-units/spec.md` (2448 lines, 39 blocks)
> baseline: 主 plan §1.5 实测锚点 = `grep -c 'generated task\|task\.md\|spawn\|Generated guidance\|Generated actor\|Generated work-unit task'` = **36 行命中**(case-sensitive grep,逐行计数)
> tool: `node openspec/governance/scan-restatement-candidates.mjs --spec <dwu> --format json`

## 结论:PASS — 13/13 散文域基线命中全部被候选覆盖

基线 36 处逐行对账(以共享解析器 `spec-unit-parse.mjs` 的切分为区域归属):

| 基线命中所在区域 | 行数 | 扫描器是否覆盖 | 依据 |
|---|---|---|---|
| 散文段(prose) | **13** | ✅ 13/13 全覆盖 | 行号 528, 534, 536, 587, 589, 591, 840, 861, 1392, 2010, 2025, 2302, 2368 各落入一个候选段 |
| 场景体(scenario) | 23 | 刻意不覆盖 | §2.2 场景块永不指针化;场景内的机械复述不是指针化候选 |

## 扫描器输出形态

- 22 个候选段(每段每类别至多一条),按 `generated_task`(9)/`spawn_mechanics`(7)/`generated_guidance`(3)/`task_md_surface`(3) 分组。
- 相对基线的**额外**候选:`259-263`、`1860` 两段——来自大小写不敏感匹配(基线 grep 为 case-sensitive);面向召回的超集,人审按 §2.1 判定取舍。
- 输出头显式声明 "candidates ≠ verdicts";场景依赖的 normative 句不在候选域。

## 词表定稿

默认词表(内置常量)维持 4 类:`generated_task` / `task_md_surface` / `spawn_mechanics` / `generated_guidance`;`--anchors` 可扩展。无需为校准修改默认词表。
