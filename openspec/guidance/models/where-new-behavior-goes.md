# Where New Behavior Goes

> 状态: model | 角色: 正确路径（change-placement）导航
> 非权威：本文件是 descriptive 导航约定；各层「首选入口」与「升级条件」的 normative effect 归对应 accepted spec / executable contract，不由本文件授予。

## 读者与有界问题

读者是一个拿到「新增/修改行为」需求的 coding agent，问：**这个改动应该落在哪一层、哪个机制，升级到上一层的条件是什么？** 本文件给出首选入口与升级条件后即停止；实现细节交给对应的 capability spec 或 cookbook。

## 参与阶梯（L0–L3）

按改动半径从小到大排列。**阶梯不是价值排序**：L0 的配置替换是完整能力，L3 也不「更先进」，只是影响半径最大、同步义务最多。「本可用低层表达却升到高层」是乱发挥的典型形态。

| 层级 | 首选入口 | 典型变化 | 升级条件 |
|---|---|---|---|
| L0 组合/配置 | `openspec/config.yaml`、profile/参数、run-bundle 模板 | 换参数、换 profile、改默认值 | 配置表达不了新行为 |
| L1 capability 契约 | `openspec/specs/<domain>/<capability>` 的 spec delta + 对应 gate/check/CLI 契约 | 新增/修改一个确定性检查、gate、或 research 阶段内容 | 需要一项可替换的完整能力 |
| L2 完整能力 seam | 需要「可替换实现 + 稳定接口」之处（Agent/Engine 边界、`research-access-adapter` 类） | 新的 filesystem/LLM/sandbox 后端 | 现有扩展点与 seam 都表达不了 loop 驱动 |
| L3 core loop | `DEEP_RESEARCH_HARNESS/` 的核心 Engine / Agent Flow 驱动 | 改变默认循环驱动 | 现有扩展点与 seam 都表达不了所需行为 |

## 归属五问（面对新行为依次问）

1. 它只是替换配置或组合吗？是 → 留 L0。
2. 它能由现有 capability 契约（spec delta + gate/check）表达吗？是 → 留 L1。
3. 它是一项需要可替换实现、由稳定接口消费的完整能力吗？是 → 设计完整 seam，进 L2。
4. （横切义务，无论选哪层都查，不是升级判据）它是否新增「必须持久化、且 reload/resume/fork 后要重建」的事实？是 → 同步扩展持久化投影。
5. 现有扩展点与 seam 都表达不了所需驱动吗？此时才论证 L3。

## 边界

- 本文件是导航约定，不是行为权威；「改哪里」的最终判定以对应 accepted spec / executable contract 为准。
- 改 core loop（L3）时，`DEEP_RESEARCH_HARNESS/` 受 OpenSpec phase gate 约束（apply 前只读），该只读边界由仓库常驻规则拥有，不由本文件改变。
- 归属问题先于实现问题：先查本表回答「改哪里」，再谈实现。
