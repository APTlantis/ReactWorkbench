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

The first implementation intentionally stayed narrow so the project could build a trustworthy preview and verification core. The broader product direction is now explicit: Theme Preview should grow into a local-first UI builder that can work from local metadata, saved variants, composed groups, and arranged pages without losing deterministic inspection.

## Mission

Theme Preview should make component states, theme tokens, reusable variants, UI groups, and pages explicit, local, renderable, and verifiable.

The current TOML metadata model is the active source adapter. External component-library adapters are deferred until a refreshed proposal defines their source records, provenance rules, preview boundaries, and verification gates.

## Design Boundaries

In scope:

- Component, theme, and group metadata stored as local TOML.
- Source records that normalize local metadata into a shared catalog.
- Desktop and browser preview surfaces for known components, variants, groups, and pages.
- Page-builder foundations through page metadata, component selection, layout composition, and deterministic preview.
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
- [x] Source records can index local TOML metadata.
- [x] Saved variant and page metadata exist beside component and group metadata.
- [x] Page-builder planning defines a saved page model, layout model, and source boundaries before page editing starts.
- [ ] Predictable React export planning turns saved metadata into handoff files.
- [ ] A post-promotion DRS verification pass is recorded.
- [ ] Final release artifacts have verified hashes and install behavior.

## Failure Criteria

- [ ] TOML metadata stops being the source of truth.
- [ ] External code or derived catalogs replace local metadata as the recoverable source.
- [ ] Generated screenshots or catalogs become the only recoverable source for project meaning.
- [ ] The product drifts into an unbounded page builder without saved page metadata, adapter boundaries, or deterministic verification.
- [ ] Release notes, manifest, hashes, and installer behavior disagree.
- [ ] The app claims production readiness before DRS evidence exists.

## Constraints

- Technical: Tauri 2, React, TypeScript, Rust, Vite, local filesystem metadata, source records, and Node verification scripts.
- Scope: deterministic preview and local source normalization first; page building follows saved metadata stability; AI or embedding workflows only after the metadata engine remains trustworthy.
- Runtime: Windows desktop is the primary DRS target; browser preview remains a development surface.
- Data: project metadata is local TOML today; future imported sources should be represented by explicit source records and derived adapter catalogs only after scope refresh; generated artifacts must remain reproducible or clearly labeled as derived output.

## Risks

- Risk: Existing build outputs may be mistaken for a certified release.
  Mitigation: Mark release status as draft and hashes as pending until DRS gates pass.

- Risk: Generated artifacts grow stale relative to TOML metadata.
  Mitigation: Treat metadata as source of truth and regenerate screenshots/reports during verification.

- Risk: Visual comparison reports overfit to tiny rendering drift.
  Mitigation: Keep threshold controls documented and review decisions explicit.

- Risk: Scope expands into general design tooling.
  Mitigation: Stage the expansion through adapter records, component catalogs, saved page metadata, and verification gates.

- Risk: External adapters return without clear provenance, cleanup, or preview boundaries.
  Mitigation: Require a refreshed source-adapter plan before adding external registries, copied source trees, or adapter-backed previews.

## Roadmap

1. Keep the current TOML preview, group, screenshot, and verification core stable.
2. Keep source records aligned with local TOML metadata.
3. Deepen saved variants and variant-backed groups.
4. Mature block-based page composition from saved variants and groups.
5. Plan predictable React export as a handoff from saved metadata.
6. Rebuild or certify desktop release artifacts separately from feature expansion, then record hashes, signing posture, install, launch, uninstall, and docs inclusion.
