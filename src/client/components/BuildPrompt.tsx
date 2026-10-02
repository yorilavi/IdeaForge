import { useState, useRef } from "preact/hooks";

interface Props {
  ideaId: string;
  buildPrompt: string;
  // Labels of required clarification fields that are still empty
  missing: string[];
  onChange: (text: string) => void;
}

// "a", "a and b", "a, b and c"
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function BuildPrompt({ ideaId, buildPrompt, missing, onChange }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ready = missing.length === 0;

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/ideas/${ideaId}/build-prompt`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate");
        return;
      }
      onChange(data.build_prompt || "");
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(buildPrompt);
    } catch {
      // The Clipboard API needs a secure context (HTTPS or localhost)
      const ta = textareaRef.current;
      if (!ta) return;
      ta.select();
      if (!document.execCommand("copy")) {
        setError("Couldn't copy automatically. The text is selected, so copy it manually.");
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div class="clarification-field build-prompt">
      <div class="build-prompt-header">
        <div class="build-prompt-intro">
          <label for={`build-prompt-${ideaId}`}>Build Prompt</label>
          <p class="build-prompt-hint">
            {ready
              ? "A prompt for Claude Code that builds a working demo from the value proposition, problem, and target audience."
              : `Fill in ${joinLabels(missing)} to generate a prompt for Claude Code that builds a working demo.`}
          </p>
        </div>
        <div class="build-prompt-actions">
          {buildPrompt && (
            <button class="btn-small" onClick={handleCopy} aria-live="polite">
              {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button class="ai-assist-btn" onClick={handleGenerate} disabled={generating || !ready}>
            {generating ? "Generating…" : buildPrompt ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {error && <div class="build-prompt-error">{error}</div>}

      {buildPrompt && (
        <textarea
          id={`build-prompt-${ideaId}`}
          ref={textareaRef}
          value={buildPrompt}
          onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
          rows={14}
          spellcheck={false}
        />
      )}
    </div>
  );
}
