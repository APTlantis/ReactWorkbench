# Roadmap

This project started as a first-day prototype, so the roadmap should stay practical. The useful direction is not “add everything.” It is to keep making component combinations easier to define, scan, and trust.

## Already Working

- Tauri 2 desktop app
- React + TypeScript frontend
- Rust command layer
- TOML component metadata
- TOML theme metadata
- TOML group metadata
- component preview across buttons, cards, badges, inputs, and toggles
- theme switching
- theme comparison
- theme token inspection
- group preview
- group board
- duplicate group structure detection in the board, matching board cards, group inspector, persisted board filter, board inspector count, board inspector filter state, board inspector quick reset, duplicate-list jump targets, jump-control smoke coverage, filter-reset smoke coverage, filter-persistence smoke coverage, seeded duplicate-badge smoke coverage, selected-group similar-panel smoke coverage, and compact duplicate smoke summary
- in-app group composer
- editing existing groups
- richer group layouts for toolbars, form rows, dialog footers, and table headers
- deterministic group validation
- explicit warning-review state in the group composer
- deterministic preview checks for visible copy, theme contrast, empty groups, and unresolved group references
- browser smoke checks for blank renders, horizontal, vertical, and child-content clipping, unmanaged text overflow, tiny controls, computed text contrast, seeded duplicate badges, selected-group similar panels, duplicate-list jump controls, board inspector filter reset, duplicate-filter reload persistence, and screenshot report review-source messages
- screenshot export for every browser-rendered component and group preview across every theme, with metadata-hash snapshots
- screenshot comparison reports in JSON, HTML, and Markdown with review status, raw JSON links, browser-local review notes, exported note JSON, optional strict-check failures that honor accepted review decisions, review-decision coverage for stale or partial decisions, fixture coverage for strict decisions, generated report links, report filtering, total-count helpers, review-decision source summaries, empty review-progress copy fixtures, malformed local-decision storage fixtures and warnings, and pixel-diff artifacts for changed images
- one-command local verification for build, compare tests, strict screenshot comparison, Rust/Tauri tests, browser smoke checks including report review-source, seeded duplicate-badge, selected-group similar-panel, duplicate-list jump, board filter-reset, and duplicate-filter reload-persistence assertions, visual smoke totals, compact duplicate smoke artifacts, duplicate coverage checklist output, and a final checklist summary
- in-app summary of the latest screenshot comparison report with quick actions for generated report files, individual changed previews, empty review-progress summaries, local accept/dismiss review state, final reviewed status, exported review decisions, reloaded prior decisions, and current/stale loaded-decision indicators
- DuckDB-backed catalog indexing
- catalog search

## Sensible Next Steps

1. Improve group authoring

Item reordering is now included in the composer, duplicate saved group structures are surfaced in the board, matching board cards, selected-group inspector, board inspector count, board inspector filter-state summary, board inspector quick reset, and duplicate-list jump targets with fixture-backed copy helpers, seeded metadata fixtures, README fixture notes, browser smoke coverage, and seeded duplicate metadata counts in verification output, duplicate-only board filtering persists per browser session with reload smoke coverage, overlapping duplicate finding fixtures keep helper counts unique, mixed seeded/synthetic findings have deterministic sort coverage, seeded metadata test parsing fails loudly on missing fields, seeded duplicate item counts and ordering now have explicit drift coverage, and drafts with validation warnings now show explicit pending/accepted review state. Next useful improvement is documenting duplicate-structure signature rules in the metadata guide.

2. Add more sample component types

Inputs and toggles are now included. Table controls, tabs, toolbar actions, dialog footers, and settings rows would make the group board more informative.

3. Add richer group layouts

Toolbar, form row, dialog footer, and table header layouts are now included. Future layouts could include split panel and dashboard section.

4. Extend screenshot exports

Component and group previews can now be exported as images across every theme, each export is identified by a deterministic TOML metadata hash, and screenshot reports can compare latest output against a baseline snapshot with HTML review pages, Markdown summaries, explicit review status, optional strict-check failures that honor accepted review decisions, review-decision coverage for stale or partial decisions, fixture coverage for strict decisions, generated report links, report filtering, total-count helpers, persisted filter validation, exported review decision payloads, loaded decision summaries, stale decision pruning, plural-aware review progress copy, plural-aware reviewed-status copy, review-decision source summaries, empty review-progress copy fixtures, malformed browser-local decision storage fixtures and warnings, local review notes with JSON export, diff images, configurable pixel-ratio thresholds, per-pixel color tolerance, one-command local verification including Rust/Tauri tests, computed contrast, child-content clipping, and report review-source smoke assertions, contrast diagnostics with sampled colors, child-content clipping diagnostic fixtures, visual smoke issue counts by kind, visual smoke totals in verification output, and a final checklist summary, and an in-app summary with quick actions for generated report files, recent report history, per-theme, per-kind, and status totals with one-click filtering, review-item filtering by status, theme, and preview kind, active filtered item counts, per-report filter persistence, compact filter reset, individual changed previews, visible empty review-progress summaries, local accept/dismiss review state, stale local decision cleanup, final reviewed status, exported review decisions, reloaded prior decisions, distinct current/stale loaded-decision indicators, and a compact source line distinguishing local browser decisions from exported decisions.

5. Extend deterministic visual checks

The first app checks now cover visible copy, theme contrast, empty groups, and unresolved group references. The browser smoke check also covers blank renders, horizontal, vertical, and child-content clipping, unmanaged text overflow, tiny controls, computed text contrast, seeded duplicate badges, selected-group similar panels, duplicate-list jump controls, board inspector filter reset, duplicate-filter reload persistence, and screenshot report review-source messages. Useful next checks should stay measurable:

- document duplicate-structure signature rules in the metadata guide

6. Add embedding-assisted search later

Embeddings should help retrieve and compare existing previews. They should not replace the deterministic metadata engine.

## Not A Priority Yet

- full page generation
- drag-and-drop editing
- generative UI design
- public plugin ecosystem
- visual regression infrastructure

Those can wait until the component/group model feels unquestionably useful.
