# Repository Guidelines

## Project Structure & Module Organization
- index.html is the single-page shell that renders the sidebar navigation, the chat header, and placeholder containers for each agent page. All dynamic UI for the “Agent Professors” flow is bootstrapped from here.
- /css/styles.css holds the global light/dark theme rules, layout helpers (sidebar, header, chat bubble), and component styles used across the dashboard and chat experience.
- /js/ contains the behavioral layers: main.js wires navigation, theme toggling, and page lifecycle events; gents.js routes chat messages to n8n webhooks; professorat.js encapsulates the Supabase-backed classroom CRUD flows; student-forms.js packages the standalone form handling and SQL builders; supporting files such as dashboard.js and supabase-config.js provide utility scaffolding.
- Static assets (fonts, icons) live under /assets, and Supabase schema/RLS SQL lives in the root (supabase_migration.sql, etc.). Professorat_spec.md documents the intended UX and data model.

## Build, Test, and Development Commands
- python -m http.server 5173 serves the site over HTTP so you can manually exercise the navigation, chat boxes, and Supabase-backed professor module.
- 
px live-server --open=index.html or another auto-reloading static server speeds up frontend tweaks by refreshing the browser after each save.
- There is no build step; refresh your browser and clear cache whenever you change CSS/JS or swap Supabase credentials.

## Coding Style & Naming Conventions
- JavaScript uses 4-space indentation, camelCase identifiers, and descriptive helpers (loadStudents, handleCreateGrade). Prefer const/let; avoid polluting globals except when exposing helpers via window.* for templated markup.
- CSS targets scoped class names (e.g., .chat-container, .form-feedback) and leverages ody.dark-mode for theme variants. Keep selectors specific so the shared styles.css stays composable.
- HTML markup should rely on semantic containers anchored by IDs used in the JS modules (e.g., #classSelector, #form-note).

## Testing Guidelines
- There is no automated test suite—validate changes manually by running the static server and ensuring the chat, class selector, and Supabase CRUD flows behave.
- When touching Supabase interactions, test against the real project so you can observe console logs and Supabase responses (the Supabase client is initialized in supabase-config.js).

## Commit & Pull Request Guidelines
- Keep commit messages descriptive and in the present tense (see git history: “Change header from H1 to H3”, “Tot centralitzat”). Mention Supabase or modal tweaks when relevant.
- Pull requests should explain user-visible UI updates, note any database or Supabase work, and list manual verification steps. Include screenshots for layout changes and link related docs such as Professorat_spec.md.

## Security & Configuration Tips
- Supabase credentials are centralized in js/supabase-config.js; do not expose service-role keys in the browser outside of secure contexts.
- Any Supabase key rotation must be synchronized with the webhook flows and n8n workflows. Keep production and prototype keys separate.
