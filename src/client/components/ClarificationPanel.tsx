import { useState, useRef, useCallback } from "preact/hooks";

interface Clarification {
  value_proposition: string;
  problem: string;
  target_audience: string;
  key_differentiator: string;
  technical_feasibility: string;
  market_feasibility: string;
  market_attractiveness: string;
  notes: string;
}

interface Props {
  ideaId: string;
  clarification: Clarification | null;
  onUpdate: (clarification: Clarification) => void;
}

const FIELDS: { key: keyof Clarification; label: string; placeholder: string }[] = [
  { key: "value_proposition", label: "Value Proposition", placeholder: "What value does this idea deliver?" },
  { key: "problem", label: "Problem Solved", placeholder: "What specific problem does it solve?" },
  { key: "target_audience", label: "Target Audience", placeholder: "Who is this for?" },
  { key: "key_differentiator", label: "Key Differentiator", placeholder: "What makes this novel or uniquely effective?" },
  { key: "technical_feasibility", label: "Technical Feasibility", placeholder: "Can this be built? What tech is needed? Complexity?" },
  { key: "market_feasibility", label: "Market Feasibility", placeholder: "Can this reach the market? Distribution, regulations, barriers?" },
  { key: "market_attractiveness", label: "Market Attractiveness", placeholder: "How big is the opportunity? Growth, demand, competition?" },
  { key: "notes", label: "Notes", placeholder: "General comments, thoughts, open questions..." },
];

const SpeechRecognitionClass =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const EMPTY: Clarification = {
  value_proposition: "",
  problem: "",
  target_audience: "",
  key_differentiator: "",
  technical_feasibility: "",
  market_feasibility: "",
  market_attractiveness: "",
  notes: "",
};

export function ClarificationPanel({ ideaId, clarification, onUpdate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dictatingField, setDictatingField] = useState<keyof Clarification | null>(null);
  const recognitionRef = useRef<any>(null);
  const preVoiceRef = useRef("");

  const current: Clarification = { ...EMPTY, ...clarification };

  const filledCount = FIELDS.filter((f) => current[f.key].trim()).length;

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setDictatingField(null);
  }, []);

  const startDictation = useCallback((field: keyof Clarification, currentValue: string) => {
    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    preVoiceRef.current = currentValue.trim();

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        if (text && segment && !text.endsWith(" ") && !segment.startsWith(" ")) {
          text += " ";
        }
        text += segment;
      }
      const transcript = text.trim();
      const prefix = preVoiceRef.current;
      const newValue = prefix ? prefix + " " + transcript : transcript;

      // We need to get the latest clarification — use a functional approach
      // Since we can't access latest `current` in this closure, dispatch with the field
      onUpdate({ ...EMPTY, ...clarification, [field]: newValue });
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      stopDictation();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setDictatingField(null);
    };

    recognitionRef.current = recognition;
    setDictatingField(field);
    recognition.start();
  }, [clarification, onUpdate, stopDictation]);

  const toggleDictation = (field: keyof Clarification) => {
    if (dictatingField === field) {
      stopDictation();
    } else {
      startDictation(field, current[field]);
    }
  };

  const handleAiAssist = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/ideas/${ideaId}/clarify`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate");
        return;
      }
      const idea = await res.json();
      if (idea.clarification) {
        // Preserve existing notes when AI fills other fields
        onUpdate({ ...idea.clarification, notes: current.notes || idea.clarification.notes || "" });
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const voiceSupported = !!SpeechRecognitionClass;

  return (
    <div class="clarification-panel">
      <div class="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span class="panel-toggle">{collapsed ? "▶" : "▼"}</span>
        <h3>Clarification</h3>
        <span class="panel-badge">{filledCount}/{FIELDS.length}</span>
        {!collapsed && (
          <button
            class="ai-assist-btn"
            onClick={(e) => { e.stopPropagation(); handleAiAssist(); }}
            disabled={generating}
          >
            {generating ? "Generating..." : "AI Assist"}
          </button>
        )}
      </div>

      {error && <div class="panel-error">{error}</div>}

      {!collapsed && (
        <div class="clarification-fields">
          {FIELDS.map((f) => (
            <div class="clarification-field" key={f.key}>
              <div class="field-label-row">
                <label>{f.label}</label>
                {voiceSupported && (
                  <button
                    class={`field-mic ${dictatingField === f.key ? "recording" : ""}`}
                    onClick={() => toggleDictation(f.key)}
                    title={dictatingField === f.key ? "Stop dictation" : "Dictate"}
                  >
                    {dictatingField === f.key ? "⏹" : "🎤"}
                  </button>
                )}
              </div>
              <textarea
                placeholder={f.placeholder}
                value={current[f.key]}
                onInput={(e) => {
                  const val = (e.target as HTMLTextAreaElement).value;
                  onUpdate({ ...current, [f.key]: val });
                }}
                rows={f.key === "notes" ? 4 : 2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
