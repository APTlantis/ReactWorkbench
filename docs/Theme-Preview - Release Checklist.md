# Theme Preview - Release Checklist

This checklist is a living DRS gate document. The current posture is release-prep. Unchecked items are release blockers.

## Pre-Release Gates

### Build

- [ ] Clean clone builds successfully with documented setup.
- [ ] Node dependencies restore from `package-lock.json`.
- [ ] Rust dependencies restore from `src-tauri/Cargo.lock`.
- [ ] `npm run build` completes.
- [ ] `npm run tauri build` completes for the selected Windows target.
- [ ] Manifest version, package version, Cargo version, and Tauri version match.

### Tests And Verification

- [x] `npm run verify` completes after promotion to `D:\DRS\Theme-Preview` on 2026-08-11.
- [x] Screenshot comparison tests pass.
- [x] Duplicate group tests pass.
- [x] Report review tests pass.
- [x] Strict screenshot comparison passes or all intentional changes have current accepted review decisions.
- [x] Rust/Tauri tests pass.
- [x] Browser smoke check passes.
- [ ] Manual desktop smoke test is recorded.

### Data Safety

- [ ] First-run behavior does not overwrite metadata unexpectedly.
- [ ] Saving edited groups requires explicit user action.
- [ ] Existing metadata survives app launch, verification, and uninstall.
- [ ] Generated artifacts are distinguishable from TOML source metadata.
- [ ] Upgrade behavior is verified once a prior released version exists.

### Network Behavior

- [ ] The app launches and runs primary workflows without network access.
- [ ] No unexpected outbound connections are observed during launch and primary workflow.
- [ ] Any optional dependency restore or Playwright browser install is treated as build-time setup, not runtime behavior.

### Security And Trust

- [ ] README and release note state release status accurately.
- [ ] Signing status is explicit.
- [ ] No credentials, private endpoints, or tokens are stored in project metadata or docs.
- [ ] Dependency provenance is current.
- [ ] Known limitations remain listed in the manifest.

### Artifacts

- [ ] Final MSI artifact path is selected.
- [ ] Final NSIS artifact path is selected, if shipping NSIS.
- [ ] SHA-256 is computed from each final artifact.
- [ ] SHA-256 values are recorded in the manifest and release note.
- [ ] Artifact sizes are recorded from the final files.
- [ ] Installed app launches with title `Theme Preview`.
- [ ] Uninstall behavior is tested.
- [ ] Installed package includes required docs or the release note records why docs are external.

### Release Document

- [ ] Release note is final prose, not a draft.
- [ ] Release theme accurately reflects what shipped.
- [ ] Design boundaries are current.
- [ ] Manifest release fields match final artifacts.
- [ ] Release checklist has a completed per-version verification block.

## Release Blockers

- A required verification command fails without a recorded explanation.
- Manifest version does not match package, Cargo, or Tauri release version.
- Artifact hash in the manifest does not match the final artifact.
- Installer install, launch, or uninstall behavior is unverified.
- Release note claims production readiness without evidence.
- TOML source metadata is modified silently by generated-output workflows.

## Per-Version Verification Blocks

Append one block per release. Newest at the bottom. Do not edit past blocks after a release is finalized.

---

## v0.1.0 win-x64 Draft Verification

* Package target: `src-tauri\target\release\bundle\msi\Theme Preview_0.1.0_x64_en-US.msi` and `src-tauri\target\release\bundle\nsis\Theme Preview_0.1.0_x64-setup.exe`
* Package size: pending final verification
* SHA-256: pending final verification
* Signing: unsigned pending verification
* Build result: existing build outputs observed from before DRS onboarding; not certified
* Test result: `npm run verify` passed on 2026-08-11: build, compare fixtures, duplicate fixtures, report review fixtures, strict screenshot comparison, 8 Rust/Tauri tests, browser smoke, 0 visual smoke issues
* Install result: pending
* Data safety: pending
* Upgrade safety: not applicable until a prior released version exists
* Public release: not planned until DRS gate passes

Notes:
Theme Preview was promoted from zoning to DRS on 2026-08-11. Existing artifacts were preserved but not certified as release artifacts.

