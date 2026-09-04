# Bug: run-scoped 脚本把大量中间产物写入系统 `/tmp/`，而非 current run bundle 内部 —— 运行时数据不随 bundle 归档、跨环境丢失、provenance 不可追溯

> **状态**：活跃（2026-09-04 新报，取证自 bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 完整现场）。
> **影响面**：任意 run bundle 的 run-scoped 辅助脚本（`_scripts/` 执行器/生成器/恢复脚本）执行时产生中间产物（queue 卡、enrich 输入、投影 packet、source 列表、result 草稿等），写向系统临时目录。
> 与本 bundle 数据损失有直接因果：wave0 `08_haiguang-shensuan4-dcu` 的提交时 source.yaml 前缀被后续脚本改写后，原始 10 条唯一可能的残留只存在于 `/tmp/` 中间产物，而这些文件不在 bundle 内 → 无法作为恢复依据，前缀 drift 至今不可逆（`submitted_source_contribution_prefix_drift`，reentry blocker）。

## 发现场景

`dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 的 `_scripts/` 下 5 个 run-scoped 脚本执行时向系统 `/tmp/` 写中间文件；现场遗留 **114 个** `/tmp/` 文件与本次 run 直接相关：

- `fix-and-enrich-seeds.mjs` → `/tmp/enrich-*.json`（11 topic + large/v2 变体，30+ 个）
- `process-seeds-batch1.mjs` → `/tmp/enrich-*.json`、`/tmp/result-*.json`
- `process-all-seeds.mjs` → `/tmp/enrich-*.json`、`/tmp/result-*.json`
- `fix-wave0-gate.mjs` → `/tmp/wave0-fix-*.json`（11 topic 投影 packet）
- `repair-wu-i0021-leaves.mjs` → `/tmp/*`（修复中间态）
- 其他批次还留下 `/tmp/wave0-source-*.json`、`/tmp/wave0-large-*.json`、`/tmp/wave0-proj-*.json`、`/tmp/wave0-v2-*.json`（11 topic × 4 类，44+ 个 queue/task 卡与 packet）

## 实际行为

1. **写系统临时目录而非 bundle 内**：脚本用 `/tmp/enrich-${slug}.json`、`/tmp/wave0-fix-${slug}.json` 等硬编码路径（或 `process.cwd()` 之外），把 queue task 卡、enrich_seed 输入、wave_projection packet、source 列表草稿全部落在 `/tmp/`。
2. **不随 bundle 归档**：`/tmp/` 是机器临时区，不属于 current run bundle root；bundle 交付/归档/迁移后这些文件不存在，接收方无法看到"这个 run 当时用了什么输入、产出了什么中间态"。
3. **跨环境/重开会话即丢失**：`/tmp` 可能被系统清理；换机器/换会话后无备份，中间产物不可重建。
4. **provenance 断链**：queue 卡、投影 packet 等是 Engine 操作的输入证据；落 `/tmp/` 后，gate/reentry/provenance 检查只能看到 bundle 内最终态，看不到生成路径，事后判定（如 `provenance-forensics-guide`）失去一手输入。
5. **已造成实际数据损失**：`08_haiguang-shensuan4-dcu/source.yaml` 提交时 10 条（ledger `semantic_digest 012bf756…`，validated_length 10），后续被 `cleanup-small-models.mjs`/`expand-sources.mjs` 改写后前缀不匹配；恢复尝试发现唯一可能保存原始 10 条的 run-scoped 中间产物在 `/tmp/`（如 `wave0-source-08…json` / `wave0-v2-08…json` 变体），但它们不是 bundle 内文件 → 无权威依据重建 → drift 不可逆，连带 4 个 `00-shared-*` reference 的 backing 解析全局失败（reentry `ledger_coverage` blocker）。

## 根因分析

- 规则只约束了 **脚本本身** 的存放位置（AGENTS.md：run-scoped 脚本必须写入 current run bundle root 的 `_scripts/`，禁止 repo 根 / `DEEP_RESEARCH_HARNESS/`），但**没有约束脚本产生的中间/临时数据文件的位置**；
- playbook（instantiate/start-research/continue-run-bundle）与 `_scripts/README.md` 只声明 `_scripts/` 是 non-authority 运行时区域，未给出"中间产物该写哪"（bundle 内 `_cache/` staging 或 `_scripts/` 子目录）的正例；
- 无验证/扫描工具检测"run 期间向 bundle 外写文件"（如扫描 `/tmp/` 残留并归因到 bundle）。

## 严重程度

**中高**（流程/可恢复性缺口）。
- 不直接破坏 gate 判定（Engine 只看 bundle 内事实），但**破坏 run 的可归档性、跨环境可恢复性与 provenance 完整性**；
- 在"脚本事后改写已提交产物"（本 bundle wave0/01/03/08 前缀 drift、i0034 result.json 重写）等破坏场景下，唯一恢复依据（中间产物）不在 bundle 内，直接导致不可逆数据损失；
- 与 BUG-250（占位 cache fail-open）、BUG-251（trace 伪造）同族：都是"run-scoped 脚本可对运行时状态任意操作、框架无留痕/无约束"的流程缺口。

## 复现步骤

1. 任意 run bundle，Phase Agent 在 `_scripts/` 写一个执行器/生成器脚本，中间产物用 `/tmp/xxx.json`；
2. 执行脚本产生 queue/enrich/projection 中间文件；
3. 归档 bundle（`tar`/移动），观察 `/tmp/` 文件不在 bundle 内；
4. 换环境或系统清理后，中间产物不可重建；
5. （本 bundle 案例）源文件被改写后，尝试用中间产物恢复 → 找不到 bundle 内副本 → 不可逆。

## 修复建议（供后续 change 采纳，不在此 run 内修改框架）

- **规则/playbook 补充**：run-scoped 脚本的中间产物一律写入 current run bundle root 的 `_cache/run-staging/`（或 `_scripts/_staging/`），禁止写系统 `/tmp/`、repo 根、`DEEP_RESEARCH_HARNESS/`；`_scripts/README.md` 给出正例与反例；
- **executor/生成器模板**：提供统一 `stagingFile(slug, kind)` helper，把 queue 卡/enrich 输入/投影 packet/source 草稿落到 bundle 内可归档路径；
- **扫描/验证**：新增只读校验（或 validate-work-unit-hygiene 扩展）扫描 `_scripts/*.mjs` 中硬编码 `/tmp/` 写路径，run 结束检查 bundle 外残留并告警；
- **recovery 出路**：若已在 `/tmp/` 发现中间产物且能按内容归属到 bundle，允许以 `_cache/run-staging/` 恢复路径采纳（如同 retain 机制），使改写已提交产物的场景有恢复依据。
