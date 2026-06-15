#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
const SEARCH_TYPES = new Set(["auto", "fast", "instant", "deep-lite", "deep", "deep-reasoning"]);
const CATEGORY_VALUES = new Set(["company", "people", "research paper", "news", "personal site", "financial report"]);
const DEFAULT_TIMEOUT_MS = 45000;

export function usage() {
  return `usage: exa-source-intake.mjs --run-dir RUN_DIR --batch-id BATCH_ID [--request FILE] [--query TEXT] [options]

Runs an Exa-backed V12 source-intake batch and writes run-local _cache outputs.

required:
  --run-dir RUN_DIR      active V12 run directory
  --batch-id BATCH_ID    concrete source-intake batch slug

input:
  --request FILE         JSON request file, or markdown with a fenced JSON block
  --query TEXT           ad hoc intake_goal when no request file is supplied
  --question TEXT        repeatable research question

options:
  --project-root DIR    project root whose .env should be searched first
  --env-file FILE       explicit .env file; overrides search-root discovery
  --budget MODE          minimal, standard, or full; default standard
  --max-calls N          cap Exa search calls; default follows budget
  --timeout-ms N         per-call timeout; default ${DEFAULT_TIMEOUT_MS}
  --dry-run              print the generated Exa/native-search plan without writing files
  -h, --help             show this help message and exit`;
}

export function parseArgs(argv) {
  const args = {
    runDir: null,
    batchId: null,
    request: null,
    query: null,
    questions: [],
    projectRoot: null,
    envFile: null,
    budget: "standard",
    maxCalls: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    dryRun: false,
    help: false,
  };

  for (let idx = 0; idx < argv.length; idx += 1) {
    const arg = argv[idx];
    if (arg === "-h" || arg === "--help") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--run-dir") {
      args.runDir = nextValue(argv, ++idx, arg);
    } else if (arg === "--batch-id") {
      args.batchId = nextValue(argv, ++idx, arg);
    } else if (arg === "--request") {
      args.request = nextValue(argv, ++idx, arg);
    } else if (arg === "--query") {
      args.query = nextValue(argv, ++idx, arg);
    } else if (arg === "--question") {
      args.questions.push(nextValue(argv, ++idx, arg));
    } else if (arg === "--project-root") {
      args.projectRoot = nextValue(argv, ++idx, arg);
    } else if (arg === "--env-file") {
      args.envFile = nextValue(argv, ++idx, arg);
    } else if (arg === "--budget") {
      args.budget = nextValue(argv, ++idx, arg);
    } else if (arg === "--max-calls") {
      args.maxCalls = positiveInt(nextValue(argv, ++idx, arg), arg);
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = positiveInt(nextValue(argv, ++idx, arg), arg);
    } else if (arg.startsWith("--")) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }

  if (args.budget && !["minimal", "standard", "full"].includes(args.budget)) {
    throw new Error("--budget must be minimal, standard, or full");
  }
  return args;
}

