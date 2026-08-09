#!/usr/bin/env node
// @impl SEF-004
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseYaml } from 'yaml';
import {
  parseSemanticClosureRecord,
  parseSemanticFactFamilies,
  repositoryCoordinatePath,
} from './semantic-fact-closure-contract.mjs';
import { parseVerificationRoutingPlan } from './verification-routing-contract.mjs';

const CHANGE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-semantic-closure.mjs --change <safe-change> --mode plan|assets');
  process.exit(2);
}

function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        change: { type: 'string' },
        mode: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (error) {
    usage(error.message);
  }
  const { change, mode } = parsed.values;
  if (!change || !CHANGE_RE.test(change) || !['plan', 'assets'].includes(mode)) {
    usage('A safe --change and --mode plan|assets are required.');
  }
  return { change, mode };
}

function relativeTo(root, path) {
  const value = relative(root, path);
  return value || '.';
}

function inside(child, parent) {
  const value = relative(parent, child);
  return value !== '' && !value.startsWith('../') && value !== '..' && !isAbsolute(value);
}

function rerun(change, mode) {
  return `node openspec/governance/check-semantic-closure.mjs --change ${change} --mode ${mode}`;
}

function fail({ change, mode, family = '(unknown)', missingFact, owner, writeTo }) {
  console.error([
    `family: ${family}`,
    `missing_fact: ${missingFact}`,
    `owner: ${owner}`,
    `write_to: ${writeTo}`,
    `rerun: ${rerun(change, mode)}`,
  ].join('\n'));
  process.exit(1);
}

function readYaml(path, details) {
  if (!existsSync(path)) {
    fail({ ...details, missingFact: 'required YAML file is missing', writeTo: details.writeTo });
  }
  try {
    return parseYaml(readFileSync(path, 'utf8'));
  } catch (error) {
    fail({ ...details, missingFact: `YAML cannot be parsed: ${error.message}`, writeTo: details.writeTo });
  }
}

function parseWithResult(result, details) {
  if (result.ok) return result;
  const issue = result.issues[0];
  fail({
    ...details,
    missingFact: `${issue.path}: ${issue.message}`,
    writeTo: details.writeTo,
  });
}

function requireOwnedRegularFile({ root, rootReal, coordinate, change, mode, family, missingFact, owner }) {
  const filePath = repositoryCoordinatePath(coordinate);
  const target = resolve(root, filePath);
  const details = {
    change,
    mode,
    family,
    owner,
    writeTo: filePath,
  };
  if (!existsSync(target)) {
    fail({ ...details, missingFact: `${missingFact} is missing` });
  }
  let stats;
  try {
    stats = statSync(target);
  } catch (error) {
    fail({ ...details, missingFact: `${missingFact} cannot be inspected: ${error.message}` });
  }
  if (!stats.isFile()) {
    fail({ ...details, missingFact: `${missingFact} is not a regular file` });
  }
  let real;
  try {
    real = realpathSync(target);
  } catch (error) {
    fail({ ...details, missingFact: `${missingFact} cannot resolve realpath: ${error.message}` });
  }
  if (!inside(real, rootReal)) {
    fail({ ...details, missingFact: `${missingFact} realpath escapes the repository root` });
  }
}

function validateCatalogMembership({ record, catalog, change, mode, catalogPath }) {
  if (record.status !== 'affected') return;
  const catalogById = new Map(catalog.families.map((family) => [family.id, family]));
  const additionsById = new Map(record.catalog_additions.map((addition) => [addition.id, addition]));
  for (const entry of record.affected) {
    const catalogFamily = catalogById.get(entry.family);
    const addition = additionsById.get(entry.family);
    if (mode === 'plan') {
      if (addition && catalogFamily) {
        fail({
          change,
          mode,
          family: entry.family,
          missingFact: 'same-change catalog addition must be absent from the current catalog in plan mode',
          owner: 'openspec/governance/semantic-fact-families.yaml',
          writeTo: 'openspec/changes/' + change + '/semantic-closure.yaml',
        });
      }
      if (!addition && !catalogFamily) {
        fail({
          change,
          mode,
          family: entry.family,
          missingFact: 'affected family is absent from the catalog and this record has no matching catalog addition',
          owner: 'semantic-closure record',
          writeTo: 'openspec/changes/' + change + '/semantic-closure.yaml',
        });
      }
      continue;
    }
    if (!catalogFamily) {
      fail({
        change,
        mode,
        family: entry.family,
        missingFact: 'affected family is absent from the current catalog in assets mode',
        owner: 'openspec/governance/semantic-fact-families.yaml',
        writeTo: catalogPath,
      });
    }
    if (addition && catalogFamily.bounded_question !== addition.bounded_question) {
      fail({
        change,
        mode,
        family: entry.family,
        missingFact: 'catalog addition bounded_question does not match the current catalog',
        owner: 'openspec/governance/semantic-fact-families.yaml',
        writeTo: catalogPath,
      });
    }
  }
}

