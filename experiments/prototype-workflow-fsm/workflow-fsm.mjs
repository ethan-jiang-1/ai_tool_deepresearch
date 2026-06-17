// workflow-fsm.mjs — FSM-driven workflow engine
// @impl WFS-001, WFS-002, WFS-003
//
// 核心概念:
//   - FSM 定义文件 (.fsm.json) 声明所有状态节点和转移规则
//   - MD 节点代码块末尾调用 transition(currentNode, status) 主动上报执行结果
//   - Engine 查 FSM 裁决下一步: advance / retry / complete / halt
//   - runFSM() 顶层循环: 加载节点 → 执行 → 读 transition → 查 FSM → 循环
//
// 从 workflow-next 保留的语义:
//   - MD frontmatter requires 声明依赖, DFS 依赖闭包解析
//   - 内容缓存 + 执行分离 (cache_hit vs file_executed)
//   - Receipt 驱动的可观察性
//   - node:vm 沙箱执行

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { z } from 'zod';
import { traceEntry } from './trace.mjs';

// ─── Paths ────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const NODES_DIR = process.env.NODES_DIR || join(__dirname, 'nodes-workflow-fsm');

// emit pushes a receipt AND writes trace to disk in one call.
function emit(runtime, type, detail = {}) {
  const receipt = { type, ...detail };
  runtime.receipts.push(receipt);
  traceEntry(type, { source: runtime.source || 'wfsm', ...receipt });
}

// ─── Zod Schemas ──────────────────────────────────────────────────────

/** @impl WFS-001 */
export const FSMDefinition = z.object({
  name: z.string(),
  initial: z.string().min(1),
  states: z.record(z.string().min(1), z.object({
    on: z.record(z.string().min(1), z.string().nullable()),
  })),
}).refine(
  (fsm) => fsm.initial in fsm.states,
  { message: 'FSM initial state must exist in states map' }
);

/** @impl WFS-003 — reused from workflow-next */
export const NodeFrontmatter = z.object({
  requires: z.array(z.string().min(1)).default([]),
});

/** @impl WFS-003 — reused from workflow-next */
export const WorkflowState = z.object({
  executionOrder: z.array(z.string()).default([]),
  counters: z.record(z.string(), z.number()).default({}),
  data: z.record(z.string(), z.unknown()).default({}),
});

// ─── FSM Loading (WFS-001) ────────────────────────────────────────────

/**
 * 读取并校验 .fsm.json 文件。
 * 不读取 states 中引用的任何 MD 文件。
 * @impl WFS-001
 */
export function loadFSM(fsmPath) {
  const raw = readFileSync(fsmPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return FSMDefinition.parse(parsed);
}

/**
 * 从 FSM 定义创建 runtime。
 * currentState 初始为 fsm.initial，contentCache 为空。
 * @impl WFS-001
 */
export function createFSMRuntime(fsm, source = 'wfsm') {
  return {
    fsm,
    currentState: fsm.initial,
    contentCache: new Map(),
    executionLog: [],
    receipts: [],
    source,
  };
}

// ─── Path Resolution (reused from workflow-next) ───────────────────

/**
 * 将 fileRef 解析为 nodes-workflow-fsm/ 内的绝对路径。
 * @impl WFS-003
 */
export function nodePath(fileRef) {
  if (fileRef.includes('..') || fileRef.startsWith('/')) {
    throw new Error(`Invalid fileRef "${fileRef}": must be a plain filename within nodes-workflow-fsm/`);
  }
  return join(NODES_DIR, fileRef);
}

// ─── Frontmatter Parsing (reused from workflow-next) ───────────────

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)---\s*\n/;

/**
 * 从 Markdown 内容中提取 JSON frontmatter。
 * @impl WFS-003
 */
export function parseFrontmatter(md) {
  const match = md.match(FRONTMATTER_RE);
  if (!match) {
    return { requires: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`Malformed JSON frontmatter: ${err.message}`);
  }
  return NodeFrontmatter.parse(parsed);
}

// ─── Markdown File Reading (reused from workflow-next) ─────────────

/**
 * 读取 Markdown 文件，首次读缓存，再次读记录 cache hit。
 * @impl WFS-003
 */
