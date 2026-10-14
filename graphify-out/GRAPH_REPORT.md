# Graph Report - Harkon-Website  (2026-10-14)

## Corpus Check
- 74 files · ~339,786 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 2, .example 1, (none) 1)

## Summary
- 450 nodes · 1037 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cc00efc5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app/page.tsx
- discovery.ts
- solutionCatalog.ts
- SolutionDiscovery.tsx
- package.json
- QueryModal.tsx
- compilerOptions
- Code Quality Enforcer
- Discovery consultant — first release
- estimatePdf.ts
- next
- Discovery experience — non-technical customer review
- SolutionDiscovery
- SolutionDiscovery.test.tsx
- AISpecChat.tsx

## God Nodes (most connected - your core abstractions)
1. `SolutionDiscovery()` - 32 edges
2. `vitest` - 19 edges
3. `POST()` - 18 edges
4. `react` - 18 edges
5. `compilerOptions` - 16 edges
6. `emptyScope()` - 16 edges
7. `reviewScope()` - 15 edges
8. `Nav()` - 14 edges
9. `createEstimatePdf()` - 14 edges
10. `parseScope()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `remount()` --calls--> `SolutionDiscovery()`  [EXTRACTED]
  __tests__/SolutionDiscovery.test.tsx → components/SolutionDiscovery.tsx
- `PricingEstimator()` --indirect_call--> `isFeatureId()`  [INFERRED]
  components/PricingEstimator.tsx → utils/pricingCatalog.ts
- `SolutionDiscovery()` --indirect_call--> `emptyScope()`  [INFERRED]
  components/SolutionDiscovery.tsx → utils/solutionCatalog.ts
- `response()` --calls--> `createDiscovery()`  [EXTRACTED]
  __tests__/SolutionDiscovery.test.tsx → utils/discovery.ts
- `response()` --calls--> `nextQuestion()`  [EXTRACTED]
  __tests__/SolutionDiscovery.test.tsx → utils/discovery.ts

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "app/page.tsx"
Cohesion: 0.08
Nodes (39): ContactPage(), metadata, Home(), metadata, PricingPage(), metadata, ProcessPage(), metadata (+31 more)

### Community 1 - "discovery.ts"
Cohesion: 0.09
Nodes (49): allowRequest(), POST(), requests, respond(), runtime, constructor(), mocks, send() (+41 more)

### Community 2 - "solutionCatalog.ts"
Cohesion: 0.08
Nodes (49): POST(), EMPTY_ESTIMATE, FEATURE_PRESENTATION, FeatureOption, FEATURES, PROJECT_PRESENTATION, PROJECT_TYPES, ProjectOption (+41 more)

### Community 3 - "SolutionDiscovery.tsx"
Cohesion: 0.11
Nodes (33): DiscoveryProgress(), emptyContactLinks, factLabels, draft, allReviewed, DiscoverySession, FactId, DiscoveryMode (+25 more)

### Community 4 - "package.json"
Cohesion: 0.05
Nodes (41): PricingEstimator(), dependencies, groq-sdk, html2canvas, jspdf, next, react, react-dom (+33 more)

### Community 5 - "QueryModal.tsx"
Cohesion: 0.14
Nodes (18): POST(), COUNTRY_CODES, CountryCode, DEFAULT_LEN, CountrySelect(), flagEmoji(), Errors, QueryModal() (+10 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "Code Quality Enforcer"
Cohesion: 0.06
Nodes (30): 10. Repeating the Same Mistake, 1. Assuming Imports/Functions Exist, 2. Surface-Level Fixes, 3. Wrong Variable Scope, 4. Off-By-One Errors, 5. Ignoring Null/Undefined, 6. Bundling Multiple Changes, 7. Copy-Paste Without Reading (+22 more)

### Community 8 - "Discovery consultant — first release"
Cohesion: 0.12
Nodes (14): Advanced version, Discovery consultant — first release, Explicit platforms and team contact, Implemented boundaries, Sessions and configuration, Solution and pricing, Verification and pilot gate, Design System (+6 more)

### Community 9 - "estimatePdf.ts"
Cohesion: 0.18
Nodes (17): money(), proposalSummary(), exportEstimate(), customerAnswers(), QUESTIONS, createEstimatePdf(), font(), header() (+9 more)

### Community 10 - "next"
Cohesion: 0.13
Nodes (11): ChatMessage, parseHistory(), POST(), SYSTEM_PROMPT_AI, bricolage, metadata, RootLayout(), SplashScreen() (+3 more)

### Community 11 - "Discovery experience — non-technical customer review"
Cohesion: 0.33
Nodes (5): Assessment, Changes, Discovery experience — non-technical customer review, Verification scope, What still needs customer validation

### Community 13 - "SolutionDiscovery"
Cohesion: 0.19
Nodes (17): ContactIcon(), readResponse(), RejectedSession, ScopeGroup(), SolutionDiscovery(), accept(), changePreference(), editSolution() (+9 more)

### Community 14 - "SolutionDiscovery.test.tsx"
Cohesion: 0.21
Nodes (12): button(), chooseFeatures(), choosePlaces(), click(), input(), invalidSession, modalMock, pdfMock (+4 more)

### Community 15 - "AISpecChat.tsx"
Cohesion: 0.29
Nodes (8): ActionWhatsApp, AISpecChat(), Message, MessageText(), parseArrayTag(), ParsedResponse, parseResponse(), Props

## Knowledge Gaps
- **7 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `autoprefixer`, `jsdom` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `app/page.tsx` to `solutionCatalog.ts`, `SolutionDiscovery.tsx`, `package.json`, `QueryModal.tsx`, `next`, `SolutionDiscovery.test.tsx`, `AISpecChat.tsx`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07743496672716274 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `solutionCatalog.ts` to `app/page.tsx`, `discovery.ts`, `SolutionDiscovery.tsx`, `package.json`, `QueryModal.tsx`, `SolutionDiscovery.test.tsx`, `AISpecChat.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `discovery.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08514013749338974 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `app/page.tsx`, `discovery.ts`, `solutionCatalog.ts`, `package.json`, `QueryModal.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `solutionCatalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0825136612021858 - nodes in this community are weakly interconnected._