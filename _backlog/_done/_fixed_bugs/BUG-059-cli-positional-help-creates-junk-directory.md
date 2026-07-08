# BUG-059 — operate-queue/operate-work-unit CLI 把 `--help` 当作 bundle 名，在 repo root 创建垃圾目录

| 属性 | 值 |
|------|-----|
| ID | BUG-059 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P2 — 产生垃圾文件，不破坏数据，但污染 repo root |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run 过程中发现 |
| 影响文件 | `DPT_FRAMEWORK/cli/operate-queue.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs` |

## 现象

Agent 在 seed-topics phase 执行 `operate-queue.mjs enqueue` 时，在某次调用中把 `--help` 传到了 bundle 位置，导致 repo root 下产生了一个名为 `--help` 的目录，内含 `_logs/run.log` 和 `rb_trace.jsonl`，像一个残缺的 run bundle。

## 复现

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue --help
# 或
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim --help
```

会在 CWD 下产生 `--help/` 目录。

## 根因

两个 CLI 都使用裸 positional parsing：

`operate-queue.mjs:37`:
```js
const [command, bundle] = process.argv.slice(2);
```

`operate-work-unit.mjs:32`:
```js
const [command, bundle] = process.argv.slice(2);
```

`--help` 落在第二个位置 → `bundle = '--help'` → `path.resolve('--help')` → 被当成合法 bundleDir。`loadQueue` 在 command dispatch 之前无条件执行（`operate-queue.mjs:403`），所以目录、log、trace 甚至在 `--task is required` 报错之前就已经写盘了。

## 事故链

1. `bundle = '--help'`
2. `bundleDir = path.resolve('--help')` → `<cwd>/--help`
3. `loadQueue(bundleDir)` 无条件执行 → `ensureTrace` 创建 `--help/rb_trace.jsonl`，`createRunLogger` 创建 `--help/_logs/run.log`
4. `createQueue(path.basename('--help'))` → `queue_id = '--help'`
5. enqueue command 检查 `--task` → 缺失 → throw → `saveQueue` 从未执行 → 没有 `rb_queue.json`
6. 目录留在磁盘上：`_logs/run.log` + `rb_trace.jsonl`，无 `rb_queue.json`

## 修复方向

两个选择，可同时做：

1. **加 `--help` flag 处理**：在 positional destructure 之前用 `process.argv.includes('--help')` 拦截，打印 usage 并 `process.exit(0)`
2. **加 bundle dir 合法性 guard**：在 `loadQueue`（或共享入口）中，当 `bundleDir` 不像合法 bundle（没有 `rb_status.json` 且路径名以 `-` 开头等可疑特征）时，拒绝创建目录并给出明确错误

对比：其他 CLI（`enter-phase.mjs`, `advance-status.mjs` 等）正确使用 `parseArgs` + named `--bundle` option，**不受此问题影响**。