export function readMarkdownFile(fileRef, runtime) {
  if (runtime.contentCache.has(fileRef)) {
    emit(runtime, 'cache_hit', { fileRef, ts: new Date().toISOString() });
    return runtime.contentCache.get(fileRef);
  }

  const path = nodePath(fileRef);
  if (!existsSync(path)) {
    throw new Error(`File not found: ${fileRef} (resolved to ${path})`);
  }

  const md = readFileSync(path, 'utf-8');
  const frontmatter = parseFrontmatter(md);
  const entry = { md, frontmatter };

  runtime.contentCache.set(fileRef, entry);
  emit(runtime, 'file_read', { fileRef, ts: new Date().toISOString() });

  return entry;
}

// ─── Dependency Resolution (reused from workflow-next) ─────────────

/**
 * DFS 解析依赖闭包，dependency-first 顺序。
 * @impl WFS-003
 */
export function resolveDependencyClosure(fileRef, runtime, visiting = new Set(), visited = new Set()) {
  if (visiting.has(fileRef)) {
    const cyclePath = [...visiting, fileRef].join(' -> ');
    throw new Error(`Dependency cycle detected: ${cyclePath}`);
  }

  if (visited.has(fileRef)) {
    return [];
  }

  visiting.add(fileRef);

  let entry;
  try {
    entry = readMarkdownFile(fileRef, runtime);
  } catch (err) {
    if (err.message.startsWith('File not found:') || err.message.startsWith('Malformed JSON')) {
      throw err;
    }
    throw new Error(`Missing dependency: ${fileRef} (required by one of the steps)`);
  }

  const deps = entry.frontmatter.requires;
  const plan = [];

  for (const dep of deps) {
    const depPlan = resolveDependencyClosure(dep, runtime, visiting, visited);
    plan.push(...depPlan);
  }

  visiting.delete(fileRef);
  visited.add(fileRef);
  plan.push(fileRef);

  return plan;
}

// ─── State Initialization ─────────────────────────────────────────────

/** @impl WFS-003 */
export function createInitialState() {
  return WorkflowState.parse({});
}

// ─── FSM Transition Resolution (WFS-002) ──────────────────────────────

/**
 * 查 FSM 定义，根据 currentNode + status 裁决下一步。
 * @impl WFS-002
 */
export function resolveTransition(fsm, currentNode, status) {
  const stateDef = fsm.states[currentNode];
  if (!stateDef) {
    return {
      action: 'halt',
      reason: `Node "${currentNode}" not found in FSM states`,
    };
  }

  const target = stateDef.on[status];
  if (target === undefined) {
    return {
      action: 'halt',
      reason: `No transition defined for node "${currentNode}" with status "${status}". Available: ${Object.keys(stateDef.on).join(', ')}`,
    };
  }

  if (target === null) {
    return { action: 'complete' };
  }

  return { action: 'advance', next: target };
}

// ─── MD Code Block Execution (WFS-002, WFS-003) ────────────────────────

const CODE_BLOCK_RE = /```(?:js|javascript)\s*\n([\s\S]*?)```/;

/**
 * 提取并执行 MD 文件中的 JS 代码块。
 * 沙箱注入 state、console、transition 函数。
 * 返回 { state, transitionStatus }。
 * @impl WFS-002, WFS-003
 */
export function executeMarkdownFile(fileRef, state, runtime) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry) {
    throw new Error(`executeMarkdownFile: ${fileRef} not in content cache — call readMarkdownFile first`);
  }

  const match = entry.md.match(CODE_BLOCK_RE);

  if (!match) {
    emit(runtime, 'no_code_block', { fileRef, ts: new Date().toISOString() });
    runtime.executionLog.push({ fileRef, event: 'no_code_block' });
    return { state, transitionResult: null };
  }

  const code = match[1];

  // Build transition result holder
  const transitionHolder = { value: null };

  const sandbox = {
    state,
    traceEntry,    // node can self-trace
    console: {
      log: (...args) => {
        // Silent in execution context
      },
    },
    transition: (currentNode, status) => {
      emit(runtime, 'transition', { currentNode, status, ts: new Date().toISOString() });

      // Look up FSM
      const result = resolveTransition(runtime.fsm, currentNode, status);

      // Store for Engine
      transitionHolder.value = { currentNode, status, ...result };

      // Return to code block
      return result;
    },
    __transitionHolder: transitionHolder,
  };
  const context = vm.createContext(sandbox);

  try {
    new vm.Script(code).runInContext(context, {
      timeout: 5000,
    });

    const validated = WorkflowState.parse(sandbox.state);

    emit(runtime, 'file_executed', { fileRef, ts: new Date().toISOString() });
    runtime.executionLog.push({ fileRef, event: 'file_executed' });

    return { state: validated, transitionResult: transitionHolder.value };
  } catch (err) {
    throw new Error(`Execution error in ${fileRef}: ${err.message}`);
  }
}