function nextValue(argv, idx, flag) {
  if (idx >= argv.length || argv[idx].startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[idx];
}

function positiveInt(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer`);
  }
  return parsed;
}

export function assertBatchId(batchId) {
  if (!batchId || !/^[a-z0-9][a-z0-9._-]{1,80}$/i.test(batchId) || batchId.includes("..") || /[<>/\\\s]/.test(batchId)) {
    throw new Error("--batch-id must be a concrete slug without spaces, slashes, placeholders, or traversal");
  }
}

export function readRequest(path) {
  if (!path) {
    return {};
  }
  const text = readFileSync(path, "utf8");
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1]);
    }
  }
  throw new Error(`request must be JSON or markdown with a fenced JSON block: ${path}`);
}

export function loadEnv(searchRoots, explicitEnvFile = null) {
  if (explicitEnvFile) {
    readEnvFile(explicitEnvFile);
    return;
  }
  for (const root of envSearchRoots(searchRoots)) {
    const path = join(root, ".env");
    readEnvFile(path);
  }
}

export function readEnvFile(path) {
  if (!path || !existsSync(path)) {
    return;
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const [rawKey, ...rawParts] = line.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key]) {
      continue;
    }
    process.env[key] = stripEnvQuotes(rawParts.join("=").trim());
  }
}

export function envSearchRoots(roots) {
  const maxUp = 4;
  const seen = new Set();
  const output = [];
  for (const rawRoot of roots.filter(Boolean)) {
    let current = resolve(rawRoot);
    let up = 0;
    while (!seen.has(current) && up <= maxUp) {
      seen.add(current);
      output.push(current);
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
      up += 1;
    }
  }
  return output;
}

export function stripEnvQuotes(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function mergeRequest(args, fileRequest) {
  const request = { ...fileRequest };
  if (args.query) {
    request.intake_goal = args.query;
  }
  if (args.questions.length > 0) {
    request.research_questions = [...asList(request.research_questions), ...args.questions];
  }
  return request;
}

export function asList(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => String(item ?? "").trim()).map((item) => String(item).trim());
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/\r?\n|;+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function fieldText(value) {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(fieldText).join("\n");
  }
  if (typeof value === "object") {
    return Object.values(value).map(fieldText).join("\n");
  }
  return String(value);
}

export function classifySearchIntent(request) {
  const allText = [
    request.intake_goal,
    request.topic_scope,
    request.trust_and_tier_targets,
    request.method_constraints,
    request.source_preferences,
    request.exclusion_rules,
    request.research_profile,
    asList(request.research_questions).join("\n"),
  ].map(fieldText).join("\n").toLowerCase();

  const reasons = [];
  const categories = new Set();

  const categoryRules = [
    ["research paper", /\b(arxiv|paper|papers|academic|scholar|study|studies|journal|conference|benchmark|dataset|论文|学术|研究|基准|数据集)\b/i],
    ["news", /\b(news|latest|current|today|recent|breaking|报道|新闻|最新|近期)\b/i],
    ["company", /\b(company|companies|startup|startups|vendor|market|funding|industry|competitor|公司|企业|创业|融资|竞品)\b/i],
    ["people", /\b(people|person|experts|founder|ceo|author|researcher|linkedin|人物|专家|作者|创始人|高管)\b/i],
    ["financial report", /\b(sec|10-k|10-q|annual report|earnings|filing|financial report|财报|年报|季报|申报|filings)\b/i],
    ["personal site", /\b(blog|personal site|portfolio|independent writer|个人博客|博客|个人网站)\b/i],
  ];
  for (const [category, pattern] of categoryRules) {
    if (pattern.test(allText)) {
      categories.add(category);
    }
  }

  const markers = [
    ["date_window", /\b(20\d{2}\s*[-/]\s*20\d{2}|since\s+20\d{2}|after\s+20\d{2}|before\s+20\d{2}|latest_available|historical_baseline|近[三四五六七八九十]?年|最新)\b/i],
    ["domain_or_source_family_filter", /\b(includeDomains|excludeDomains|official|standards?|regulation|filing|dataset|benchmark|must[_ -]?include|exclude|排除|优先|官方|标准|法规|数据集|基准)\b/i],
    ["claim_or_counterexample_search", /\b(claim_verification|verify|falsify|counterexample|limitation|failure mode|dispute|contradict|反例|限制|争议|失败模式|验证|削弱)\b/i],
    ["structured_or_enrichment_need", /\b(compare|matrix|list|extract|schema|enrich|rank|top\s+\d+|对比|列表|提取|结构化|排序)\b/i],
    ["multi_question_batch", asList(request.research_questions).length >= 2],
  ];
  for (const [reason, pattern] of markers) {
    if (typeof pattern === "boolean" ? pattern : pattern.test(allText)) {
      reasons.push(reason);
    }
  }

  const advanced = reasons.length > 0 || categories.size > 0;
  return { advanced, reasons, categories: [...categories] };
}

export function buildSearchPlan(request, args) {
  const intent = classifySearchIntent(request);
  const prefs = request.source_preferences && typeof request.source_preferences === "object" ? request.source_preferences : {};
  const query = compactText(request.intake_goal || request.topic_scope || asList(request.research_questions)[0] || "source intake research query", 500);
  const questions = asList(request.research_questions);
  const baseQuery = compactText([query, request.topic_scope].filter(Boolean).join(" "), 900);
  const additionalQueries = unique([
    ...questions,
    ...splitPreferenceQueries(prefs.must_include_sources),
    intent.reasons.includes("claim_or_counterexample_search") ? `counterexamples limitations disputes for ${query}` : null,
    request.trust_and_tier_targets ? `${query} official primary source evidence` : null,
  ]).slice(0, 8);
  const includeDomains = unique([
    ...extractDomains(prefs.preferred_source_families),
    ...extractDomains(prefs.must_include_sources),
    ...extractDomains(request.must_include_sources),
  ]).slice(0, 1200);
  const excludeDomains = unique([
    ...extractDomains(prefs.exclusion_rules),
    ...extractDomains(request.exclusion_rules),
  ]).slice(0, 1200);
  const dateFilters = dateFilterFromRequest(request);
  const userLocation = userLocationFromText([prefs.geography_or_jurisdiction, request.geography_or_jurisdiction].map(fieldText).join(" "));
  const maxCalls = args.maxCalls || { minimal: 2, standard: 4, full: 7 }[args.budget];
  const numResults = { minimal: 5, standard: 8, full: 10 }[args.budget];
  const fresh = /\b(latest|current|today|breaking|latest_available|最新|当前|近期)\b/i.test(fieldText(request));

  const baseContents = {
    highlights: true,
    summary: { query: compactText(`Why this source matters for: ${query}`, 220) },
    text: { maxCharacters: args.budget === "minimal" ? 3000 : 5000 },
    extras: { links: args.budget === "full" ? 3 : 1 },
  };
  if (fresh) {
    baseContents.maxAgeHours = 0;
    baseContents.livecrawlTimeout = 15000;
  }

  const richContents = {
    ...baseContents,
    text: { maxCharacters: args.budget === "full" ? 12000 : 8000 },
  };

  const passes = [];
  passes.push({
    id: "semantic-discovery",
    purpose: "broad semantic source discovery",
    payload: withFilters({
      query: baseQuery,
      type: "auto",
      numResults,
      contents: baseContents,
    }, { includeDomains, excludeDomains, dateFilters, userLocation }),
  });

  for (const category of intent.categories) {
    const categoryQuery = category === "company" || category === "people"
      ? verticalNaturalLanguageQuery(baseQuery, request, prefs)
      : baseQuery;
    passes.push({
      id: `category-${slug(category)}`,
      purpose: `category-specific ${category} retrieval`,
      payload: withFilters({
        query: categoryQuery,
        type: "auto",
        category,
        numResults,
        contents: category === "research paper" || category === "financial report" ? richContents : baseContents,
      }, { includeDomains, excludeDomains, dateFilters, userLocation }),
    });
  }

  if (includeDomains.length > 0) {
    passes.push({
      id: "preferred-domain-pass",
      purpose: "must-include or preferred-source-family domain pass",
      payload: withFilters({
        query: baseQuery,
        type: "auto",
        includeDomains,
        numResults,
        contents: richContents,
      }, { includeDomains: [], excludeDomains, dateFilters, userLocation }),
    });
  }

  if (intent.reasons.includes("claim_or_counterexample_search")) {
    passes.push({
      id: "counterexample-limitations",
      purpose: "counterexample, limitation, dispute, and failure-mode search",
      payload: withFilters({
        query: compactText(`Find counterexamples, limitations, disputes, and failure modes for: ${baseQuery}`, 900),
        type: "deep-lite",
        additionalQueries,
        numResults,
        systemPrompt: "Prefer primary evidence, independent checks, and sources that weaken or bound the claim. Avoid repeated copies of the same source family.",
        contents: richContents,
      }, { includeDomains, excludeDomains, dateFilters, userLocation }),
    });
  }

  if (intent.advanced) {
    passes.push({
      id: "deep-evidence-map",
      purpose: "synthesized retrieval map with grounded source candidates",
      payload: withFilters({
        query: baseQuery,
        type: intent.reasons.length >= 3 ? "deep-reasoning" : "deep",
        additionalQueries,
        numResults: Math.min(10, numResults),
        systemPrompt: "Return source candidates useful for a V12 deep-research intake. Prefer independent source families, primary sources, and explicit limitation evidence. Do not treat the synthesis as accepted evidence.",
        outputSchema: {
          type: "object",
          properties: {
            retrieval_focus: { type: "string" },
            high_value_source_families: { type: "array", items: { type: "string" } },
            gaps_or_counterexamples: { type: "array", items: { type: "string" } },
            promotion_notes: { type: "array", items: { type: "string" } },
          },
          required: ["retrieval_focus"],
        },
        contents: richContents,
      }, { includeDomains, excludeDomains, dateFilters, userLocation }),
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const pass of passes) {
    const key = JSON.stringify({ ...pass.payload, contents: undefined, outputSchema: Boolean(pass.payload.outputSchema) });
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push({ ...pass, payload: sanitizePayload(pass.payload) });
  }

  return {
    intent,
    query,
    additionalQueries,
    includeDomains,
    excludeDomains,
    dateFilters,
    userLocation,
    passes: deduped.slice(0, maxCalls),
  };
}

function verticalNaturalLanguageQuery(baseQuery, request, prefs) {
  const parts = [
    combinedFieldText(request.source_date_window, prefs.source_date_window) ? `date window: ${combinedFieldText(request.source_date_window, prefs.source_date_window)}` : null,
    combinedFieldText(request.geography_or_jurisdiction, prefs.geography_or_jurisdiction) ? `geography or jurisdiction: ${combinedFieldText(request.geography_or_jurisdiction, prefs.geography_or_jurisdiction)}` : null,
    fieldText(request.method_constraints) ? `method constraints: ${fieldText(request.method_constraints)}` : null,
    fieldText(prefs.preferred_source_families) ? `preferred source families: ${fieldText(prefs.preferred_source_families)}` : null,
    combinedFieldText(request.must_include_sources, prefs.must_include_sources) ? `must include when possible: ${combinedFieldText(request.must_include_sources, prefs.must_include_sources)}` : null,
    combinedFieldText(request.exclusion_rules, prefs.exclusion_rules) ? `exclude when possible: ${combinedFieldText(request.exclusion_rules, prefs.exclusion_rules)}` : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return baseQuery;
  }
  return compactText(`${baseQuery} Constraints to honor in natural language because this Exa category rejects API filters: ${parts.join("; ")}`, 900);
}

function combinedFieldText(...values) {
  return unique(values.map(fieldText).filter(Boolean)).join("; ");
}

export function withFilters(payload, { includeDomains, excludeDomains, dateFilters, userLocation }) {
  const next = { ...payload };
  if (includeDomains.length > 0 && !next.includeDomains) {
    next.includeDomains = includeDomains;
  }
  if (excludeDomains.length > 0) {
    next.excludeDomains = excludeDomains;
  }
  Object.assign(next, dateFilters);
  if (userLocation) {
    next.userLocation = userLocation;
  }
  return next;
}

export function sanitizePayload(payload) {
  const next = JSON.parse(JSON.stringify(payload));
  if (!SEARCH_TYPES.has(next.type)) {
    next.type = "auto";
  }
  if (next.category && !CATEGORY_VALUES.has(next.category)) {
    delete next.category;
  }
  if (next.category === "company" || next.category === "people") {
    delete next.includeDomains;
    delete next.startPublishedDate;
    delete next.endPublishedDate;
    delete next.startCrawlDate;
    delete next.endCrawlDate;
    delete next.excludeDomains;
    delete next.userLocation;
  }
  return next;
}

export function splitPreferenceQueries(value) {
  return fieldText(value).split(/\r?\n|;+/).map((item) => item.trim()).filter((item) => item && !extractDomains(item).length);
}

export function extractDomains(value) {
  const text = fieldText(value);
  const domains = [];
  const pattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\/[^\s,;)]*)?/gi;
  for (const match of text.matchAll(pattern)) {
    const domain = match[1].toLowerCase();
    if (!domain.includes("example.") && !domain.includes("replace-with")) {
      domains.push(domain);
    }
  }
  return unique(domains);
}

export function dateFilterFromRequest(request) {
  const text = [
    request.source_date_window,
    request.source_preferences?.source_date_window,
    request.method_constraints,
    request.intake_goal,
  ].map(fieldText).join(" ");
  const filters = {};
  const range = text.match(/\b(20\d{2})\s*[-/]\s*(20\d{2})\b/);
  if (range) {
    filters.startPublishedDate = `${range[1]}-01-01T00:00:00.000Z`;
    filters.endPublishedDate = `${range[2]}-12-31T23:59:59.999Z`;
    return filters;
  }
  const since = text.match(/\b(?:since|after)\s+(20\d{2})\b/i);
  if (since) {
    filters.startPublishedDate = `${since[1]}-01-01T00:00:00.000Z`;
    return filters;
  }
  const before = text.match(/\bbefore\s+(20\d{2})\b/i);
  if (before) {
    filters.endPublishedDate = `${before[1]}-12-31T23:59:59.999Z`;
  }
  return filters;
}

export function userLocationFromText(text) {
  const normalized = text.toLowerCase();
  const latinMappings = [
    ["US", /\b(us|usa|united states|america)\b/i],
    ["CN", /\b(china|prc)\b/i],
    ["GB", /\b(uk|united kingdom|britain)\b/i],
    ["DE", /\b(germany|deutschland)\b/i],
    ["FR", /\b(france)\b/i],
    ["JP", /\b(japan)\b/i],
    ["SG", /\b(singapore)\b/i],
  ];
  for (const [code, pattern] of latinMappings) {
    if (pattern.test(normalized)) {
      return code;
    }
  }
  const cjkMappings = [
    ["US", "美国"],
    ["CN", "中国"],
    ["GB", "英国"],
    ["DE", "德国"],
    ["FR", "法国"],
    ["JP", "日本"],
    ["SG", "新加坡"],
  ];
  for (const [code, term] of cjkMappings) {
    if (normalized.includes(term)) {
      return code;
    }
  }
  const explicit = text.match(/\b[A-Z]{2}\b/);
  return explicit ? explicit[0] : null;
}

export async function runExaPass(pass, apiKey, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(EXA_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(pass.payload),
      signal: controller.signal,
    });
    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = { raw: bodyText.slice(0, 2000) };
    }
    if (!response.ok) {
      return {
        ok: false,
        pass,
        status: response.status,
        error: body?.message || body?.error || bodyText.slice(0, 500),
      };
    }
    return { ok: true, pass, response: body };
  } catch (error) {
    return { ok: false, pass, status: "network_error", error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeCandidates(results, batchId, request) {
  const seen = new Map();
  for (const result of results) {
    if (!result.ok) {
      continue;
    }
    const passId = result.pass.id;
    const responseResults = Array.isArray(result.response.results) ? result.response.results : [];
    for (const item of responseResults) {
      addCandidate(seen, item, passId, result.pass);
      for (const subpage of Array.isArray(item.subpages) ? item.subpages : []) {
        addCandidate(seen, subpage, `${passId}/subpage`, result.pass);
      }
    }
    const grounding = result.response.output?.grounding || [];
    for (const grounded of grounding) {
      for (const citation of Array.isArray(grounded.citations) ? grounded.citations : []) {
        addCandidate(seen, {
          title: citation.title,
          url: citation.url,
          id: citation.url,
          highlights: [`Grounded by Exa output field: ${grounded.field || "content"}`],
        }, `${passId}/grounding`, result.pass);
      }
    }
  }

  return [...seen.values()].map((candidate, index) => {
    const candidateId = `exa-${String(index + 1).padStart(3, "0")}`;
    const slugPart = slug(candidate.title || domainFromUrl(candidate.url) || candidateId).slice(0, 72) || candidateId;
    const proposedReferencePath = proposedReferencePathFor(request, slugPart);
    const diagnostic = sourceDiagnostic(candidate);
    return {
      ...candidate,
      candidateId,
      proposedReferencePath,
      cachePath: `_cache/intake/${batchId}/retrieval-results.md#candidate-${candidateId}`,
      diagnostic,
    };
  });
}

