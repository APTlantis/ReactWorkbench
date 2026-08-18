# Theme-Preview Instructions

Inherit the drive and DRS portfolio instructions when located under `D:\DRS`.

## Read first

1. `Theme-Preview.manifest.toml`
2. `Project-README.md`
3. `README.md`
4. `Theme-Preview.md`
5. `docs\Project-Proposal.md`
6. `docs\Theme-Preview - Release Checklist.md`
7. `docs\Theme-Preview - Dependency Provenance.md`
8. `docs\CONCEPT.md`, `docs\METADATA.md`, and `docs\ROADMAP.md`

## Project boundaries

Theme Preview is a local-first Tauri desktop laboratory for deterministic UI component, theme-token, component-group, variant, and page metadata. TOML files under `metadata/` are current source material. Future imported libraries require refreshed project records and should be represented by source records and adapter catalogs. DuckDB catalogs, screenshots, reports, `dist`, smoke output, and Tauri build output are derived artifacts.

The PPS proposal has been refreshed around local metadata, saved variants, block-based pages, and governed source-adapter boundaries. Continue to avoid Figma replacement workflows, prompt-only generative UI design, external import assumptions, or a public plugin ecosystem unless the PPS proposal is refreshed again.

## Build and verification

Use the project scripts from the root:

```powershell
npm run dev
npm run tauri dev
npm run build
npm run verify
npm run tauri build
```

`npm run verify` is the main local verification command. It does not establish DRS release readiness by itself.

## Release rules

The current posture is `release-prep`. Do not claim a release is ready until DRS evidence verifies the final artifact path, size, SHA-256, install, launch, uninstall, docs inclusion, and signing status.

Installer files under `src-tauri\target\release\bundle` are existing build outputs until a release gate certifies them.
