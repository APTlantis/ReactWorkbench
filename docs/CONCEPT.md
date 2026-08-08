# Concept

Theme Preview is a component exploration studio.

Most UI work has a hidden problem: the important pieces are scattered. A component has props, states, themes, layout expectations, accessibility concerns, documentation, and examples. Those details usually live in separate places, so checking a simple question can become surprisingly repetitive.

Theme Preview makes those pieces explicit.

## The Core Idea

Instead of manually building every preview by hand, the user describes UI pieces as metadata:

- what components exist
- what props they support
- what states matter
- what themes exist
- which components belong together in a named area

The app then renders those definitions and lets the user inspect them.

This is useful even for someone who knows UI well. Knowing how to build a thing is different from wanting to rebuild it every time just to check one visual combination.

## What A Group Means

A group is a named area of UI made from known component states.

Examples:

- settings row
- dashboard summary
- danger zone
- toolbar
- dialog footer
- table controls

The user decides what belongs in the group. The app checks whether the referenced components and states exist, then previews the group under the active theme.

## What The App Is Not

Theme Preview is not currently:

- a full page builder
- a Figma replacement
- a generative AI designer
- a drag-and-drop layout editor

Those are different products. This app is closer to a lab bench for component systems.

## Why Deterministic First

The first version favors deterministic behavior because it should be explainable.

If a group fails validation, the app can say exactly why:

- unsupported layout
- missing component
- missing state
- duplicate role
- empty role

Later, embeddings or AI-assisted search can help navigate a large catalog, but the underlying component and group definitions should remain inspectable and predictable.
