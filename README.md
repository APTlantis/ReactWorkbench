# Theme Preview

![Stage](https://img.shields.io/badge/stage-release--prep-blue)
![Version](https://img.shields.io/badge/version-0.1.0-informational)
![Standard: DRS](https://img.shields.io/badge/standard-DRS-purple)
![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-v7-646CFF?logo=vite&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust&logoColor=white)

Theme Preview is a local-first Tauri desktop workbench for React UI composition. It started as a deterministic component and theme preview lab, and is now growing into a builder shaped around this rule:

**Components are configured. Groups are composed. Pages are arranged.**

The app uses explicit TOML metadata as its source of truth so components, saved variants, groups, page layouts, themes, and source records stay inspectable and reproducible.

## What It Does

- Loads component metadata from `metadata/components`.
- Saves reusable component variants under `metadata/variants`.
- Loads named component groups from `metadata/groups`.
- Lets groups reference either component states or saved variants.
- Loads block-based pages from `metadata/pages`.
- Arranges page blocks inside semantic regions such as header, main, and footer.
- Loads source records from `metadata/sources`.
- Loads theme token sets from `metadata/themes`.
- Uses Blue Slate as the default theme, with `light`, `dark`, and `aurora` still available for comparison.
- Previews component states, variants, groups, and pages in the app.
- Provides structured form editors for variants and groups.
- Provides constrained block movement for pages, without absolute positioning or freeform canvas editing.
- Exports and compares browser-rendered preview screenshots.
- Runs deterministic checks for rendering, contrast, clipping, text overflow, duplicate groups, and screenshot review state.

The current export target is planned React handoff output from saved metadata. The app is not intended to import arbitrary existing pages and visually edit them after export.

## Quick Start

Install dependencies:

```powershell
npm install
```

Run the browser preview:

```powershell
npm run dev
```

Run the desktop app:

```powershell
npm run tauri dev
```

Build the frontend:

```powershell
npm run build
```

Run the full local verification loop:

```powershell
npm run verify
```

Build desktop packages:

```powershell
npm run tauri build
```

## Metadata Model

```text
metadata/
  components/   Stock component definitions, props, and states
  variants/     Saved component recipes with prop overrides and structured slots
  groups/       Reusable UI areas made from component states or variants
  pages/        Block-based page layouts made from groups and variants
  sources/      Local and imported component catalog source records
  themes/       Theme token sets, including the default Blue Slate theme
```

Variants sit between components and groups. For example, a stock `Card` can become `Project Feature Card` with media, header, badge, divider, body, metadata, and action slots.

Pages sit above groups. A page record arranges saved groups and variants into ordered blocks inside semantic regions. Page editing uses block reorder and move-to-region controls; it does not store pixel positions.

## Verification

Useful focused checks:

```powershell
npm run test:compare
npm run test:groups
npm run test:pages
npm run test:reports
npm run compare:screenshots:strict
```

Browser smoke requires Playwright Chromium to launch successfully:

```powershell
npm run smoke
```

In this Codex sandbox, Playwright browser launch can fail with `spawn EPERM`; running the smoke command outside the sandbox is the expected workaround.

## Release Status

Lifecycle: `release-prep`.

`npm run verify` is the main local verification command, but a passing local verification run is not a DRS release claim. Release readiness still requires final artifact paths, sizes, SHA-256 hashes, install, launch, uninstall, docs inclusion, and signing status to be verified and recorded.

Existing MSI, NSIS, executable, `dist`, screenshot, and smoke outputs are preserved artifacts. They are not certified release artifacts until the DRS release gate is completed.

## Useful Docs

- [Project README](Project-README.md)
- [Theme Preview Brief](Theme-Preview.md)
- [Metadata Guide](docs/METADATA.md)
- [Roadmap](docs/ROADMAP.md)
- [Project Proposal](docs/Project-Proposal.md)
- [Release Checklist](docs/Theme-Preview%20-%20Release%20Checklist.md)
- [Dependency Provenance](docs/Theme-Preview%20-%20Dependency%20Provenance.md)
