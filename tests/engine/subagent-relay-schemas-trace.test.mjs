// subagent-relay-schemas-trace.test.mjs — @impl FRE-004
import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  SlotResult,
  AgentOutputDeclarationSchema,
  OutputFileRole,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';

describe('Agent Output Declaration (Stage 1)', () => {
  it('SlotResult accepts valid output_files with reference and source_url', () => {
    const result = SlotResult.parse({
      slotKey: 'test', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [],
      output_files: [
        { path: 'reference/test.md', role: 'reference', source_url: 'https://example.com/article' },
      ],
      cache_trails: ['_cache/wave0/primary/01_topic/s01_source/'],
    });
    assert.equal(result.output_files.length, 1);
    assert.equal(result.output_files[0].role, 'reference');
    assert.equal(result.output_files[0].source_url, 'https://example.com/article');
    assert.equal(result.cache_trails.length, 1);
  });

  it('SlotResult accepts evidence_summary role without source_url', () => {
    const result = SlotResult.parse({
      slotKey: 'test', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [],
      output_files: [
        { path: 'evidence-summary.md', role: 'evidence_summary' },
      ],
    });
    assert.equal(result.output_files.length, 1);
    assert.equal(result.output_files[0].role, 'evidence_summary');
  });

  it('SlotResult rejects invalid role', () => {
    const parse = SlotResult.safeParse({
      slotKey: 'test', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [],
      output_files: [
        { path: 'test.md', role: 'invalid_role' },
      ],
    });
    assert.equal(parse.success, false);
  });

  it('SlotResult rejects reference role without source_url', () => {
    const parse = SlotResult.safeParse({
      slotKey: 'test', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [],
      output_files: [
        { path: 'reference/test.md', role: 'reference' },
      ],
    });
    assert.equal(parse.success, false);
    assert.ok(parse.error.message.includes('source_url'));
  });

  it('AgentOutputDeclarationSchema validates without output_files (defaults to empty)', () => {
    const decl = AgentOutputDeclarationSchema.parse({});
    assert.deepEqual(decl.output_files, []);
    assert.deepEqual(decl.cache_trails, []);
  });

  it('OutputFileRole enum has 6 valid roles', () => {
    assert.equal(OutputFileRole.options.length, 6);
    assert.ok(OutputFileRole.options.includes('reference'));
    assert.ok(OutputFileRole.options.includes('evidence_summary'));
    assert.ok(OutputFileRole.options.includes('question_list'));
    assert.ok(OutputFileRole.options.includes('source_yaml'));
    assert.ok(OutputFileRole.options.includes('index'));
    assert.ok(OutputFileRole.options.includes('other'));
  });
});
