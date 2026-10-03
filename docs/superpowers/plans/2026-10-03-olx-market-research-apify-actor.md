# OLX Market Research Apify Actor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować własny Apify Actor, który dla jednego przedmiotu zbiera porównywalne oferty OLX.pl, analizuje ceny i treści oraz tworzy Dataset, raport i gotowy pakiet do ręcznego użycia w ChatGPT.

**Architecture:** Actor w TypeScript używa lekkiego Crawlee `CheerioCrawler` jako ścieżki podstawowej i kontrolowanego `PlaywrightCrawler` jako fallbacku. Czyste moduły odpowiadają za wejście, zapytania, parsowanie, normalizację, dopasowanie, analizę i raporty; cienka warstwa runtime łączy je z Apify SDK i storage. Parsery są testowane na lokalnych fixture HTML, a komunikacja sieciowa jest wstrzykiwana do orkiestratora, aby błędy i retry dało się testować offline.

**Tech Stack:** Node.js 22, TypeScript/ES2022, Apify SDK 3.7, Crawlee 3.18, Cheerio, Playwright/Chromium, Zod, Vitest, Apify Actor schemas.

**Spec:** `docs/superpowers/specs/2026-10-03-olx-market-research-apify-actor-design.md`

## Global Constraints

- Jedno uruchomienie analizuje dokładnie jeden przedmiot.
- Rynek to OLX.pl w Polsce; kod lokalny domyślny to `55-002`, promień `50 km`.
- `deliveryMode` ma dokładnie trzy wartości: `local`, `shipping`, `both`.
- `maxResults` ma domyślnie `100` i zakres 10–300.
- Actor nie loguje się do OLX, nie pobiera danych kontaktowych, nie omija CAPTCHA ani blokad.
- Każdy publiczny opis jest redagowany z numerów telefonu i adresów e-mail przed zapisem.
- Actor nie wywołuje OpenAI API ani innego modelu językowego.
- Brakujące dane są `null`, nigdy wartością zgadywaną.
- Wynik ma zawierać Dataset oraz `REPORT.md`, `REPORT.html`, `CHATGPT_PROMPT.md`, `RUN_SUMMARY.json` i `EXCLUDED.json`.
- Podstawowy crawler jest HTTP/HTML; Playwright uruchamia się tylko po jawnie sklasyfikowanym braku danych wymagającym renderowania.
- Zależności są przypięte przez `package-lock.json`; kod wymaga Node.js 22 i targetu ES2022.

## Review Focus

1. `manual-only` bez zapytań lub URL-i musi zakończyć walidację przed startem crawlera — test w Task 2.
2. Ręczny URL spoza `https://www.olx.pl/` musi zostać odrzucony, a nie pobrany — test w Task 2.
3. Lokalny tryb bez poprawnego kodu pocztowego lub z promieniem poza dozwolonym zakresem musi dać czytelny błąd — test w Task 1.
4. Opis zawierający telefon lub e-mail nie może przenieść tych danych do Dataset ani promptu — testy w Task 3 i Task 8.
5. Powtarzające się `403`/`429` albo zmiana selektorów muszą zakończyć się wynikiem częściowym i diagnostyką, bez nieskończonych retry — test w Task 7.

---

## File Map

### Actor and project configuration

- `package.json` — scripts and runtime/dev dependencies.
- `package-lock.json` — reproducible dependency graph.
- `tsconfig.json` — strict ES2022 TypeScript build.
- `vitest.config.ts` — offline unit/integration test configuration.
- `.gitignore` — generated storage, build, coverage and dependencies.
- `.actor/actor.json` — Actor metadata, schemas, Dockerfile and storage links.
- `.actor/Dockerfile` — Node 22 Apify image and production build.
- `.actor/input_schema.json` — standard Apify input form.
- `.actor/dataset_schema.json` — one normalized offer per record.
- `.actor/key_value_store_schema.json` — report artifacts.
- `.actor/output_schema.json` — links to Dataset and report artifacts.

### Source

