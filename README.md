# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Phase 1: Plugin registration

The current version is intentionally minimal. It exists to confirm that Obsidian can discover, enable, and load the plugin successfully.

### Install in the test vault

Clone or place this repository at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

If you already cloned the repository, pull the latest changes:

```bash
git pull origin main
```

Then restart Obsidian or reload the app.

Go to:

**Settings → Community plugins**

Enable **OnProgram**.

When the plugin loads, Obsidian should show the notice:

> OnProgram loaded

Then open the Command Palette and run:

**OnProgram: Test OnProgram**

You should see:

> OnProgram is working!

## Current files

- `manifest.json` — Obsidian plugin metadata
- `main.js` — minimal plugin entry point used for Phase 1 registration testing

## Next phase

Once registration is confirmed, the repository will be converted to a TypeScript/esbuild development setup before implementing OnProgram's task model and Bases-powered views.
