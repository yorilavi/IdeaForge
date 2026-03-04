import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { ClarificationPanel } from "./ClarificationPanel.js";
import { RubricPanel } from "./RubricPanel.js";

const SpeechRecognitionClass =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

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

interface RubricCriterion {
  name: string;
  description: string;
  weight: number;
  score: number | null;
  notes: string;
}

interface Rubric {
  criteria: RubricCriterion[];
}

interface Idea {
  id: string;
  title: string;
  created: string;
  updated: string;
  stage: string;
  category: string;
  tags: string[];
  source: string;
  ai_status: string;
  decision: string | null;
  decision_technical_feasibility: string;
  decision_market_feasibility: string;
  decision_window_of_opportunity: string;
  decision_six_month_vision: string;
  score: number | null;
  clarification: Clarification | null;
  rubric: Rubric | null;
  body: string;
}

interface Category {
  name: string;
  description: string;
  color: string;
}

interface Props {
  ideaId: string;
  categories: Category[];
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

const STAGES = ["captured", "clarified", "evaluated", "decided"] as const;
const DECISIONS = ["pursue", "shelve", "merge", "drop"] as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function IdeaDetail({ ideaId, categories, onBack, onDeleted, onUpdated }: Props) {
  const [idea, setIdea] = useState<Idea | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [flash, setFlash] = useState("");

  // Edit state
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  // Decision field dictation
  const [dictatingField, setDictatingField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const preVoiceRef = useRef("");

  useEffect(() => {
    fetchIdea();
  }, [ideaId]);

  const fetchIdea = async () => {
    const res = await fetch(`/api/ideas/${ideaId}`);
    if (res.ok) {
      const data = await res.json();
      setIdea(data);
    }
  };

  const startEditing = () => {
    if (!idea) return;
    setEditTitle(idea.title);
    setEditBody(idea.body);
    setEditTags(idea.tags.join(", "));
    setEditing(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!idea) return;
    setSaving(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim(), tags }),
      });
      if (res.ok) {
        const updated = await res.json();
        setIdea(updated);
        setEditing(false);
        onUpdated();
        showFlash("Saved");
      }
    } catch {
      showFlash("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateField = async (fields: Record<string, unknown>) => {
    if (!idea) return;
    const res = await fetch(`/api/ideas/${idea.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json();
      setIdea(updated);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!idea) return;
    const res = await fetch(`/api/ideas/${idea.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted();
    }
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 1500);
  };

  const voiceSupported = !!SpeechRecognitionClass;

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setDictatingField(null);
  }, []);

  const startDictation = useCallback((fieldKey: string, currentValue: string) => {
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
      updateField({ [fieldKey]: newValue });
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
    setDictatingField(fieldKey);
    recognition.start();
  }, [stopDictation, updateField]);

  const toggleDictation = (fieldKey: string, currentValue: string) => {
    if (dictatingField === fieldKey) {
      stopDictation();
    } else {
      startDictation(fieldKey, currentValue);
    }
  };

  if (!idea) {
    return <div class="detail-loading">Loading...</div>;
  }

  const stageIndex = STAGES.indexOf(idea.stage as typeof STAGES[number]);

  return (
    <div class="idea-detail">
      <div class="detail-nav">
        <button class="detail-back" onClick={onBack}>← Back</button>
        {flash && <span class="detail-flash">{flash}</span>}
        <div class="detail-actions">
          {!editing && (
            <button class="detail-edit-btn" onClick={startEditing}>Edit</button>
          )}
          {!confirmDelete ? (
            <button class="detail-delete-btn" onClick={() => setConfirmDelete(true)}>Delete</button>
          ) : (
            <span class="detail-confirm-delete">
              <span>Delete this idea?</span>
              <button class="confirm-yes" onClick={handleDelete}>Yes</button>
              <button class="confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <div class="detail-edit-form">
          <input
            ref={titleRef}
            class="edit-title"
            value={editTitle}
            onInput={(e) => setEditTitle((e.target as HTMLInputElement).value)}
            placeholder="Title"
          />
          <textarea
            class="edit-body"
            value={editBody}
            onInput={(e) => setEditBody((e.target as HTMLTextAreaElement).value)}
            placeholder="Body (optional)"
            rows={8}
          />
          <input
            class="edit-tags"
            value={editTags}
            onInput={(e) => setEditTags((e.target as HTMLInputElement).value)}
            placeholder="Tags (comma-separated)"
          />
          <div class="edit-buttons">
            <button class="save-btn" onClick={saveEdit} disabled={saving || !editTitle.trim()}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button class="cancel-btn" onClick={cancelEditing}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <h2 class="detail-title">{idea.title}</h2>
          {idea.body && <div class="detail-body">{idea.body}</div>}
        </>
      )}

      <div class="detail-section">
        <label class="detail-label">Stage</label>
        <div class="stage-track">
          {STAGES.map((s, i) => (
            <button
              key={s}
              class={`stage-step stage-step-${s} ${idea.stage === s ? "active" : ""} ${i <= stageIndex ? "reached" : ""}`}
              onClick={() => updateField({ stage: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {stageIndex >= 1 && (
        <ClarificationPanel
          ideaId={idea.id}
          clarification={idea.clarification}
          onUpdate={(clarification) => updateField({ clarification })}
        />
      )}

      {stageIndex >= 2 && (
        <RubricPanel
          ideaId={idea.id}
          rubric={idea.rubric}
          onUpdate={(rubric) => updateField({ rubric })}
        />
      )}

      {idea.stage === "decided" && (
        <div class="detail-section">
          <label class="detail-label">Decision</label>
          <div class="decision-options">
            {DECISIONS.map((d) => (
              <button
                key={d}
                class={`decision-btn ${idea.decision === d ? "active" : ""}`}
                onClick={() => updateField({ decision: idea.decision === d ? null : d })}
              >
                {d}
              </button>
            ))}
          </div>
          <div class="decision-fields">
            <div class="decision-field">
              <div class="field-label-row">
                <label>Technical Feasibility</label>
                {voiceSupported && (
                  <button
                    class={`field-mic ${dictatingField === "decision_technical_feasibility" ? "recording" : ""}`}
                    onClick={() => toggleDictation("decision_technical_feasibility", idea.decision_technical_feasibility || "")}
                    title={dictatingField === "decision_technical_feasibility" ? "Stop dictation" : "Dictate"}
                  >
                    {dictatingField === "decision_technical_feasibility" ? "⏹" : "🎤"}
                  </button>
                )}
              </div>
              <textarea
                placeholder="Can this be built? Resources, complexity, timeline..."
                value={idea.decision_technical_feasibility || ""}
                onInput={(e) => updateField({ decision_technical_feasibility: (e.target as HTMLTextAreaElement).value })}
                rows={2}
              />
            </div>
            <div class="decision-field">
              <div class="field-label-row">
                <label>Market Feasibility</label>
                {voiceSupported && (
                  <button
                    class={`field-mic ${dictatingField === "decision_market_feasibility" ? "recording" : ""}`}
                    onClick={() => toggleDictation("decision_market_feasibility", idea.decision_market_feasibility || "")}
                    title={dictatingField === "decision_market_feasibility" ? "Stop dictation" : "Dictate"}
                  >
                    {dictatingField === "decision_market_feasibility" ? "⏹" : "🎤"}
                  </button>
                )}
              </div>
              <textarea
                placeholder="Can this reach the market? Distribution, regulations, barriers..."
                value={idea.decision_market_feasibility || ""}
                onInput={(e) => updateField({ decision_market_feasibility: (e.target as HTMLTextAreaElement).value })}
                rows={2}
              />
            </div>
            <div class="decision-field">
              <div class="field-label-row">
                <label>Window of Opportunity</label>
                {voiceSupported && (
                  <button
                    class={`field-mic ${dictatingField === "decision_window_of_opportunity" ? "recording" : ""}`}
                    onClick={() => toggleDictation("decision_window_of_opportunity", idea.decision_window_of_opportunity || "")}
                    title={dictatingField === "decision_window_of_opportunity" ? "Stop dictation" : "Dictate"}
                  >
                    {dictatingField === "decision_window_of_opportunity" ? "⏹" : "🎤"}
                  </button>
                )}
              </div>
              <textarea
                placeholder="Is there urgency? Market timing, competition, trends..."
                value={idea.decision_window_of_opportunity || ""}
                onInput={(e) => updateField({ decision_window_of_opportunity: (e.target as HTMLTextAreaElement).value })}
                rows={2}
              />
            </div>
            <div class="decision-field">
              <div class="field-label-row">
                <label>6-Month Vision</label>
                {voiceSupported && (
                  <button
                    class={`field-mic ${dictatingField === "decision_six_month_vision" ? "recording" : ""}`}
                    onClick={() => toggleDictation("decision_six_month_vision", idea.decision_six_month_vision || "")}
                    title={dictatingField === "decision_six_month_vision" ? "Stop dictation" : "Dictate"}
                  >
                    {dictatingField === "decision_six_month_vision" ? "⏹" : "🎤"}
                  </button>
                )}
              </div>
              <textarea
                placeholder="If pursued, where do you expect to be in six months?"
                value={idea.decision_six_month_vision || ""}
                onInput={(e) => updateField({ decision_six_month_vision: (e.target as HTMLTextAreaElement).value })}
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      <div class="detail-section">
        <label class="detail-label">Category</label>
        <select
          class="detail-select"
          value={idea.category}
          onChange={(e) => updateField({ category: (e.target as HTMLSelectElement).value })}
        >
          {categories.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {idea.tags.length > 0 && !editing && (
        <div class="detail-section">
          <label class="detail-label">Tags</label>
          <div class="detail-tags">
            {idea.tags.map((t) => <span key={t} class="detail-tag">{t}</span>)}
          </div>
        </div>
      )}

      <div class="detail-meta">
        <span>Source: {idea.source}</span>
        <span>Created: {formatDate(idea.created)}</span>
        <span>Updated: {formatDate(idea.updated)}</span>
        {idea.ai_status !== "none" && <span>AI: {idea.ai_status}</span>}
      </div>
    </div>
  );
}
