# Theme Preview Brief

Theme Preview is a desktop component exploration studio. It helps a user define UI components, named states, theme tokens, and reusable component groups as local metadata, then inspect the resulting previews in a predictable app.

The project is built around one practical idea: component systems become easier to trust when their important combinations are explicit, renderable, and checkable.

## Product Position

Theme Preview is not a drag-and-drop page editor. It is not trying to replace Figma, generate full pages, or invent UI from a prompt.

It is closer to a lab bench for component systems:

- describe component behavior in TOML
- describe themes as token sets
- combine known component states into named groups
- render those definitions in the app
- inspect duplicate structures and validation warnings
- export screenshots and compare visual output over time

The result should feel useful before any AI-assisted features are added.

## Current Shape

The app currently includes:

- Tauri 2 desktop shell
- React + TypeScript frontend
- Rust command layer
- local TOML metadata for components, groups, and themes
- component previews for buttons, cards, badges, inputs, and toggles
- theme switching, theme comparison, and token inspection
- saved group previews and a full group board
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

The current metadata set includes components, themes, and groups under `metadata/`. The generated outputs live under `artifacts/`.

## Core Workflow

The main workflow is deliberately simple:

1. Define components, states, themes, and groups in TOML.
2. Open the app and inspect individual component states.
3. Switch themes and compare tokens.
4. Inspect saved groups in the board.
5. Compose or edit groups when a useful combination is missing.
6. Review validation warnings before saving risky drafts.
7. Use duplicate surfacing to notice repeated layouts and component-state sequences.
8. Export screenshots when a stable visual snapshot is needed.
9. Compare new screenshots against a metadata-matched baseline.
10. Record review decisions for intentional visual changes.

This keeps the work grounded in explicit source files instead of one-off manual preview setups.

## Metadata Model

Theme Preview currently understands three metadata types:

- components
- themes
- groups

Components define available props and named states. Themes define token values. Groups reference known component states and arrange them into named UI areas.

A group is not a page. It is a reusable area of interface, such as:

- settings row
- dashboard summary
- danger zone
- command toolbar
- confirmation footer
- table header

The user decides what belongs in a group. The app checks whether each referenced component and state exists, then renders the group under the active theme.

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

The useful next work is not to add every possible design feature. It is to keep making component combinations easier to define, scan, verify, and trust.

Good next steps include:

- clearer metadata documentation and examples
- more sample component types
- additional group layouts
- stronger deterministic visual checks
- better report ergonomics
- embedding-assisted search only after the deterministic catalog feels solid

The north star is a compact tool that makes component-system knowledge visible without turning it into a heavyweight page builder.
