## Context

BUG-095 记录了 disposable creator 把 `--help` 作为 `args[0]` 并完整创建 `dpt_disp_--help_<hex>/` 的事实。生产 instantiator 有同一裸位置解析，`--help` 同样能进入其 `dpt_rb_${bundleName}` 写入路径。两个 creator 目前都只在文件系统操作之后依赖 `validate-bundle`、`inspect-bundle` 或后续 Gate；这些检查不能撤销已创建的目录、trace 或日志。

受影响的 direct Source of Record 是一次 invocation 的 argv、显式 `--target-dir` 与 creator 构造的最终 basename。现有 instantiation Gate 的命名 pattern 是后置 bundle-structure check，不是 creator 输入安全的 authority。BUG-059 的 queue/work-unit 修复已证明：帮助与可疑位置输入必须在 runtime side effect 之前截断。

本设计已 paired-review `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`：这里没有 Agent 语义判断、用户 checkpoint、状态迁移或 recovery；Engine/CLI 只对可机械判定的 argv 结构给出一个最近动作。

## Goals / Non-Goals

**Goals:**

- 两个 creator 都在任何目录、控制文件、trace 或日志写入前完成 argv 解析、option 完整性与名称合法性检查。
- `--help` 成为零副作用、退出码为 0 的独立入口；无效 invocation 以非 0 退出并保留 target root 的已有内容不变。
- 生产与 disposable 输出名分别符合其既有 Gate 的字符边界，且成功 bundle 仍是显式 target root 的直接子目录。
- 保留所有已审计的合法调用形状：production `<name> [--target-dir <dir>|--target-dir=<dir>]`；disposable `<name>` 加 `--case`、`--nodes`、`--target-dir` 的分离或 `=` 形式及 `--force`。

**Non-Goals:**

- 不改变已有 bundle、自动清理 BUG-095 的历史目录，或加入 repo-wide sweep。
- 不新增 Gate、trace event、持久 schema、命名 registry、Agent Flow、后台 watcher 或 recovery path。
- 不把所有仓库 CLI 重写为统一 parser；本 change 只处理唯一两个会从位置名称创建 bundle 的入口。
- 不改变 production 的 `--force` 禁止语义，也不改变 disposable 的合法 `--force` 覆盖语义。

## Decisions

### 1. 每个 creator 在自身入口使用一次严格的 `node:util.parseArgs`

两个 CLI 的 option 集不同，分别在其入口声明严格 options 和允许的位置参数。解析后只接受一个 name positional；`--help` 在触碰 git/repo root 或文件系统前返回 usage 与 0。未知 option、重复/多余 positional、缺少 value 或空 value 通过同一解析边界失败，输出 usage 加一个具体的 argv 错误。

选择 `parseArgs` 而非继续 `args[0]` 加零散 `includes/indexOf`：它直接拥有当前 invocation 的 argv truth，并防止 option 顺序、缺值和未知 flag 从不同分支漏入创建路径。选择分别定义而非新建共享 parser：两组合法 option、输出路径和覆盖语义不同；一个跨 framework/experiment 的通用抽象会比两段短入口规则增加更多 API、测试与兼容边界。

### 2. 名称与嵌入目录的每个 segment 都在创建前验证

production name SHALL match `^[a-z0-9][a-z0-9-]*$`。disposable name 与可选 case fragment SHALL each match `^[a-z0-9][a-z0-9_-]*$`；creator 在保留现有 trailing-underscore normalization 后构造 `dpt_disp_<case_?><name>_<hex>`。因此 `--help`、空白、slash/backslash、`..`、前导 `-`、路径遍历和 Gate 不接受的字符都无法进入插值路径。

这复用现有 `gate-instantiation-complete` 的 production/disposable 字符集，而不是另设更宽或更窄的命名 authority。creator 不需要运行 Gate：它只在写前验证能够安全构造的输入；Gate 继续对已存在的 bundle surface 负责。

### 3. 失败顺序是 parse/name → target creation → existing creation flow

只有当 argv 和 name/case fragment 都有效后，creator 才解析 repo root、读取 version/template 或执行 `mkdirSync(targetDir)`。随后保持既有 collision、production no-overwrite、disposable force、schema validation 与 validate/inspect 流程。非法 invocation 不建立临时 workspace，也不尝试 rollback，因为正确的最短闭环是根本不开始 mutation。

错误文本说明一次最近动作：`--help` 展示正确调用形状；缺失/未知 option 指向 accepted option；非法 name 指向该 creator 的命名 pattern。调用 Agent 可以直接换成合法 `<name>` 或修正 option 后重跑相同命令；不需要用户参与或另一个恢复命令。

### 4. 验证以真实 child process 和真实文件系统为准

新增/扩展 `tests/integration/` Node tests，以 `spawnSync` 调用实际 CLI，并只在 test-owned temporary target root 断言：

- `--help` 退出 0、写 usage，且即使给出不存在的 `--target-dir` 也没有创建任何路径；
- flag/name、路径形 name、未知 option、缺 option value 和多余 positional 非 0 退出，且目标保持为空；
- 两个 creator 的一条合法路径仍创建通过现有 validate/inspect 的 direct-child bundle；
- production `--force` 的既有拒绝与 disposable 合法 `--force` 保持原有边界。

这属于 `integration`：child process、CLI argv、真实临时目录和 creator side effects 都是被测 deterministic boundary。没有 Agent 判断、真实 runtime workflow 或外部调用，故其余三个 test class 应在 verification plan 明确 `not_applicable`。

## Risks / Trade-offs

- **[现有脚本依赖未文档化的宽松 name]** → 先用全仓调用点审计锁定现有合法 shape；spec 接受 Gate 已允许的字符集，并用合法创建回归保护。
- **[过早创建 target root 使“零副作用”落空]** → tests 对不存在和已存在但为空的 test target 都断言，不允许 `mkdirSync(targetDir)` 出现在 parse/name checks 之前。
- **[把 Gate pattern 复制成第二 authority]** → design 只复用其字符语言；creator 的 requirement 明确是预写输入合法性，Gate 仍是已创建 bundle 的结构 verdict owner。
- **[通用 parser 扩张成跨层 infrastructure]** → 两个 creator 各自使用短 `parseArgs` 声明，不导出 helper、不引入依赖。
- **[历史垃圾目录被误删]** → change 不含 cleanup；维护者若需要删除，另以明确目标和授权处理。

## Migration Plan

1. 先加入会失败的 integration tests，使用 isolated temp roots，不在 repo root 复现 BUG-095。
2. 在两个 creator 的第一个写盘前实现严格 parsing 与名称/segment validation，并补上 CMI-008 / EXS-003 implementation annotations。
3. 跑 focused tests、现有 instantiation/targeting regression、governance checks、workflow/package validation 与 verification-routing asset check。
4. 更新 v0.37 CHANGELOG/RUN banner；不迁移或删除任何既有 bundle。

Rollback 是还原这两处 creator 代码和 specs；本 change 不产生新 runtime state 或持久格式，因此没有 bundle migration 或 recovery 数据。

## Open Questions

无。`--help` 的零副作用、严格单一 name positional、两套已有字符边界、historical cleanup 不在 scope，以及 v0.37 都已确定。
