// wave-depth-contracts.mjs — deterministic Wave1/Wave2 depth-adjacent checks
// @impl WAI-005, WAI-008, RWG-002, RWG-003, RWG-005, RWG-017, WTS-004, WTS-008, WTS-009, WTS-010, CRC-007, WPG-003, WPG-005, WPG-012

// Navigation: public API — exactUrlKey, normalizeUrlForCacheMapping, evaluateWave1FocusCoverage, readWave0SourceUrls, deriveWave1NewSourceFloor, checkSourceClaimCacheMapping, checkWave1DepthReviewContract, loadWave2FindingIndexFact, evaluateWave2PairFacts, checkWave2FindingIndexContract, topicSlugFromDepthReviewTarget
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve as resolvePath } from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  readBundlePlan,
  readBundleProfile,
  readNormalizedSubmittedWorkUnitDeclarations,
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';
import { inspectCacheLeaf } from './cache-leaf-contract.mjs';
import { evaluateTopicLayouts } from './topic-layout.mjs';
import { buildCanonicalTopicRegistryFact } from './topic-registry-fact.mjs';
import { resolveTopicLayout } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { selectWave1CarriedTargetReceiptForWave2 } from './wave-carried-target-receipts.mjs';
import { normalizeWave1ReferenceUrl } from './reference-url.mjs';
import { resolveReviewedWave1SubmittedBacking } from './wave1-reference-convergence.mjs';
import { readProjectionProfileRound } from '../work-unit-projection.mjs';



// Facade re-exports: the 11 public symbols now live in the carved modules (W3 carve).
export {
  exactUrlKey,
  normalizeUrlForCacheMapping,
  readWave0SourceUrls,
  checkSourceClaimCacheMapping,
  deriveWave1NewSourceFloor,
} from './wave1-source-claim-mapping.mjs';
export {
  evaluateWave1FocusCoverage,
  checkWave1DepthReviewContract,
} from './wave1-depth-review-contract.mjs';
export {
  loadWave2FindingIndexFact,
  evaluateWave2PairFacts,
  checkWave2FindingIndexContract,
  topicSlugFromDepthReviewTarget,
} from './wave2-finding-index-contract.mjs';
