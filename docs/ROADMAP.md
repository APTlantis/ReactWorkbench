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
- in-app group composer
- editing existing groups
- richer group layouts for toolbars, form rows, dialog footers, and table headers
- deterministic group validation
- deterministic preview checks for visible copy, theme contrast, empty groups, and unresolved group references
- browser smoke checks for blank renders, horizontal clipping, unmanaged text overflow, and tiny controls
- screenshot export for every browser-rendered component and group preview across every theme, with metadata-hash snapshots
- screenshot comparison reports in JSON, HTML, and Markdown with review status, raw JSON links, browser-local review notes, exported note JSON, optional strict-check failures, and pixel-diff artifacts for changed images
- in-app summary of the latest screenshot comparison report with quick actions for generated report files, individual changed previews, local accept/dismiss review state, and exported review decisions
- DuckDB-backed catalog indexing
- catalog search

## Sensible Next Steps

1. Improve group authoring

Item reordering is now included in the composer. Next useful improvements are duplicate group detection surfacing in the UI and a clearer review flow for validation warnings.

2. Add more sample component types

Inputs and toggles are now included. Table controls, tabs, toolbar actions, dialog footers, and settings rows would make the group board more informative.

3. Add richer group layouts

Toolbar, form row, dialog footer, and table header layouts are now included. Future layouts could include split panel and dashboard section.

4. Extend screenshot exports

Component and group previews can now be exported as images across every theme, each export is identified by a deterministic TOML metadata hash, and screenshot reports can compare latest output against a baseline snapshot with HTML review pages, Markdown summaries, explicit review status, optional strict-check failures, local review notes with JSON export, diff images, configurable pixel-ratio thresholds, per-pixel color tolerance, and an in-app summary with quick actions for generated report files, individual changed previews, local accept/dismiss review state, and exported review decisions. Next useful improvement is loading prior exported decisions back into the in-app review panel.

5. Extend deterministic visual checks

The first app checks now cover visible copy, theme contrast, empty groups, and unresolved group references. The browser smoke check also covers blank renders, horizontal clipping, unmanaged text overflow, and tiny controls. Useful next checks should stay measurable:

- clipped content
- vertical clipping inside fixed-height regions
- actual contrast sampled from rendered computed styles

6. Add embedding-assisted search later

Embeddings should help retrieve and compare existing previews. They should not replace the deterministic metadata engine.

## Not A Priority Yet

- full page generation
- drag-and-drop editing
- generative UI design
- public plugin ecosystem
- visual regression infrastructure

Those can wait until the component/group model feels unquestionably useful.
