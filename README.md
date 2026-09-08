# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Current development status

Phase 1 establishes the plugin foundation.

- **Sprint 1.1:** TypeScript/esbuild development environment
- **Sprint 1.2:** maintainable plugin architecture

The active Sprint 1.2 branch is:

```text
phase-1-sprint-1-2-plugin-architecture
```

## Install in the test vault

Clone or place this repository at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

Switch to the active branch and install dependencies:

```bash
git fetch origin
git checkout phase-1-sprint-1-2-plugin-architecture
npm install
```

## Development workflow

Start esbuild in watch mode:

```bash
npm run dev
```

Changes under `src/` rebuild `main.js` automatically.

Run a production build with TypeScript validation:

```bash
npm run build
```

## Verify in Obsidian

Reload Obsidian and enable **OnProgram** under **Settings → Community plugins**.

The Command Palette should include:

- **OnProgram: Test OnProgram**
- **OnProgram: Show diagnostics**

OnProgram also has a settings tab with:

- **Debug mode** — enables verbose developer-console logging
- **Show startup notice** — controls the load notification

## Architecture

```text
src/
├── commands/
│   └── CommandRegistrar.ts
├── core/
│   ├── ErrorHandler.ts
│   ├── EventManager.ts
│   └── LifecycleManager.ts
├── services/
│   ├── RuntimeService.ts
│   └── ServiceRegistry.ts
├── settings/
│   ├── OnProgramSettings.ts
│   └── OnProgramSettingTab.ts
├── utils/
│   └── Logger.ts
└── main.ts
```

`src/main.ts` is intentionally a thin composition root. Feature code should be added behind commands, services, views, models, or other focused modules instead of accumulating in the plugin entry point.

### Architecture rules

1. Markdown files remain the future source of truth for work items.
2. Services are registered through `ServiceRegistry` and own their lifecycle.
3. Obsidian event subscriptions are registered through the plugin so Obsidian can clean them up safely.
4. Commands are registered centrally through `CommandRegistrar`.
5. User-facing failures go through `ErrorHandler` and diagnostics go through `Logger`.
6. Plugin-owned CSS classes use the `onprogram-` prefix.
7. Debug logging is disabled by default and controlled from OnProgram settings.

## Sprint 1.2 completion criteria

Sprint 1.2 is complete when:

1. plugin startup and shutdown are represented by a lifecycle manager;
2. commands have a central registration layer;
3. settings persist through Obsidian's plugin data storage;
4. logging and error handling are centralized;
5. services have a registry and lifecycle contract;
6. core Obsidian event subscriptions are centrally registered and automatically cleaned up;
7. OnProgram has a reserved CSS namespace;
8. debug mode can be enabled from plugin settings;
9. the plugin still builds and loads successfully in Obsidian.
