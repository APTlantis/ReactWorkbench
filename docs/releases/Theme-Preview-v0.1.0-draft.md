# Theme Preview v0.1.0 - Draft Release Note

Status: draft, not released.
Date opened: 2026-08-11.

## Release Theme

Metadata Preview Studio.

## What This Version Contains

Theme Preview v0.1.0 currently contains a Tauri 2 desktop shell, React + TypeScript preview UI, Rust command layer, TOML component/theme/group metadata, screenshot export, screenshot comparison reports, duplicate group surfacing, report review state, smoke checks, and a one-command local verification script.

## Design Boundaries

This release is intended to remain a deterministic component-system preview and verification tool. It is not a page builder, Figma replacement, generative UI designer, or public plugin host.

## Artifact Evidence

Release artifacts are pending DRS verification.

| Artifact | Path | Size | SHA-256 | Status |
| --- | --- | ---: | --- | --- |
| MSI | `src-tauri\target\release\bundle\msi\Theme Preview_0.1.0_x64_en-US.msi` | 3309568 | pending | existing output, not certified |
| NSIS | `src-tauri\target\release\bundle\nsis\Theme Preview_0.1.0_x64-setup.exe` | 2225669 | pending | existing output, not certified |

## Verification Status

Completed after promotion to `D:\DRS\Theme-Preview`:

- `npm run verify` passed on 2026-08-11: build, compare fixtures, duplicate fixtures, report review fixtures, strict screenshot comparison, 8 Rust/Tauri tests, browser smoke, 0 visual smoke issues

Still pending:
- release package rebuild or artifact certification
- SHA-256 computation from final artifacts
- install, launch, uninstall, and docs-in-package check
- signing status confirmation

## Known Limitations

- Existing build outputs predate DRS onboarding and are not release evidence by themselves.
- Install and uninstall behavior has not been verified.
- Signing is not configured or certified.
- `D:\Development.manifest.toml` was referenced by root instructions but absent during onboarding.

## Release Decision

Do not publish this draft. Promote it to a final release note only after the DRS checklist is complete and the manifest hashes match final artifacts.


