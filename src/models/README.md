# Models

Domain models live here and should remain independent from Obsidian view code.

`work-item/` defines the canonical contracts for tasks, projects, milestones, and events: types, statuses, priority semantics, dates, property mappings, schemas, and shared work-item interfaces.

`publishing/` defines platform distribution state without coupling publishing metadata to Calendar placement.

Services and views should reuse these model contracts instead of duplicating frontmatter assumptions.
