# Tasks: seg2node

## 1. Experiment 目录重命名

- [x] 1.1 `experiments/prototype-gate-fork/segments-gate-fork/` → `nodes-gate-fork/`
- [x] 1.2 `experiments/prototype-gate-loop/segments-gate-loop/` → `nodes-gate-loop/`
- [x] 1.3 `experiments/prototype-workflow-fsm/segments-workflow-fsm/` → `nodes-workflow-fsm/`
- [x] 1.4 `experiments/prototype-workflow-next/segments-workflow-next/` → `nodes-workflow-next/`

## 2. Engine 代码（.mjs）更新

- [x] 2.1 `experiments/prototype-workflow-fsm/workflow-fsm.mjs`: `SEGMENTS_DIR`→`NODES_DIR`, `segments-workflow-fsm`→`nodes-workflow-fsm` in path/comment/error string
- [x] 2.2 `experiments/prototype-workflow-fsm/workflow-fsm.test.mjs`: `SEGMENTS_DIR`→`NODES_DIR`, `SEG`→`ND`, `segments-workflow-fsm`→`nodes-workflow-fsm`
- [x] 2.3 `experiments/prototype-workflow-fsm/trace.mjs`: comment refs (no changes needed)
- [x] 2.4 `experiments/prototype-workflow-next/workflow-next.mjs`: `SEGMENTS_DIR`→`NODES_DIR`, `segments-workflow-next`→`nodes-workflow-next`, `segmentPath`→`nodePath`, `SegmentFrontmatter`→`NodeFrontmatter`
- [x] 2.5 `experiments/prototype-workflow-next/workflow-next.test.mjs`: same
- [x] 2.6 `experiments/prototype-workflow-next/trace.mjs`: comment refs (no changes needed)
- [x] 2.7 `experiments/prototype-gate-loop/gate-loop.mjs`: `SEGMENTS_DIR`→`NODES_DIR`, `segments-gate-loop`→`nodes-gate-loop`
- [x] 2.8 `experiments/prototype-gate-loop/gate-loop.test.mjs`: same
- [x] 2.9 `experiments/prototype-gate-fork/gate-fork.mjs`: `SEGMENTS_DIR`→`NODES_DIR`, `segments-gate-fork`→`nodes-gate-fork`, comment "Conditional Branch Segments"→"Conditional Branch Nodes"
- [x] 2.10 `experiments/prototype-gate-fork/gate-fork.test.mjs`: "Conditional segments (COS-001)"→"Conditional nodes (COS-001)"
- [x] 2.11 `experiments/prototype-gate-fork/EXPERIMENT.md`: "Conditional segments"→"Conditional nodes"

## 3. Command Experiment Playbook 更新

- [x] 3.1 `DPT_FRAMEWORK/command_experiments/gate-loop/test-simple.md`: `exp/segments`→`exp/nodes`, `SEGMENTS_DIR`→`NODES_DIR`, `segments-gate-loop`→`nodes-gate-loop`, heading "拷入 Segments"→"拷入 Nodes"
- [x] 3.2 `DPT_FRAMEWORK/command_experiments/gate-loop/test-medium.md`: same pattern
- [x] 3.3 `DPT_FRAMEWORK/command_experiments/gate-loop/test-complex.md`: same pattern
- [x] 3.4 `DPT_FRAMEWORK/command_experiments/gate-fork/test-simple.md`: same pattern
- [x] 3.5 `DPT_FRAMEWORK/command_experiments/gate-fork/test-medium.md`: same pattern
- [x] 3.6 `DPT_FRAMEWORK/command_experiments/gate-fork/test-complex.md`: same pattern
- [x] 3.7 `DPT_FRAMEWORK/command_experiments/workflow-next/test-simple.md`: `exp/segments`→`exp/nodes`, `SEGMENTS_DIR`→`NODES_DIR`, `segments-workflow-next`→`nodes-workflow-next`, "segment MD"→"node MD", `echo "✓ segments:"`→`echo "✓ nodes:"`
- [x] 3.8 `DPT_FRAMEWORK/command_experiments/workflow-next/test-medium.md`: same pattern
- [x] 3.9 `DPT_FRAMEWORK/command_experiments/workflow-next/test-complex.md`: same pattern

## 4. OpenSpec Active Changes 更新

- [x] 4.1 `openspec/changes/prototype-workflow-fsm/design.md`: `segmentPath()`→`nodePath()`, `segments-workflow-fsm`→`nodes-workflow-fsm`
- [x] 4.2 `openspec/changes/prototype-workflow-fsm/tasks.md`: `segments-workflow-fsm`→`nodes-workflow-fsm`
- [x] 4.3 `openspec/changes/prototype-workflow-next/design.md`: `segmentPath()`→`nodePath()`, `segments-workflow-next`→`nodes-workflow-next`
- [x] 4.4 `openspec/changes/prototype-workflow-next/tasks.md`: `segments-workflow-next`→`nodes-workflow-next`

## 5. Guidelines 更新

- [x] 5.1 `guidelines/command-experiments.md`: `exp/segments`→`exp/nodes`, `SEGMENTS_DIR`→`NODES_DIR`, `segments-<name>/`→`nodes-<name>/`, "segment MD"→"node MD"
- [x] 5.2 `guidelines/project.md`: 如有 "segments" 引用则更新（无残留）

## 6. OpenSpec Config 更新

- [x] 6.1 `openspec/config.yaml`: `segments-{component}/`→`nodes-{component}/`（模板注释）

## 7. 验证

- [x] 7.1 全仓 grep "segments"（排除 archive、main spec），确认除 archive/main-spec 外无残留
- [x] 7.2 `node --test experiments/prototype-gate-loop/gate-loop.test.mjs` — PASS
- [x] 7.3 `node --test experiments/prototype-gate-fork/gate-fork.test.mjs` — PASS
- [x] 7.4 `node --test experiments/prototype-workflow-next/workflow-next.test.mjs` — PASS
- [x] 7.5 `node --test experiments/prototype-workflow-fsm/workflow-fsm.test.mjs` — PASS
- [x] 7.6 `node openspec/governance/check-project-reqs.mjs` — PASS
- [x] 7.7 `node openspec/governance/check-project-specs.mjs` — PASS
- [x] 7.8 `openspec status --change seg2node` — 确认所有 artifacts 完整

## 不变的内容（确认不改）

- `openspec/specs/` main specs（archive 时通过 delta 合并更新）
- `openspec/changes/archive/` — 历史记录
- `openspec/governance/req-registry.yaml` — capability 名通过 delta spec 的 RENAMED 在 archive 时更新
- Req IDs：COS-001, DYS-001
- `.fsm.json` 文件
- node MD 文件内部（已同步更新，中文"段"→"节点"）
