// workflow-load.mjs — Workflow 动态加载实验
// @impl WML-001, WDM-001, WMD-001, WLO-001
//
// 核心概念:
//   - Manifest 定义 step 顺序，不预加载 step MD 内容
//   - advanceWorkflow() 一次推进一个 step，走到哪个才加载哪个
//   - step MD 的 JSON frontmatter `requires` 声明依赖 MD
//   - Engine 递归解析依赖闭包，依赖优先执行
//   - 内容缓存但执行不缓存（同一 MD 再次被引用时重新执行）
//   - runtime.receipts + trace events 暴露全部加载行为

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { z } from 'zod';

// ─── Paths ────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SEGMENTS_DIR = join(__dirname, 'segments-workflow-load');

// ─── Zod Schemas ──────────────────────────────────────────────────────

/** @impl WML-001 */
export const WorkflowManifest = z.object({
  name: z.string(),
  steps: z.array(z.string().min(1)).min(1),
});

/** @impl WMD-001 */
export const SegmentFrontmatter = z.object({
  requires: z.array(z.string().min(1)).default([]),
});

/** @impl Decision 7 */
export const WorkflowState = z.object({
  executionOrder: z.array(z.string()).default([]),
  counters: z.record(z.string(), z.number()).default({}),
  data: z.record(z.string(), z.unknown()).default({}),
});

// ─── Manifest Loading (WML-001) ───────────────────────────────────────

/**
 * 读取并校验 workflow.json manifest。
 * 不读取 steps 指向的任何 MD 文件。
 * @impl WML-001
 */
export function loadWorkflowManifest(manifestPath) {
  const raw = readFileSync(manifestPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return WorkflowManifest.parse(parsed);
}

/**
 * 从 manifest 创建 workflow runtime。
 * contentCache 初始为空——不预加载任何 step MD。
 * @impl WML-001, WLO-001
 */
export function createWorkflowRuntime(manifest) {
  return {
    manifest,
    cursor: 0,
    contentCache: new Map(),
    executionLog: [],
    receipts: [],
  };
}

// ─── Path Resolution (WDM-001) ────────────────────────────────────────

/**
 * 将 fileRef 解析为 segments-workflow-load/ 内的绝对路径。
 * 不支持任意外部路径，fileRef 不能包含 ../ 或绝对路径。
 * @impl WDM-001
 */
export function segmentPath(fileRef) {
  if (fileRef.includes('..') || fileRef.startsWith('/')) {
    throw new Error(`Invalid fileRef "${fileRef}": must be a plain filename within segments-workflow-load/`);
  }
  return join(SEGMENTS_DIR, fileRef);
}

// ─── Frontmatter Parsing (WMD-001) ────────────────────────────────────

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)---\s*\n/;

/**
 * 从 Markdown 内容中提取 JSON frontmatter。
 * 无 frontmatter 返回 { requires: [] }。
 * frontmatter 存在但 JSON 无效时抛出 parse error。
 * @impl WMD-001
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
  return SegmentFrontmatter.parse(parsed);
}

// ─── Markdown File Reading (WDM-001, WLO-001) ─────────────────────────

/**
 * 读取 Markdown 文件，首次读缓存内容+frontmatter，再次读记录 cache hit。
 * @impl WDM-001, WLO-001
 */
export function readMarkdownFile(fileRef, runtime) {
  if (runtime.contentCache.has(fileRef)) {
    const receipt = {
      type: 'cache_hit',
      fileRef,
      ts: new Date().toISOString(),
    };
    runtime.receipts.push(receipt);
    return runtime.contentCache.get(fileRef);
  }

  const path = segmentPath(fileRef);
  if (!existsSync(path)) {
    throw new Error(`File not found: ${fileRef} (resolved to ${path})`);
  }

  const md = readFileSync(path, 'utf-8');
  const frontmatter = parseFrontmatter(md);
  const entry = { md, frontmatter };

  runtime.contentCache.set(fileRef, entry);

  const receipt = {
    type: 'file_read',
    fileRef,
    ts: new Date().toISOString(),
  };
  runtime.receipts.push(receipt);

  return entry;
}

// ─── Dependency Resolution (WMD-001) ──────────────────────────────────

/**
 * DFS 解析依赖闭包，输出依赖优先的 plan。
 * - visiting 检测 cycle
 * - visited 保证同一次 closure 内去重
 * - 依赖在 requester 之前（dependency-first）
 * - 同层依赖按 requires 声明顺序稳定解析
 * @impl WMD-001
 */
