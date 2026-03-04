import { useState, useRef, useEffect } from "preact/hooks";
import { useVoiceCapture } from "../hooks/useVoiceCapture.js";

interface Props {
  onCaptured: () => void;
  onOfflineQueue: (title: string, body: string, source: string) => void;
  queueSize: number;
}

export function CaptureInput({ onCaptured, onOfflineQueue, queueSize }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [voiceSource, setVoiceSource] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const [summarizing, setSummarizing] = useState(false);
  const bodyBeforeVoice = useRef("");
  const voice = useVoiceCapture();

  // When voice transcript updates, append to existing body text
  useEffect(() => {
    if (voice.transcript) {
      const prefix = bodyBeforeVoice.current;
      setBody(prefix ? prefix + " " + voice.transcript : voice.transcript);
      setVoiceSource(true);
      setExpanded(true);
    }
  }, [voice.transcript]);

  const summarizeTranscript = (text: string) => {
    setSummarizing(true);
    fetch("/api/ideas/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.title) setTitle(data.title);
      })
      .catch(() => {
        // Fallback: first sentence or first 80 chars
        const end = text.search(/[.!?\n]/);
        setTitle(end > 0 ? text.slice(0, end + 1).trim() : text.slice(0, 80));
      })
      .finally(() => setSummarizing(false));
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setExpanded(false);
    setVoiceSource(false);
    voice.clear();
    titleRef.current?.focus();
  };

  const showFlash = (msg: string, duration = 1500) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), duration);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (voice.state === "listening") {
      voice.stop();
    }

    const source = voiceSource ? "voice" : "pwa";

    setSaving(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          body: body.trim(),
          source,
        }),
      });

      if (res.ok) {
        resetForm();
        showFlash("Captured!");
        onCaptured();
      } else {
        showFlash("Failed to save", 3000);
      }
    } catch {
      // Offline — queue for later
      onOfflineQueue(trimmedTitle, body.trim(), source);
      resetForm();
      showFlash("Saved offline — will sync later");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  const toggleVoice = () => {
    if (voice.state === "listening") {
      voice.stop();
      // Auto-summarize full body into title when user stops recording
      const fullBody = bodyBeforeVoice.current
        ? bodyBeforeVoice.current + " " + voice.transcript
        : voice.transcript;
      if (fullBody && !title) {
        summarizeTranscript(fullBody);
      }
    } else {
      bodyBeforeVoice.current = body.trim();
      voice.start();
    }
  };

  return (
    <form class="capture-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <div class="capture-main">
        <input
          ref={titleRef}
          type="text"
          class="capture-title"
          placeholder={summarizing ? "Summarizing..." : voice.state === "listening" ? "Listening..." : "Capture an idea..."}
          value={title}
          onInput={(e) => { setTitle((e.target as HTMLInputElement).value); setVoiceSource(false); }}
          onFocus={() => setExpanded(true)}
          disabled={saving}
          autocomplete="off"
        />
        {voice.supported && (
          <button
            type="button"
            class={`capture-mic ${voice.state === "listening" ? "recording" : ""}`}
            onClick={toggleVoice}
            disabled={saving}
            title={voice.state === "listening" ? "Stop recording" : "Voice capture"}
          >
            {voice.state === "listening" ? "⏹" : "🎙"}
          </button>
        )}
        <button type="submit" class="capture-btn" disabled={saving || !title.trim()}>
          {saving ? "..." : "+"}
        </button>
      </div>
      {expanded && (
        <textarea
          class="capture-body"
          placeholder="Add details (optional)..."
          value={body}
          onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          rows={3}
          disabled={saving}
        />
      )}
      {voice.state === "listening" && (
        <div class="voice-indicator">Recording — speak your idea</div>
      )}
      {voice.error && (
        <div class="capture-flash error">Voice error: {voice.error}</div>
      )}
      {queueSize > 0 && (
        <div class="capture-flash offline-queue">
          {queueSize} idea{queueSize !== 1 ? "s" : ""} queued offline
        </div>
      )}
      {flash && <div class={`capture-flash ${flash === "Captured!" ? "success" : flash.startsWith("Saved offline") ? "offline" : "error"}`}>{flash}</div>}
    </form>
  );
}
