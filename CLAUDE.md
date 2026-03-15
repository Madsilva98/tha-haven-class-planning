# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```bash
npm install        # first time only
npm run dev        # starts everything at http://localhost:5173
```

There is no separate build step for development. Vite serves the React frontend and mounts the Express API as middleware in the same process — no second terminal needed.

To build for production:
```bash
npm run build
npm run preview
```

There are no tests.

## Architecture

**Single-file React app** — all UI lives in `src/App.jsx` (~2600+ lines). There are no separate component files or routing library. Navigation is handled by a `screen` state object `{ mode, cls, fromLibrary }` in the root `HavenInstructor` component.

**Backend** — `server/index.js` is an Express router injected into Vite's dev server via `vite.config.js`. It exposes three API groups:
- `GET/POST /api/data/:key` — read/write JSON files in `data/` (the persistence layer)
- `GET/POST/DELETE /api/video/:id` — store reference videos in `data/videos/`
- `POST /api/ai` — proxy to Anthropic Claude Sonnet (requires `ANTHROPIC_API_KEY` in `.env`)

**State & persistence** — The root component loads `series`, `classes`, and `aistyle` from disk on mount via `api.load()`, then auto-saves on every change via `useEffect`. There is no state management library; all state is plain `useState` passed down as props.

## Data model

- **Series** (`data/series.json`) — a movement/exercise block. Key fields: `id`, `name`, `type` (`signature`|`reformer`|`barre`), `springs`, `startPosition`, `movements[]`, `primaryZone`, `status`.
  - Each movement has: `timing`, `lyric`, `movement`, `breath`, `transitionCue`.
  - Signature series carry parallel `reformer` and `barre` movement columns inside `EditorSigTable`.
- **Classes** (`data/classes.json`) — a session with `id`, `name`, `type`, `date`, `seriesIds[]`.
- **AI Style** (`data/aistyle.json`) — free-text instructor style preferences, stored as `{ value: "..." }`, injected as system context into every AI prompt.
- **Examples** (`data/examples.json`) — few-shot learning store. Records generated vs. final cues (accepted or corrected) to improve future AI outputs. Managed by `examplesStore` in `App.jsx`.

## AI system

All AI calls share a single path: component → `POST /api/ai` → Anthropic API. The server reads `ANTHROPIC_API_KEY` from `.env`.

Four AI features, each as its own component:
- `IntroCue` — generates the verbal setup/intro for a series
- `CardCueGen` — generates per-movement transition cues
- `CardInstrNotesAI` — generates instructor coaching notes
- `MovementAnalysisChat` — free-form chat about a series

The `aistyle.json` value is passed as a system prompt prefix to all four. `examplesStore.getRelevant()` fetches recent accepted/corrected cues as few-shot examples appended to prompts.

## Brand / styling

All styles are inline. The brand palette is defined at the top of `App.jsx` in the `C` object (e.g. `C.crimson`, `C.cream`, `C.stone`). Fonts are Clash Display (headings) and Satoshi (body), loaded from Fontshare at runtime. There is no CSS file or utility class system.

## Brand & conventions

- Studio name is always **"The Haven"** — never just "Haven"
- Brand palette: burgundy `#721919`, peach `#FFB892`, cream `#FFFAF7`, dark `#292323`
- Typography: Clash Display (headings), Satoshi (body)
- "Instructors" is always capitalised
- All styles are inline via the `C` object in `App.jsx` — no CSS files or utility classes
- This is an internal tool for Instructors, not clients
