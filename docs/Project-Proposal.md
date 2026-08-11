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

Component-system knowledge often lives across scattered source files, screenshots, notes, and one-off examples. Checking whether a component state, theme token, or reusable UI area still behaves correctly becomes repetitive and hard to trust.

## Mission

Theme Preview should make component states, theme tokens, and reusable UI groups explicit, local, renderable, and verifiable from deterministic TOML metadata.

## Design Boundaries

In scope:

- Component, theme, and group metadata stored as local TOML.
- Desktop and browser preview surfaces for known components and groups.
- Theme switching, token inspection, duplicate group surfacing, and deterministic validation.
- Screenshot export, comparison reports, review decisions, and smoke checks.
- Optional local catalog indexing and search when available.

Out of scope unless this proposal is refreshed:

- Full page generation.
- Drag-and-drop page editing.
- Figma replacement workflows.
- Prompt-generated UI design.
- Public plugin ecosystem.
- Release-readiness claims without DRS evidence.

## Success Criteria

- [x] Metadata can define components, themes, and groups.
- [x] The app can preview individual states and saved groups across themes.
- [x] Duplicate structures and validation warnings are surfaced deterministically.
- [x] Screenshots and comparison reports can be generated locally.
- [x] A one-command verification loop exists.
- [ ] A post-promotion DRS verification pass is recorded.
- [ ] Final release artifacts have verified hashes and install behavior.

## Failure Criteria

- [ ] TOML metadata stops being the source of truth.
- [ ] Generated screenshots or catalogs become the only recoverable source for project meaning.
- [ ] The product drifts into an unbounded page builder without a revised proposal.
- [ ] Release notes, manifest, hashes, and installer behavior disagree.
- [ ] The app claims production readiness before DRS evidence exists.

## Constraints

- Technical: Tauri 2, React, TypeScript, Rust, Vite, local filesystem metadata, and Node verification scripts.
- Scope: deterministic preview and verification first; AI or embedding workflows only after the metadata engine remains trustworthy.
- Runtime: Windows desktop is the primary DRS target; browser preview remains a development surface.
- Data: project metadata is local TOML; generated artifacts must remain reproducible or clearly labeled as derived output.

## Risks

- Risk: Existing build outputs may be mistaken for a certified release.
  Mitigation: Mark release status as draft and hashes as pending until DRS gates pass.

- Risk: Generated artifacts grow stale relative to TOML metadata.
  Mitigation: Treat metadata as source of truth and regenerate screenshots/reports during verification.

- Risk: Visual comparison reports overfit to tiny rendering drift.
  Mitigation: Keep threshold controls documented and review decisions explicit.

- Risk: Scope expands into general design tooling.
  Mitigation: Preserve clear out-of-scope boundaries in proposal, README, and agent instructions.

## Roadmap

1. Complete DRS onboarding and parent registration.
2. Run post-promotion `npm run verify` from `D:\DRS\Theme-Preview`.
3. Rebuild or certify desktop release artifacts.
4. Record artifact hashes, signing posture, install, launch, uninstall, and docs inclusion.
5. Improve metadata examples and deterministic checks before adding broader search or AI-assisted workflows.