// ─── Execute Dependency Plan (WFS-003) ────────────────────────────────

/**
 * 按 plan 顺序执行依赖 MD，最后执行目标节点。
 * 只有目标节点的 transition 结果被返回。
 * @impl WFS-003
 */
export function executeLoadPlan(plan, state, runtime) {
  let currentState = state;
  // Execute all but the last (target) node — these are dependencies
  for (let i = 0; i < plan.length - 1; i++) {
    currentState = executeMarkdownFile(plan[i], currentState, runtime).state;
  }
  // Execute the target node and capture its transition
  const target = plan[plan.length - 1];
  return executeMarkdownFile(target, currentState, runtime);
}

// ─── Node Loading + Execution (WFS-003) ───────────────────────────────

/**
 * 加载并执行一个 FSM 节点：解析依赖闭包 → 执行 plan → 返回 { state, status }。
 * @impl WFS-003
 */
export function loadAndExecuteNode(nodeRef, state, runtime) {
  emit(runtime, 'node_start', { fileRef: nodeRef, ts: new Date().toISOString() });

  let plan;
  try {
    plan = resolveDependencyClosure(nodeRef, runtime);
  } catch (err) {
    emit(runtime, 'load_error', { fileRef: nodeRef, error: err.message, ts: new Date().toISOString() });
    return { state, status: null, error: err.message };
  }

  emit(runtime, 'dependency_resolved', { fileRef: nodeRef, plan, ts: new Date().toISOString() });

  let result;
  try {
    result = executeLoadPlan(plan, state, runtime);
  } catch (err) {
    emit(runtime, 'load_error', { fileRef: nodeRef, error: err.message, ts: new Date().toISOString() });
    return { state, status: null, error: err.message };
  }

  const status = result.transitionResult ? result.transitionResult.status : null;

  emit(runtime, 'node_complete', { fileRef: nodeRef, status, ts: new Date().toISOString() });

  return { state: result.state, status };
}

// ─── Declarative Machine (WFS-003) ─────────────────────────────────────

/**
 * Machine — 声明式 FSM workflow 实例。
 *
 * 用法:
 *   const m = createMachine('wf-simple.fsm.json');
 *   m.current;     // 'wave.entry.md'
 *   m.canAdvance;  // true
 *   m.step();      // 执行当前节点 → 读 transition → 裁决转移
 *   m.current;     // 'wave-audit.entry.md'
 *   m.run();       // 跑到底
 *   m.isComplete;  // true
 *   m.receipts;    // 完整审计轨迹
 *
 * 设计理念：
 *   - 过程式的 runFSM(fsm, state, runtime) 是外部推
 *   - 声明式的 Machine 是内部自治——定义一次，之后只 step/run
 *   - getter 暴露全状态（current, outcome, receipts...），外部只读不写
 *
 * @impl WFS-003
 */
export class Machine {
  /**
   * @param {object} fsm - validated FSM definition
   * @param {object} [initialState] - optional initial WorkflowState
   */
  constructor(fsm, initialState) {
    this._fsm = fsm;
    this._state = initialState || createInitialState();
    this._current = fsm.initial;
    this._outcome = 'running';
    this._haltReason = null;
    this._contentCache = new Map();
    this._executionLog = [];
    this._receipts = [];
    this._iterations = 0;
    this._lastTransition = null;
  }

  // ─── Declarative properties ───────────────────────────────────────

  /** 当前 FSM 定义 */
  get fsm() { return this._fsm; }
  /** 当前 workflow state（executionOrder, counters, data） */
  get state() { return this._state; }
  /** 当前节点名（FSM 状态） */
  get current() { return this._current; }
  /** 'running' | 'complete' | 'halted' */
  get outcome() { return this._outcome; }
  /** halt 原因，仅在 outcome === 'halted' 时有效 */
  get haltReason() { return this._haltReason; }
  /** 完整 receipt 审计轨迹 */
  get receipts() { return this._receipts; }
  /** 已执行的节点次数 */
  get iterations() { return this._iterations; }
  /** 最后一次 resolveTransition 的结果 */
  get lastTransition() { return this._lastTransition; }

  /** 机器是否还能继续推进 */
  get canAdvance() { return this._outcome === 'running'; }
  /** workflow 是否已成功完成 */
  get isComplete() { return this._outcome === 'complete'; }
  /** workflow 是否已异常终止 */
  get isHalted() { return this._outcome === 'halted'; }

  // ─── Internal: build runtime-like adapter for engine functions ────

