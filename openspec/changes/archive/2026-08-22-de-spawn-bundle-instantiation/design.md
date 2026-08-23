## Context

- 串行基线：605s（WS-A 后实测 542s），2799/2799。leaf CPU 和 ~893s（并行 TAP 累计，
  含争用膨胀）。
- 单次 `new-disposable-bundle.mjs` 冷启动实测 619ms（node 42ms + CLI 模块加载 zod/yaml +
  模板落盘）。top-6 文件 87 处 per-test 实例化 spawn ≈ 48-54s 串行。
- 实例化输出是一份**字节可复制**的 bundle 模板：后续测试各自覆写
  rb_plan.md frontmatter / rb_profile.yaml / rb_status.json / 具体 artifacts。
  `fs.cpSync` 克隆 ~20-50ms。
- 命名契约：`new-disposable-bundle.mjs` 产出 `dpt_disp_${name}_${hexSuffix}`（1 位
  hex，`randomInt(0,16)`），且被 `new-disposable-bundle.test.mjs` 的 `[0-9a-f]$`
  断言锁为契约；`--force` = 先 rmSync 再落盘。克隆必须保持同一形状，避免破坏任何
  依赖 dir-basename 形状的检查（如 setup-ready 的 basename 一致性）。

## Goals / Non-Goals

**Goals:**

- 把 top-6 文件的 per-test 实例化 spawn（87 处）降到每文件 1 处（模板），串行省 ~48-54s。
- 克隆后的 bundle 与现行为**逐字节等价**：dir 名形状、plan_basename、status window、
  profile 覆写全部与现状一致。
- 断言、用例数量、验证-plan claim 零变化。
- 排除「被测对象就是实例化 CLI」的文件，保留其真实 spawn。

**Non-Goals:**

- 不处理 CLI gate/inspect spawn 本身（那是 WS-C 语义层的事）。
- 不扩大 hex 后缀空间（契约测试锁定；且这不是瓶颈）。
- 不改 `npm test` 命令/发现/超时；不改测试类。

## Decisions

### D1 克隆 helper（唯一新增的共享代码）

在 `tests/e2e/helpers/deterministic-chain-harness.mjs` 增加：

```js
export function cloneBundleTemplate(template, name, { targetDir, caseId = null, patchPlanBasename = false } = {}) {
  const hexSuffix = randomInt(0, 16).toString(16);
  const dirName = caseId ? `dpt_disp_${caseId}_${name}_${hexSuffix}` : `dpt_disp_${name}_${hexSuffix}`;
  const dest = join(targetDir, dirName);
  rmSync(dest, { recursive: true, force: true });          // --force parity
  cpSync(template, dest, { recursive: true, errorOnExist: true });
  if (patchPlanBasename) {
    const planPath = join(dest, 'rb_plan.md');
    const profilePath = join(dest, 'rb_profile.yaml');
    // rewrite plan_basename: <old> -> <name> in rb_plan.md frontmatter and rb_profile.yaml
  }
  return dest;
}
```

- `randomInt(0,16)` 来自 node:crypto（helper 文件已可 import）；命名形状与
  new-disposable-bundle 完全一致（含 caseId 变体，handoff 等文件将来可用）。
- `patchPlanBasename` 只对 setup-ready 启用（其 gate 校验
  `normalize(dpt_disp_rt_<name>_<hex>) == plan_basename`）；其余文件由测试自身的
  覆写逻辑维持 plan_basename 语义（现状即如此）。

### D2 每文件重构模式

- `before(() => { template = <原 createBundle 的一次调用>; })`——唯一保留的 spawn。
- `createBundle(name)` 改为 `const dir = cloneBundleTemplate(template, name, {...});`
  + 原有的 post-writes（status window / plan frontmatter / profile / artifacts）原样执行。
- 模板名用每文件固定字面量（如 `'w1-template'`），克隆名沿用现有 `unique('...')`。
- 注意 `createdDirs`/track：模板与每个克隆都要入 cleanup 列表（模板在 after() 删除）。

### D3 setup-ready 身份不变量

`check-gate-setup-ready` 的 gate 校验「bundle 逻辑名 == plan_basename == profile
plan_basename」（`dpt_disp_rt_<name>_<hex>` 归一化）。克隆时若 plan_basename 仍是
模板名会 mismatch。处置：该文件 `cloneBundleTemplate(..., { patchPlanBasename: true })`，
helper 把 rb_plan.md frontmatter 与 rb_profile.yaml 的 `plan_basename:` 改写为克隆逻辑名
（与 now 的 `plan_basename: ${name}` 覆写等价的机械改写）。其余 5 文件不启用（其 gate
不比对 basename；apply 时 grep 验证）。

### D4 e2e 文件

`wave1-target-receipt-wave2-closure`（deterministic_e2e）同样用 NEW_BUNDLE + BUNDLES_DIR
做 per-test setup → 同一 clone 模式。它的链式步骤（gate/inspect 生产 CLI 调用）不变，
class 不变。

### D5 排除清单

`check-gate-instantiation-complete`、`instantiate-run-bundle.test.mjs`、
`new-disposable-bundle.test.mjs` 以实例化 CLI 本身为被测对象，保留真实 spawn；
`validate-bundle.test.mjs` 的 bundle 是 validate CLI 的 fixture 输入（每次结构不同），
不在本 change。

## Risks / Trade-offs

- plan_basename/身份语义回归：D1 的命名形状 + D3 的 patch 保证等价；apply 时对 6 文件
  grep 所有 `plan_basename`/basename 比对，发现意外比对则补 patch 或排除该文件。
- cpSync 大目录耗时：bundle 模板 ~几十 KB-几百 KB，cpSync 毫秒级；无风险。
- 并行下克隆目标唯一：克隆名沿用 unique()（Date.now + 随机），跨文件/跨测试不撞。
- 若某文件 post-writes 依赖模板的「新鲜生成」副作用（不存在：NEW_BUNDLE 只写模板文件），
  克隆等价。
