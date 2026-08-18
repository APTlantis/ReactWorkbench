# Roadmap

Theme Preview started as a deterministic component preview lab so the hard parts would be inspectable before the product became a builder. That remains the right foundation, but the broader direction is now explicit: this should grow into a local-first UI builder that can work from explicit local metadata first and reopen external component sources only when that scope is refreshed.

The useful direction is still not “add everything at once.” It is to make component sources easy to register, inspect, preview, compose, and verify.

## Already Working

- Tauri 2 desktop app
- React + TypeScript frontend
- Rust command layer
- TOML component metadata
- TOML theme metadata
- TOML group metadata
- component preview across buttons, cards, badges, inputs, toggles, tabs, and table controls
- theme switching, theme comparison, and theme token inspection
- group preview and group board
- metadata-backed catalog tabs and table-control sample groups
- in-app group composer and editing
- richer group layouts for rows, grids, stacks, toolbars, form rows, dialog footers, and table headers
- deterministic group validation with explicit warning-review state
- duplicate group structure detection across board cards, selected-group inspector, board inspector, duplicate-only filtering, persisted filter state, reset controls, and jump targets
- browser smoke checks for blank renders, clipping, text overflow, tiny controls, computed contrast, seeded duplicate behavior, filter persistence, jump targets, and screenshot report review-source messages
- screenshot export for browser-rendered component and group previews across every theme, with metadata-hash snapshots
- screenshot comparison reports in JSON, HTML, and Markdown with review status, raw JSON links, local review notes, exported review decisions, strict-check behavior, diff images, filtering, totals, and source summaries
- one-command local verification for build, compare tests, strict screenshot comparison, Rust/Tauri tests, browser smoke checks, duplicate smoke coverage, visual smoke totals, and final checklist summary
- in-app summary of the latest screenshot comparison report with quick actions, filtered counts, review state, exported decisions, and loaded-decision indicators
- DuckDB-backed catalog indexing when available
- catalog search
- source records under `metadata/sources`
- Sources library tab and source catalog inspector
- saved component variants under `metadata/variants`
- variant-backed group items while preserving existing component-state group items
- saved page records under `metadata/pages`
- block-based page layout preview and editing with semantic regions
- Blue Slate added as the default theme while existing themes remain available for comparison

## Next: Variant-To-Page Builder

1. Deepen the Variant Workshop

Variants are now the reusable layer between stock components and groups. The next useful work is richer slot presets, more component-specific builders, better prop/state inference for local metadata, and export-ready naming controls.

2. Keep group composition structured

Groups can consume component states or saved variants. Continue using layout presets and ordered role rows; do not add freeform component dragging.

3. Mature page layout

Pages are explicit metadata records with regions and ordered blocks. The page editor should stay block-based: reorder sections and move blocks between semantic regions. Avoid pixel positioning, imported page editing, and Figma-style canvas behavior.

4. Prepare export

The first export target should be predictable React output from saved metadata: variant component files, group/section files, page files, and a manifest. Export is a handoff to WebStorm, not an import/edit loop for arbitrary existing pages.

## Source Adapters

1. Define source records

Source records describe where catalog material comes from. The active record covers:

- local TOML metadata in this project

Next useful additions are source add/edit UI for local metadata records, last indexed time, and clearer derived-catalog freshness.

2. Keep external adapters out until they have a fresh scope

The app previously carried a fixture adapter for an external component catalog, but that path is no longer part of the active project shape. Any future external adapter should begin with a refreshed plan that defines:

- supported source type and provenance fields
- whether source files are copied, referenced, or ignored
- preview determinism and sandboxing expectations
- prop/example inference boundaries
- verification and cleanup rules

3. Normalize component catalogs

Keep local TOML as the active adapter and preserve the same internal catalog concepts for any future adapter:

- component identity
- source provenance
- framework/runtime requirements
- props or inferred controls
- named examples or states
- theme/styling requirements
- preview support status

4. Add adapter-aware preview surfaces only after scope refresh

If imported components return later, they should appear beside local components without pretending they are native TOML. The UI should make source, adapter, preview status, and missing requirements obvious. Screenshot export and smoke checks should include adapter-backed previews only once they are deterministic enough.

## Builder Foundations

1. Define saved page metadata

Implemented first slice: a page is an explicit local record, not a hidden generated artifact. The first page model references saved variants, groups, layout regions, theme, route, and role labels.

2. Build composition from existing primitives

Start with structured layout composition rather than freeform canvas editing. Useful first layouts include sections, stacks, grids, split panels, dashboards, forms, and table areas.

3. Keep source selection explicit

The builder should make the active component source visible. Today that source is local TOML metadata.

4. Verify built pages

Extend screenshot export, comparison reports, and visual smoke checks from components/groups to saved pages. Page output should remain reproducible from source records and page metadata.

## Supporting Work

- Add a compact metadata example index to the metadata guide.
- Add smoke coverage that confirms tabs and table controls render in group previews without clipping or text overflow.
- Improve source/catalog search so local metadata remains usable as the catalog grows.
- Keep report ergonomics tight enough for page-level review.
- Revisit release packaging separately from feature expansion.

## Later Adapters

- Flowbite React adapter for package-oriented React/Tailwind components.
- User-authored component repos.
- External component-library adapters after a refreshed source-adapter plan.
- Optional embedding-assisted search for large catalogs.

Embeddings should help retrieve and compare existing components. They should not replace the deterministic source, adapter, group, page, or theme records.

## Guardrails

- Do not bypass explicit source records when importing external components.
- Do not let generated screenshots, DuckDB catalogs, or build output become the only recoverable source of project meaning.
- Do not make prompt-generated UI the primary model; prompts may assist selection or assembly later, but saved metadata should remain inspectable.
- Do not treat public plugin ecosystem work as part of the first builder path.
- Do not claim DRS release readiness until artifact hashes, install, launch, uninstall, docs inclusion, and signing posture are verified.
