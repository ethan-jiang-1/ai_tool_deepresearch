#!/usr/bin/env node
// scan-restatement-candidates.mjs — restatement-candidate scanner (spec hygiene
// helper, NOT a governance checker; not wired into check-all.mjs).
//
// Reads one main spec, segments it with the shared unit parser, and outputs
// prose paragraphs whose text hits a procedural-restatement anchor category
// (main plan §2.1 rule 1 anchors). Output is a CANDIDATE table for human
// review — candidates are NOT verdicts; pointerization decisions follow the
// §2.1 three-condition review and stay with the human reviewer.
//
// Usage:
//   node openspec/governance/scan-restatement-candidates.mjs --spec <path> \
//        [--anchors <yaml>] [--format table|json]
// Exit codes: 0 scan completed; 2 invocation error (missing/unreadable args).

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import { parseRequirementBlocks, parseBlockUnits } from './spec-unit-parse.mjs';

// Default anchor categories (main plan §2.1 rule-1 procedural restatement
// vocabulary; calibrated against the DWU 36-hit baseline, main plan §1.5).
const DEFAULT_ANCHORS = {
  generated_task: ['generated task', 'generated work-unit task'],
  task_md_surface: ['task.md'],
  spawn_mechanics: ['spawn', 'spawns', 'spawned', 'spawning'],
  generated_guidance: ['generated guidance', 'generated actor guidance', 'generated actor'],
};

const AnchorConfigSchema = z
  .record(z.string(), z.array(z.string().min(1)))
  .refine((v) => Object.keys(v).length > 0, { message: 'anchor config must not be empty' });

const CandidateSchema = z.object({
  spec: z.string(),
  block_title: z.string(),
  paragraph_index: z.number().int().positive(),
  start_line: z.number().int().positive(),
  end_line: z.number().int().positive(),
  hit_category: z.string(),
  hit_token: z.string(),
  excerpt: z.string(),
});

function buildMatchers(anchors) {
  return Object.entries(anchors).map(([category, tokens]) => ({
    category,
    regexes: tokens.map((t) => ({
      token: t,
      re: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    })),
  }));
}

function scanText(text, specLabel, matchers) {
  const { blocks, lines } = parseRequirementBlocks(text);
  const candidates = [];
  for (const block of blocks) {
    const { prose } = parseBlockUnits(lines, block);
    for (const para of prose) {
      const paraText = lines.slice(para.startLine - 1, para.endLine).join(' ');
      for (const { category, regexes } of matchers) {
        for (const { token, re } of regexes) {
          if (re.test(paraText)) {
            candidates.push(
              CandidateSchema.parse({
                spec: specLabel,
                block_title: block.title,
                paragraph_index: para.index,
                start_line: para.startLine,
                end_line: para.endLine,
                hit_category: category,
                hit_token: token,
                excerpt: lines[para.startLine - 1].slice(0, 100),
              })
            );
            break; // one candidate per (paragraph, category)
          }
        }
      }
    }
  }
  return candidates;
}

function formatTable(candidates) {
  const out = [];
  out.push('# Restatement candidates (non-authoritative projection)');
  out.push('');
  out.push('> candidates ≠ verdicts. Pointerization decisions require the §2.1');
  out.push('> three-condition human review (process-restatement / authoritative owner /');
  out.push('> no loss of testability). Scenario-dependent normative text is never a candidate.');
  out.push('');
  const byCategory = new Map();
  for (const c of candidates) {
    if (!byCategory.has(c.hit_category)) byCategory.set(c.hit_category, []);
    byCategory.get(c.hit_category).push(c);
  }
  for (const [category, list] of byCategory) {
    out.push(`## ${category} (${list.length})`);
    out.push('');
    out.push('| lines | paragraph | requirement block | excerpt |');
    out.push('|---|---|---|---|');
    for (const c of list) {
      out.push(
        `| ${c.start_line}-${c.end_line} | P${c.paragraph_index} | ${c.block_title.replace('### Requirement: ', '')} | ${c.excerpt.replace(/\|/g, '\\|')} |`
      );
    }
    out.push('');
  }
  out.push(`total: ${candidates.length}`);
  return out.join('\n');
}

async function main() {
  const { values } = parseArgs({
    options: {
      spec: { type: 'string' },
      anchors: { type: 'string' },
      format: { type: 'string', default: 'table' },
    },
  });
  if (!values.spec || (values.format !== 'table' && values.format !== 'json')) {
    console.error('usage: scan-restatement-candidates.mjs --spec <path> [--anchors <yaml>] [--format table|json]');
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(values.spec, 'utf8');
  } catch (err) {
    console.error(`cannot read spec: ${values.spec} (${err.message})`);
    process.exit(2);
  }
  let anchors = DEFAULT_ANCHORS;
  if (values.anchors) {
    let raw;
    try {
      raw = parseYaml(readFileSync(values.anchors, 'utf8'));
    } catch (err) {
      console.error(`cannot read/parse anchors file: ${values.anchors} (${err.message})`);
      process.exit(2);
    }
    const parsed = AnchorConfigSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`invalid anchors config: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
      process.exit(2);
    }
    anchors = parsed.data;
  }
  const candidates = scanText(text, values.spec, buildMatchers(anchors));
  if (values.format === 'json') {
    console.log(JSON.stringify({ note: 'candidates ≠ verdicts', spec: values.spec, candidates }, null, 2));
  } else {
    console.log(formatTable(candidates));
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
