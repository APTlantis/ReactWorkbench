# React UI Workbench Variant-To-Page Plan

![Stage](https://img.shields.io/badge/stage-release--prep-blue)
![Version](https://img.shields.io/badge/version-0.1.0-informational)
![Standard: DRS](https://img.shields.io/badge/standard-DRS-purple)
![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-v7-646CFF?logo=vite&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust&logoColor=white)

## Summary

Evolve the app from a component/group preview lab into a React composition workbench with this rule:

**Components are configured. Groups are composed. Pages are arranged.**

The first slice is **variant-first**: add saved component variants as first-class reusable metadata, make groups consume variants, then add block-based page assembly from variants/groups. Blue Slate becomes the default theme, while existing themes remain available for comparison.

## Key Changes

- Add `metadata/variants/` as the new reusable object layer between components and groups.
  - A variant references a base component, selected state/props, optional named slots, source provenance, themes, and React/Svelte framework targets.
  - Initial slot support should be structured and form-driven: text, media, badge, divider, footer/action, and metadata rows for card-like variants.
  - Save/copy/edit flows should mirror the existing group composer pattern: explicit save, validation panel, warning review, slugified file ids.

- Update group composition to allow items to reference either a component state or a saved variant.
  - Keep existing group metadata valid.
  - Add a new item shape that can represent `kind = "component"` or `kind = "variant"` without breaking old `component/state/role` files.
  - Group editing remains form-driven with layout presets, item ordering buttons, duplicate/copy/edit support, and deterministic validation.

- Add `metadata/pages/` after variants are usable.
  - A page record contains regions such as `header`, `main`, and `footer`, and ordered blocks within each region.
  - Blocks reference saved groups or variants, plus layout mode such as `stack`, `grid`, `split`, `sidebar`, or `section`.
  - Page editing uses block reorder/drop-zone behavior only: move sections between semantic regions and reorder them. No absolute positioning, freeform canvas, or pixel-level resize handles.

- Add Blue Slate as the default theme.
  - Import it as a theme metadata file and set it as the initial selected theme.
  - Preserve existing `light`, `dark`, and `aurora` themes as comparison targets unless later intentionally retired.
  - Update docs to clarify that Blue Slate is the default project theme, not a release-readiness claim.

- Add export planning after page metadata exists.
  - First export target is predictable React output from saved metadata: variant component files, group/section files, page files, and a manifest.
  - Export is a handoff to WebStorm, not an import/edit loop for arbitrary existing pages.

## Interfaces And Metadata

- Rust/Tauri commands:
  - `list_variants`, `load_variant`, `save_variant`, `update_variant`, `validate_variant`
  - `list_pages`, `load_page`, `save_page`, `update_page`, `validate_page`
  - Extend local index records to include variants and pages.

- Frontend types:
  - `VariantFile`, `VariantSummary`, `VariantSlot`, `VariantValidation`
  - `PageFile`, `PageSummary`, `PageRegion`, `PageBlock`, `PageValidation`
  - Extend catalog/search result types with `variant` and `page`.

- UI navigation:
  - Add library modes for `Variants` and `Pages`.
  - Keep `Components`, `Groups`, and `Sources`.
  - Add a Variant Workshop inspector for form/slot editing.
  - Add a Page Layout view with semantic regions and block reorder controls.
