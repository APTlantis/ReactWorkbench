# Roadmap

This project started as a first-day prototype, so the roadmap should stay practical. The useful direction is not “add everything.” It is to keep making component combinations easier to define, scan, and trust.

## Already Working

- Tauri 2 desktop app
- React + TypeScript frontend
- Rust command layer
- TOML component metadata
- TOML theme metadata
- TOML group metadata
- component preview
- theme switching
- theme comparison
- theme token inspection
- group preview
- group board
- in-app group composer
- deterministic group validation
- DuckDB-backed catalog indexing
- catalog search

## Sensible Next Steps

1. Improve group authoring

Add editing existing groups, not only copying or creating new ones.

2. Add more sample component types

Inputs, toggles, table controls, tabs, toolbar actions, dialog footers, and settings rows would make the group board more informative.

3. Add richer group layouts

The current layouts are `row`, `grid`, and `stack`. Future layouts could include toolbar, form row, dialog footer, table header, split panel, and dashboard section.

4. Add screenshots

Export component and group previews as images. This would make the catalog more useful and prepare for visual regression checks.

5. Add deterministic visual checks

Start with measurable issues:

- missing references
- text overflow
- low contrast
- clipped content
- empty labels
- tiny click targets

6. Add embedding-assisted search later

Embeddings should help retrieve and compare existing previews. They should not replace the deterministic metadata engine.

## Not A Priority Yet

- full page generation
- drag-and-drop editing
- generative UI design
- public plugin ecosystem
- visual regression infrastructure

Those can wait until the component/group model feels unquestionably useful.