export function addCandidate(seen, item, passId, pass) {
  const url = item?.url || item?.id;
  if (!url) {
    return;
  }
  const key = canonicalUrl(url);
  const existing = seen.get(key);
  const entry = existing || {
    title: item.title || url,
    url,
    id: item.id || url,
    author: item.author || null,
    publishedDate: item.publishedDate || null,
    image: item.image || null,
    favicon: item.favicon || null,
    text: item.text || null,
    highlights: [],
    highlightScores: [],
    summary: item.summary || null,
    extras: item.extras || {},
    passes: [],
    categories: [],
  };
  if (Array.isArray(item.highlights)) {
    entry.highlights.push(...item.highlights.filter(Boolean));
  }
  if (Array.isArray(item.highlightScores)) {
    entry.highlightScores.push(...item.highlightScores);
  }
  if (item.summary && !entry.summary) {
    entry.summary = item.summary;
  }
  if (item.text && !entry.text) {
    entry.text = item.text;
  }
  entry.passes.push(passId);
  if (pass.payload.category) {
    entry.categories.push(pass.payload.category);
  }
  seen.set(key, entry);
}

export function canonicalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.replace(/^www\./, "");
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.trim();
  }
}

export function domainFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function sourceDiagnostic(candidate) {
  const domain = domainFromUrl(candidate.url);
  const category = candidate.categories[0] || "";
  const isAcademic = category === "research paper" || /\.(edu|ac\.[a-z]+)$/i.test(domain) || /\b(arxiv|doi|ieee|acm|springer|nature|science|sciencedirect|ssrn)\b/i.test(domain);
  const isOfficial = /\.(gov|mil)$/i.test(domain) || /\b(official|standards?|regulator|who\.int|oecd\.org|worldbank\.org|sec\.gov)\b/i.test(domain);
  const isCommunity = /\b(reddit|forum|stackoverflow|stackexchange|serverfault|superuser|askubuntu|medium|substack|news\.ycombinator)\b/i.test(domain);
  const highlightCount = Array.isArray(candidate.highlights) ? candidate.highlights.length : 0;
  const hasSubstance = Boolean(candidate.text || candidate.summary || highlightCount > 0);
  const trustLevel = isOfficial ? "official" : isAcademic ? "academic" : isCommunity ? "community" : "practitioner";
  const tier = isOfficial || isAcademic ? "tier_1" : isCommunity ? "tier_4" : "tier_2";
  const noiseRisk = isCommunity ? "medium" : /\b(vendor|pricing|product|solution|sponsored)\b/i.test(`${candidate.title} ${candidate.summary}`) ? "medium" : "low";
  const decision = hasSubstance && noiseRisk === "low" ? "promote" : "needs_full_read";
  return {
    domain,
    trustLevel,
    tier,
    noiseRisk,
    decision,
    hasSubstance,
  };
}

