// @impl VEM-001
// Root CHANGELOG version-bump CLI under the two-dot MAJOR.MINOR.BUILD scheme.
// Usage: node openspec/governance/bump-version.mjs --build|--minor|--major [--dry-run] [--changelog <path>]

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const DEFAULT_CHANGELOG = join(REPO_ROOT, 'CHANGELOG.md');

const VERSION_HEADING_RE = /^## (\d+)\.(\d+)\.(\d+)$/m;

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/bump-version.mjs --build|--minor|--major [--dry-run] [--changelog <path>]');
  process.exit(2);
}

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        build: { type: 'boolean', default: false },
        minor: { type: 'boolean', default: false },
        major: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
        changelog: { type: 'string' },
      },
      strict: true,
    });
  } catch (error) {
    usage(error.message);
  }
  return parsed.values;
}

function findCurrentVersion(changelog) {
  const match = changelog.match(VERSION_HEADING_RE);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    build: Number(match[3]),
    raw: match[0],
  };
}

function bumpVersion(current, segment) {
  if (segment === 'build') {
    return { major: current.major, minor: current.minor, build: current.build + 1 };
  }
  if (segment === 'minor') {
    return { major: current.major, minor: current.minor + 1, build: 0 };
  }
  return { major: current.major + 1, minor: 0, build: 0 };
}

function formatVersion(v) {
  return `${v.major}.${v.minor}.${v.build}`;
}

// Insert the new heading immediately after the `# Changelog` title line (and its
// trailing blank line), before the previous latest entry, preserving all existing
// content below. Finds the first `## x.y.z` line and inserts before it.
function insertNewHeading(changelog, target) {
  const lines = changelog.split('\n');
  const titleIdx = lines.findIndex((line) => line.startsWith('# '));
  const firstHeadingIdx = lines.findIndex((line, i) => i > titleIdx && VERSION_HEADING_RE.test(line));
  const newHeading = `## ${formatVersion(target)}`;
  if (firstHeadingIdx === -1) {
    // No existing version heading: append after the title block.
    return `${changelog.trimEnd()}\n\n${newHeading}\n`;
  }
  const insertAt = firstHeadingIdx;
  lines.splice(insertAt, 0, newHeading, '');
  return lines.join('\n');
}

function main() {
  const flags = parseCli();
  if (flags.help) {
    console.log('bump-version: bump the root CHANGELOG MAJOR.MINOR.BUILD version.');
    console.log('Usage: node openspec/governance/bump-version.mjs --build|--minor|--major [--dry-run] [--changelog <path>]');
    console.log('  --build       increment BUILD (0.2.0 -> 0.2.1)');
    console.log('  --minor       increment MINOR, reset BUILD (0.2.9 -> 0.3.0)');
    console.log('  --major       increment MAJOR, reset MINOR/BUILD (0.2.0 -> 1.0.0)');
    console.log('  --dry-run     report the target version without writing');
    console.log('  --changelog   changelog path to operate on (default: repo root CHANGELOG.md)');
    return 0;
  }

  const segments = ['build', 'minor', 'major'].filter((s) => flags[s]);
  if (segments.length === 0) {
    usage('Exactly one of --build / --minor / --major is required.');
  }
  if (segments.length > 1) {
    usage(`Conflicting bump flags: --${segments.join(' --')}. Exactly one is required.`);
  }
  const segment = segments[0];
  const changelogPath = flags.changelog ? resolve(flags.changelog) : DEFAULT_CHANGELOG;

  let changelog;
  try {
    changelog = readFileSync(changelogPath, 'utf-8');
  } catch (error) {
    console.error(`Cannot read ${changelogPath}: ${error.message}`);
    return 1;
  }

  const current = findCurrentVersion(changelog);
  if (!current) {
    console.error(`No valid MAJOR.MINOR.BUILD version heading found in ${changelogPath}.`);
    return 1;
  }

  const target = bumpVersion(current, segment);
  const targetText = formatVersion(target);
  if (flags['dry-run']) {
    console.log(`Would bump ${current.raw.replace('## ', '')} -> ${targetText} (--${segment})`);
    return 0;
  }

  const updated = insertNewHeading(changelog, target);
  writeFileSync(changelogPath, updated);
  console.log(`Bumped ${current.raw.replace('## ', '')} -> ${targetText} (--${segment})`);
  return 0;
}

process.exitCode = main();
