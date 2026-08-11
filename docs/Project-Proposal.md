# Theme Preview Proposal

## Project Type

Desktop application.

## Readiness Level

ready for governed development; release-prep for DRS release evidence.

## Governing Standards

- Proposal: PPS
- Workspace: WGS
- Delivery: DRS
- Supporting: SESM and Blue Slate may inform visual metadata when explicitly adopted by project records.

## Problem Statement

Component-system knowledge often lives across scattered source files, screenshots, notes, open-source component libraries, and one-off examples. Checking whether a component state, theme token, reusable UI area, or assembled page still behaves correctly becomes repetitive and hard to trust.

The first implementation intentionally stayed narrow so the project could build a trustworthy preview and verification core. The broader product direction is now explicit: Theme Preview should grow into a local-first UI builder that can work with local metadata, imported open-source component systems, and later additional adapters without losing deterministic inspection.

## Mission

Theme Preview should make component states, theme tokens, reusable UI groups, imported component libraries, and eventually pages explicit, local, renderable, and verifiable.

The current TOML metadata model is the first source adapter. shadcn-compatible registries and local shadcn-style directories are the next planned adapter target.

## Design Boundaries

In scope:

- Component, theme, and group metadata stored as local TOML.
- Source adapters that normalize local metadata and imported component systems into a shared catalog.
- shadcn import planning for public GitHub registries, local directories, and copied component trees.
- Desktop and browser preview surfaces for known components and groups.
- Page-builder foundations once component adapters are stable: page metadata, component selection, layout composition, and deterministic preview.
- Theme switching, token inspection, duplicate group surfacing, and deterministic validation.
- Screenshot export, comparison reports, review decisions, and smoke checks.
- Optional local catalog indexing and search when available.

Out of scope unless this proposal is refreshed:

- Unbounded full-site generation without a local component/page model.
- Drag-and-drop editing before adapter import, catalog normalization, and deterministic save semantics exist.
- Figma replacement workflows.
- Prompt-generated UI design that bypasses explicit components, props, layouts, or source records.
- Public plugin ecosystem.
- Release-readiness claims without DRS evidence.

## Success Criteria

- [x] Metadata can define components, themes, and groups.
- [x] The app can preview individual states and saved groups across themes.
- [x] Duplicate structures and validation warnings are surfaced deterministically.
- [x] Screenshots and comparison reports can be generated locally.
- [x] A one-command verification loop exists.
- [ ] Source records can register multiple local or remote component sources.
- [ ] A shadcn adapter can import/index registry items or local component directories without replacing local TOML metadata.
- [ ] Imported components can be previewed beside local metadata components.
- [ ] Page-builder planning defines a saved page model, layout model, and adapter boundaries before page editing starts.
- [ ] A post-promotion DRS verification pass is recorded.
- [ ] Final release artifacts have verified hashes and install behavior.

## Failure Criteria

- [ ] TOML metadata stops being the source of truth.
- [ ] Imported code replaces adapter records as the only recoverable catalog source.
- [ ] Generated screenshots or catalogs become the only recoverable source for project meaning.
- [ ] The product drifts into an unbounded page builder without saved page metadata, adapter boundaries, or deterministic verification.
- [ ] Release notes, manifest, hashes, and installer behavior disagree.
- [ ] The app claims production readiness before DRS evidence exists.

## Constraints

- Technical: Tauri 2, React, TypeScript, Rust, Vite, local filesystem metadata, source adapters, and Node verification scripts.
- Scope: deterministic preview and source normalization first; page building follows adapter stability; AI or embedding workflows only after the metadata and adapter engine remains trustworthy.
- Runtime: Windows desktop is the primary DRS target; browser preview remains a development surface.
- Data: project metadata is local TOML today; imported sources should be represented by explicit source records and derived adapter catalogs; generated artifacts must remain reproducible or clearly labeled as derived output.

## Risks

- Risk: Existing build outputs may be mistaken for a certified release.
  Mitigation: Mark release status as draft and hashes as pending until DRS gates pass.

- Risk: Generated artifacts grow stale relative to TOML metadata.
  Mitigation: Treat metadata as source of truth and regenerate screenshots/reports during verification.

- Risk: Visual comparison reports overfit to tiny rendering drift.
  Mitigation: Keep threshold controls documented and review decisions explicit.

- Risk: Scope expands into general design tooling.
  Mitigation: Stage the expansion through adapter records, component catalogs, saved page metadata, and verification gates.

- Risk: Imported open-source repositories bring incompatible build systems, styling assumptions, or side effects.
  Mitigation: Start with read/index/import workflows, prefer shadcn registry semantics where available, require source provenance, and keep rendered previews sandboxed behind adapters.

## Roadmap

1. Keep the current TOML preview, group, screenshot, and verification core stable.
2. Add source records for component catalogs, starting with local TOML and planned shadcn sources.
3. Build a shadcn adapter that can inspect a local directory or public GitHub registry and import/index components beside existing metadata.
4. Add adapter-backed previews for imported shadcn components without making them the only source of truth.
5. Define saved page metadata and layout composition once multiple component sources can be selected and previewed.
6. Rebuild or certify desktop release artifacts separately from feature expansion, then record hashes, signing posture, install, launch, uninstall, and docs inclusion.