export function proposedReferencePathFor(request, sourceSlug) {
  const outputPaths = request.output_paths && typeof request.output_paths === "object" ? request.output_paths : {};
  const referenceDir = outputPaths.reference_dir || request.reference_dir || "REFERENCE_DIR";
  const topicId = request.topic_id || outputPaths.topic_id || "";
  const prefix = topicId && !/^wave0|shared|foundation$/i.test(topicId) ? topicId : "00-shared";
  return `${referenceDir.replace(/\/$/, "")}/${prefix}-${sourceSlug}.md`;
}

export function renderIntakeRequest(request, plan, batchId) {
  return [
    "# Intake Request",
    "",
    `- batch_id: \`${batchId}\``,
    "- selected_provider_profile: `exa_search`",
    `- advanced_search_detected: \`${plan.intent.advanced ? "yes" : "no"}\``,
    `- advanced_search_reasons: \`${plan.intent.reasons.join("; ") || "none"}\``,
    `- exa_categories: \`${plan.intent.categories.join("; ") || "none"}\``,
    `- fallback_provider: \`native_search\``,
    "",
    "## Stable Request Fields",
    "",
    fencedJson({
      intake_goal: request.intake_goal || null,
      research_questions: asList(request.research_questions),
      topic_scope: request.topic_scope || null,
      trust_and_tier_targets: request.trust_and_tier_targets || null,
      method_constraints: request.method_constraints || null,
      source_preferences: request.source_preferences || null,
      exclusion_rules: request.exclusion_rules || null,
      output_paths: request.output_paths || null,
      runner_mode: request.runner_mode || null,
    }),
    "",
    "## Exa Search Plan",
    "",
    ...plan.passes.map((pass, index) => [
      `### Pass ${index + 1}: ${pass.id}`,
      "",
      `- purpose: \`${pass.purpose}\``,
      "",
      fencedJson(redactPayload(pass.payload)),
      "",
    ].join("\n")),
  ].join("\n");
}

