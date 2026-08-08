# Theme Preview Brief

Theme Preview is planned as a component exploration studio rather than a drag-and-drop visual editor. The core idea is to make component structure explicit through metadata, then let the software enumerate valid visual states, themes, and combinations.

The initial product direction:

- Tauri 2 desktop application
- React + TypeScript frontend
- Rust command layer
- TOML metadata for components and themes
- deterministic previews before AI-assisted features
- local file metadata as the portable source of truth
- DuckDB and local embeddings as a personal indexing/search foundation

The useful first workflow is a theme preview loop:

1. Load component metadata.
2. Select a component.
3. Toggle props and preview states.
4. Switch themes.
5. Store derived records in a local index.

Longer-term directions include screenshot generation, accessibility checks, documentation generation, layout exploration, and semantic search over rendered candidates. AI is not part of the core design engine; it may later help retrieve, compare, or inspect deterministic outputs.
