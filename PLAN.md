# IdeaForge — Implementation Plan

## Tech Stack

- **Runtime:** Bun (fast startup, native TS, built-in bundler)
- **Server:** Hono (lightweight, Bun-native)
- **Frontend:** Preact (3KB, hooks-compatible)
- **Data:** Flat `.md` files with YAML frontmatter (gray-matter)
- **IDs:** ULID (sortable, unique)
- **AI:** Claude API (server-side, non-blocking)

---

## Milestone 1 — Minimum Viable Capture Loop ✅

> Goal: Capture and save ideas from the PWA. Nothing else.

| # | Task | Status |
|---|------|--------|
| 1.1 | Data model & types (Stage, Source, Idea, frontmatter schema) | ✅ Done |
| 1.2 | File service (read/write/delete `.md` files with gray-matter) | ✅ Done |
| 1.3 | In-memory index service (search, filter, sort, paginate) | ✅ Done |
| 1.4 | Idea service (CRUD + quick capture) | ✅ Done |
| 1.5 | Hono API routes (`POST /api/ideas`, `POST /api/ideas/quick`, `GET/PUT/DELETE`) | ✅ Done |
| 1.6 | Health check endpoint | ✅ Done |
| 1.7 | `categories.yaml` with starter taxonomy | ✅ Done |
| 1.8 | Preact client shell (`App`, `CaptureInput`, `IdeaList`, `IdeaCard`) | ✅ Done |
| 1.9 | PWA manifest + dark theme CSS | ✅ Done |
| 1.10 | Static file serving from Hono | ✅ Done |

**Validated:**
- ✅ Health endpoint returns status
- ✅ Create idea via API → saves `.md` file with clean YAML frontmatter
- ✅ Quick capture splits title/body from raw text
- ✅ List/get/update/delete all work
- ✅ Search and stage filtering work
- ✅ Empty title rejected (400)
- ✅ HTML/CSS/JS served correctly
- ✅ Markdown files are human-readable, git-friendly
- ✅ TypeScript checks pass (`tsc --noEmit`)
- ✅ Client bundle builds (27KB)

---

## Milestone 2 — Browse, View & Edit ✅

> Goal: View idea details, edit inline, manage lifecycle stages.

| # | Task | Status |
|---|------|--------|
| 2.1 | Idea detail view (click card → full view with body) | ✅ Done |
| 2.2 | Inline editing (title, body, tags) | ✅ Done |
| 2.3 | Stage progression UI (captured → clarified → evaluated → decided) | ✅ Done |
| 2.4 | Category display & manual reassignment (+ categories API) | ✅ Done |
| 2.5 | Delete idea from UI (with confirmation) | ✅ Done |
| 2.6 | Filter/sort controls in idea list (by stage, category, search) | ✅ Done |
| 2.7 | Decision selector (pursue/shelve/merge/drop) when stage = decided | ✅ Done |

**Validated:**
- ✅ Categories API returns full taxonomy from `categories.yaml`
- ✅ Create → detail view → edit → save round-trip works
- ✅ Stage progression updates file and index
- ✅ Category reassignment persists to `.md` file
- ✅ Delete with confirmation removes file and index entry
- ✅ Search, stage filter, and category filter all work
- ✅ TypeScript checks pass
- ✅ Client bundle builds (43KB)

---

## Milestone 3 — Voice Capture ✅

> Goal: Capture ideas by voice using browser Web Speech API.

| # | Task | Status |
|---|------|--------|
| 3.1 | Voice capture hook (`useVoiceCapture`) using Web Speech API | ✅ Done |
| 3.2 | Mic button in capture form with recording state indicator | ✅ Done |
| 3.3 | Graceful fallback — if speech fails, keep text input active | ✅ Done |
| 3.4 | Set `source: "voice"` on voice-captured ideas | ✅ Done |

**Validated:**
- ✅ Mic button hidden when Web Speech API not supported (graceful degradation)
- ✅ Pulsing recording indicator while listening
- ✅ Transcript populates title field, user can edit before submitting
- ✅ Voice errors shown inline, text input stays functional
- ✅ `source: "voice"` set on voice-captured ideas, reverts to `"pwa"` if user types
- ✅ TypeScript checks pass
- ✅ Client bundle builds (46KB)

---

## Milestone 4 — AI Categorization (Claude API) ✅

> Goal: Auto-categorize new ideas using Claude, non-blocking.

| # | Task | Status |
|---|------|--------|
| 4.1 | Claude API service (send idea + taxonomy → get category + tags) | ✅ Done |
| 4.2 | Background categorization — save idea first, categorize async | ✅ Done |
| 4.3 | Update `.md` file with AI result, set `ai_status` field | ✅ Done |
| 4.4 | Retry logic for failed/pending categorizations on startup | ✅ Done |
| 4.5 | UI indicator for AI status (pending/failed badges on cards) | ✅ Done |
| 4.6 | Cost guard — skip if user already categorized or ai_status=done | ✅ Done |

