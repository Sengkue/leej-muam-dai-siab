## Quick orientation for AI coding agents

This is a small, static front-end photo gallery. The goal of this file is to give an AI agent just enough, concrete, and repo-specific context to be productive quickly.

1) Big picture
- Type: Static front-end (single-page gallery) built with Tailwind CSS and vanilla JavaScript.
- Entry: `index.html` loads `script.js` and uses Tailwind via CDN. `styles.css` contains additional custom styles.
- Runtime: No build step required — files are served as static assets. README states "No build process needed." (confirm before changing that).

2) Major components & data flow
- `index.html` — DOM, custom classes (`.line-clamp-2`, `.card-shimmer`, `.image-loading`, `.btn-ripple`) and modal markup.
- `script.js` — app logic. Key responsibilities:
  - API interaction: constants at top — `API_BASE_URL` and `IMAGE_BASE_URL`.
  - Paging: `fetchData(page, append)` fetches JSON from `${API_BASE_URL}/${page}/0`.
  - Rendering: `renderPosts()` + `createImageCarousel()` build DOM strings inserted into `#postsContainer`.
  - Performance: image lazy-loading via IntersectionObserver (`initImageObserver()`), `imageCache`, and `preloadQueue`.
  - Modal: `openImageModal`, `preloadAdjacentImages`, keyboard navigation (←, →, Esc).

3) Integration points & external dependencies
- External services:
  - API: `API_BASE_URL` (production endpoint in `script.js`). If that API is unavailable, the page will show errors via `showError()`.
  - Image CDN: `IMAGE_BASE_URL` and full-size path (`/full/1080/`) are used to construct URLs.
  - Fonts/icons: Google Fonts and Font Awesome are loaded via CDN links in `index.html`.

4) Project-specific conventions and patterns
- No bundler: code assumes files are deployed as-is. Avoid introducing a build-only change unless you add accompanying docs (e.g., package.json).
- Inline Tailwind config: `index.html` sets `tailwind.config` for custom animations. Prefer editing `index.html`'s script-block when adjusting Tailwind tokens for this project.
- DOM-first rendering: `script.js` returns HTML strings (not framework components). Edits should preserve the string templates and their escaping patterns (note `escapedDescription` in `createImageCarousel`).
- Image URL transforms: small -> full images use string replace: `imageUrl.replace('/square/450/', '/full/1080/')`. Keep this pattern consistent when changing image-size logic.

5) Developer workflows (what actually works today)
- Run locally: open `index.html` in a browser (file:// or a simple static server). Many features require access to `API_BASE_URL` so using a local proxy or mock server is useful for offline testing.
- Git push: `push.bat` automates add/commit/push on Windows (cmd). It sets a time-stamped commit message. Use it if you want a quick commit+push flow.
- Deployment: README says "Upload both files to your server" — in practice, deploy the full repo root as static files.

6) Debugging and common edits the agent may make
- If API fails: update `API_BASE_URL` in `script.js` to point to a local mock JSON or modify `fetchData` to return a small fixture for testing.
- To test lazy-loading logic: add `console.log` in `initImageObserver` callback or temporarily lower `rootMargin`/threshold.
- When editing templates: beware of single-quote escaping. `createImageCarousel()` escapes single quotes and newlines for inline onclick handlers — maintain that escaping to avoid XSS or broken JS.

7) Tests / Linting
- There are no tests or linters configured. Small, low-risk PRs should include manual verification steps in the PR description (open `index.html`, verify gallery loads, modal works, keyboard nav).

8) Files to open first when working on a task
- `script.js` — app logic, first stop for bugs or feature changes.
- `index.html` — Tailwind config, markup, and custom CSS classes used in JS templates.
- `styles.css` — extra styling and utility classes referenced from HTML/JS.
- `README.md` — project overview and claims about performance and deployment.
- `push.bat` — quick Windows commit/push helper.

9) Examples / snippets (safe, minimal)
- Where to change API endpoint (quick test):
  - In `script.js` change the top `API_BASE_URL` to a local stub (e.g., `http://localhost:3000/page`) or to a JSON file for offline testing.

10) Constraints & cautions for the agent
- Do not assume a Node-based build pipeline exists — adding one requires updating README and adding build files.
- Avoid heavy refactors that introduce a dev-server or bundler without the user's consent.
- Keep edits small and verifiable: open `index.html` after changes and verify main flows (list render, modal open, image lazy load).

---

If any section is unclear or you'd like more detail (example mock JSON for local testing, or a suggested `package.json` + dev server), tell me which area to expand and I will iterate.
