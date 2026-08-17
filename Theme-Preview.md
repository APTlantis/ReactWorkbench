# Theme Preview Brief

Theme Preview is a desktop component exploration studio growing into a local-first UI builder. It helps a user define or import UI components, named states, theme tokens, saved variants, reusable component groups, and pages, then inspect the resulting previews in a predictable app.

The current builder rule is: components are configured, groups are composed, and pages are arranged. Component variants are the reusable layer between stock components and page sections.

The project is built around one practical idea: UI systems become easier to trust when their source components, important combinations, and pages are explicit, renderable, and checkable.

## Product Position

Theme Preview started smaller than its final ambition on purpose. The first surface is not a drag-and-drop page editor, Figma replacement, or prompt-generated UI designer. The long-term product direction is a fuller UI builder that can work from local metadata and imported open-source component systems.

The current app is closer to a lab bench for component systems:

- describe component behavior in TOML
- describe themes as token sets
- combine known component states into named groups
- render those definitions in the app
- inspect duplicate structures and validation warnings
- export screenshots and compare visual output over time

That lab bench becomes the foundation for source adapters, shadcn imports, and later page composition. The result should feel useful before any AI-assisted features are added.

## Current Shape

The app currently includes:

- Tauri 2 desktop shell
- React + TypeScript frontend
- Rust command layer
- local TOML metadata for components, groups, and themes
- component previews for buttons, cards, badges, inputs, and toggles
- component previews for tabs and table controls
- saved component variants with structured slots
- theme switching, theme comparison, and token inspection
- saved group previews and a full group board
- variant-backed group items
- saved page metadata and block-based page previews
- in-app group composing, editing, validation, and warning review
- richer group layouts, including toolbar, form row, dialog footer, and table header
- duplicate group structure detection across saved groups
- duplicate badges, duplicate-only filtering, similar-group inspector copy, and jump targets
- screenshot export across every component, group, and theme
- screenshot comparison reports in JSON, HTML, and Markdown
- review decisions for changed screenshots
- browser smoke checks for render, clipping, text overflow, contrast, controls, and report review-source behavior
- one-command local verification through `npm run verify`
- optional DuckDB-backed catalog indexing and search

## Long-Term Product Direction

Theme Preview should become a builder that can work with multiple component sources:

- local TOML metadata
- shadcn-compatible registries and local component directories
- later adapters for other open-source component libraries
- user-authored component sets

The first adapter target is shadcn because its registry model gives the project a practical import shape: source records can point at a local directory or public GitHub registry, index available components, preserve provenance, and expose imported components beside the current local metadata.

Page building is now represented by explicit metadata records, not hidden generated output. The first page editor is block-based: it arranges saved groups and variants inside semantic regions, without absolute positioning or arbitrary imported page editing.

The current metadata set includes components, variants, groups, pages, sources, and themes under `metadata/`. The generated outputs live under `artifacts/`.

## Core Workflow

The main workflow is deliberately simple:

1. Define components, states, themes, and groups in TOML.
2. Register or import component sources, starting with planned shadcn support.
3. Open the app and inspect individual component states.
4. Switch themes and compare tokens.
5. Inspect saved groups in the board.
6. Compose or edit groups when a useful combination is missing.
7. Review validation warnings before saving risky drafts.
8. Use duplicate surfacing to notice repeated layouts and component-state sequences.
9. Export screenshots when a stable visual snapshot is needed.
10. Compare new screenshots against a metadata-matched baseline.
11. Record review decisions for intentional visual changes.
12. Compose saved pages from selected groups and variants.
13. Later, export predictable React files and manifests as a handoff to WebStorm.

This keeps the work grounded in explicit source files and source records instead of one-off manual preview setups.

## Metadata Model

Theme Preview currently understands three metadata types:

- components
- themes
- groups

Components define available props and named states. Themes define token values. Groups reference known component states and arrange them into named UI areas.

Future source records should describe where a component catalog came from, how it was imported, which adapter owns it, and whether generated catalog data is current.

A group is not a page. It is a reusable area of interface, such as:

- settings row
- dashboard summary
- danger zone
- command toolbar
- confirmation footer
- table header

The user decides what belongs in a group. The app checks whether each referenced component and state exists, then renders the group under the active theme. Later, pages should compose groups and individual components while preserving the same explicit source model.

## Duplicate Structures

Duplicate group detection is structural. The signature is:

```text
<layout>|<component>:<state>|<component>:<state>|...
```

Names, descriptions, roles, and theme lists do not affect the duplicate signature. Item order does.

For example, `settings-row.toml` and `settings-review-row.toml` intentionally share:

```text
row|badge:soft-info|card:compact-warning|button:secondary-disabled
```

That seeded duplicate pair keeps the duplicate UI and smoke coverage honest because the behavior is backed by real metadata.

## Verification Model

The project has a growing deterministic verification loop:

- TypeScript build
- screenshot comparison fixtures
- duplicate group helper tests
- screenshot report review tests
- strict screenshot comparison
- Rust/Tauri tests
- temporary browser preview smoke test
- final checklist summary

The browser smoke test checks for blank renders, clipping, unmanaged text overflow, tiny controls, computed contrast, seeded duplicate behavior, filter persistence, jump targets, and report review-source copy.

The screenshot system uses a TOML metadata fingerprint so comparisons line up with the metadata state that produced them.

## Why Deterministic First

Deterministic behavior makes the app explainable. If a group cannot be saved, the app can point to a missing component, missing state, unsupported layout, duplicate role, or empty role label. If a screenshot changes, the comparison report can show what changed and whether it has been accepted.

AI or embedding-assisted search may become useful later, especially for navigating a large catalog. But the design engine should remain local, inspectable, and predictable.

## Near-Term Direction

The useful next work is not to add every possible design feature. It is to keep making component sources and combinations easier to define, scan, verify, and trust.

Good next steps include:

- clearer metadata documentation and examples
- source records for local and imported component catalogs
- shadcn import and preview planning
- adapter-backed component selection
- stronger deterministic visual checks around imported components
- saved page metadata after adapter-backed previews are reliable
- embedding-assisted search only after the deterministic catalog feels solid

The north star is a builder that can use real component systems without hiding how the UI was assembled.
