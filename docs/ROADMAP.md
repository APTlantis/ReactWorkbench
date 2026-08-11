# Roadmap

Theme Preview started as a deterministic component preview lab so the hard parts would be inspectable before the product became a builder. That remains the right foundation, but the broader direction is now explicit: this should grow into a local-first UI builder that can work with local metadata and imported open-source component systems.

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
- first shadcn adapter slice for local registry or `components/ui/*.tsx` directory indexing
- Sources library tab and source catalog inspector

## Next: Source Adapters

1. Define source records

Source records now describe where component catalog material comes from. The first records cover:

- local TOML metadata in this project
- a local directory containing shadcn-style component files

Next useful additions are source add/edit UI, last indexed time, public GitHub source records, and clearer derived-catalog freshness.

2. Add shadcn import to the books

shadcn is the first external adapter because its registry conventions provide a practical bridge from open-source component code into Theme Preview’s catalog. The current adapter can index local registry metadata and local `components/ui/*.tsx` files. The next shadcn adapter work should add:

- reading public GitHub registry metadata where available
- source add/edit UI for local directories
- richer prop/example inference when discoverable
- importing or materializing selected components only by explicit user action
- previewing imported components beside existing TOML components

This should not assume every shadcn-like repo is perfectly structured. The adapter should start useful with partial metadata, clear warnings, and inspectable source records.

Reference assumption: shadcn-compatible public GitHub registry support is based on the shadcn registry model, where a public repository can expose a root `registry.json` and registry items that reference source files. Local directory support should use the same internal adapter shape even when no registry file exists.

3. Normalize component catalogs

Keep local TOML as the first adapter and normalize shadcn imports into the same internal catalog concepts:

- component identity
- source provenance
- framework/runtime requirements
- props or inferred controls
- named examples or states
- theme/styling requirements
- preview support status

4. Add adapter-aware preview surfaces

Imported components should appear beside local components without pretending they are native TOML. The UI should make source, adapter, preview status, and missing requirements obvious. Screenshot export and smoke checks should eventually include adapter-backed previews once they are deterministic enough.

## Then: Builder Foundations

1. Define saved page metadata

A page should be an explicit local record, not a hidden generated artifact. The first page model should reference source components, groups, layout regions, props, theme, and source provenance.

2. Build composition from existing primitives

Start with structured layout composition rather than freeform canvas editing. Useful first layouts include sections, stacks, grids, split panels, dashboards, forms, and table areas.

3. Add source switching

The builder should let the user choose which component source or sources are active: local TOML, imported shadcn components, and later other adapters.

4. Verify built pages

Extend screenshot export, comparison reports, and visual smoke checks from components/groups to saved pages. Page output should remain reproducible from source records and page metadata.

## Supporting Work

- Add a compact metadata example index to the metadata guide.
- Add smoke coverage that confirms tabs and table controls render in group previews without clipping or text overflow.
- Improve source/catalog search so imported libraries remain usable as the catalog grows.
- Keep report ergonomics tight enough for page-level review.
- Revisit release packaging separately from feature expansion.

## Later Adapters

- Flowbite React adapter for package-oriented React/Tailwind components.
- Additional shadcn registries and community component sets.
- User-authored component repos.
- Optional embedding-assisted search for large catalogs.

Embeddings should help retrieve and compare existing components. They should not replace the deterministic source, adapter, group, page, or theme records.

## Guardrails

- Do not bypass explicit source records when importing external components.
- Do not let generated screenshots, DuckDB catalogs, or build output become the only recoverable source of project meaning.
- Do not make prompt-generated UI the primary model; prompts may assist selection or assembly later, but saved metadata should remain inspectable.
- Do not treat public plugin ecosystem work as part of the first builder path.
- Do not claim DRS release readiness until artifact hashes, install, launch, uninstall, docs inclusion, and signing posture are verified.