**Validated:**
- ✅ Without API key: ideas save normally, `ai_status: "none"`, no crash
- ✅ With API key: fires background categorization after save (non-blocking)
- ✅ AI result updates category (only if still "Unsorted") and merges tags
- ✅ On startup, retries any ideas with `ai_status` = none/pending/failed
- ✅ Uses Claude Haiku 4.5 for cost efficiency (~150 tokens per call)
- ✅ AI status badges (pending/failed) shown on idea cards
- ✅ TypeScript checks pass
- ✅ Client bundle builds (47KB)
- Note: Full E2E test requires adding `CLAUDE_API_KEY` to `.env`

---

## Milestone 5 — Watch & Shortcut Capture ✅

> Goal: Capture ideas from Apple Watch / locked phone via Siri/Shortcuts.

| # | Task | Status |
|---|------|--------|
| 5.1 | Quick capture accepts JSON and plain text bodies | ✅ Done |
| 5.2 | Lean response format for Shortcuts (`{ok, id, title}`) | ✅ Done |
| 5.3 | SHORTCUTS.md — 3 shortcut recipes (text, voice, share sheet) | ✅ Done |
| 5.4 | Siri dictation → Shortcut → API flow documented | ✅ Done |
| 5.5 | Tips: Back Tap, Action Button, Watch complications | ✅ Done |

**Validated:**
- ✅ JSON body: `{"text": "...", "source": "shortcut"}` → `{"ok": true, "id": "...", "title": "..."}`
- ✅ Plain text body: raw text → same lean response
- ✅ Empty text rejected: `{"ok": false, "error": "Text is required"}`
- ✅ TypeScript checks pass

---

## Milestone 6 — PWA Polish & Installability ✅

> Goal: Installable on home screen, offline-resilient, production-ready.

| # | Task | Status |
|---|------|--------|
| 6.1 | Service worker (cache app shell, queue captures when offline) | ✅ Done |
| 6.2 | PWA icons (192px + 512px) | ✅ Done |
| 6.3 | Apple touch icon + splash screens | ✅ Done |
| 6.4 | Offline capture queue (save locally, sync when back online) | ✅ Done |
| 6.5 | Build script fix (`bun` not in PATH for npm scripts) | ✅ Done |
| 6.6 | Production start script / process manager guidance | ✅ Done |

**Validated:**
- ✅ Service worker registers and caches app shell (/, index.html, app.js, global.css, manifest.json)
- ✅ Cache-first strategy for shell, network-only for API calls
- ✅ PWA icons generated (192px + 512px solid purple PNGs via scripts/generate-icons.ts)
- ✅ Apple touch icon link added to index.html
- ✅ Offline capture queue stores ideas in localStorage, syncs on reconnect
- ✅ Auto-sync triggered on "online" event and SW TRIGGER_SYNC message
- ✅ Build scripts use `$HOME/.bun/bin/bun` to work without bun in PATH
- ✅ TypeScript checks pass
- ✅ Client bundle builds (49KB)

---

## Architecture Reference

```
Browser/Phone/Watch
       │
       ▼
  POST /api/ideas/quick  ←── Apple Shortcut / Siri
  POST /api/ideas        ←── PWA capture form
  GET  /api/ideas        ←── PWA idea list
       │
       ▼
  ┌─────────────┐
  │  Hono Server │ (Bun runtime, port 3000)
  │  ┌─────────┐ │
  │  │ Routes  │ │──→ idea-service ──→ file-service ──→ ./ideas/*.md
  │  └─────────┘ │            │
  │              │            └──→ index-service (in-memory)
  │              │
  │  ┌─────────┐ │
  │  │ Static  │ │──→ ./src/client/ (HTML, JS, CSS, manifest)
  │  └─────────┘ │
  └─────────────┘
       │ (async, non-blocking)
       ▼
  Claude API ──→ categorize ──→ update .md file
```

**Idea Lifecycle:**
```
Captured → Clarified → Evaluated → Decided
                                      │
                                      ├── pursue
                                      ├── shelve
                                      ├── merge
                                      └── drop
```

**File format:**
```yaml
---
id: 01KJRWPTTX49AKRDGVDMMKK6RP
title: Quick idea from a walk
created: '2026-03-03T03:43:44.477Z'
updated: '2026-03-03T03:43:44.477Z'
stage: captured
category: Unsorted
tags: []
source: shortcut
ai_status: none
decision: null
score: null
---

Optional body text with more details...
```
