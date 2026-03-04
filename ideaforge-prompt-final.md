# IdeaForge — Claude Code Prompt (Final)

You are helping design and build **IdeaForge** — a self-hosted idea capture and progression system.

This is a personal tool, not enterprise software.
Think like an experienced builder optimizing for clarity, simplicity, and long-term durability.

Before writing code, outline a clear, practical plan. Then build incrementally.

---

## Core Concept

A personal idea system where:

- Ideas are captured quickly (text or voice) from any device
- Each idea is stored as a standalone `.md` file with YAML frontmatter in a flat folder
- AI (Claude API) auto-categorizes new ideas using a dynamic, user-revisable taxonomy
- Ideas progress through lifecycle stages from raw capture → refinement → decision (pursue or shelve)
- The system is accessed via a PWA served locally and reachable anywhere via Tailscale

Speed of capture is the highest UX priority.

---

## Explicit Non-Goals

This tool will NOT:

- Become a task manager
- Replace Obsidian/Notion
- Support multiple users
- Require authentication beyond Tailscale
- Use a database

If a feature pushes toward SaaS complexity, reconsider it.

---

## Architecture Constraints

### Data Layer

- Flat directory of `.md` files
- YAML frontmatter for all metadata
- Files must remain human-readable and editable in any markdown editor
- Target scale: up to 10,000 ideas without noticeable performance degradation
- The flat folder should work cleanly as a git repo for version history

### Server

- Lightweight self-hosted runtime (Linux or macOS)
- Recommend best runtime and justify it
- Keep operational complexity low
- `.md` files are the source of truth — if the server dies, all data remains as readable files

### Frontend

- PWA that works on desktop + mobile browsers
- Installable on iOS/Android home screens
- Capture flow should allow idea recording in under 5 seconds

### Watch & Quick-Capture

A full PWA on Apple Watch is not realistic. Propose a pragmatic alternative for ultra-fast capture from a watch or locked phone — for example:

- An Apple Shortcut that hits a simple API endpoint
- Siri integration via Shortcut
- A minimal POST endpoint designed for automation

The goal is: I have an idea while walking, I can record it in seconds without unlocking my phone or opening a browser.

### Network & Security

- Accessible only via Tailscale
- No public exposure
- API keys stored server-side
- Assume single trusted user environment

### AI Integration

- Claude API used for:
  - Auto-categorization against the current taxonomy
  - Optional tag suggestion or summarization
- **AI failure must NEVER block capture**
- If AI is unavailable:
  - Idea still saves immediately
  - Category defaults to "Unsorted"
  - Categorization retries later or is handled in review
- Be mindful of API cost — avoid unnecessary calls, consider batching or caching strategies where sensible

### Voice Input

- Use browser Web Speech API for MVP
- If voice recognition fails, user falls back to text immediately — no dead ends
- No external transcription service needed for MVP

---

## Data Model

Each idea is a `.md` file in a single flat directory.

YAML frontmatter must include at minimum:

- Unique ID (suggest a format)
- Title
- Created timestamp
- Updated timestamp
- Category (AI-assigned, user-editable)
- Stage (lifecycle position)
- Tags (optional, freeform)
- Source (how it was captured: voice, typed, watch-shortcut, etc.)

Also design:

- A `categories.yaml` file defining the current taxonomy. This taxonomy is dynamic — categories will be added, renamed, merged, and retired over time. When the taxonomy changes, existing ideas must not break.
- A clear convention for what belongs in frontmatter vs. the markdown body

Keep the schema minimal but future-safe.

---

## Idea Lifecycle

Captured → Clarified → Evaluated → Decided

For each stage define:

- Expected metadata at that stage
- Allowed transitions
- What the UI emphasizes at that stage
- What changes (if any) happen automatically

Keep the lifecycle lightweight — avoid bureaucracy. Not every idea needs to pass through every stage.

---

## Phased Plan

### Phase 1 — Architecture & Tech Stack

Output:
- High-level system diagram (text-based is fine)
- Runtime recommendation with reasoning
- Request flow: capture → save → optional AI categorization → update file
- Watch/Shortcut capture design

Validation:
- Can we describe exactly what happens when a new idea is submitted from each surface (browser, phone, watch)?
- Is the capture path fully independent from AI availability?

---

### Phase 2 — Data Model & File Structure

Output:
- Complete YAML frontmatter schema
- 3–4 example `.md` files at different lifecycle stages
- Example `categories.yaml`
- File naming convention

Validation:
- Can a markdown editor open and modify ideas without breaking anything?
- Would git diffs be clean and readable?
- If I rename a category in `categories.yaml`, do existing files still work?

---

### Phase 3 — Implementation Plan (4–6 Milestones)

Output:
- Incremental milestones, each producing something runnable
- Milestone 1 must be the minimum viable capture loop

Validation:
- After milestone 1, can I capture and save ideas?
- After milestone 2, can I view and browse them?
- After milestone 3, does AI categorization work?
- At no point should the system depend on unfinished parts

---

### Phase 4 — MVP Build

Output:
- Working server + PWA
- Text capture working
- Voice capture working (or gracefully degrading)
- AI categorization working but non-blocking

Validation:
- Can I capture an idea from my phone in under 5 seconds?
- Does the system still work if the Claude API key is removed?
- Are the saved `.md` files clean, readable, and git-friendly?

---

## Design Principles

- Capture > refinement
- Simplicity > cleverness
- Markdown durability > feature richness
- AI augments, never controls
- Avoid premature abstraction
- Make decisions that do not block future extension, but do not design for plugins or SaaS-scale

---

Think like a pragmatic solo builder creating a tool you will use daily.

Propose clean solutions. Avoid unnecessary ceremony.
