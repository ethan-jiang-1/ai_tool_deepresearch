# Tasks: carve-canonical-topic-state

- [x] 0.1 openspec-feedback:plan-review —— （2026-08-31）AUD-1 聚类地图 + W1 基线在案；validate --strict 绿；顺序违规（codemod 先于 change 目录）已在本 proposal 诚实登记。
- [x] 0.2 openspec-feedback:closeout-review —— （2026-08-31）diff 复核：4 新模块 + 主文件 1879→604 + contract 测试重指 + 基线测试；全量 0 fail；导出面 grep 对照（6 公开名 facade re-export + 其余不变）；无 open finding。
- [x] 1.1 按 AUD-1 聚类地图执行 codemod（move-only + export 前缀）：plan-schema 663 / bundle-io 177 / wave-projection 389 / inspect 263 / 主 604。Done condition 达成：五文件 node 加载 OK；全量 0 fail。
- [x] 1.2 facade re-exports 补齐（6 公开名）。Done condition 达成：32 消费者零改动；基线测试绿。
- [x] 1.3 contract 源文本锁重指模块族。Done condition 达成：测试绿。
- [x] 2.1 归档转场与提交：本勾选表示 §1 全部就绪；勾选后立即执行 finalizer 与 git commit；快照 Post-W2 追加至 plan §10。
