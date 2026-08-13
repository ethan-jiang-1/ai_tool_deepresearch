#!/usr/bin/env node
// apply-research-style.mjs — apply a research style JSON to an current run bundle
// Usage: node apply-research-style.mjs --bundle <path> --style <name>
//
// Reads the JSON style file, computes topic-count-dependent values,
// and writes the complete research_style_params section to rb_profile.yaml.
// MD/Agent never touches the JSON style files or does the math — this CLI
// is the single computation point.

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';
import { computeResearchStyleParams } from '../engine/helpers/research-style-params.mjs';
import { ProfileSchema } from '../schema/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ──
const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    style: { type: 'string' },
  },
});

if (!values.bundle || !values.style) {
  console.error('Usage: node apply-research-style.mjs --bundle <path> --style <name>');
  process.exit(1);
}

const bundlePath = values.bundle;
const styleName = values.style;

// ── 1. Read topic_count from rb_plan.md ──
const planPath = join(bundlePath, 'rb_plan.md');
if (!existsSync(planPath)) {
  console.error(`Error: rb_plan.md not found in ${bundlePath}`);
  process.exit(1);
}
const plan = parseMdFrontmatter(readFileSync(planPath, 'utf-8'));
if (!plan || !Array.isArray(plan.topic_registry)) {
  console.error('Error: rb_plan.md frontmatter has no valid topic_registry');
  process.exit(1);
}
const topicCount = plan.topic_registry.length;

// ── 2. Read JSON style file ──
const stylePath = join(__dirname, '..', 'schema', 'research-styles', `${styleName}.json`);
if (!existsSync(stylePath)) {
  console.error(`Error: style file not found: ${stylePath}`);
  process.exit(1);
}
let style;
try {
  style = JSON.parse(readFileSync(stylePath, 'utf-8'));
} catch (e) {
  console.error(`Error: cannot parse style JSON: ${e.message}`);
  process.exit(1);
}

// ── 3. Compute complete style parameters ──
let params;
try {
  params = computeResearchStyleParams({ styleDefinition: style, topicCount });
} catch (error) {
  console.error(`Error: invalid research style definition: ${error.message}`);
  process.exit(1);
}

// ── 4. Write to rb_profile.yaml ──
const profilePath = join(bundlePath, 'rb_profile.yaml');
if (!existsSync(profilePath)) {
  console.error(`Error: rb_profile.yaml not found in ${bundlePath}`);
  process.exit(1);
}
const raw = readFileSync(profilePath, 'utf-8');
const profile = parseYaml(raw);
profile.research_profile = styleName;
profile.research_style_params = params;
const parsedProfile = ProfileSchema.safeParse(profile);
if (!parsedProfile.success) {
  console.error(`Error: rb_profile.yaml fails ProfileSchema: ${parsedProfile.error.issues.map((issue) => issue.message).join('; ')}`);
  process.exit(1);
}
writeFileSync(profilePath, stringifyYaml(profile));

// ── 5. Output result ──
console.log(JSON.stringify({
  applied: styleName,
  topic_count: topicCount,
  wave0_shared_ref_total: params.wave0_shared_ref_total,
}));
