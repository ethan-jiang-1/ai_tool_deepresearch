---
bug_id: BUG-137
title: "Topic reference filenames omit the full topic slug and are counted as zero by Wave1"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-influence-landscape
phase: wave1
node: phases/phase-wave1.md
gate: wave1-complete
status: active
---

# BUG-137: topic reference 文件名没有使用完整 topic slug

## 现象

`reference/README.md` 明确规定 topic-specific reference 使用：

```text
{slug}-<qualifier>.md
```

其中 `slug` 是已经包含 `NN_` 前缀的完整 topic slug，例如：

```text
01_openspec-core-design-workflow-<source>.md
```

但本 bundle 的 96 个 reference 文件实际都采用只有两位编号的形式，例如：

```text
01-wave1-evidence.md
01-wave1-deep-dive.md
02-wave1-evidence.md
08-wave1-questions.md
```

对 96 个 topic-prefixed 文件进行完整 slug 对照，匹配完整 registered topic
slug 的数量为 `0`。实际每个 topic 都有 12 个文件，但都没有使用其完整 slug。

## 可复现证据

运行：

```bash
node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs \\
  --bundle dpt_rb_openspec-influence-landscape
```

inspect 对所有 8 个 topic 都报告：

```text
Count floor not met for reference/*01_openspec-core-design-workflow*.md:
0 countable references (threshold: 10)
Count floor not met for reference/*02_sdd-ecosystem-competitive-landscape*.md:
0 countable references (threshold: 10)
...
Count floor not met for reference/*08_real-team-experiences*.md:
0 countable references (threshold: 10)
```

这不是单纯的 `_INDEX.md` 缺行：即使为现有 96 个文件补齐 index rows，
当前 topic filename pattern 仍无法匹配 Wave1 的 per-topic count floor。

## 契约对照

- `reference/README.md` 要求 `{slug}-<qualifier>.md`，并说明 slug 是完整 topic
  slug。
- `openspec/specs/reference-flat-format/spec.md` 将 topic-specific reference
  定义为 `{topic_slug}-<source-qualifier>.md`。
- Wave1 inspect 的实际 count-floor pattern 使用 registered topic slug；因此
  当前文件名被当作不属于任何 topic 的 reference。

## 影响

1. 已产出的 topic references 在目录里可见，却无法被 Wave1 的 topic count
   evaluator 识别。
2. 每个 topic 的有效 reference 数量被错误判为 0，直接阻断 Wave1 Gate。
3. Agent 可能误以为需要重新搜索 8 个 topic，重复生产 evidence；也可能通过
   改 index 或复制文件尝试凑数，不能解决根本的 filename-to-topic binding。
4. README、topic registry、reference filenames 和 Gate evaluator 对同一 topic
   使用了不同的 identity projection。

## 根因假设

当前 run 沿用了旧的编号前缀命名模板（`NN-waveX-*`），而 reference-flat-format
与 Wave1 count evaluator 已迁移到完整 topic slug 命名。文件 materializer、
README/guidance 与 evaluator 没有共享同一个 canonical filename renderer。

## 建议方向

1. 让 reference materializer 与 evaluator 共用 canonical topic-slug filename
   contract；不要由 Agent 手工截断为两位编号。
2. 明确历史文件的迁移/兼容边界：对当前 run 提供可审计的 rename/migration，
   保留 metadata、declaration 和 backing 绑定，不靠复制文件制造新 evidence。
3. 增加 deterministic regression：每个 registered topic 产出一个
   `{full_topic_slug}-<qualifier>.md` 后，Wave1 count evaluator 必须计入该文件；
   `NN-wave1-*` 只能作为显式 legacy layout，不能静默当作当前 topic reference。

## 接手信息

### 已确认的 producer/consumer 不一致

`phase-wave1.md` 的 Phase-owned materialization contract 写的是
`reference/{topic.slug}-<source-slug>.md`。Wave1 evaluator 随 canonical topic
registry 展开 per-topic reference target，并按完整 slug 的 pattern 计算 floor。
本 bundle 的 `01-wave1-*` 等文件没有一个以 current `topic.slug` 开头，所以
它们在 filesystem 中存在，却不属于 evaluator 的任何 topic bucket。

这也是为什么本卡的 CLI red loop 很强：`inspect-wave1-output` 对 8 个 canonical
topic 都给出 `0 countable references`，而不是仅报告 presentation advisory。

### 迁移边界

- 这不是只做 `mv` 的 cosmetic repair。文件名会被 seed return-map refs、
  `_INDEX.md` rows、reference metadata/topic binding 和可能的 output declaration
  locator 消费；迁移必须保持同一份 submitted backing，不能通过复制形成新 evidence。
- [BUG-136](BUG-136-reference-index-not-refreshed-after-wave-materialization.md)
  处理 index row 缺失；先解决本卡的 canonical names，或在同一 materialization
  transaction 内更新 filenames 与 index。
- [BUG-133](BUG-133-wave1-reference-floor-deficit-not-turned-into-repair-demand.md)
  的 bundle 已经能按完整 slug 计到 `6/5/5/6`，故它不是本卡的重复；filename
  identity 恢复后仍可能存在真实数量缺口。

### 完成判据

1. 新建 Wave1 projection 必须由 canonical topic slug renderer 产生，不能由
   Agent 截断成两位编号。
2. current-layout full-slug files被 count evaluator、index evaluator 与 seed refs
   一致识别；legacy layout 只有在有明确 compatibility/migration rule 时才可读取。
3. regression 覆盖完整 slug 正常计数、`NN-wave1-*` 不被静默计入、以及迁移后
   backing/declaration hashes 不变。
