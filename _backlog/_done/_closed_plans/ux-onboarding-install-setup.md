# Plan: 安装 / 环境搭建 UX

**性质:** 纯文档 + package.json 修复  
**状态:** 设计中（2026-07-10）  
**优先级:** 高（所有后续 plan 的前置）  
**依赖:** 无  
**交叉:** `ux-coding-agent-permissions-setup.md`（装好了才能配权限）

---

## 0. 问题

用户 clone 仓库后无法直接跑起来：

- `package.json` 没有 `dependencies` 字段 — `zod` 和 `yaml` 在 13+ 个文件中被 import，但未声明
- `node_modules/` 不存在，依赖从未实际安装过
- 全仓库搜不到一句 "run `npm install`"
- 没有 `.nvmrc`，Node >=20 只在 prose 里提
- `.gitignore` 排除了 `package-lock.json`，即使装了也无法复现
- `DPT_FRAMEWORK/command_playbook/start-research.md` 和 `instantiate-run-bundle.md` 都写"npm 依赖已安装 (zod, yaml)"，但没告诉你怎么装

## 1. 设计原则

- **纯文档** — 不加 setup.sh、Makefile、bootstrap 脚本
- **极短** — README 里加 2-3 行 shell 就够
- **不动 framework 逻辑** — gate/schema/phase 行为不变

## 2. 要改的文件

### 2.1 `package.json` — 声明依赖

```json
"dependencies": {
  "zod": "^3.0.0",
  "yaml": "^2.0.0"
}
```

### 2.2 `.gitignore` — 提交 lockfile

移除 `package-lock.json` 行。这是应用不是库，应提交 lockfile 确保可复现安装。

### 2.3 新增 `.nvmrc`

```
20
```

### 2.4 `README.md` — 加 Setup 段

在 `## Start Here` 之前插入 `## Setup`：

```markdown
## Setup

git clone <repo>
cd ai_tool_deepresearch
npm install
```

### 2.5 `DPT_FRAMEWORK/command_playbook/start-research.md` — 前置条件改为可执行

第 8 行 `- npm 依赖已安装 (zod, yaml)` → `- 已运行 npm install（依赖 zod, yaml）`

### 2.6 `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md` — 同上

第 9 行 `- npm 依赖已安装 (zod, yaml)` → `- 已运行 npm install（依赖 zod, yaml）`

## 3. Non-Goals

- 不加 setup.sh / Makefile / bootstrap 脚本
- 不加冒烟测试步骤
- 不加 `npm start` / `npm run dev` 等脚本
- 不动 gate / schema / phase 行为
- 不引入新依赖

## 4. 建议下一步

小 propose 或直接改（改动量极小，纯工程修复性质）。
