# Theme Preview

## Purpose and boundaries

Theme Preview is a local-first Tauri desktop laboratory for inspecting UI components, theme tokens, reusable component groups, saved variants, and block-based pages from explicit TOML metadata. It makes important component states, combinations, and page assemblies visible, renderable, searchable, and checkable.

The first implementation is a deterministic preview studio. The current builder rule is: components are configured, groups are composed, and pages are arranged. The long-term product direction is a fuller UI builder that saves reusable component variants, composes groups, arranges pages from explicit local metadata, and can later reopen external source adapters when project records define them.

The current source of truth is the TOML metadata under `metadata/components`, `metadata/variants`, `metadata/groups`, `metadata/pages`, and `metadata/themes`. Future imported sources should be represented by explicit source records and adapter catalogs. DuckDB catalogs, screenshots, comparison reports, smoke artifacts, `dist`, and Tauri build outputs are derived.

## Governance

- Project manifest: `Theme-Preview.manifest.toml`
- Modification instructions: `AGENTS.md`
- Proposal: `docs/Project-Proposal.md`
- Release checklist: `docs/Theme-Preview - Release Checklist.md`
- Dependency provenance: `docs/Theme-Preview - Dependency Provenance.md`
- Governing standard: DRS
- Supporting standards: WGS, PPS

## Current state

Lifecycle: `release-prep`.

The app has a working Tauri 2 shell, React + TypeScript frontend, Rust command layer, TOML metadata catalogs, visual preview exports, screenshot comparison reports, deterministic smoke checks, and documented verification commands. `npm run verify` passed from `D:\DRS\Theme-Preview` on 2026-08-11. Existing built artifacts are preserved, but they are not certified release artifacts until a DRS release gate verifies hashes and install behavior.

The planning docs now treat saved variants, variant-backed groups, block-based pages, and predictable React export planning as the active expansion path. External source adapters are deferred until they are intentionally reintroduced.

## Architecture

- React + TypeScript renders the preview studio and review surfaces.
- Rust/Tauri loads local metadata and provides the desktop shell.
- TOML metadata describes components, variants, groups, pages, and themes.
- Source records index the local TOML catalog; future external adapters must be reintroduced through explicit project records.
- Node scripts export screenshots, compare visual snapshots, review reports, and run smoke verification.

## Repository layout

- `metadata/`: source TOML for components, variants, groups, pages, sources, and themes.
- `src/`: React + TypeScript frontend.
- `src-tauri/`: Rust/Tauri desktop shell, commands, icons, and build output.
- `scripts/`: screenshot, comparison, smoke, report, and verification scripts.
- `docs/`: concept, metadata guide, roadmap, proposal, and DRS records.
- `artifacts/`: generated smoke, screenshot, and comparison outputs.
- `dist/`: generated frontend build output.

## Primary workflows

- Run the desktop app with `npm run tauri dev`.
- Run the browser preview with `npm run dev`.
- Build the frontend with `npm run build`.
- Build desktop packages with `npm run tauri build`.
- Run the current verification loop with `npm run verify`.
- Export and compare visual previews with `npm run screenshots`, `npm run compare:screenshots`, and `npm run compare:screenshots:strict`.

## Artifacts, data, and integrity

Existing MSI, NSIS, executable, frontend build, screenshot, and smoke artifacts are preserved. Their presence is evidence of prior builds only. They are not current DRS release evidence until artifact paths, sizes, hashes, install, launch, uninstall, docs inclusion, and signing posture are verified and recorded.

## Known gaps and roadmap

- Run post-promotion verification from `D:\DRS\Theme-Preview`.
- Certify or rebuild installer artifacts before any release claim.
- Record SHA-256 hashes only after selecting final release artifacts.
- Verify install, launch, uninstall, and docs-in-package behavior.
- Keep source records aligned with the local TOML catalog and revisit external adapters only through a fresh scoped plan.
- Keep the metadata guide and roadmap aligned with the deterministic adapter and builder model.

## Handoff notes

This project was promoted from `D:\.zoning\Theme-Preview` to `D:\DRS\Theme-Preview` on 2026-08-11. Existing product docs were preserved as source context. `D:\Development.manifest.toml` was referenced by root instructions but absent during onboarding; this project does not create that root record.

