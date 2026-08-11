# Theme Preview

Theme Preview is a Tauri 2 desktop laboratory for inspecting UI components, theme tokens, and reusable component groups from explicit TOML metadata. It is also the foundation for a local-first UI builder that can work with imported component systems.

It is intentionally deterministic. The current app is a place to define components, states, themes, and named UI areas, then inspect how those definitions behave alone, together, and across themes. The longer-term product direction is to add source adapters, starting with shadcn-compatible imports, then build pages from selected local and imported components.

## What It Does

- Loads component metadata from `metadata/components`.
- Loads theme token sets from `metadata/themes`.
- Loads named component groups from `metadata/groups`.
- Previews component states for buttons, cards, badges, inputs, toggles, tabs, and table controls.
- Switches themes and compares theme token values.
- Shows a board of saved groups and an inspector for the selected group.
- Lets you compose, edit, validate, and save groups inside the app.
- Supports group layouts such as `row`, `grid`, `stack`, `toolbar`, `form-row`, `dialog-footer`, and `table-header`.
- Surfaces duplicate saved group structures in board cards, the group inspector, and duplicate-only board filtering.
- Keeps duplicate fixtures covered with real metadata, including `settings-row.toml` and `settings-review-row.toml`.
- Runs deterministic checks for visible copy, contrast, empty groups, unresolved references, clipping, tiny controls, and screenshot report review-source behavior.
- Exports browser-rendered preview screenshots for every component and group across every theme.
- Compares screenshot exports against metadata-hash snapshots and writes JSON, HTML, and Markdown reports.
- Tracks local review decisions for changed screenshots and supports strict comparison checks for release-style verification.
- Builds a local DuckDB catalog when DuckDB is available, with search over components, groups, and themes.
- Reads source records from `metadata/sources`.
- Indexes a local shadcn-style registry or component directory through the first shadcn adapter slice.
- Shows source catalogs beside local components and groups.

The TOML files are the current source of truth. Source records describe imported or external catalogs. DuckDB, adapter catalogs, screenshots, reports, and smoke artifacts are derived outputs.

## Quick Start

Install dependencies:

```powershell
npm install
```

Run the desktop app:

```powershell
npm run tauri dev
```

Run the Vite web preview instead:

```powershell
npm run dev
```

Build the frontend:

```powershell
npm run build
```

Build the desktop executable and installers:

```powershell
npm run tauri build
```

The built Windows executable is written under:

```text
src-tauri/target/release/theme-preview.exe
```

## Verification

The main local verification command is:

```powershell
npm run verify
```

It runs the frontend build, screenshot comparison tests, duplicate group tests, report review tests, strict screenshot comparison, Rust/Tauri tests, a temporary Vite preview server, and the browser smoke check. The final output includes a checklist summary, duplicate smoke coverage, and visual smoke totals.

Focused checks are also available:

```powershell
npm run test:compare
npm run test:groups
npm run test:reports
npm run compare:screenshots:strict
```

To run the browser smoke check directly, start a preview server first, then run:

```powershell
npm run smoke
```

Smoke artifacts are written to:

```text
artifacts/smoke
```

## Screenshots And Reports

Export screenshots for every component and group preview across every theme:

```powershell
npm run screenshots
```

Screenshot exports are written to `artifacts/previews/latest`, organized by theme. Each run records a deterministic TOML metadata fingerprint and copies the export to:

```text
artifacts/previews/snapshots/<metadata-hash>
```

Compare the latest export against its matching metadata snapshot, or against a specific baseline snapshot id:

```powershell
npm run compare:screenshots
npm run compare:screenshots -- 69b0c577a9be
npm run compare:screenshots:strict
```

Comparison reports are written to:

```text
artifacts/previews/reports
```

Each comparison can produce:

- JSON for machine-readable results.
- HTML for interactive review.
- Markdown for pull request summaries.
- `.diff.png` images for changed previews.
- Optional `.review.json` decisions for accepted or dismissed visual changes.

Strict comparison fails when added, removed, or changed previews still need review. Accepted blocking items pass when the matching review decision file is present; dismissed or unresolved items continue to fail.

Tiny rendering drift can be tolerated with:

```powershell
$env:PIXEL_DIFF_THRESHOLD = "0.001"
npm run compare:screenshots
```

Small per-pixel color shifts can be ignored before counting changed pixels:

```powershell
$env:PIXEL_COLOR_THRESHOLD = "3"
npm run compare:screenshots
```

## Metadata Model

Project metadata lives under:

```text
metadata/
  components/   Component props and named states
  groups/       Named UI areas made from component states
  sources/      Component catalog source records
  themes/       Theme token sets
```

Components define identity, supported props, named states, supported themes, and framework targets. Themes define token values for color, spacing, radii, and typography. Groups reference component states by id and arrange them into named UI areas.

The adapter model extends this without replacing it: local TOML is the first adapter, shadcn import is the first external adapter target, and later libraries should normalize into the same catalog shape before they can participate in previews or page building.

The current shadcn adapter slice can index a local shadcn-style registry with a root `registry.json`, or scan `components/ui/*.tsx` when no registry file is present. Imported entries are catalog items with provenance and preview status; they are not yet materialized as native editable components.

Duplicate group detection is based on a structural signature: group layout plus the ordered `component:state` item sequence. Names, descriptions, roles, and theme lists do not affect duplicate matching. See [Duplicate Structures](docs/METADATA.md#duplicate-structures) for the authoring rule.

The seeded `metadata/groups/settings-row.toml` and `metadata/groups/settings-review-row.toml` files intentionally share this signature:

```text
row|badge:soft-info|card:compact-warning|button:secondary-disabled
```

That pair exists as fixture data for duplicate badges, duplicate-only board filtering, similar-group inspector copy, jump targets, and verification output.

## Project Shape

```text
docs/           Concept, metadata guide, and roadmap
examples/       Local adapter fixtures, including a shadcn-style registry
metadata/       Source TOML for components, groups, and themes
scripts/        Screenshot, comparison, smoke, report, and verification scripts
src/            React + TypeScript frontend
src-tauri/      Rust/Tauri desktop shell and commands
artifacts/      Generated smoke, screenshot, and comparison outputs
```

## Useful Docs

- [Theme Preview Brief](Theme-Preview.md): product direction and operating model.
- [Concept](docs/CONCEPT.md): why this app exists.
- [Metadata Guide](docs/METADATA.md): how components, themes, and groups are described.
- [Roadmap](docs/ROADMAP.md): what is working and what is next.

## Design Philosophy

The human decides what belongs together. The app removes the repetitive work of checking whether those pieces still look right across states, themes, layouts, and saved combinations.

That keeps the system inspectable. Later page building, search, or AI-assisted workflows can help navigate and assemble larger catalogs, but the underlying definitions should stay portable, local, and predictable.
