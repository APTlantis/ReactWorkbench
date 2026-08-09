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
- Lets you compose and save new groups from inside the app.
- Validates groups against known components and states.
- Runs deterministic preview checks for visible copy, theme contrast, empty groups, and unresolved group references.
- Builds a local DuckDB catalog when DuckDB is available.
- Searches the local catalog for components, groups, and themes.
- Smoke-tests the browser preview for blank renders, horizontal clipping, unmanaged text overflow, and tiny controls.
- Exports browser-rendered component and group preview screenshots for every theme.

The TOML files are the source of truth. DuckDB is a derived local catalog/cache for search and future embedding workflows.

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
```

Comparison reports are written to `artifacts/previews/reports`. When a preview image changes, a pink-highlighted `.diff.png` is written beside the report under `artifacts/previews/reports/<baseline>-to-<latest>`.

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
