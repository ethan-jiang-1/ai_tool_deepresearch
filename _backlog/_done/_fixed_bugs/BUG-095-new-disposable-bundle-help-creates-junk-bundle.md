# BUG-095 — `new-disposable-bundle.mjs` 把 `--help` 当作 bundle 名，在 repo root 创建 `dpt_disp_--help_*` 垃圾 bundle

| 属性 | 值 |
|------|-----|
| ID | BUG-095 |
| 发现日期 | 2026-07-19 |
| 严重级别 | P2 — 产生垃圾 bundle 目录，不破坏数据，但污染 repo root |
| 来源 | repo root 发现 `dpt_disp_--help_7/` 和 `dpt_disp_--help_e/` 两个完整 bundle 目录 |
| 影响文件 | `experiments_env/shared/new-disposable-bundle.mjs` |

## 现象

repo root 下存在两个垃圾 disposable bundle：

```
dpt_disp_--help_7/
dpt_disp_--help_e/
```

两者都是**完整**的 run bundle（含 `rb_status.json`、`rb_queue.json`、`rb_profile.yaml`、`rb_plan.md`、`rb_trace.jsonl`、`BUNDLE_MAP.md`、`_logs/run.log`、scaffold 目录），说明 `new-disposable-bundle.mjs` 从头到尾成功执行，没有在任何校验阶段失败。

hex suffix `7` 和 `e` 来自 `randomInt(0, 16).toString(16)`（line 62），证明是两次独立调用。

## 复现

```bash
node experiments_env/shared/new-disposable-bundle.mjs --help
```

在 repo root 下产生 `dpt_disp_--help_<hex>/` 完整 bundle。

## 根因

`new-disposable-bundle.mjs` 使用裸 positional parsing（line 29）：

```js
const bundleName = args[0];
```

与 BUG-059（`operate-queue.mjs` / `operate-work-unit.mjs`）**完全相同的根因**：

1. `--help` 落在 `args[0]` → `bundleName = '--help'`
2. `!bundleName` 检查通过（`'--help'` 是 truthy string）
3. 没有任何检查拒绝以 `--` 开头的 bundleName
4. 没有 `--help` flag 处理
5. 目录名合法通过 gate naming pattern（`dpt_disp_[a-z0-9][a-z0-9_-]*_[0-9a-f]+` — `--help` 中的 `-` 在 `[a-z0-9_-]` 范围内）

## 与 BUG-059 的关系

BUG-059 是同一 bug class 的首次发现（`operate-queue.mjs` + `operate-work-unit.mjs`），当时修复了那两个 CLI。但 `new-disposable-bundle.mjs` 从未被修复——它是 later addition，没有采用 BUG-059 修复中建立的 pattern（`--help` flag 拦截 + bundle 名合法性 guard）。

同样受影响的还有 `instantiate-run-bundle.mjs`（line 29: `const bundleName = args[0]`），但 production bundle 的 `--force` 检查 + Zod validation 可能会中途拦截（未验证）。

## 事故链

1. `bundleName = '--help'`
2. `strippedName = '--help'`（无 trailing underscore）
3. `dirName = 'dpt_disp_--help_<hex>'`（no caseId）
4. `bundleDir = '<repoRoot>/dpt_disp_--help_<hex>'`
5. 目录不存在 → 正常创建完整 bundle 结构
6. 所有 Zod schema 校验通过（`plan_basename: '--help'` 不违反任何 schema 规则）
7. validate-bundle + inspect-bundle 通过（`--help` 是合法 kebab-esque string）
8. 完整垃圾 bundle 留在磁盘上

## 修复方向

三个 layer，与 BUG-059 修复对齐：

1. **加 `--help` flag 处理**：在 positional destructure 之前用 `process.argv.includes('--help')` 拦截，打印 usage 并 `process.exit(0)`
2. **加 bundleName 合法性 guard**：拒绝以 `--` 开头的 bundleName，给出明确错误信息
3. **加 bundleName pattern 预检**：在创建目录之前验证 bundleName 匹配 `^[a-z][a-z0-9_-]*$`（至少不以 `-` 开头），与 gate naming pattern 的 name 部分对齐

同样检查 `instantiate-run-bundle.mjs` 是否需要同修。

## 复现证据

```bash
$ ls -d /Users/bowhead/ai_tool_deepresearch/dpt_disp_--help_*
dpt_disp_--help_7
dpt_disp_--help_e

$ ls dpt_disp_--help_7/
BUNDLE_MAP.md  _cache/  _logs/  _work_units/  artifacts/  final/
rb_plan.md  rb_profile.yaml  rb_queue.json  rb_status.json
rb_trace.jsonl  reference/  seed_topics/

$ cat dpt_disp_--help_7/rb_profile.yaml
plan_basename: --help
research_profile: not_selected
...
```

## 修复结论

已由 OpenSpec change `harden-bundle-creator-arguments`（v0.37，commit `7ad92777b`）修复并归档。

- `new-disposable-bundle.mjs` 现在在任何 repo/root/target/bundle 写入前严格解析完整 argv；standalone pre-delimiter `--help` 先打印 usage 并以 0 退出。
- 非法 positional、未知/重复/缺值 option 和非 canonical `--case` 都在 target directory 创建前拒绝；`--` 后的 `--help` 保持 positional 并按 name grammar 拒绝。
- 同类 production creator 已同时修复，且 validation/inspection 对 literal target path 使用 child-process argument vector。
- 真实 child-process integration 覆盖 help 零写入、拒绝路径、含引号 target path、nodes copy 及 disposable `--force` collision replacement；focused suite 与完整 `npm test` 均通过。

历史 `dpt_disp_--help_*` 目录未由该 change 自动删除；它们是明确 out-of-scope 的既有垃圾数据。
