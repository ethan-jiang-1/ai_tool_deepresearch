# Repair: 补充参考
> 状态: 已加载 ✅
> 📊 痕迹: 执行时自动记录到当前活跃痕迹文件 (setTraceFile) (caller + callee 双保险)
> 我是修复节点！Gate 说证据不够，我来补！
> 我的职责: 每次补齐 2 条本地参考文件

```js
traceEntry('md:executed', { source: 'gl-node/repair-references', node: 'repair-references', status: 'loaded', ref_before: state.ref_count });
```

## 执行结果
- 修复前 ref_count: ?
- 修复后 ref_count: ? (原值 + 2)
- 修复动作: 已补充 2 条本地参考
