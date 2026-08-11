# Concept

Theme Preview is a component exploration studio growing into a local-first UI builder.

Most UI work has a hidden problem: the important pieces are scattered. A component has props, states, themes, layout expectations, accessibility concerns, documentation, and examples. Those details usually live in separate places, so checking a simple question can become surprisingly repetitive.

Theme Preview makes those pieces explicit. The first version does this through local TOML metadata. The longer-term product should also understand established component systems, starting with shadcn-style registries or local directories, then use those sources to build real pages.

## The Core Idea

Instead of manually building every preview by hand, the user describes or imports UI pieces as source records:

- what components exist
- what props they support
- what states matter
- what themes exist
- which components belong together in a named area
- which external component source a component came from
- which page or layout uses those pieces

The app then renders those definitions and lets the user inspect them. The current TOML model is the first adapter. A shadcn adapter is the planned next step so a user can point at a repo or local directory and bring those components into the same working surface.

This is useful even for someone who knows UI well. Knowing how to build a thing is different from wanting to rebuild it every time just to check one visual combination.

## What A Group Means Today

A group is a named area of UI made from known component states.

Examples:

- settings row
- dashboard summary
- danger zone
- toolbar
- dialog footer
- table controls

The user decides what belongs in the group. The app checks whether the referenced components and states exist, then previews the group under the active theme.

## Where This Goes

The long-term target is a fuller UI builder:

- register multiple component sources
- switch between local TOML, shadcn imports, and later other adapters
- choose components from any active source
- compose groups and pages from those components
- preserve source provenance for every imported component
- preview, verify, screenshot, and compare the result

The builder should grow from the deterministic lab bench rather than bypass it. That means imported components, page layouts, and generated outputs need explicit records the app can inspect and verify.

## What Still Needs Guardrails

Theme Preview should not become a Figma replacement or prompt-only generative designer. Page building is now part of the product direction, but it should be built through components, props, layouts, themes, and source adapters that remain visible and editable.

## Why Deterministic First

The first version favors deterministic behavior because it should be explainable.

If a group fails validation, the app can say exactly why:

- unsupported layout
- missing component
- missing state
- duplicate role
- empty role

Later, embeddings or AI-assisted search can help navigate a large catalog. They should help select and compare components; they should not replace the underlying component, adapter, group, page, and theme definitions.