- `src/main.ts` — Actor lifecycle entry point only.
- `src/run-actor.ts` — testable dependency composition and pipeline orchestration.
- `src/types.ts` — shared domain types and discriminated unions.
- `src/input.ts` — Zod validation and defaults.
- `src/search/query-builder.ts` — automatic/manual query planning.
- `src/search/url-builder.ts` — safe OLX.pl search URL construction.
- `src/scraping/search-parser.ts` — pure search-results parser.
- `src/scraping/listing-parser.ts` — pure listing-details parser.
- `src/scraping/normalize.ts` — prices, dates, locations and attributes.
- `src/scraping/redact.ts` — contact-data redaction.
- `src/scraping/collector.ts` — bounded crawl, retries, fallback and partial results.
- `src/scraping/crawlee-fetchers.ts` — HTTP and Playwright adapters.
- `src/categories/registry.ts` — category extractor selection.
- `src/categories/tires.ts` — tire parameters.
- `src/categories/kids-bike.ts` — children’s bicycle parameters.
- `src/categories/kids-shoes.ts` — children’s shoes parameters.
- `src/categories/roof-window-sash.ts` — roof-window sash parameters.
- `src/matching/dedupe.ts` — ID/canonical URL deduplication.
- `src/matching/relevance.ts` — deterministic score and reasons.
- `src/analysis/price.ts` — IQR, weighted quantiles and confidence.
- `src/analysis/content.ts` — aggregated words, phrases and completeness patterns.
- `src/reporting/report-model.ts` — final report data composition.
- `src/reporting/markdown.ts` — Markdown report.
- `src/reporting/html.ts` — escaped HTML report.
- `src/reporting/chatgpt-prompt.ts` — copy-ready prompt capped at top 20 offers.
- `src/reporting/storage.ts` — Apify Dataset/KVS writer.

### Tests and fixtures

- `tests/**/*.test.ts` — unit and offline integration tests mirroring source responsibilities.
- `tests/fixtures/search/*.html` — sanitized search result pages.
- `tests/fixtures/listings/*.html` — sanitized category-specific listing pages.
- `tests/fixtures/inputs/*.json` — four acceptance inputs.
- `scripts/live-smoke.ts` — opt-in low-volume live validation; excluded from normal tests.
- `README.md` — use, outputs, cost controls, limitations and deployment.

---

### Task 1: Project foundation, domain types and input validation

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `.actor/actor.json`, `.actor/Dockerfile`, `.actor/input_schema.json`
- Create: `src/types.ts`, `src/input.ts`
- Test: `tests/input.test.ts`

**Interfaces:**
- Produces: `ActorInput`, `ValidatedInput`, `DeliveryMode`, `Condition`, `QueryMode` from `src/types.ts`.
- Produces: `validateInput(raw: unknown): ValidatedInput` from `src/input.ts`.

- [ ] **Step 1: Scaffold the TypeScript test/build environment**

Create scripts `build`, `test`, `test:watch`, `typecheck`, `start`, `start:dev` and install `apify@3.7`, `crawlee@3.18`, `cheerio`, `playwright`, `zod`, `typescript`, `vitest`, `@types/node`, `@apify/tsconfig`. Generate and commit `package-lock.json`; use `apify/actor-node-playwright-chrome:22` in the Dockerfile.

- [ ] **Step 2: Write failing input tests**

Cover defaults (`55-002`, `50`, `100`, `merge`), all delivery modes, `maxResults` boundaries, invalid conditions, local/both mode without a Polish `NN-NNN` postal code, radius below 1 or above 100, and preservation of optional item fields.

- [ ] **Step 3: Run the focused tests and verify failure**

Run: `npm test -- tests/input.test.ts`

Expected: FAIL because `validateInput` and shared types do not exist.

- [ ] **Step 4: Implement exact input contracts and validation**

Define `validateInput(raw: unknown): ValidatedInput`; normalize whitespace, apply exact defaults, reject unknown enum values, and require `postalCode`/`radiusKm` only for `local` and `both`.

- [ ] **Step 5: Add the Apify input schema and compile-time checks**

Mirror the validated fields in `.actor/input_schema.json`, including conditional help text, Polish labels and range constraints. Run `npm run typecheck` and `npm test -- tests/input.test.ts`; expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore .actor src/types.ts src/input.ts tests/input.test.ts
git commit -m "feat: scaffold actor input contract"
```

### Task 2: Hybrid query planning and safe OLX URLs

**Files:**
- Create: `src/search/query-builder.ts`, `src/search/url-builder.ts`
- Modify: `src/types.ts`
- Test: `tests/search/query-builder.test.ts`, `tests/search/url-builder.test.ts`

**Interfaces:**
- Consumes: `ValidatedInput`.
- Produces: `SearchSegment = 'local' | 'shipping'`, `SearchRequest`, `SearchPlan`.
- Produces: `buildSearchPlan(input: ValidatedInput): SearchPlan`.
- Produces: `assertAllowedOlxSearchUrl(value: string): URL` and `buildOlxSearchUrl(request: SearchRequest): URL`.

- [ ] **Step 1: Write failing query-planning tests**

Assert a maximum of five normalized automatic queries, stable deduplication, brand/model retention, numeric attribute retention, `merge` behavior, `manual-only` behavior, split segments for `both`, and rejection of empty `manual-only` input.

- [ ] **Step 2: Write failing URL safety tests**

Accept only HTTPS URLs whose hostname is exactly `www.olx.pl` or `olx.pl`; reject HTTP, credentials in URL, subdomain tricks, external hosts and non-search paths. Assert local URLs carry `55-002`/50 km semantics and shipping URLs are nationwide.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/search`

