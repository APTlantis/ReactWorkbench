# Theme Preview

Theme Preview is a Tauri 2 desktop component laboratory for exploring UI components, themes, and component groups from explicit metadata.

The app is not trying to be a drag-and-drop page editor. It is a deterministic preview environment: define components, states, themes, and named groups, then inspect how those pieces behave alone and together.

## What It Does Now

- Loads component definitions from `metadata/components`.
- Loads theme token sets from `metadata/themes`.
- Loads named component areas and layout patterns from `metadata/groups`.
- Previews one component and its named states, including buttons, cards, badges, inputs, and toggles.
- Switches themes and compares themes.
- Shows a board of all defined groups.
- Surfaces duplicate saved group structures in the group board, matching board cards, and group inspector, with a persisted board filter for duplicate structures.
- Lets you compose and save new groups from inside the app.
- Validates groups against known components and states.
- Shows explicit review state when group drafts have validation warnings.
- Runs deterministic preview checks for visible copy, theme contrast, empty groups, and unresolved group references.
- Builds a local DuckDB catalog when DuckDB is available.
- Searches the local catalog for components, groups, and themes.
- Smoke-tests the browser preview for blank renders, horizontal, vertical, and child-content clipping, unmanaged text overflow, tiny controls, computed text contrast, and screenshot report review-source messages.
- Exports browser-rendered component and group preview screenshots for every theme.
- Shows recent screenshot comparison summaries inside the desktop inspector, with actions to open generated report files, revisit recent comparisons, scan per-theme and per-kind report totals, jump from totals into focused filter slices, filter review items by status, theme, and preview kind, see filtered item counts, reopen each report with its last filter focus, reset filters quickly, inspect individual changed previews, show an empty review summary when no items need review, mark items accepted or dismissed locally, clear stale local decisions, show a final reviewed status, export those decisions beside the report, distinguish local browser decisions from exported decisions, and distinguish current or stale exported decisions loaded in later sessions.

The TOML files are the source of truth. DuckDB is a derived local catalog/cache for search and future embedding workflows.

The seeded `metadata/groups/settings-row.toml` and `metadata/groups/settings-review-row.toml` files intentionally share the same `row` layout and ordered `badge:soft-info`, `card:compact-warning`, `button:secondary-disabled` item sequence. They are fixture data for duplicate-structure surfacing, duplicate-only board filtering, similar-group inspector copy, jump targets, and verification output.

## Running

```powershell
npm install
npm run tauri dev
```

To build the desktop executable and installers:

```powershell
npm run tauri build
```

To run the browser smoke check while a Vite preview is available at `http://127.0.0.1:1420/`:

```powershell
npm run smoke
```

Smoke artifacts are written to `artifacts/smoke`.

To export screenshots for every component and group preview, across every theme, from the same running browser preview:

```powershell
npm run screenshots
```

Screenshot exports and their manifest are written to `artifacts/previews/latest`, organized by theme. Each run also records a TOML metadata fingerprint and copies the same export to `artifacts/previews/snapshots/<metadata-hash>`.

To compare the latest export against its matching metadata snapshot, or against a specific baseline snapshot id:

```powershell
npm run compare:screenshots
npm run compare:screenshots -- 69b0c577a9be
npm run compare:screenshots:strict
npm run test:compare
npm run verify
```

Comparison reports are written to `artifacts/previews/reports` as JSON, HTML, and Markdown. The HTML report shows an all-clear, tolerated-drift, or needs-review status, links back to the raw JSON, and includes browser-local review notes on each review card. The Markdown report gives the same review summary in a pull-request-friendly format. Non-empty notes can be exported from the HTML report as a small JSON file. When a preview image changes, a pink-highlighted `.diff.png` is written beside the report under `artifacts/previews/reports/<baseline>-to-<latest>`.

Use `npm run compare:screenshots:strict` for CI or release checks. It writes the same reports, then exits with a failing status when added, removed, or changed previews need review. Tolerated differences still pass when they are within the configured threshold. If a sibling `<baseline>-to-<latest>.review.json` file exists, strict mode treats blocking items marked `accepted` as reviewed and still fails on dismissed or unresolved items. Generated JSON, HTML, and Markdown reports include review-decision coverage so stale or partial decisions are visible.

Use `npm run verify` to run the local verification pass: build, compare fixture tests, strict screenshot comparison, Rust/Tauri tests, a temporary Vite preview server, and the browser smoke check. It ends with a concise checklist summary, including visual smoke totals from the generated smoke artifact.

By default, any pixel difference is reported as changed. To tolerate tiny render drift, set `PIXEL_DIFF_THRESHOLD` to a changed-pixel ratio:

```powershell
$env:PIXEL_DIFF_THRESHOLD = "0.001"
npm run compare:screenshots
```

Differences at or below the threshold are still recorded, but are listed as tolerated rather than changed.

To ignore small per-pixel color shifts before counting changed pixels, set `PIXEL_COLOR_THRESHOLD` to an RGBA distance:

```powershell
$env:PIXEL_COLOR_THRESHOLD = "3"
npm run compare:screenshots
```

The built executable is written to:

```text
src-tauri/target/release/theme-preview.exe
```

## Project Shape

```text
metadata/
  components/   Component props and named states
  groups/       Named UI areas made from component states
  themes/       Theme token sets
src/            React + TypeScript frontend
src-tauri/      Rust/Tauri backend commands
docs/           Project notes and design rationale
```

## Useful Docs

- [Concept](docs/CONCEPT.md): why this app exists and what problem it is trying to solve.
- [Metadata Guide](docs/METADATA.md): how components, themes, and groups are described.
- [Roadmap](docs/ROADMAP.md): what this first-day version already has and where it can go next.

## Current Philosophy

The human decides what belongs together. The app removes the tedious work of repeatedly checking how those pieces look across states, themes, and combinations.

That matters because many people do not know every UI component, state, token, or layout pattern off the top of their head. Even when they do, they may not want to manually rebuild the same combinations just to see whether a button, card, badge, or group still works in a different context.
