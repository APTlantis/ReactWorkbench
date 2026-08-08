# Theme Preview

Theme Preview is a Tauri 2 desktop component laboratory for exploring UI components, themes, and component groups from explicit metadata.

The app is not trying to be a drag-and-drop page editor. It is a deterministic preview environment: define components, states, themes, and named groups, then inspect how those pieces behave alone and together.

## What It Does Now

- Loads component definitions from `metadata/components`.
- Loads theme token sets from `metadata/themes`.
- Loads named component areas from `metadata/groups`.
- Previews one component and its named states.
- Switches themes and compares themes.
- Shows a board of all defined groups.
- Lets you compose and save new groups from inside the app.
- Validates groups against known components and states.
- Builds a local DuckDB catalog when DuckDB is available.
- Searches the local catalog for components, groups, and themes.

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
