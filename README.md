# IdeaForge

Self-hosted idea capture and progression system. Capture ideas from your phone, watch, or desktop — via text, voice, or Siri Shortcuts — and move them through a structured lifecycle.

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)

## Setup

```bash
# Install dependencies
bun install

# Build the client bundle
bun run build

# Generate PWA icons (placeholder purple squares)
bun scripts/generate-icons.ts
```

## Configuration

Copy or edit `.env` in the project root:

```env
PORT=3000
IDEAS_DIR=./ideas
# CLAUDE_API_KEY=sk-ant-...  (optional — enables AI auto-categorization)
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `IDEAS_DIR` | `./ideas` | Directory where idea `.md` files are stored |
| `CLAUDE_API_KEY` | _(none)_ | Anthropic API key for AI categorization (optional) |

## Running

```bash
# Development (hot reload)
bun --hot src/server/index.ts

# Production
bun src/server/index.ts
```

Then open `http://localhost:3000` in your browser.

### Mobile / Phone Testing

Voice capture and PWA install require HTTPS. To test on your phone, create a temporary tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

This prints a public HTTPS URL (e.g. `https://random-words.trycloudflare.com`) — open it on your phone. No account needed.

Alternatively, if your phone is on the same Wi-Fi, find your Mac's IP with `ipconfig getifaddr en0` and visit `http://<ip>:3000` (note: voice and PWA won't work over plain HTTP).

## npm scripts

```bash
bun run dev          # Start with hot reload
bun run start        # Start normally
bun run build        # Build client bundle
bun run build:prod   # Build minified client bundle
bun run check        # TypeScript type check
bun run icons        # Regenerate PWA icons
```

## Capture Methods

- **PWA** — Open the app in a browser or install to home screen
- **Voice** — Tap the mic button to record (speaks through pauses). Transcript goes into the body; an AI-generated summary fills the title. Tap mic again to stop. Tap multiple times to append more.
- **Apple Shortcuts / Siri** — POST to `/api/ideas/quick` (see [SHORTCUTS.md](SHORTCUTS.md))

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ideas` | Create idea (`{title, body?, source?, category?, tags?}`) |
| `POST` | `/api/ideas/quick` | Quick capture (`{text, source?}` or plain text body) |
| `GET` | `/api/ideas` | List ideas (query: `stage`, `category`, `search`, `sort`, `order`, `limit`, `offset`) |
| `GET` | `/api/ideas/:id` | Get single idea |
| `PUT` | `/api/ideas/:id` | Update idea fields |
| `DELETE` | `/api/ideas/:id` | Delete idea |
| `POST` | `/api/ideas/summarize` | AI-summarize text into a title (`{text}`) |
| `GET` | `/api/categories` | Get category taxonomy |
| `GET` | `/api/health` | Health check |

## Idea Lifecycle

```
Captured → Clarified → Evaluated → Decided
                                      ├── pursue
                                      ├── shelve
                                      ├── merge
                                      └── drop
```

## Data Storage

Ideas are stored as Markdown files with YAML frontmatter in the `ideas/` directory:

```yaml
---
id: 01KJRWPTTX49AKRDGVDMMKK6RP
title: Quick idea from a walk
created: '2026-03-03T03:43:44.477Z'
updated: '2026-03-03T03:43:44.477Z'
stage: captured
category: Unsorted
tags: []
source: pwa
ai_status: none
decision: null
score: null
---

Optional body text with more details...
```

Files are human-readable, portable, and easy to version control with git.

## Project Structure

```
src/
  server/
    index.ts              # Server entry point
    routes/               # Hono route handlers
    services/             # Business logic (file, index, idea, AI, category)
    lib/                  # Types and config
  client/
    index.html            # App shell
    app.tsx               # Preact entry point
    components/           # UI components
    hooks/                # Custom hooks (voice, offline queue)
    styles/global.css     # Dark theme styles
    sw.js                 # Service worker
    manifest.json         # PWA manifest
ideas/                    # Idea storage (*.md files)
  categories.yaml         # Category taxonomy
scripts/
  generate-icons.ts       # PWA icon generator
```
