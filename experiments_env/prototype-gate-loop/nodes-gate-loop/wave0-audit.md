# Wave 0: 基础审计
> 状态: 已加载 ✅
> 📊 痕迹: 执行时自动记录到当前活跃痕迹文件 (setTraceFile) (caller + callee 双保险)
> 我是 Wave 0 的第二个节点！
> 我的职责: 检查共享参考是否达到 floor 要求

```js
traceEntry('md:executed', { source: 'gl-node/wave0-audit', node: 'wave0-audit', status: 'loaded' });
```

## 执行结果
- 共享参考 floor: 5 条
- 实际拥有: 5 条
- 审计结论: PASS
- 下一站: Wave 1
