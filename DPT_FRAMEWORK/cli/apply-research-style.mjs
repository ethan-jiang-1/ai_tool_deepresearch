#!/usr/bin/env node
// apply-research-style.mjs — apply a research style JSON to an active bundle
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
import { parse as parseYaml } from 'yaml';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';

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

// ── 3. Compute topic-count-dependent values ──
const sharedRef = style.wave0_shared_ref;
if (!sharedRef || typeof sharedRef.base !== 'number' || typeof sharedRef.per_topic !== 'number') {
  console.error('Error: style JSON missing wave0_shared_ref.base or wave0_shared_ref.per_topic');
  process.exit(1);
}
const wave0SharedRefTotal = sharedRef.base + sharedRef.per_topic * topicCount;

// ── 4. Build research_style_params ──
const params = {
  user_visible: style.user_visible,
  // Wave0
  wave0_per_topic_source_floor: style.wave0_per_topic_source_floor,
  wave0_shared_ref_total: wave0SharedRefTotal,
  // Wave1
  wave1_per_topic_ref_floor: style.wave1_per_topic_ref_floor,
  topic_unique_ratio: style.topic_unique_ratio,
  counterexample_search: style.counterexample_search,
  cross_verification: style.cross_verification,
  // Wave2 — quality
  p0p1_independent_backing: style.p0p1_independent_backing,
  quality_min_tier: style.quality_min_tier,
  quality_min_substance: style.quality_min_substance,
  // Wave2 — behavior
  wave2_cross_topic_depth: style.wave2_cross_topic_depth,
  wave2_emergent_search_rounds: style.wave2_emergent_search_rounds,
};

// ── 5. Write to rb_profile.yaml ──
const profilePath = join(bundlePath, 'rb_profile.yaml');
if (!existsSync(profilePath)) {
  console.error(`Error: rb_profile.yaml not found in ${bundlePath}`);
  process.exit(1);
}
const raw = readFileSync(profilePath, 'utf-8');
const profile = parseYaml(raw);
profile.research_profile = styleName;
profile.research_style_params = params;
writeFileSync(profilePath, stringifyProfile(profile));

// ── 6. Output result ──
console.log(JSON.stringify({
  applied: styleName,
  topic_count: topicCount,
  wave0_shared_ref_total: wave0SharedRefTotal,
}));

// ── Helpers ──

/**
 * Minimal YAML serializer for rb_profile.yaml.
 * Preserves the existing structure: flat keys, nested human_decision_checkpoints.
 */
function stringifyProfile(profile) {
  const lines = [];
  lines.push(`plan_basename: ${profile.plan_basename || ''}`);
  lines.push(`research_profile: ${profile.research_profile || 'not_selected'}`);
  lines.push('root_must_answer_set:');
  if (Array.isArray(profile.root_must_answer_set)) {
    for (const item of profile.root_must_answer_set) {
      lines.push(`  - "${item}"`);
    }
  } else {
    lines.push('  []');
  }
  lines.push('research_style_params:');
  if (profile.research_style_params) {
    for (const [key, value] of Object.entries(profile.research_style_params)) {
      if (typeof value === 'boolean') {
        lines.push(`  ${key}: ${value}`);
      } else if (typeof value === 'string') {
        lines.push(`  ${key}: ${value}`);
      } else {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }
  lines.push('human_decision_checkpoints:');
  const hdc = profile.human_decision_checkpoints || {};
  lines.push('  hitl1:');
  lines.push(`    status: ${hdc.hitl1?.status || 'not_started'}`);
  if (hdc.hitl1?.recorded_at) lines.push(`    recorded_at: ${hdc.hitl1.recorded_at}`);
  lines.push('  hitl2:');
  lines.push(`    status: ${hdc.hitl2?.status || 'not_started'}`);
  lines.push(`    answerability_class: ${hdc.hitl2?.answerability_class || 'not_assessed'}`);
  lines.push(`    user_decision: ${hdc.hitl2?.user_decision || 'not_started'}`);
  lines.push(`    final_report_view: ${hdc.hitl2?.final_report_view || 'not_started'}`);
  if (hdc.hitl2?.custom_slug) lines.push(`    custom_slug: ${hdc.hitl2.custom_slug}`);
  if (hdc.hitl2?.rerun_count !== undefined) lines.push(`    rerun_count: ${hdc.hitl2.rerun_count}`);
  if (hdc.hitl2?.rationale) lines.push(`    rationale: ${hdc.hitl2.rationale}`);
  return lines.join('\n') + '\n';
}
