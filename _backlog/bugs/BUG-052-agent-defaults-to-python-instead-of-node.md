# BUG-052: Agent 在纯 Node.js 项目中默认使用 Python 做数据操作

## 严重程度
P2 — 环境依赖风险 + 代码风格不一致。项目 CLAUDE.md 明确规定 "Use Node.js >=20, pure JavaScript ESM (`.mjs`)"，且 `package.json` 只有 `zod` 和 `yaml` 两个依赖。项目中不存在任何 `.py` 文件。但 Agent 在 run 执行期间频繁使用 `python3 -c` 做 JSON 解析、YAML 转换、字符串处理等操作——这些 Node.js 全都能做，且是项目唯一指定的运行时。

## 复现

在 `engelberg-tech-retreat-2026` run 中，Agent 大量使用 Python：

```bash
# JSON 解析（Node 有 JSON.parse）
node ... | python3 -c "import sys,json; d=json.load(sys.stdin); ..."

# YAML 处理（项目已安装 yaml npm 包）
python3 << 'PYEOF'
import yaml
...

# 文件读写 + 数据转换（Node 有 fs + 内置工具）
python3 << 'PYEOF'
import json, os, hashlib
...
```

整个 session 中 Python 调用次数远超 Node.js 内联脚本。

## 根因分析

这是 Agent 的行为偏好问题，不是框架问题。Agent 默认将 Python 视为"数据操作的瑞士军刀"，在没有被明确纠正的情况下会反复使用。项目 CLAUDE.md 和 RUN.md 虽然指定了 Node.js 运行时，但没有明确禁止 Python。

## 建议修复

1. **CLAUDE.md 增加明确禁止**：在 "Hard Rules" 或 "Before Anything Else" 中增加一行：
   > "Do not use Python (`python3`, `python`) for any purpose. All data manipulation, JSON/YAML parsing, file I/O, and scripting must use Node.js. If you need a one-liner, use `node -e '...'`. If you need a script, write a `.mjs` file."

2. **或者更轻量**：在 RUN.md §0 "禁用内置捷径" 旁边增加"禁用非项目运行时"条目，明确 Python 和任何不在 `package.json` 中的工具都是禁止的。

3. **Agent 自检**：在 phase 开始时检查本次 session 使用的工具列表，如果出现了 `python3` 且项目是纯 Node.js，在 trace 中记录 warning。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，整个 session 期间

## 影响
- 环境依赖：CI/其他开发者环境可能没有 Python 3.12 + pyyaml
- 可维护性：Python 内联脚本和 Node.js CLI 混在一起，调试困难
- 合约违反：项目明确是 "pure JavaScript ESM"，混入 Python 违反了项目宪章