export function renderRetrievalResults({ batchId, plan, results, candidates, runnerResult }) {
  const okResults = results.filter((result) => result.ok);
  const failedResults = results.filter((result) => !result.ok);
  const totalCost = okResults.reduce((sum, result) => sum + Number(result.response.costDollars?.total || 0), 0);
  return [
    "# Retrieval Results",
    "",
    `- provider_profile_used: \`exa_search\``,
    `- runner_result: \`${runnerResult}\``,
    `- fallback_provider: \`native_search\``,
    `- batch_id: \`${batchId}\``,
    `- successful_exa_passes: \`${okResults.length}\``,
    `- failed_exa_passes: \`${failedResults.length}\``,
    `- normalized_candidates: \`${candidates.length}\``,
    `- exa_cost_dollars_total: \`${totalCost ? totalCost.toFixed(6) : "not_reported"}\``,
    "",
    "## Pass Outcomes",
    "",
    "| pass | status | resolved_search_type | result_count | request_id | note |",
    "| --- | --- | --- | --- | --- | --- |",
    ...results.map((result) => {
      if (!result.ok) {
        return `| ${escapeCell(result.pass.id)} | failed | not_applicable | 0 | not_applicable | ${escapeCell(`${result.status}: ${result.error}`)} |`;
      }
      const response = result.response;
      const resolvedType = response.searchType || response.resolvedSearchType || result.pass.payload.type || "auto";
      return `| ${escapeCell(result.pass.id)} | success | ${escapeCell(resolvedType)} | ${Array.isArray(response.results) ? response.results.length : 0} | ${escapeCell(response.requestId || "not_reported")} | ${escapeCell(result.pass.purpose)} |`;
    }),
    "",
    "## Candidate Detail",
    "",
    ...candidates.map(renderCandidateDetail),
    candidates.length === 0 ? fallbackQueryGroupsMarkdown(plan) : "",
    "",
  ].join("\n");
}

