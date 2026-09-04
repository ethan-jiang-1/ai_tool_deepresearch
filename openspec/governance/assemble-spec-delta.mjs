#!/usr/bin/env node
// assemble-spec-delta.mjs — generic spec-delta assembly tool (spec hygiene
// helper, NOT a governance checker; not wired into check-all.mjs).
//
// Splits one requirement block of a main spec into multiple new requirements
// according to a grouping YAML, moving text byte-conservatively:
//   - content multiset conservation (non-empty lines): the only allowed net
//     additions are the new unit title lines;
//   - declared==actual: the grouping's expected prose/scenario counts must
//     match the shared parser's recomputation of the block;
//   - coverage completeness + no overlap: units must partition all prose
//     paragraphs and scenarios of the block.
// Default is a dry-run (no write). Pass --out to write the transformed text.
//
// Usage:
//   node openspec/governance/assemble-spec-delta.mjs --spec <path> --grouping <yaml> [--out <path>]
// Exit codes: 0 success/dry-run pass; 1 assertion failure (declared==actual,
// coverage, conservation); 2 invocation/schema error.

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import {
  parseRequirementBlocks,
  parseBlockUnits,
  multisetConservation,
} from './spec-unit-parse.mjs';

const RE_REQ_PREFIX = /^### Requirement: /;

const UnitSchema = z
  .object({
    title: z.string().regex(RE_REQ_PREFIX, 'unit title must start with "### Requirement: "'),
    prose: z.array(z.number().int().positive()).optional(),
    prose_range: z.array(z.number().int().positive()).length(2).optional(),
    scenarios: z.array(z.number().int().positive()).optional(),
    lead: z.string().min(1).optional(),
  })
  .refine((u) => Boolean(u.prose ?? u.prose_range) || Boolean((u.scenarios ?? []).length), {
    message: 'unit must declare prose (list), prose_range ([start, end]), or a non-empty scenarios list',
  })
  .refine((u) => !(u.prose && u.prose_range), {
    message: 'declare either prose or prose_range, not both',
  });

const GroupingSchema = z
  .object({
    spec: z.string().min(1),
    block_title: z.string().regex(RE_REQ_PREFIX, 'block_title must start with "### Requirement: "'),
    expect: z.object({
      prose: z.number().int().positive(),
      scenarios: z.number().int().nonnegative(),
    }),
    units: z.array(UnitSchema).min(2, 'a split needs at least two units'),
  })
  .superRefine((g, ctx) => {
    const titles = g.units.map((u) => u.title);
    if (new Set(titles).size !== titles.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unit titles must be unique' });
    }
    if (titles.includes(g.block_title)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unit title must differ from block_title' });
    }
    const expand = (u) =>
      u.prose ?? [u.prose_range[0], ...Array.from({ length: u.prose_range[1] - u.prose_range[0] + 1 }, (_, k) => u.prose_range[0] + k)].slice(1);
    const allProse = g.units.flatMap((u) => expand(u));
    const allScen = g.units.flatMap((u) => u.scenarios ?? []);
    const check = (label, arr, max) => {
      const seen = new Set();
      for (const n of arr) {
        if (n > max) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} index ${n} exceeds declared count ${max}` });
          return;
        }
        if (seen.has(n)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} index ${n} assigned more than once` });
          return;
        }
        seen.add(n);
      }
    };
    check('prose', allProse, g.expect.prose);
    check('scenario', allScen, g.expect.scenarios);
    if (!ctx.issues?.length) {
      if (allProse.length !== g.expect.prose) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `units cover ${allProse.length} of ${g.expect.prose} prose paragraphs — coverage incomplete` });
      }
      if (allScen.length !== g.expect.scenarios) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `units cover ${allScen.length} of ${g.expect.scenarios} scenarios — coverage incomplete` });
      }
    }
  });

/**
 * Expand a unit's declared prose/scenario indices.
 */
function unitIndices(u) {
  let prose;
  if (u.prose) prose = [...u.prose];
  else {
    const [a, b] = u.prose_range;
    prose = Array.from({ length: b - a + 1 }, (_, k) => a + k);
  }
  return { prose, scenarios: [...(u.scenarios ?? [])] };
}

/**
 * Assemble the transformed text. Pure: returns a result object, no I/O.
 * @returns {{ ok: true, outputText: string, unitSummaries: Array<{title: string, lines: number}> }
 *          | { ok: false, stage: 'declared'|'coverage'|'conservation', rootCause: string }}
 */
