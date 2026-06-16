# 关键架构决策

## 1. 纯 JavaScript, 零 TypeScript

**决策**: 不使用 TypeScript。手写 `.mjs`。

**理由**: MD 和 JS 之间不需要编译层。Agent 读 MD 命令 playbook，调用 `node xxx.mjs`。TypeScript 多一层编译对 Agent 无益。

## 2. 仅 2 个 npm 依赖

**决策**: zod (schema 校验) + yaml (YAML 解析)。不可新增。

**理由**: 最小化外部依赖。其余全部 Node.js 内置: util.parseArgs, fs, test, assert, path。

## 3. Framework ↔ Bundle 同级, 不拷贝

**决策**: `DPT_FRAMEWORK/` 和 `dpt_rb_{name}/` 平级放在项目根目录。Bundle 通过 `../DPT_FRAMEWORK/` 引用框架。

**理由**: V12 拷贝 `_framework/` 进每个 bundle 导致无法共享。同级共享让一份框架服务所有 bundle。

## 4. 目录即约定, 无配置文件

**决策**: 不依赖 `deep-research.yaml` 或类似配置文件。目录结构本身就是约定。

## 5. C&I 双保险

**决策**: Check (Zod 硬性验证，写入前拒绝) + Inspect (CLI 诊断，事后审视)。LLM 负责信息加工，JS 负责质量保证。

## 6. Capability 命名前缀

**决策**: cmd-* = Agent 读的 Markdown playbook, cli-* = JS 脚本, 无前缀 = 普通 capability。

## 7. 实验分离

**决策**: `experiments/` (原型, 冻结) 和 `tests/` (回归, 演进) 物理隔离。