export function renderCandidateDetail(candidate) {
  const highlights = unique(candidate.highlights);
  return [
    `### Candidate ${candidate.candidateId}`,
    "",
    `- title: ${inline(candidate.title)}`,
    `- url: ${inline(candidate.url)}`,
    `- domain: \`${candidate.diagnostic.domain || "unknown"}\``,
    `- passes: \`${unique(candidate.passes).join("; ")}\``,
    `- categories: \`${unique(candidate.categories).join("; ") || "none"}\``,
    `- published_date: \`${candidate.publishedDate || "not_reported"}\``,
    `- author: ${inline(candidate.author || "not_reported")}`,
    `- exa_content_modes: \`${[
      candidate.text ? "text" : null,
      candidate.summary ? "summary" : null,
      highlights.length > 0 ? "highlights" : null,
    ].filter(Boolean).join("; ") || "metadata_only"}\``,
    "",
    candidate.summary ? [
      "summary:",
      "",
      blockquote(candidate.summary),
      "",
    ].join("\n") : "",
    highlights.length > 0 ? [
      "highlights:",
      ...highlights.map((item) => `- ${item}`),
      "",
    ].join("\n") : "",
    candidate.text ? [
      "text_excerpt:",
      "",
      blockquote(candidate.text),
      "",
    ].join("\n") : "",
  ].join("\n");
}

export function renderCandidateCards({ batchId, candidates, runnerResult }) {
  return [
    "# Candidate Cards",
    "",
    `- provider_profile_used: \`exa_search\``,
    `- runner_result: \`${runnerResult}\``,
    `- fallback_provider: \`native_search\``,
    `- batch_id: \`${batchId}\``,
    "",
    candidates.length === 0
      ? "No Exa candidates were produced. Treat this as `fail_soft` and rerun the same intake request through `native_search`."
      : candidates.map(renderCandidateCard).join("\n\n"),
    "",
  ].join("\n");
}

