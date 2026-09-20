# Views

Obsidian-facing Dashboard, Board, Calendar, Timeline, Projects, and Inspector views live here.

Views own presentation and interaction. Persistence should flow through services such as `WorkItemWriter`, creation services, project services, and linked-instance storage rather than ad-hoc frontmatter writes in view code.

Large style constants should live in dedicated style modules so view classes remain focused on behavior.
