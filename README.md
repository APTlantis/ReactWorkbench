# Theme Preview

Theme Preview is a Tauri 2 desktop component laboratory. It reads portable TOML metadata, renders component states, compares themes, and prepares a local DuckDB/embedding index for later search workflows.

The first slice is intentionally deterministic: the user defines components, props, states, and themes; the app enumerates and previews those definitions.

## Current Model

- `metadata/components` defines individual component props and named states.
- `metadata/themes` defines visual token environments.
- `metadata/groups` defines named areas where known component states belong together.

The app can preview one component, one group, compare themes, or open a group board that shows all defined areas at once. This is the first step toward browsing larger sets of valid component combinations without asking the app to invent them.

When DuckDB is available, the app rebuilds a derived local index on startup with one searchable record per component, theme, and group. The TOML files remain canonical; DuckDB is a local catalog/cache layer for later search and embedding workflows.

The Catalog search button queries that DuckDB index and can jump directly to a matching component, group, or theme. This is intentionally simple text search for now; the same record shape is prepared for later embedding-backed similarity.

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