export function renderCandidateCard(candidate) {
  const supportsClaims = unique([
    candidate.summary ? compactText(candidate.summary, 240) : null,
    ...candidate.highlights.slice(0, 2).map((item) => compactText(item, 180)),
  ].filter(Boolean)).join(" | ") || "requires main-agent review";
  return [
    `## ${candidate.candidateId}`,
    "",
    `- candidate_source: ${inline(`${candidate.title} - ${candidate.url}`)}`,
    `- cache_path: \`${candidate.cachePath}\``,
    `- proposed_reference_path: \`${candidate.proposedReferencePath}\``,
    "- provider_profile: `exa_search`",
    `- trust_level / tier: \`${candidate.diagnostic.trustLevel} / ${candidate.diagnostic.tier}\``,
    `- topic_alignment: \`review_required\``,
    `- supports_claims: ${inline(supportsClaims)}`,
    `- source_diagnostic_summary: \`domain=${candidate.diagnostic.domain || "unknown"}; published=${candidate.publishedDate || "not_reported"}; exa_modes=${[
      candidate.text ? "text" : null,
      candidate.summary ? "summary" : null,
      candidate.highlights.length > 0 ? "highlights" : null,
    ].filter(Boolean).join("+") || "metadata_only"}; webpage_material_diagnostic_gate=required_before_promotion\``,
    `- noise_risk: \`${candidate.diagnostic.noiseRisk}\``,
    `- decision: \`${candidate.diagnostic.decision}\``,
    `- why_main_agent_should_care: ${inline(compactText(supportsClaims, 280))}`,
  ].join("\n");
}

export function renderCaptureManifest({ batchId, candidates }) {
  return [
    "# Capture Manifest",
    "",
    `- provider_profile_used: \`exa_search\``,
    `- batch_id: \`${batchId}\``,
    "- capture_rule: `retrieval-results.md contains Exa-returned excerpts; create separate full captures only when full-read triggers require them`",
    "",
    "| candidate_id | capture_path | source_url | available_exa_content | followup |",
    "| --- | --- | --- | --- | --- |",
    ...candidates.map((candidate) => {
      const modes = [
        candidate.text ? "text_excerpt" : null,
        candidate.summary ? "summary" : null,
        candidate.highlights.length > 0 ? "highlights" : null,
      ].filter(Boolean).join("; ") || "metadata_only";
      return `| ${candidate.candidateId} | _cache/intake/${batchId}/retrieval-results.md | ${escapeCell(candidate.url)} | ${escapeCell(modes)} | direct fetch or Exa /contents only if promotion review needs a full read |`;
    }),
    candidates.length === 0 ? `| none | not_applicable | not_applicable | none | rerun through native_search |` : "",
    "",
  ].join("\n");
}

export function renderExcluded({ plan, results, candidates }) {
  const failed = results.filter((result) => !result.ok);
  return [
    "# Excluded And Failure Notes",
    "",
    `- provider_profile_used: \`exa_search\``,
    `- fallback_provider: \`native_search\``,
    "",
    "## Failed Exa Passes",
    "",
    failed.length === 0 ? "- none" : failed.map((result) => `- ${result.pass.id}: ${result.status} ${result.error}`).join("\n"),
    "",
    "## Duplicate / Noise Handling",
    "",
    "- duplicate URLs were merged into one candidate card",
    "- low-substance or high-noise sources are marked `needs_full_read` instead of promoted by the runner",
    "",
    candidates.length === 0 ? fallbackQueryGroupsMarkdown(plan) : "",
    "",
  ].join("\n");
}

export function fallbackQueryGroupsMarkdown(plan) {
  return [
    "## Suggested Native Search Query Groups",
    "",
    "- fallback_provider: `native_search`",
    "- use 3-5 focused native query groups, preserving the same source preferences and exclusion rules",
    "",
    ...plan.passes.map((pass) => `- ${pass.id}: ${pass.payload.query}`),
    "",
  ].join("\n");
}

export function outputPaths(runDir, batchId) {
  const intakeDir = join(runDir, "_cache", "intake", batchId);
  const excludedDir = join(runDir, "_cache", "excluded");
  return {
    intakeDir,
    excludedDir,
    intakeRequest: join(intakeDir, "intake-request.md"),
    retrievalResults: join(intakeDir, "retrieval-results.md"),
    candidateCards: join(intakeDir, "candidate-cards.md"),
    captureManifest: join(intakeDir, "capture-manifest.md"),
    excluded: join(excludedDir, `${batchId}-excluded.md`),
  };
}

export function writeOutputs(paths, files) {
  mkdirSync(paths.intakeDir, { recursive: true });
  mkdirSync(paths.excludedDir, { recursive: true });
  for (const [path, text] of files) {
    writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  }
}