export function assembleSpec(text, grouping) {
  const { blocks, lines } = parseRequirementBlocks(text);
  const matches = blocks.filter((b) => b.title === grouping.block_title);
  if (matches.length !== 1) {
    return {
      ok: false,
      stage: 'coverage',
      rootCause: `block_title matches ${matches.length} blocks (expected exactly 1): ${grouping.block_title}`,
    };
  }
  const block = matches[0];
  const { prose, scenarios } = parseBlockUnits(lines, block);

  if (prose.length !== grouping.expect.prose || scenarios.length !== grouping.expect.scenarios) {
    return {
      ok: false,
      stage: 'declared',
      rootCause: `declared==actual mismatch: expect prose ${grouping.expect.prose}/scenarios ${grouping.expect.scenarios}, actual ${prose.length}/${scenarios.length}`,
    };
  }

  // Element line ranges by index.
  const proseRange = new Map(prose.map((p) => [p.index, [p.startLine, p.endLine]]));
  const scenRange = new Map(scenarios.map((s) => [s.index, [s.startLine, s.endLine]]));

  // Build unit element lists in original document order.
  const unitElems = grouping.units.map((u) => {
    const { prose: pi, scenarios: si } = unitIndices(u);
    const elems = [
      ...pi.map((i) => ({ kind: 'prose', index: i, range: proseRange.get(i) })),
      ...si.map((i) => ({ kind: 'scenario', index: i, range: scenRange.get(i) })),
    ];
    elems.sort((a, b) => a.range[0] - b.range[0]);
    return { title: u.title, lead: u.lead, elems };
  });

  // Ownership map for unclaimed non-blank lines (e.g. inline `> req:` meta):
  // attach to the unit owning the next claimed region; trailing lines attach
  // to the last unit.
  const claimed = new Map(); // line -> unit index
  unitElems.forEach((ue, ui) => {
    for (const e of ue.elems) {
      for (let l = e.range[0]; l <= e.range[1]; l++) claimed.set(l, ui);
    }
  });
  const blockFirst = block.startLine + 1; // content starts after the heading
  const ownerOfLine = (l) => {
    if (claimed.has(l)) return claimed.get(l);
    for (let n = l + 1; n <= block.endLine; n++) {
      if (claimed.has(n)) return claimed.get(n);
    }
    return unitElems.length - 1; // trailing unclaimed content
  };

  // Emit.
  const out = [];
  for (let l = 1; l < block.startLine; l++) out.push(lines[l - 1]);
  const unitSummaries = [];
  const allowedAdditions = [];
  for (let ui = 0; ui < unitElems.length; ui++) {
    const ue = unitElems[ui];
    out.push(ue.title);
    out.push('');
    if (ue.lead) {
      out.push(ue.lead);
      out.push('');
      allowedAdditions.push(ue.lead);
    }
    const body = [];
    for (let l = blockFirst; l <= block.endLine; l++) {
      if (ownerOfLine(l) !== ui) continue;
      body.push(lines[l - 1]);
    }
    // trim leading/trailing blanks of body
    while (body.length && body[0].trim() === '') body.shift();
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    unitSummaries.push({ title: ue.title, lines: body.length });
    out.push(...body);
    out.push('');
  }
  for (let l = block.endLine + 1; l <= lines.length; l++) out.push(lines[l - 1]);

  // Conservation: multiset equality over non-empty lines; net additions
  // allowed = the new unit title lines, net removal = the original block
  // title line (replaced by the unit titles).
  const outputText = out.join('\n');
  const beforeLines = lines.slice();
  beforeLines.splice(block.startLine - 1, 1); // original block heading is replaced
  const cons = multisetConservation(
    beforeLines,
    out,
    [...grouping.units.map((u) => u.title), ...allowedAdditions]
  );
  if (!cons.ok) {
    const first =
      cons.missing.length > 0
        ? `missing line: ${JSON.stringify(cons.missing[0])}`
        : `unexpected line: ${JSON.stringify(cons.extra[0])}`;
    return {
      ok: false,
      stage: 'conservation',
      rootCause: `content multiset not conserved (missing ${cons.missing.length}, unexpected ${cons.extra.length}); first root cause: ${first}`,
    };
  }
  return { ok: true, outputText, unitSummaries };
}

async function main() {
  const { values } = parseArgs({
    options: {
      spec: { type: 'string' },
      grouping: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (!values.spec || !values.grouping) {
    console.error('usage: assemble-spec-delta.mjs --spec <path> --grouping <yaml> [--out <path>]');
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(values.spec, 'utf8');
  } catch (err) {
    console.error(`cannot read spec: ${values.spec} (${err.message})`);
    process.exit(2);
  }
  let raw;
  try {
    raw = parseYaml(readFileSync(values.grouping, 'utf8'));
  } catch (err) {
    console.error(`cannot read/parse grouping yaml: ${values.grouping} (${err.message})`);
    process.exit(2);
  }
  const parsed = GroupingSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`grouping yaml rejected (invocation/schema error):`);
    for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    process.exit(2);
  }
  if (parsed.data.spec !== values.spec) {
    console.error(`grouping.spec (${parsed.data.spec}) does not match --spec (${values.spec})`);
    process.exit(2);
  }
  const result = assembleSpec(text, parsed.data);
  if (!result.ok) {
    console.error(`[${result.stage}] ${result.rootCause}`);
    process.exit(1);
  }
  if (values.out) {
    writeFileSync(values.out, result.outputText);
    console.log(`wrote ${values.out}`);
  } else {
    console.log('dry-run: assertions passed, no file written');
  }
  console.log(`block: ${parsed.data.block_title}`);
  for (const s of result.unitSummaries) {
    console.log(`  ${s.title.replace('### Requirement: ', '')} — ${s.lines} lines`);
  }
  console.log('content multiset conserved (net additions = unit title lines only)');
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
