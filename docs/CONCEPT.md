# Concept

Theme Preview is a component exploration studio growing into a local-first UI builder.

Most UI work has a hidden problem: the important pieces are scattered. A component has props, states, themes, layout expectations, accessibility concerns, documentation, and examples. Those details usually live in separate places, so checking a simple question can become surprisingly repetitive.

Theme Preview makes those pieces explicit. The first version does this through local TOML metadata. The longer-term product can reopen established component-system adapters later, but the active builder path is local metadata, saved variants, groups, and pages.

## The Core Idea

Instead of manually building every preview by hand, the user describes UI pieces as source records:

- what components exist
- what props they support
- what states matter
- what themes exist
- which components belong together in a named area
- which source record a component came from
- which page or layout uses those pieces

The app then renders those definitions and lets the user inspect them. The current TOML model is the active adapter. Future external adapters should be added only when their source records, provenance rules, and preview boundaries are deliberately scoped.

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

- keep local TOML as the explicit active source, with later adapters added only through refreshed scope
- choose components from any active source
- compose groups and pages from those components
- preserve source provenance for every component
- preview, verify, screenshot, and compare the result

The builder should grow from the deterministic lab bench rather than bypass it. That means components, page layouts, and generated outputs need explicit records the app can inspect and verify.

## What Still Needs Guardrails

Theme Preview should not become a Figma replacement or prompt-only generative designer. Page building is now part of the product direction, but it should be built through components, props, layouts, themes, and source records that remain visible and editable.

## Why Deterministic First

The first version favors deterministic behavior because it should be explainable.

If a group fails validation, the app can say exactly why:

- unsupported layout
- missing component
- missing state
- duplicate role
- empty role

Later, embeddings or AI-assisted search can help navigate a large catalog. They should help select and compare components; they should not replace the underlying component, adapter, group, page, and theme definitions.