Expected: FAIL because query and URL builders do not exist.

- [ ] **Step 4: Implement the query builder**

Implement `buildSearchPlan(input)` with deterministic normalization, category synonym maps and exact `merge`/`manual-only` semantics. Do not call an LLM or network service.

- [ ] **Step 5: Implement safe URL construction**

Implement `assertAllowedOlxSearchUrl` and `buildOlxSearchUrl`; keep all OLX filter parameter names in this module so later site changes are isolated.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/search && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/search tests/search
git commit -m "feat: add hybrid OLX search planning"
```

### Task 3: Pure OLX parsers, normalization and privacy redaction

**Files:**
- Create: `src/scraping/search-parser.ts`, `src/scraping/listing-parser.ts`, `src/scraping/normalize.ts`, `src/scraping/redact.ts`
- Modify: `src/types.ts`
- Create: `tests/fixtures/search/basic.html`, `tests/fixtures/listings/basic.html`
- Test: `tests/scraping/search-parser.test.ts`, `tests/scraping/listing-parser.test.ts`, `tests/scraping/normalize.test.ts`, `tests/scraping/redact.test.ts`

**Interfaces:**
- Produces: `SearchCandidate`, `RawListing`, `NormalizedListing`.
- Produces: `NormalizeContext` containing source segment, matched queries and optional origin coordinates.
- Produces: `parseSearchResults(html: string, source: SearchRequest): SearchCandidate[]`.
- Produces: `parseListing(html: string, url: URL): RawListing`.
- Produces: `normalizeListing(raw: RawListing, context: NormalizeContext): NormalizedListing`.
- Produces: `redactContactData(text: string): string`.

- [ ] **Step 1: Add sanitized fixtures and failing parser tests**

Assert extraction from semantic HTML and embedded structured data, canonical URL/ID, nullable missing fields, promoted flag, price/negotiation, location, shipping, dates, seller type, description, attributes and photo count. Add a fixture with missing primary selectors but valid structured data.

- [ ] **Step 2: Add failing normalization and privacy tests**

Cover Polish price formats, `Za darmo`, negotiable prices, invalid price as `null`, dates, whitespace, attribute keys, phone formats, obfuscated email spacing and ordinary numeric product codes that must remain. When both origin and listing coordinates exist, assert Haversine distance in kilometers; when either side is missing, assert `distanceKm: null` while preserving `locationFilterMatched`.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/scraping`

Expected: FAIL because parser/normalizer functions do not exist.

- [ ] **Step 4: Implement parsers with explicit selector fallback order**

Prefer JSON-LD or embedded structured state when present; fall back to semantic selectors. Throw `ParserDriftError` only when the page is clearly an offer/search page but required identity fields cannot be recovered.

- [ ] **Step 5: Implement normalization and redaction**

