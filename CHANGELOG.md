# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-20

### Fixed
- Mobile PWA: content at the top of the screen (e.g. the idea-detail view with
  its Delete action) no longer renders under the device status bar
  (notch / Dynamic Island). The app shell now respects the top safe-area inset.

### Changed
- Bumped the service worker cache so installed PWAs pick up the updated styles
  on next launch.

## [1.0.0] - 2026-06-18

First public release.

### Added
- Idea capture via text, voice dictation, and Siri Shortcuts.
- Four-stage idea lifecycle (captured → clarified → decided → archived) with a
  structured scoring rubric.
- AI auto-categorization and rubric assistance via the Anthropic API (optional —
  the app runs fully without an API key).
- Category/taxonomy management with retirement support.
- Offline-capable PWA with a service worker and installable manifest.
- Flat-file storage: every idea is a portable Markdown file with YAML
  frontmatter; no database required.
- **Docker support** via a multi-stage Bun image and `docker-compose.yml`. Idea
  files are stored in a host-mounted volume so data survives image rebuilds.
- **Optional Tailscale sidecar** (profile-gated): joins the container to your
  tailnet and serves valid HTTPS via Tailscale Serve, reachable from anywhere on
  your network without exposing a host port.
- Self-bootstrapping data directory: a fresh clone or empty volume is seeded with
  a default `categories.yaml` on first start.

[1.1.0]: https://github.com/yorilavi/IdeaForge/releases/tag/v1.1.0
[1.0.0]: https://github.com/yorilavi/IdeaForge/releases/tag/v1.0.0
