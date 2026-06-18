# IdeaForge

Self-hosted idea capture and progression system. Capture ideas from your phone, watch, or desktop — via text, voice, or Siri Shortcuts — and move them through a structured lifecycle.

Ideas are stored as plain Markdown files with YAML frontmatter — no database. Run it
locally with [Bun](https://bun.sh), or with [Docker](#run-with-docker) (optionally behind a
[Tailscale](#tailscale-reach-it-anywhere) sidecar for secure access from anywhere).

> **Two ways to run:** [Local (Bun)](#run-locally-bun) · [Docker](#run-with-docker)

## Run locally (Bun)

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)

### Setup

```bash
# Install dependencies
bun install

# Build the client bundle
bun run build

# Generate PWA icons (placeholder squares — optional)
bun scripts/generate-icons.ts
```

## Configuration

Copy [`.env.example`](.env.example) to `.env` and edit:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `IDEAS_DIR` | `./ideas` | Directory where idea `.md` files are stored (`/data` in Docker) |
| `CLAUDE_API_KEY` | _(none)_ | Anthropic API key for AI categorization (optional) |
| `TS_AUTHKEY` | _(none)_ | Tailscale auth key — enables the Docker [Tailscale sidecar](#tailscale-reach-it-anywhere) |
| `TS_HOSTNAME` | `ideaforge` | Hostname the app appears as on your tailnet |

On first start the app creates `IDEAS_DIR` if needed and seeds a default
`categories.yaml`, so a fresh checkout or empty volume just works.

### Run

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

## Run with Docker

The image is a multi-stage [Bun](https://bun.sh) build — it installs dependencies,
bundles the client, and ships a slim runtime. Your ideas are **not** baked into the
image; they live in a host-mounted volume so they persist across rebuilds.

```bash
# Build and start; app is published on the host at http://localhost:3000
docker compose up -d --build
```

Your `.md` files are stored on the host in `./ideas` (mounted to `/data` inside the
container). To use a different location, change the volume mapping in
[`docker-compose.yml`](docker-compose.yml), e.g. `- /srv/ideaforge/ideas:/data`.

```bash
docker compose logs -f      # follow logs
docker compose down         # stop (your ideas in ./ideas are untouched)
```

For AI categorization, put `CLAUDE_API_KEY=sk-ant-...` in a `.env` file next to the
compose file — Compose passes it through automatically.

### Tailscale: reach it anywhere

Optionally run a **Tailscale sidecar** so IdeaForge is reachable from anywhere on your
tailnet, over **valid HTTPS** (real MagicDNS certificate — no warnings, no public
exposure). The app is bound only to the container's network, **not to a host port**.

1. Create an auth key at [login.tailscale.com → Settings → Keys](https://login.tailscale.com/admin/settings/keys).
2. Add it to your `.env` (next to the compose file):

   ```env
   TS_AUTHKEY=tskey-auth-xxxxxxxxxxxx
   TS_HOSTNAME=ideaforge
   ```

3. Start the Tailscale stack:

   ```bash
   docker compose -f docker-compose.tailscale.yml up -d --build
   ```

4. Open `https://ideaforge.<your-tailnet>.ts.net` from any device on your tailnet.

How it works: the sidecar joins your tailnet and runs **Tailscale Serve**, terminating
HTTPS and proxying to the app on `127.0.0.1:3000`. The app container uses
`network_mode: service:tailscale`, so it shares the sidecar's network and is never
published on the host. The Serve config lives in
[`tailscale/serve.json`](tailscale/serve.json). Because HTTPS is provided by Tailscale,
voice capture and PWA install work out of the box.

> The sidecar needs `/dev/net/tun` and the `NET_ADMIN` capability (already set in the
> compose file). Run it on a Linux host for a true always-on deployment.

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
ideas/                    # Idea storage (*.md files) — gitignored; your data lives here
examples/ideas/           # Sample idea(s) illustrating the file format
scripts/
  generate-icons.ts       # PWA icon generator
Dockerfile                # Multi-stage Bun build
docker-compose.yml        # Local / LAN deployment
docker-compose.tailscale.yml  # Tailscale sidecar deployment
tailscale/serve.json      # Tailscale Serve (HTTPS) config
```

Your `ideas/` directory is gitignored — your personal ideas are never committed. The
directory itself is kept via a `.gitkeep`, and a default `categories.yaml` is created on
first run.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © Yori Lavi
