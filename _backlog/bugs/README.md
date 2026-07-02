# Active Bugs

活跃 bug，修完后移入 [`_done/_fixed_bugs/`](../_done/_fixed_bugs/)。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

**bug 编号权威来源是 [`_done/_fixed_bugs/`](../_done/_fixed_bugs/)——新 bug 的编号从那里的最大编号往后排，不要从本目录推断。**

---

## 活跃列表

无活跃 bug。

**Next available bug ID: BUG-014**（= `_done/_fixed_bugs/` 最大编号 BUG-013 + 1）