Call `redactContactData` inside `normalizeListing` before assigning `descriptionClean`. Preserve `null` for absent values and never infer seller identity.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/scraping && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/scraping tests/scraping tests/fixtures
git commit -m "feat: parse and normalize public OLX listings"
```

### Task 4: Category-specific parameter extractors

**Files:**
- Create: `src/categories/registry.ts`, `src/categories/tires.ts`, `src/categories/kids-bike.ts`, `src/categories/kids-shoes.ts`, `src/categories/roof-window-sash.ts`
- Modify: `src/types.ts`, `src/scraping/normalize.ts`
- Test: `tests/categories/*.test.ts`

**Interfaces:**
- Produces: `CategoryExtractor = (listing: NormalizedListing) => Record<string, string | number | boolean | null>`.
- Produces: `selectCategoryExtractor(category: string | null, itemName: string): CategoryExtractor | null`.
- Produces: `extractCategoryAttributes(listing, input): Record<string, ...>` via the registry.

- [ ] **Step 1: Write failing extractor tests for all four categories**

Use Polish title/description examples to assert tire size/DOT/tread/count/run-flat, bike wheel/frame/gears/brakes, shoe size/insole/material/season and window dimensions/brand/glazing/model. Include ambiguous numbers that must not be mislabeled.

- [ ] **Step 2: Run category tests and verify failure**

Run: `npm test -- tests/categories`

Expected: FAIL because extractors do not exist.

- [ ] **Step 3: Implement small pure extractors and registry routing**

Each extractor owns its regexes and normalization; the registry uses category text and item name, returning `null` for unsupported categories. Merge recognized fields into `attributesNormalized` without discarding raw OLX attributes.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/categories tests/scraping/normalize.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/categories src/scraping/normalize.ts tests/categories tests/scraping/normalize.test.ts
git commit -m "feat: extract category-specific product attributes"
```

### Task 5: Deduplication and explainable relevance scoring

**Files:**
- Create: `src/matching/dedupe.ts`, `src/matching/relevance.ts`
- Modify: `src/types.ts`
- Test: `tests/matching/dedupe.test.ts`, `tests/matching/relevance.test.ts`

**Interfaces:**
- Produces: `deduplicateListings(listings: NormalizedListing[]): NormalizedListing[]`.
- Produces: `scoreRelevance(listing: NormalizedListing, input: ValidatedInput): RelevanceResult`.
- `RelevanceResult` contains `score: number`, `included: boolean`, `matchReasons: string[]`, `exclusionReasons: string[]`.
- Produces: `ScoredListing = NormalizedListing & RelevanceResult` for analysis and reporting.

- [ ] **Step 1: Write failing deduplication tests**

Assert priority by listing ID, canonical URL fallback, stable preservation of the more complete duplicate and union of matched queries/segments.

- [ ] **Step 2: Write failing relevance tests**

Cover exact model matches, category agreement, numeric parameter conflicts, condition mismatch, accessories, wanted ads, incomparable bundles, unsupported generic categories and explanation strings. Assert score remains within 0–1.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/matching`

Expected: FAIL because matching functions do not exist.

- [ ] **Step 4: Implement deduplication and weighted scoring**

Normalize available weights so missing optional data does not automatically penalize an offer. Treat type/category conflicts and explicit accessory/wanted intent as exclusion gates before scoring.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/matching && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/matching tests/matching
git commit -m "feat: rank and deduplicate comparable offers"
```

### Task 6: Price and content analysis

**Files:**
- Create: `src/analysis/price.ts`, `src/analysis/content.ts`
- Modify: `src/types.ts`
- Test: `tests/analysis/price.test.ts`, `tests/analysis/content.test.ts`

**Interfaces:**
- Produces: `analyzePrices(listings: ScoredListing[], segment: SearchSegment): PriceAnalysis`.
- Produces: `analyzeContent(listings: ScoredListing[]): ContentAnalysis`.
- `PriceAnalysis` contains counts, pre/post-IQR statistics, weighted quartiles, three optional strategy prices, confidence and warnings.

- [ ] **Step 1: Write failing price-analysis tests**

Assert IQR outlier marking, weighted median/quartiles, PLN rounding, local/shipping separation, promoted/private/business slices, zero-result behavior, 1–9 low confidence, 10–24 medium and 25+ complete high confidence.

- [ ] **Step 2: Write failing content-analysis tests**

Assert Polish stop-word removal, stable n-gram frequency, common attributes, title/description length, photo-count summaries and contrasts between lower/upper price bands without emitting copied descriptions.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/analysis`

Expected: FAIL because analysis functions do not exist.

- [ ] **Step 4: Implement price analysis**

Use only included, numeric-price offers; retain outliers in diagnostics but exclude them from strategy calculations. Return all strategy prices as `null` when no comparable sample exists.

- [ ] **Step 5: Implement content aggregation**

Return counts and short aggregate phrases only; do not return full competitor descriptions from this module.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/analysis && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/analysis tests/analysis
git commit -m "feat: analyze OLX prices and listing patterns"
```

### Task 7: Bounded crawler, retries, browser fallback and partial results

**Files:**
- Create: `src/scraping/collector.ts`, `src/scraping/crawlee-fetchers.ts`
- Modify: `src/types.ts`
- Test: `tests/scraping/collector.test.ts`

**Interfaces:**
- Produces: `PageFetcher` with `fetchHtml(request: FetchRequest): Promise<FetchResult>`.
- Produces: `FetchRequest`, `FetchResult`, `RenderingRequiredError`, `AccessBlockedError` and `ParserDriftError`.
- Produces: `CollectorDependencies` containing `httpFetcher`, `browserFetcher`, `saveCheckpoint`, `now`.
- Produces: `collectListings(plan: SearchPlan, deps: CollectorDependencies, maxResults: number): Promise<CollectionResult>`.
- `CollectionResult` contains normalized listings, excluded failures, counts, warnings, partial flag and selector-drift diagnostics.

- [ ] **Step 1: Write failing orchestration tests with fake fetchers**

Cover pagination, global result cap, deduplication before detail fetch, max three retry attempts with increasing delays, `429`/`403`, timeout, one bad listing, checkpoint after each normalized listing and HTTP success without browser fallback.

- [ ] **Step 2: Add failure-mode tests from Review Focus**

Assert browser fallback occurs only for `RenderingRequiredError`; repeated access blocks produce `partial: true`; parser drift above 50% of attempted detail pages produces an explicit terminal diagnostic while preserving saved records.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/scraping/collector.test.ts`

Expected: FAIL because collector interfaces do not exist.

- [ ] **Step 4: Implement the injected collector state machine**

Keep limits and retry policy in named constants. Stop enqueueing new detail pages once `maxResults` complete records are saved; never turn access-block errors into browser fallback.

- [ ] **Step 5: Implement Crawlee adapters**

Create conservative HTTP and Playwright adapters with default concurrency 2, request timeout 30 seconds and Apify proxy configuration supplied from runtime. Do not place parsing logic in adapters.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/scraping/collector.test.ts && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/scraping/collector.ts src/scraping/crawlee-fetchers.ts tests/scraping/collector.test.ts
git commit -m "feat: collect OLX offers with bounded retries"
```

### Task 8: Report model, Markdown/HTML and ChatGPT package

**Files:**
- Create: `src/reporting/report-model.ts`, `src/reporting/markdown.ts`, `src/reporting/html.ts`, `src/reporting/chatgpt-prompt.ts`
- Modify: `src/types.ts`
- Test: `tests/reporting/report-model.test.ts`, `tests/reporting/renderers.test.ts`, `tests/reporting/chatgpt-prompt.test.ts`

**Interfaces:**
- Produces: `buildReportModel(input, plan, collection, scored, analyses): ReportModel`.
- Produces: `renderMarkdown(model: ReportModel): string`.
- Produces: `renderHtml(model: ReportModel): string`.
- Produces: `renderChatGptPrompt(model: ReportModel): string`.

- [ ] **Step 1: Write failing report-model tests**

Assert used queries, collection counts, local/shipping sections, three pricing strategies, confidence, assumptions, missing fields, diagnostics and top 20 ordering by relevance.

- [ ] **Step 2: Write failing renderer and privacy tests**

Assert valid headings/tables, escaped HTML, no executable competitor markup, no phone/e-mail leakage, no more than 20 full offer summaries and explicit instruction to write original text rather than copy competitors.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/reporting`

Expected: FAIL because report functions do not exist.

- [ ] **Step 4: Implement report composition and renderers**

Keep all calculations outside renderers. HTML must be standalone UTF-8 with inline accessible styling; the ChatGPT package must include aggregate information for offers outside the top 20.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- tests/reporting && npm run typecheck`

Expected: PASS.

```bash
git add src/types.ts src/reporting tests/reporting
git commit -m "feat: generate market report and ChatGPT package"
```

### Task 9: Apify storage schemas and Actor runtime composition

**Files:**
- Create: `src/reporting/storage.ts`, `src/run-actor.ts`, `src/main.ts`
- Create: `.actor/dataset_schema.json`, `.actor/key_value_store_schema.json`, `.actor/output_schema.json`
- Modify: `.actor/actor.json`, `package.json`
- Test: `tests/reporting/storage.test.ts`, `tests/main.test.ts`

**Interfaces:**
- Produces: `StoragePort` with `pushOffer(record)`, `setArtifact(name, value, contentType)` and `setStatus(message)`.
- Produces: `writeActorOutputs(storage: StoragePort, offers, model, excluded): Promise<void>`.
- Produces: `runActor(deps: RuntimeDependencies): Promise<RunSummary>` from `src/run-actor.ts`; `src/main.ts` calls it inside `Actor.main`.

- [ ] **Step 1: Write failing storage tests**

Assert one Dataset row per accepted normalized offer, exact artifact names/content types, `EXCLUDED.json` size cap and output links matching the Apify schemas.

- [ ] **Step 2: Write failing runtime composition test**

With fake input, collector and storage, assert the ordered flow validate → plan → collect → score → analyze → report → persist, plus status messages and useful zero-result completion.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/reporting/storage.test.ts tests/main.test.ts`

Expected: FAIL because storage/runtime composition does not exist.

- [ ] **Step 4: Implement schemas and storage adapter**

Define Dataset fields from the spec, KVS artifacts and Actor output links. The production adapter uses `Actor.pushData`, `Actor.setValue` and status APIs; tests use an in-memory port.

- [ ] **Step 5: Implement the thin Actor entry point**

Keep `src/main.ts` limited to creating Apify/Crawlee dependencies and invoking `runActor` from `src/run-actor.ts`. Map terminal parser drift to a failed run only after partial artifacts have been written.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/reporting/storage.test.ts tests/main.test.ts && npm run build`

Expected: PASS and `dist/main.js` produced.

```bash
git add src/main.ts src/run-actor.ts src/reporting/storage.ts .actor package.json tests/main.test.ts tests/reporting/storage.test.ts
git commit -m "feat: integrate analysis pipeline with Apify runtime"
```

### Task 10: Acceptance fixtures, live smoke path, documentation and deployment verification

**Files:**
- Create: `tests/fixtures/inputs/roof-window-sash.json`, `tests/fixtures/inputs/winter-tires.json`, `tests/fixtures/inputs/kids-bike.json`, `tests/fixtures/inputs/kids-shoes.json`
- Create: `tests/acceptance/pipeline.test.ts`, `scripts/live-smoke.ts`, `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: all prior public interfaces.
- Produces: `npm run smoke:live -- --input <path>` as an explicit, opt-in network check.

- [ ] **Step 1: Write four failing offline acceptance tests**

For each starting category, feed the saved input and sanitized HTML through the complete pure pipeline. Assert relevant offers, extracted category attributes, price/confidence output, privacy redaction and all report artifacts.

- [ ] **Step 2: Run acceptance tests and close fixture/parser gaps**

Run: `npm test -- tests/acceptance/pipeline.test.ts`

Expected before fixes: at least one fixture-specific failure. Make the smallest parser/extractor change required; rerun until PASS.

- [ ] **Step 3: Add the opt-in live smoke command**

Implement `scripts/live-smoke.ts` with a hard cap of 3 results, concurrency 1 and no automatic retry beyond one transient retry. Require `LIVE_OLX_SMOKE=1`; otherwise exit without network access.

- [ ] **Step 4: Write README and operational guidance**

Document local setup, `apify run`, `apify push`, every input/output field, export flow, manual ChatGPT workflow, credit drivers, proxy configuration, responsible-use limits, selector-drift symptoms and troubleshooting. State clearly that displayed prices are asking prices, not completed-sale prices.

- [ ] **Step 5: Run full local verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run typecheck && npm run build`

Expected: both exit 0.

Run: `docker build -f .actor/Dockerfile -t olx-market-research-actor .`

Expected: image builds successfully.

Run: `apify run --purge`

Expected: Actor completes using a test input and writes Dataset plus five KVS artifacts.

- [ ] **Step 6: Perform authorized Apify deployment verification**

If the user’s Apify CLI is authenticated, run `apify push`, then perform one capped test run and inspect its Dataset, artifacts, usage and logs. If credentials are unavailable, stop after local verification and provide the exact deployment command; never request or commit the user’s token.

- [ ] **Step 7: Commit**

```bash
git add tests/fixtures tests/acceptance scripts/live-smoke.ts README.md package.json
git commit -m "docs: add acceptance coverage and Apify runbook"
```

---

## Final Verification Gate

- [ ] Run `npm test` and record the passing test count.
- [ ] Run `npm run typecheck` and confirm zero TypeScript diagnostics.
- [ ] Run `npm run build` and confirm `dist/main.js` exists.
- [ ] Build the Docker image from `.actor/Dockerfile`.
- [ ] Run the Actor locally with one local-mode and one shipping-mode fixture input.
- [ ] Inspect Dataset and all five KVS artifacts for contact-data leakage.
- [ ] Review the git diff against the approved spec and confirm every acceptance criterion is represented.
- [ ] Request a whole-branch code review before claiming completion.
