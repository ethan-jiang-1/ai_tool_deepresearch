# 07 — 已为本机制决定：`guidelines/` 不搬，强化 OpenSpec bridge

> **状态：RESOLVED FOR THIS MECHANISM。** `08` 选择 A：`guidelines/` 保持原位，但其新增/修改走
> OpenSpec lifecycle；OpenSpec artifact/operation guidance 在事件上主动读取它。是否未来因其它独立理由
> 重组整个 guidance suite，仍可另开 constitutional change，但不再阻塞本 feedback loop。

## 1. 直觉（用户的）

“越发感觉到 `guidelines/` 应该移入 `openspec/`。”

这个直觉和本分析的根因是**同一件事**：`guidelines/` 之所以“最初提醒了、却没形成跨 session 的 loop、
各干各的”，不只是“内容是静态 prose”，而是它的**物理位置没有自动提供 lifecycle enforcement**：

- 文件系统允许**直接编辑**；Charter 虽要求项目演进走 OpenSpec，但当前没有 checker/transition 强制 guidance
  修改一定来自 propose→apply→archive；
- guideline 文件本身不逐条进 `req-registry.yaml`；只有相应 accepted constitutional/capability requirement
  和 review 才能治理其行为；
- 当前主动进入 change context 的方式，主要是 `openspec/config.yaml` 的 proposal/design rules 用**引用**把它拉进去；
  历史上同一 config 的 `rules.tasks` 已证明能可靠生成治理义务，但 proposal/design guideline 引用仍只是
  **产物生成时的静态注入**，不会在 resumed apply/archive 事件重新给反馈。

所以“移入 openspec/”的本质诉求 = **让 guidance 成为一个被生命周期治理、可追溯、能在 loop 里 fire 的对象**。
这跟 `06`（让智慧从 pull 变 push、进 loop）是同一个根因的不同表现。

## 2. 为什么它不是 trivial——宪法张力（已核实）

`guidance-constitution` 里有**刻意**的隔离：

- **GCO-008**（`openspec/specs/guidance-constitution/spec.md:127-130`）：guidance 的导航
  “SHALL stay within `guidelines/`，SHALL NOT route to `openspec/config.yaml`、downstream capability
  specs…”；且 `:127`“Project Charter 无 `defers_to`；其余每个 guideline 恰好一个
  `defers_to: guidelines/project-charter.md`”。
- **GCO-002 admission test**（`spec.md:23`）：宪法级不变量必须“在移除所有 incident/BUG/Wave/CLI/
  file-format/implementation 名字后仍成立”——即 **guidance 必须 implementation-neutral**。
- 而 `openspec/specs/` 恰恰是 **mechanism-specific**（它点名 command、file、schema、gate）。

GCO-008 限制的是 **guideline 自己的 constitutional navigation 向下游跳转**，不禁止 OpenSpec config
从下游把相关 guideline 推入 proposal/apply context；其 scenario 反而明确要求 `openspec/config.yaml`
把相关设计引向 ordered evolution directions。这正是选项 A 的合法桥。

结论：**物理上把 `guidelines/` 搬进 `openspec/` 是宪法级改动，不是 refactor**；搬进去之后还得在
`openspec/` 内部**重建 neutrality 隔离**，否则 mechanism-specific 的 specs 会污染 implementation-neutral
的 guidance。

## 3. 它是个梯度（A/B/C），不是二选一

| 选项 | 做什么 | 收益 | 成本 |
|---|---|---|---|
| **A. 不搬，强化桥** | guidance 留 `guidelines/`，但：① guidance 的编辑也走 OpenSpec change lifecycle；② 把 `config.yaml` 那条静态注入升级成 advisor（给反馈，见 `06`） | 拿到 loop 的**绝大部分**好处 | 低；不改宪法，只把已存在的桥接通 |
| **B. 拆分搬迁** | 宪法/evolution-direction 那层（implementation-neutral 根）留 `guidelines/`；**只把操作化设计纪律**（`06` 的 7 条 wisdom、要 fire 的东西）作为 governed spec 移入 `openspec/` | 真正该 fire 的东西进了 governed 层 | 中；要界定“哪些是 neutral 根、哪些是 operational” |
| **C. 整体搬迁** | `guidelines/` → `openspec/guidelines/`，全部进 change lifecycle | 最彻底的整合 | 高；要改 GCO-008 + Charter + `defers_to` 链，并在 `openspec/` 内重建 neutrality 隔离 |

## 4. 本机制的决定

选择 **A，不是 B/C**。理由：C 的主要好处（guidance 进 lifecycle、可追溯、能 fire）**A 用最小代价就能
拿到**——关键不在“目录在哪”，在“它有没有进 lifecycle、桥有没有 fire”。而 C 要付的宪法代价
（拆 `defers_to` 链、重建 neutrality 隔离）很重，且搬完还得把那道隔离在 `openspec/` 里重做一遍，等于
绕一圈。

具体落点：七问进入一个短的 `guidelines/change-feedback-loop.md`；触发、finding→tasks、finalizer 行为进入
accepted OpenSpec spec 和 `openspec/config.yaml`。guideline 的任何更新也通过一个 OpenSpec change 完成。

## 5. 决定时真正要回答的问题

若未来重新打开整体搬迁问题，真正要回答的仍不是“目录看起来整不整齐”，而是：

> **你想要的是“guidance 进 governed lifecycle”（→ A 就够），还是“guidance 和 specs 在同一个物理治理
> 空间里平起平坐”（→ 要 B/C）？**

辅助判别：痛点是“guidance 漂移没人管”（→ A），还是“guidance 与 specs 分家导致割裂”（→ B/C）？

## 6. 与本分析其它部分的关系

- 与 `06`：`06` 的 carrier/advisor 已经假设 wisdom 可以从 `guidelines/`（或一个 governed 源）拉进 loop；
  本文件问的是**那个源该物理上住哪、受不受 openspec lifecycle 治理**。二者正交：`06` 的机制（advisor
  注入）无论 A/B/C 都需要；本文件决定 wisdom 的**归属与治理级别**。
- 与 `01`/`04`：本文件是 loop 根因的**另一面**——`01` 说“检查义务已能进入 tasks，但执行没绑定
  archive transition”，本文件说“guidance 已能在 artifact generation 被引用，但没在 apply/archive
  事件重新 fire”。两侧都不是完全游离于 lifecycle；缺的是 feedback 与 deterministic closure。

## 7. 本机制明确不做

- 不移动 `guidelines/`。
- 不改 GCO-008 / GCO-002 / Charter / 任何 `defers_to`。
- 不新建 `openspec/guidelines/` 或 guidance capability。
- 不以目录搬迁作为获得自动反馈的前置条件；bridge 的行为和验证见 `08`。
