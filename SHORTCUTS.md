# IdeaForge — Apple Shortcuts Setup

Capture ideas from your Apple Watch, lock screen, or via Siri without opening a browser.

## Prerequisites

- IdeaForge server running and reachable via Tailscale
- Your server's Tailscale IP or hostname (e.g., `http://your-machine:3000`)

## Shortcut 1: Quick Text Capture

Captures a typed idea in seconds.

### Setup

1. Open **Shortcuts** app on iPhone
2. Tap **+** to create a new shortcut
3. Add these actions in order:

| # | Action | Configuration |
|---|--------|---------------|
| 1 | **Ask for Input** | Prompt: "What's your idea?" / Type: Text |
| 2 | **Get Contents of URL** | URL: `http://YOUR-TAILSCALE-IP:3000/api/ideas/quick` |
|   |  | Method: **POST** |
|   |  | Headers: `Content-Type: application/json` |
|   |  | Request Body (JSON): `{"text": "<Provided Input>", "source": "shortcut"}` |
| 3 | **Show Notification** | Title: "Idea Captured" / Body: result's `title` |

4. Name it **"Capture Idea"**
5. Add to Home Screen and/or Apple Watch

### Usage

- Tap the shortcut → type your idea → done
- From Apple Watch: tap the shortcut → dictate → done
- Say **"Hey Siri, Capture Idea"** → dictate → done

## Shortcut 2: Siri Voice Capture

Captures a dictated idea hands-free.

### Setup

1. Create a new shortcut
2. Add these actions:

| # | Action | Configuration |
|---|--------|---------------|
| 1 | **Dictate Text** | Stop Listening: After Pause |
| 2 | **Get Contents of URL** | URL: `http://YOUR-TAILSCALE-IP:3000/api/ideas/quick` |
|   |  | Method: **POST** |
|   |  | Headers: `Content-Type: application/json` |
|   |  | Request Body (JSON): `{"text": "<Dictated Text>", "source": "voice"}` |
| 3 | **Show Notification** | Title: "Idea Captured" / Body: result's `title` |

3. Name it **"Idea"** (short name = faster Siri activation)

### Usage

- **"Hey Siri, Idea"** → speak your idea → captured
- Works from Apple Watch, AirPods, HomePod, CarPlay

## Shortcut 3: Share Sheet Capture

Capture ideas from any app's share menu (articles, tweets, notes).

### Setup

1. Create a new shortcut
2. Enable **Show in Share Sheet** in shortcut settings
3. Accept: **Text, URLs, Articles**
4. Add these actions:

| # | Action | Configuration |
|---|--------|---------------|
| 1 | **Get Contents of URL** | URL: `http://YOUR-TAILSCALE-IP:3000/api/ideas/quick` |
|   |  | Method: **POST** |
|   |  | Headers: `Content-Type: application/json` |
|   |  | Request Body (JSON): `{"text": "<Shortcut Input>", "source": "shortcut"}` |
| 2 | **Show Notification** | Title: "Idea Captured" |

5. Name it **"Send to IdeaForge"**

## API Reference

### `POST /api/ideas/quick`

**JSON body:**
```json
{"text": "Your idea text here", "source": "shortcut"}
```

**Plain text body** (also accepted):
```
Your idea text here
```

**Success response** (201):
```json
{"ok": true, "id": "01KJ...", "title": "Your idea text here"}
```

**Error response** (400/500):
```json
{"ok": false, "error": "Text is required"}
```

**Behavior:**
- First sentence becomes the title, rest becomes the body
- If text is short (< 200 chars) with no sentence break, entire text becomes the title
- Category defaults to "Unsorted" (AI categorizes in the background if enabled)
- Idea is saved immediately — AI never blocks capture

## Tips

- Keep shortcut names short for faster Siri activation
- Add shortcuts to your Apple Watch face as complications
- The "Back Tap" accessibility feature can trigger a shortcut with a double/triple tap on the back of your iPhone
- Action Button (iPhone 15 Pro+) can be mapped to a shortcut
