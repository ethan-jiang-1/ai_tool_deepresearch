// @impl WNC-001, PRP-002, PRP-005
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const PHASE_PATH = new URL('../../../DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md', import.meta.url);
const markdown = readFileSync(PHASE_PATH, 'utf-8');
const frontmatter = parseYaml(markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');

describe('phase-hitl1 research-access contract', () => {
  it('declares stop yes and capability_probe_only', () => {
    assert.equal(frontmatter.stop, 'yes');
    assert.equal(frontmatter.execution_contract?.surface, 'phase-agent');
    assert.equal(frontmatter.execution_contract?.search_policy, 'capability_probe_only');
  });

  it('keeps the probe short and ordered after style apply', () => {
    const styleIndex = markdown.indexOf('### 3c. Research Style Parameters');
    const probeIndex = markdown.indexOf('### 3d. Research Access Probe');
    assert.ok(styleIndex >= 0 && probeIndex > styleIndex);
    assert.match(markdown, /至多一次 neutral capability-only search/);
    assert.match(markdown, /第一个 usable HTTP\(S\) result/);
    assert.match(markdown, /至多一次 fetch/);
    assert.match(markdown, /不跳到第二个站点/);
  });

  it('exposes exact available and unavailable payload branches', () => {
    for (const token of [
      'research_access.status',
      'research_access/{probed_at,result_url,fetch_outcome}',
      'fetch_outcome: success',
      'research_access/{probed_at,fetch_outcome,reason}',
      'failed | blocked | not_attempted',
    ]) {
      assert.ok(markdown.includes(token), `missing HITL1 payload token: ${token}`);
    }
    assert.match(markdown, /search_surface.*fetch_surface.*audit label/);
  });

  it('keeps unavailable repair on the same probe and gate', () => {
    assert.match(markdown, /保留已记录的 `research_profile`、`root_must_answer_set`、style params 和 `hitl1\.status: recorded`/);
    assert.match(markdown, /重跑本节同一 bounded probe 和同一 gate/);
    assert.match(markdown, /不得进入 Setup/);
  });

  it('forbids fake capability and evidence leakage', () => {
    for (const token of [
      'mock/fixed URL',
      'reference/',
      '_cache/',
      'artifacts/',
      'work-unit output/result/receipt',
      'rb_work_unit_ledger.jsonl',
      'rb_output_declarations.jsonl',
      'Wave coverage/count floor',
    ]) {
      assert.ok(markdown.includes(token), `missing research-access boundary: ${token}`);
    }
  });
});