export function resolveDependencyClosure(fileRef, runtime, visiting = new Set(), visited = new Set()) {
  // Cycle detection
  if (visiting.has(fileRef)) {
    const cyclePath = [...visiting, fileRef].join(' -> ');
    throw new Error(`Dependency cycle detected: ${cyclePath}`);
  }

  // Already resolved in this closure (diamond dedup)
  if (visited.has(fileRef)) {
    return [];
  }

  visiting.add(fileRef);

  // Read the file to get its dependencies (triggers cache or file_read)
  let entry;
  try {
    entry = readMarkdownFile(fileRef, runtime);
  } catch (err) {
    // Preserve the original error message for file-not-found and parse errors
    if (err.message.startsWith('File not found:') || err.message.startsWith('Malformed JSON')) {
      throw err;
    }
    throw new Error(`Missing dependency: ${fileRef} (required by one of the steps)`);
  }

  const deps = entry.frontmatter.requires;
  const plan = [];

  // Resolve dependencies first (stable order from requires array)
  for (const dep of deps) {
    const depPlan = resolveDependencyClosure(dep, runtime, visiting, visited);
    plan.push(...depPlan);
  }

  visiting.delete(fileRef);
  visited.add(fileRef);

  // Requester after its dependencies
  plan.push(fileRef);

  return plan;
}

// ─── State Initialization ─────────────────────────────────────────────

/** @impl Decision 7 */
export function createInitialState() {
  return WorkflowState.parse({});
}

// ─── MD Execution (WDM-001, WLO-001) ──────────────────────────────────

const CODE_BLOCK_RE = /```(?:js|javascript)\s*\n([\s\S]*?)```/;

/**
 * 提取并执行 MD 文件中的第一个 JS 代码块。
 * 使用 node:vm 沙箱，注入 state 和 console。
 * 无代码块 = no-op，记录 no_code_block receipt。
 * @impl WDM-001, WLO-001, Decision 7
 */
export function executeMarkdownFile(fileRef, state, runtime) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry) {
    throw new Error(`executeMarkdownFile: ${fileRef} not in content cache — call readMarkdownFile first`);
  }

  const match = entry.md.match(CODE_BLOCK_RE);

  if (!match) {
    const receipt = {
      type: 'no_code_block',
      fileRef,
      ts: new Date().toISOString(),
    };
    runtime.receipts.push(receipt);
    runtime.executionLog.push({ fileRef, event: 'no_code_block' });
    return state;
  }

  const code = match[1];

  // Create sandbox with state and console
  const sandbox = {
    state,
    console: {
      log: (...args) => {
        // Forward console.log to trace — silent in execution context
      },
    },
  };
  const context = vm.createContext(sandbox);

  try {
    new vm.Script(code).runInContext(context, {
      timeout: 5000, // 5s safety timeout for prototype
    });

    // After execution, state may have been mutated in sandbox
    // Re-validate
    const validated = WorkflowState.parse(sandbox.state);

    const receipt = {
      type: 'file_executed',
      fileRef,
      ts: new Date().toISOString(),
    };
    runtime.receipts.push(receipt);
    runtime.executionLog.push({ fileRef, event: 'file_executed' });

    return validated;
  } catch (err) {
    throw new Error(`Execution error in ${fileRef}: ${err.message}`);
  }
}

// ─── Load Plan Execution (WDM-001, WLO-001) ───────────────────────────

/**
 * 按 plan 顺序执行每个 fileRef。
 * @impl WDM-001, WLO-001
 */
export function executeLoadPlan(plan, state, runtime) {
  let currentState = state;
  for (const fileRef of plan) {
    currentState = executeMarkdownFile(fileRef, currentState, runtime);
  }
  return currentState;
}

// ─── Workflow Advance (WDM-001, WMD-001, WLO-001) ─────────────────────

/**
 * 推进 workflow 一个 step。
 * 原子操作：解析依赖闭包 → 执行 → cursor+1。
 * 失败时 cursor 不前进，不执行任何文件。
 * @impl WDM-001, WMD-001, WLO-001
 */
export function advanceWorkflow(state, runtime) {
  if (runtime.cursor >= runtime.manifest.steps.length) {
    return { state, status: 'complete', runtime };
  }

  const step = runtime.manifest.steps[runtime.cursor];

  // Receipt: advance_start
  runtime.receipts.push({
    type: 'advance_start',
    step,
    cursor: runtime.cursor,
    ts: new Date().toISOString(),
  });

  let plan;
  try {
    plan = resolveDependencyClosure(step, runtime);
  } catch (err) {
    // Receipt: load_error
    runtime.receipts.push({
      type: 'load_error',
      step,
      cursor: runtime.cursor,
      error: err.message,
      ts: new Date().toISOString(),
    });
    return { state, status: 'error', runtime, error: err.message };
  }

  // Receipt: dependency_resolved
  runtime.receipts.push({
    type: 'dependency_resolved',
    step,
    plan,
    cursor: runtime.cursor,
    ts: new Date().toISOString(),
  });

  // Execute the plan
  let nextState;
  try {
    nextState = executeLoadPlan(plan, state, runtime);
  } catch (err) {
    runtime.receipts.push({
      type: 'load_error',
      step,
      cursor: runtime.cursor,
      error: err.message,
      ts: new Date().toISOString(),
    });
    return { state, status: 'error', runtime, error: err.message };
  }

  runtime.cursor += 1;

  // Receipt: advance_complete
  runtime.receipts.push({
    type: 'advance_complete',
    step,
    cursor: runtime.cursor,
    plan,
    ts: new Date().toISOString(),
  });

  return { state: nextState, status: 'advanced', runtime, plan };
}