export function fencedJson(value) {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

export function redactPayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

export function compactText(value, maxLength) {
  const text = fieldText(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

export function blockquote(text) {
  return text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

export function inline(value) {
  return `\`${String(value ?? "").replace(/`/g, "'")}\``;
}

export function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : value;
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

export function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function runnerResultFor(results, candidates) {
  const okCount = results.filter((result) => result.ok).length;
  return okCount > 0 && candidates.length > 0 ? "success" : "fail_soft";
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
    if (args.help) {
      console.log(usage());
      return 0;
    }
    if (!args.runDir) {
      throw new Error("--run-dir is required");
    }
    if (!args.batchId) {
      throw new Error("--batch-id is required");
    }
    assertBatchId(args.batchId);
    const runDir = resolve(args.runDir);
    const requestPath = args.request ? (isAbsolute(args.request) ? args.request : resolve(args.request)) : null;
    const projectRoot = args.projectRoot
      ? resolve(args.projectRoot)
      : (process.env.DEEP_RESEARCH_PROJECT_ROOT ? resolve(process.env.DEEP_RESEARCH_PROJECT_ROOT) : null);
    const envFile = args.envFile
      ? resolve(args.envFile)
      : (process.env.EXA_ENV_FILE ? resolve(process.env.EXA_ENV_FILE) : null);
    const fileRequest = readRequest(requestPath);
    const request = mergeRequest(args, fileRequest);
    if (!request.intake_goal && asList(request.research_questions).length === 0) {
      throw new Error("provide --query, or request.intake_goal / request.research_questions");
    }
    const plan = buildSearchPlan(request, args);
    if (args.dryRun) {
      console.log(fencedJson({
        provider_profile_used: "exa_search",
        fallback_provider: "native_search",
        batch_id: args.batchId,
        advanced_search_detected: plan.intent.advanced,
        advanced_search_reasons: plan.intent.reasons,
        exa_categories: plan.intent.categories,
        planned_passes: plan.passes.map((pass) => ({ id: pass.id, purpose: pass.purpose, payload: redactPayload(pass.payload) })),
      }));
      return 0;
    }

    loadEnv([projectRoot, runDir, requestPath ? dirname(requestPath) : null, process.cwd(), dirname(fileURLToPath(import.meta.url))], envFile);
    const apiKey = process.env.EXA_API_KEY;
    const paths = outputPaths(runDir, args.batchId);
    if (!apiKey) {
      const files = fallbackFiles({ request, plan, batchId: args.batchId, reason: "missing EXA_API_KEY" });
      writeOutputs(paths, filesForPaths(paths, files));
      console.log(`FAIL_SOFT exa_search missing EXA_API_KEY; wrote fallback cache files for native_search: ${paths.candidateCards}`);
      return 0;
    }

    const results = [];
    for (const pass of plan.passes) {
      results.push(await runExaPass(pass, apiKey, args.timeoutMs));
    }
    const candidates = normalizeCandidates(results, args.batchId, request);
    const runnerResult = runnerResultFor(results, candidates);
    const files = {
      intakeRequest: renderIntakeRequest(request, plan, args.batchId),
      retrievalResults: renderRetrievalResults({ batchId: args.batchId, plan, results, candidates, runnerResult }),
      candidateCards: renderCandidateCards({ batchId: args.batchId, candidates, runnerResult }),
      captureManifest: renderCaptureManifest({ batchId: args.batchId, candidates }),
      excluded: renderExcluded({ plan, results, candidates }),
    };
    writeOutputs(paths, filesForPaths(paths, files));
    const status = runnerResult === "success" ? "SUCCESS" : "FAIL_SOFT";
    console.log(`${status} exa_search wrote ${candidates.length} candidate cards: ${paths.candidateCards}`);
    return 0;
  } catch (error) {
    console.error(`error: ${error.message}`);
    console.error(usage());
    return 2;
  }
}

export function fallbackFiles({ request, plan, batchId, reason }) {
  const pseudoResults = [{ ok: false, pass: { id: "exa-provider-startup", payload: {}, purpose: "provider startup" }, status: "not_started", error: reason }];
  return {
    intakeRequest: renderIntakeRequest(request, plan, batchId),
    retrievalResults: renderRetrievalResults({ batchId, plan, results: pseudoResults, candidates: [], runnerResult: "fail_soft" }),
    candidateCards: renderCandidateCards({ batchId, candidates: [], runnerResult: "fail_soft" }),
    captureManifest: renderCaptureManifest({ batchId, candidates: [] }),
    excluded: renderExcluded({ plan, results: pseudoResults, candidates: [] }),
  };
}

export function filesForPaths(paths, files) {
  return [
    [paths.intakeRequest, files.intakeRequest],
    [paths.retrievalResults, files.retrievalResults],
    [paths.candidateCards, files.candidateCards],
    [paths.captureManifest, files.captureManifest],
    [paths.excluded, files.excluded],
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