function selectedVerificationAssets(record, plan, change, mode, recordPath) {
  if (record.status !== 'affected') return [];
  const selected = new Set(plan.claims.map((claim) => claim.asset.path));
  const coordinates = [];
  for (const entry of record.affected) {
    for (const [kind, coordinate] of Object.entries(entry.verification)) {
      const path = repositoryCoordinatePath(coordinate);
      if (!selected.has(path)) {
        fail({
          change,
          mode,
          family: entry.family,
          missingFact: `${kind} verification coordinate is not a selected verification-plan asset`,
          owner: 'verification-routing plan',
          writeTo: recordPath,
        });
      }
      coordinates.push({ family: entry.family, kind, coordinate });
    }
  }
  return coordinates;
}

function allDeclaredCoordinates(record, verificationCoordinates) {
  if (record.status !== 'affected') return verificationCoordinates;
  const coordinates = [];
  for (const entry of record.affected) {
    coordinates.push({ family: entry.family, kind: 'authority resolver', coordinate: entry.authority.resolver });
    for (const coordinate of entry.established_by) {
      coordinates.push({ family: entry.family, kind: 'authority-establishing surface', coordinate });
    }
    for (const coordinate of entry.consumers) {
      coordinates.push({ family: entry.family, kind: 'verdict consumer', coordinate });
    }
    for (const overlap of entry.overlap) {
      if (overlap.relation !== 'none') {
        coordinates.push({ family: entry.family, kind: 'overlap coordinate', coordinate: overlap.coordinate });
      }
    }
  }
  return [...coordinates, ...verificationCoordinates];
}

function main() {
  const { change, mode } = parseCli();
  const root = resolve(process.cwd());
  const changeRoot = join(root, 'openspec', 'changes', change);
  const recordPath = join(changeRoot, 'semantic-closure.yaml');
  const catalogPath = join(root, 'openspec', 'governance', 'semantic-fact-families.yaml');
  const verificationPlanPath = join(changeRoot, 'verification-plan.yaml');

  if (!existsSync(changeRoot)) {
    fail({
      change,
      mode,
      missingFact: 'selected active change directory is missing',
      owner: 'OpenSpec change lifecycle',
      writeTo: relativeTo(root, changeRoot),
    });
  }

  const rawRecord = readYaml(recordPath, {
    change,
    mode,
    owner: 'semantic-closure record',
    writeTo: relativeTo(root, recordPath),
  });
  const record = parseWithResult(parseSemanticClosureRecord(rawRecord, { expectedChange: change }), {
    change,
    mode,
    owner: 'semantic-closure record',
    writeTo: relativeTo(root, recordPath),
  }).record;

  const rawCatalog = readYaml(catalogPath, {
    change,
    mode,
    owner: 'semantic fact catalog',
    writeTo: relativeTo(root, catalogPath),
  });
  const catalog = parseWithResult(parseSemanticFactFamilies(rawCatalog), {
    change,
    mode,
    owner: 'semantic fact catalog',
    writeTo: relativeTo(root, catalogPath),
  }).catalog;
  validateCatalogMembership({
    record,
    catalog,
    change,
    mode,
    catalogPath: relativeTo(root, catalogPath),
  });

  const rawPlan = readYaml(verificationPlanPath, {
    change,
    mode,
    owner: 'verification-routing plan',
    writeTo: relativeTo(root, verificationPlanPath),
  });
  let verificationPlan;
  try {
    verificationPlan = parseVerificationRoutingPlan(rawPlan);
  } catch (error) {
    const issue = error.issues?.[0];
    fail({
      change,
      mode,
      missingFact: issue ? `${issue.path.join('.') || 'document'}: ${issue.message}` : error.message,
      owner: 'verification-routing plan',
      writeTo: relativeTo(root, verificationPlanPath),
    });
  }
  if (verificationPlan.change !== change) {
    fail({
      change,
      mode,
      missingFact: `verification-plan change must equal selected change ${change}`,
      owner: 'verification-routing plan',
      writeTo: relativeTo(root, verificationPlanPath),
    });
  }

  const verificationCoordinates = selectedVerificationAssets(
    record,
    verificationPlan,
    change,
    mode,
    relativeTo(root, recordPath),
  );

  if (mode === 'assets') {
    let rootReal;
    try {
      rootReal = realpathSync(root);
    } catch (error) {
      fail({
        change,
        mode,
        missingFact: `repository root cannot resolve realpath: ${error.message}`,
        owner: 'semantic-closure checker',
        writeTo: '.',
      });
    }
    requireOwnedRegularFile({
      root,
      rootReal,
      coordinate: relativeTo(root, catalogPath),
      change,
      mode,
      missingFact: 'semantic fact catalog',
      owner: 'semantic fact catalog',
    });
    for (const entry of allDeclaredCoordinates(record, verificationCoordinates)) {
      requireOwnedRegularFile({
        root,
        rootReal,
        coordinate: entry.coordinate,
        change,
        mode,
        family: entry.family,
        missingFact: entry.kind,
        owner: 'semantic-closure record',
      });
    }
  }

  console.log(`Semantic closure ${mode} valid: ${change}.`);
}

main();
