# Theme Preview - Dependency Provenance

**Version:** Theme Preview v0.1.0
**Last updated:** 2026-08-11

This document records current dependency sources for release-prep. Exact resolved JavaScript versions are controlled by `package-lock.json`; exact resolved Rust versions are controlled by `src-tauri/Cargo.lock`.

## Runtime Dependencies

| Package | Version | Source | License | Purpose | Verified |
| --- | --- | --- | --- | --- | --- |
| @tauri-apps/api | ^2 | npm registry via package-lock.json | upstream package license | Tauri frontend API | pending release gate |
| @tauri-apps/plugin-opener | ^2 | npm registry via package-lock.json | upstream package license | Open files/URLs through Tauri plugin | pending release gate |
| lucide-react | ^0.468.0 | npm registry via package-lock.json | ISC | UI icons | pending release gate |
| react | ^19.1.0 | npm registry via package-lock.json | MIT | Frontend UI runtime | pending release gate |
| react-dom | ^19.1.0 | npm registry via package-lock.json | MIT | React DOM renderer | pending release gate |
| tauri | 2 | crates.io via Cargo.lock | upstream crate license | Desktop shell runtime | pending release gate |
| tauri-plugin-opener | 2 | crates.io via Cargo.lock | upstream crate license | Desktop opener plugin | pending release gate |
| serde | 1 with derive | crates.io via Cargo.lock | MIT OR Apache-2.0 | Rust serialization | pending release gate |
| serde_json | 1 | crates.io via Cargo.lock | MIT OR Apache-2.0 | JSON serialization | pending release gate |
| toml | 0.8 | crates.io via Cargo.lock | MIT OR Apache-2.0 | TOML metadata parsing | pending release gate |

## Build-Time Dependencies

| Package | Version | Source | License | Purpose | Verified |
| --- | --- | --- | --- | --- | --- |
| @tauri-apps/cli | ^2 | npm registry via package-lock.json | upstream package license | Tauri build and packaging CLI | pending release gate |
| @vitejs/plugin-react | ^4.6.0 | npm registry via package-lock.json | MIT | Vite React integration | pending release gate |
| playwright | ^1.62.1 | npm registry via package-lock.json | Apache-2.0 | Browser smoke and screenshot automation | pending release gate |
| typescript | ~5.8.3 | npm registry via package-lock.json | Apache-2.0 | Type checking and build | pending release gate |
| vite | ^7.0.4 | npm registry via package-lock.json | MIT | Development server and frontend build | pending release gate |
| @types/react | ^19.1.8 | npm registry via package-lock.json | MIT | Type definitions | pending release gate |
| @types/react-dom | ^19.1.6 | npm registry via package-lock.json | MIT | Type definitions | pending release gate |
| tauri-build | 2 | crates.io via Cargo.lock | upstream crate license | Tauri Rust build support | pending release gate |

## Framework And Runtime

| Component | Version | Source | Notes |
| --- | --- | --- | --- |
| Node.js | not pinned in project docs yet | local developer environment | Required for npm scripts. |
| npm | not pinned in project docs yet | local developer environment | Uses committed `package-lock.json`. |
| Rust toolchain | not pinned in project docs yet | local developer environment | Required for Tauri build. |
| Tauri | 2 | npm and crates.io | Desktop application framework. |
| DuckDB | optional, not pinned here | local runtime when available | README describes optional catalog indexing/search. |

## Cryptographic Dependencies

This application does not implement user-facing cryptography. Release integrity uses DRS artifact hashing, which is external release evidence rather than app runtime cryptography.

## Dependency Change Log

| Date | Package | Change | Reason | Release |
| --- | --- | --- | --- | --- |
| 2026-08-11 | all current packages | Recorded existing dependencies | DRS onboarding | v0.1.0 draft |

## Verification Notes

* Source verification: pending release gate.
* Lock file policy: `package-lock.json` and `src-tauri/Cargo.lock` are present and should remain committed.
* Private feeds: none documented.
* Pinning policy: npm and Cargo lock files provide resolved versions; top-level manifests still use semver ranges for several dependencies.
