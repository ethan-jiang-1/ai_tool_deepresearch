# Design: add-doc-code-drift-guards

## Context

C3 是 governance/verification 变更(动机与范围见 proposal.md — Why/What)。现状:FM-1 内容漂移只靠一次性人工审计(证据 Part I §6);所有 governance checkers 只在 OpenSpec 流程内被调用;propose 预读 req-registry 963 行(H2);`shared-gate-rules.md` 的 gate 表与 definition JSON 无覆盖检查(H8);exit-code inventory 测试已有 runtime 代表样本、无静态全量扫描(CLE-004 胚胎)。用户已拍板:**不做 pre-commit hook**。

目标文件在 `/opsx:apply` 前保持不动。

## Goals / Non-Goals

**Goals:**
- 内容漂移 checker(路径/CLI 名/gate 清单)作为第五个 hard gate 串入 finalizer。
- `--check-prefix` 前缀查询,propose 不再通读 registry。
- exit-code inventory 静态扩展(源码 `process.exit(N)` vs 文档 class)。
- 不接线任何自动执行点(hook 决定项闭环为不做)。

**Non-Goals:**
- 不做远程 CI(沿用 semantic-fact-closure 边界);不写 hook 脚本、不设 core.hooksPath。
- 不做 C4 的 phase 闭包去重(H7 deferred)。
- 不改 Engine 行为/schema/lifecycle state。

## Decisions

1. **checker 形态 = 独立 governance 脚本 + finalizer 接线。** 新 `openspec/governance/check-content-drift.mjs`,仿照既有 checker(parse args + scan + exit 1 on failures);finalizer 在 semantic-closure 之后、native archive 之前串入。备选:并入 check-project-specs → 拒绝:职责分离,既有 checker 专注格式/注册,内容漂移独立可单独调试。
2. **扫描面与排除面。** 扫 `openspec/guidance/**`、`openspec/specs/**/spec.md`、`DEEP_RESEARCH_HARNESS/**/*.md`、根 `CONTEXT.md`;反引号路径检查:仓库相对坐标(`openspec/`、`docs/`、`tests/`、`experiments_playbook/`、`DEEP_RESEARCH_HARNESS/` 前缀)与 harness 内相对坐标(`command_playbook/`、`cli/`、`engine/`、`workflows/`、`schema/`、`rb_templates/` 前缀,解析到 `DEEP_RESEARCH_HARNESS/` 下)。排除与特判(原型在真实文档上验证过):
   - bundle-runtime 前缀(`rb_`、`_work_units/`、`_cache/`、`_logs/`、`final/`、`reference/`、`artifacts/`、`dpt_*`);
   - `<...>` 占位符、glob 模式(`*`、`...`、`{}`)、`#fragment` 锚点(剥离后检查)、capability-path 形状(两段 kebab 无已知根前缀,如 `engine/schema-core`);
   - **negative/required-absent 引用**(契约要求该路径不存在,如 `DEEP_RESEARCH_HARNESS/CONTEXT.md`、`not DEEP_RESEARCH_HARNESS/command_experiments_env/...`)——以显式 allowlist 登记(文件 + 引用 + reason:required-absent),不在 allowlist 的缺失路径才是漂移。
3. **CLI 名/动词检查。** 路径检查覆盖工具存在性;动词检查:从 `COMMANDS.md` 索引行提取 `operate-*.mjs <verb>` 词面,断言 verb 出现在工具源码(dispatch 字符串)。确定性、无语义解析。
4. **gate 清单检查(H8)。** 解析 `shared-gate-rules.md` 表格第一列 gate 名 + `schema/gate_definitions/` 文件名,双向覆盖断言。表头/权威声明行已存在("以 definition JSON 为准"),检查只锁覆盖。
5. **exit-code 静态扩展。** 在 `exit-code-convention.test.mjs` 增加:对 `CLI_CONVENTION_INVENTORY` 每个工具,读源码提取 `process.exit(N)` 字面量集合,断言 class 声明(含 2 的 class 必须有 exit(2) 字面量;binary class 不得有)一致。运行时代表样本保留。
6. **`--check-prefix` 实现。** `check-project-reqs.mjs` 加 `--check-prefix <ABC>` 参数:查 prefixes 映射 + 该前缀全部 ID 三态;注册 → exit 0 打印;缺失/非法 → exit 2 usage。不影响 plan/archive 模式。
7. **no-hook 决定落地。** 不写任何 hook 文件;RET-006 delta 里记录决定;tasks 不含 hook 任务。

## 三原则应用记录

- **语义边界**:checker 读者 = 维护者/流程;有界问题 = "散文引用与当前树是否一致";停止点 = 确定性点名。`--check-prefix` 读者 = propose Agent;停止点 = 前缀的完整注册事实。
- **direct Source of Record**:路径→文件系统;CLI→`cli/`+源码;gate→definition JSON;exit code→源码字面量。
- **net simplification**:四个漂移类一个 checker;963 行预读 → 一行查询;未新增控制层。
- **helper-oriented**:User decision = hook(已拍板:不做);Agent execution = 修漂移;Engine verdict = checker 判定 + finalizer hard gate。

## Risks / Trade-offs

- [checker 对现存文档报大量假阳性] → apply 时先跑真实文档,逐条分诊(修散文 vs 修规则),冲突升级用户;checker 排除面显式 allowlist。
- [gate 表与 JSON 名不完全一致(如 rerun-ready 表行缺失)] → checker 先红;apply 时补表行(shared-gate-rules 是 generated-summary,补行是正确方向)。
- [静态 exit-code 扫描误判(如 `process.exit(2)` 只在 catch 路径)] → 扫描只断言"字面量存在性"级别的 class 一致性,不做控制流分析;文档 class 声明与字面量集合的粗粒度对照。
- [finalizer 串入新 checker 后旧 change 归档变慢] → checker 扫描面有限(反引号路径),成本可忽略。

## Migration Plan

无数据迁移。apply 顺序:checker 实现 → 真实文档跑通(分诊现存漂移)→ exit-code 静态扩展 → `--check-prefix` → finalizer 接线 → spec 同步 → 归档。

## Open Questions

无。hook 决定项已闭环(用户拍板:不做)。
