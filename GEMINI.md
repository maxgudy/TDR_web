---
title: Repository Guidelines
---

# Repository Guidelines

## Project Structure & Module Organization
- `index.html` hosts the single-page interface with sidebar navigation, the professor dashboard, and chat placeholders.
- `/css/styles.css` contains the shared layout, theme toggles, and component styles (forms, tables, grade history).
- `/js/` holds the client logic: `main.js` controls navigation/theme, `agents.js` wraps the webhook/chat interactions, `professorat.js` contains all Supabase CRUD flows, and the supplementary modules (`dashboard.js`, `student-forms.js`, `supabase-config.js`) provide visual helpers, form wiring, and the Supabase initializer.
- `assets/` stores static resources (fonts/icons). SQL scripts (`supabase_migration.sql`, `supabase_rls_setup.sql`, `supabase_update_notes_to_grades.sql`) describe the database schema and RLS policies.
- Markdown docs (`Professorat_spec.md`, `README.md`, etc.) capture specs/setup details. Add new front-end changes directly to the matching HTML/JS/CSS files and keep SQL scripts in sync with Supabase migrations.

## Build, Test, and Development Commands
- `python -m http.server 5173` – serves the static files on `http://localhost:5173` so you can interact with the UI and chat flows.
- `npx live-server --open=index.html` (optional) – auto-refreshing local server is helpful when tweaking CSS/JS.
- There is no build step; changes are consumed directly by the browser. Always refresh the page and clear caches after updating Supabase keys or helpers.

## Coding Style & Naming Conventions
- JavaScript uses 4-space indentation, camelCase for identifiers, and descriptive helper prefixes (e.g., `loadStudents`, `updateHomeworkStatus`). Prefer `const` and `let`; avoid globals unless intentionally exported via `window.*`.
- CSS follows BEM-like naming for components (`.grade-item`, `.students-table-container`). Keep selectors specific to prevent bleeding into the shared layout; light/dark theme toggles rely on `body.dark-mode`.
- HTML uses semantic sections (panels, headers, forms) and minimal inline styles; introduce classes in the stylesheet when repeating patterns.
- No automated linter is configured; rely on consistent spacing, line breaks, and comments when the intent is non-trivial.

## Testing Guidelines
- There is no automated test suite. Validate changes manually by running the static server and exercising the relevant UI (students list, grade creation/edit, Supabase CRUD flows).
- When touching Supabase interactions, test against the actual project to confirm migrations and policies behave as expected.

## Commit & Pull Request Guidelines
- Follow concise, descriptive commits (e.g., `Add edit/delete for grades`, `Hide student search when creating entries`). Include context if you touched Supabase schemas or added assets.
- Pull requests should summarize user-visible changes, list any Supabase updates, and mention manual verification steps. Attach screenshots for UI tweaks and link related issues or Specs (like `Professorat_spec.md`) when applicable.

## Security & Configuration Tips
- Supabase anon key lives in `supabase-config.js`; never commit service-role keys. If you regenerate keys, update both the front-end file and any n8n workflows that rely on them.
- The project assumes permissive RLS policies, so keep production credentials separated and consider routing sensitive requests through n8n to avoid exposing keys in the browser.