  _asRuntime() {
    return {
      fsm: this._fsm,
      currentState: this._current,
      contentCache: this._contentCache,
      executionLog: this._executionLog,
      receipts: this._receipts,
    };
  }

  // ─── Step: execute current node → resolve transition ──────────────

  /**
   * 执行当前 FSM 节点并做一次转移裁决。
   * 原子操作：loadAndExecuteNode → resolveTransition → 更新内部状态。
   *
   * @returns {'complete'|'halted'|'running'} 执行后的 outcome
   */
  step() {
    if (!this.canAdvance) return this._outcome;

    const runtime = this._asRuntime();
    const { state: nextState, status, error } = loadAndExecuteNode(
      this._current, this._state, runtime
    );

    // Sync back state + receipts
    this._state = nextState;
    this._current = runtime.currentState;
    this._iterations++;

    if (error) {
      this._outcome = 'halted';
      this._haltReason = error;
      return this._outcome;
    }

    if (status === null) {
      this._outcome = 'halted';
      this._haltReason = `Node "${this._current}" did not call transition() — no status reported`;
      return this._outcome;
    }

    const result = resolveTransition(this._fsm, this._current, status);
    this._lastTransition = result;

    if (result.action === 'complete') {
      this._outcome = 'complete';
    } else if (result.action === 'halt') {
      this._outcome = 'halted';
      this._haltReason = result.reason;
    } else {
      this._current = result.next;
    }

    return this._outcome;
  }

  // ─── Run: step until terminal ─────────────────────────────────────

  /**
   * 运行 machine 直到终止或超过 maxIterations。
   *
   * @param {number} [maxIterations=100] 安全上限，防自环死循环
   * @returns {'complete'|'halted'} 最终 outcome
   */
  run(maxIterations = 100) {
    while (this.canAdvance && this._iterations < maxIterations) {
      this.step();
    }
    if (this.canAdvance) {
      this._outcome = 'halted';
      this._haltReason = `Exceeded max iterations (${maxIterations}) — possible infinite loop in FSM self-cycle`;
    }
    return this._outcome;
  }
}

/**
 * 工厂函数：从 FSM 定义文件或定义对象创建 Machine 实例。
 *
 * @param {string|object} fsmPathOrDef - .fsm.json 路径，或已解析的 FSM 对象
 * @param {object} [initialState] - 可选的初始 state
 * @returns {Machine}
 */
export function createMachine(fsmPathOrDef, initialState) {
  const fsm = typeof fsmPathOrDef === 'string'
    ? loadFSM(fsmPathOrDef)
    : fsmPathOrDef;
  return new Machine(fsm, initialState);
}

// ─── FSM Run Loop (WFS-003) ────────────────────────────────────────────

/**
 * 运行完整的 FSM workflow。
 * 从 fsm.initial 开始，循环执行节点 → 读 transition → advance/retry/complete/halt。
 * maxIterations 防止自环死循环，默认 100（开发/测试安全网，不改变 FSM 语义）。
 * @impl WFS-003
 */
export function runFSM(fsm, state, runtime, maxIterations = 100) {
  let currentState = state;
  let iterations = 0;

  while (iterations < maxIterations) {
    const currentNode = runtime.currentState;

    // 1. 加载并执行当前节点
    const { state: nextState, status, error } = loadAndExecuteNode(currentNode, currentState, runtime);
    currentState = nextState;
    iterations++;

    // 2. 错误处理: 节点加载/执行失败
    if (error) {
      return {
        finalState: currentState,
        outcome: 'halted',
        runtime,
        reason: error,
      };
    }

    // 3. 代码块没有调用 transition()
    if (status === null) {
      return {
        finalState: currentState,
        outcome: 'halted',
        runtime,
        reason: `Node "${currentNode}" did not call transition() — no status reported`,
      };
    }

    // 4. 查 FSM 转移
    const transition = resolveTransition(fsm, currentNode, status);

    // 5. 根据 action 决定下一步
    if (transition.action === 'complete') {
      return {
        finalState: currentState,
        outcome: 'complete',
        runtime,
        iterations,
      };
    }

    if (transition.action === 'halt') {
      return {
        finalState: currentState,
        outcome: 'halted',
        runtime,
        reason: transition.reason,
        iterations,
      };
    }

    // transition.action === 'advance'
    runtime.currentState = transition.next;
  }

  return {
    finalState: currentState,
    outcome: 'halted',
    runtime,
    reason: `Exceeded max iterations (${maxIterations}) — possible infinite loop in FSM self-cycle`,
    iterations,
  };
}
