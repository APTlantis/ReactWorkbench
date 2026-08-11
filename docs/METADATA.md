# Metadata Guide

Theme Preview uses TOML files as the source of truth.

The app currently understands three metadata types:

- components
- themes
- groups
- sources

DuckDB is only a derived catalog. If there is a disagreement, the TOML files win.

## Components

Component files live in:

```text
metadata/components
```

A component defines:

- identity: id, name, description
- framework targets: React now, Svelte later
- props: enum, boolean, text, number
- named states: reusable prop combinations
- supported themes

Named states are important because groups can reference them directly. A group does not need to repeat every prop value; it can say "use the Button danger loading state" or "use the Input invalid state."

## Themes

Theme files live in:

```text
metadata/themes
```

A theme defines token values:

- colors
- spacing
- radii
- typography

The preview surface reads those tokens and applies them to components and groups.

## Groups

Group files live in:

```text
metadata/groups
```

A group defines:

- name
- description
- layout: `row`, `grid`, `stack`, `toolbar`, `form-row`, `dialog-footer`, or `table-header`
- supported themes
- items

Each item references:

- a component id
- a named state from that component
- a role label explaining what that item does in the area

Example:

```toml
[group]
id = "danger-zone"
name = "Danger Zone"
description = "A destructive action area with warning context and an explicit loading state."
layout = "stack"
themes = ["light", "dark", "aurora"]

[[items]]
component = "badge"
state = "soft-danger"
role = "Warning"

[[items]]
component = "card"
state = "compact-warning"
role = "Context"

[[items]]
component = "button"
state = "danger-loading"
role = "Destructive Action"
```

### Duplicate Structures

Duplicate group detection uses a structural signature made from:

- the group layout
- each item component id
- each item state id
- the item order

Names, descriptions, roles, and theme lists do not affect the signature. This means two groups are considered structurally similar when they use the same layout and the same ordered component-state sequence, even if they describe different product areas.

For example, `settings-row.toml` and `settings-review-row.toml` intentionally share this signature:

```text
row|badge:soft-info|card:compact-warning|button:secondary-disabled
```

That seeded pair keeps duplicate badges, duplicate-only board filtering, similar-group inspector copy, jump targets, and verification output covered by real metadata.

## Validation

Groups are checked before saving.

The app reports:

- unsupported layout
- missing component
- missing state
- duplicate role
- empty role label

Blocking errors prevent saving. Warnings can be reviewed while keeping the workflow moving.

## Sources

Source files live in:

```text
metadata/sources
```

A source defines where component catalog material comes from:

- `id`
- `name`
- `description`
- `adapter`
- `kind`
- `location`
- `enabled`

The current adapters are:

- `local-toml`: indexes this project’s component, group, and theme TOML.
- `shadcn`: indexes a local shadcn-style registry or component directory.

For shadcn sources, `location` can point at a local directory with a root `registry.json`. If no registry is present, the adapter scans `components/ui/*.tsx` as a partial catalog. The imported entries keep file paths, dependencies, source location, and preview status so they can be inspected before any future materialization step.
