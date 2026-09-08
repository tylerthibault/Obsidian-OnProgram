# Models

Domain models live here and remain independent from Obsidian view code.

## Work items

`work-item/` contains the canonical OnProgram work-item contract for Tasks, Projects, Milestones, and Events, including:

- canonical types
- canonical statuses
- priority semantics
- date semantics
- property-name mapping contract
- required versus optional fields
- shared WorkItem interfaces

Views and services should import the public model API from `work-item/index.ts` rather than duplicating frontmatter assumptions.

The human-readable schema specification lives at `docs/work-item-schema.md`.
