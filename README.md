# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Current development status

Phase 1, Sprint 1.1 establishes the TypeScript/esbuild development foundation while preserving the original Phase 0 registration test.

## Install in the test vault

Clone or place this repository at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

Then switch to the active Sprint 1.1 branch:

```bash
git fetch origin
git checkout phase-1-sprint-1-milestone-1
```

Install development dependencies:

```bash
npm install
```

## Development workflow

Start esbuild in watch mode:

```bash
npm run dev
```

Changes under `src/` will rebuild `main.js` automatically.

For a production build with TypeScript validation and minified output:

```bash
npm run build
```

## Verify in Obsidian

Restart or reload Obsidian, then go to:

**Settings → Community plugins**

Enable **OnProgram**.

When the plugin loads, Obsidian should show:

> OnProgram loaded

Open the Command Palette and run:

**OnProgram: Test OnProgram**

You should see:

> OnProgram is working!

## Development structure

```text
OnProgram/
├── src/
│   └── main.ts
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── versions.json
├── styles.css
├── README.md
└── main.js
```

- `src/main.ts` — TypeScript source entry point
- `main.js` — Obsidian-loadable build output
- `esbuild.config.mjs` — development watch and production bundling configuration
- `tsconfig.json` — strict TypeScript configuration
- `versions.json` — plugin-version to minimum-Obsidian-version compatibility map

## Sprint 1.1 completion criteria

Sprint 1.1 is complete when:

1. `npm install` installs the Obsidian API and build dependencies.
2. `npm run dev` watches `src/main.ts` and rebuilds `main.js`.
3. `npm run build` type-checks and creates the production `main.js` bundle.
4. Obsidian can load the resulting plugin and the test command still works.
