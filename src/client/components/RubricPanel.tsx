import { useState, useRef, useCallback } from "preact/hooks";

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

interface Props {
  ideaId: string;
  rubric: Rubric | null;
  onUpdate: (rubric: Rubric) => void;
}

const SpeechRecognitionClass =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

function computeScore(criteria: RubricCriterion[]): number | null {
  const scored = criteria.filter((c) => c.score !== null);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, c) => sum + c.weight * (c.score || 0), 0);
  const weightSum = scored.reduce((sum, c) => sum + c.weight, 0);
  return weightSum > 0 ? Math.round((total / weightSum) * 10) / 10 : null;
}

export function RubricPanel({ ideaId, rubric, onUpdate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [dictatingIndex, setDictatingIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const preVoiceRef = useRef("");

  const criteria = rubric?.criteria || [];
  const consolidatedScore = computeScore(criteria);
  const scoredCount = criteria.filter((c) => c.score !== null).length;

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setDictatingIndex(null);
  }, []);

  const startDictation = useCallback((index: number, currentValue: string) => {
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

      const updated = (rubric?.criteria || []).map((c, ci) =>
        ci === index ? { ...c, notes: newValue } : c
      );
      onUpdate({ criteria: updated });
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      stopDictation();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setDictatingIndex(null);
    };

    recognitionRef.current = recognition;
    setDictatingIndex(index);
    recognition.start();
  }, [rubric, onUpdate, stopDictation]);

  const toggleDictation = (index: number) => {
    if (dictatingIndex === index) {
      stopDictation();
    } else {
      startDictation(index, criteria[index]?.notes || "");
    }
  };

  const handleGenerate = async (regenerate = false) => {
    if (regenerate && !confirm("Regenerate rubric? This will replace all existing criteria, scores, and notes.")) {
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/ideas/${ideaId}/rubric`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate");
        return;
      }
      const idea = await res.json();
      if (idea.rubric) {
        onUpdate(idea.rubric);
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const addCriterion = () => {
    onUpdate({ criteria: [...criteria, { name: "", description: "", weight: 0, score: null, notes: "" }] });
  };

  const removeCriterion = (index: number) => {
    onUpdate({ criteria: criteria.filter((_, i) => i !== index) });
  };

  const updateCriterion = (index: number, updates: Partial<RubricCriterion>) => {
    const updated = criteria.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onUpdate({ criteria: updated });
  };

  const updateWeight = (index: number, newWeight: number) => {
    const updated = criteria.map((c, i) =>
      i === index ? { ...c, weight: newWeight / 100 } : c
    );
    onUpdate({ criteria: updated });
  };

  const toggleNotes = (index: number) => {
    const next = new Set(expandedNotes);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedNotes(next);
  };

  const voiceSupported = !!SpeechRecognitionClass;
  const weightSum = criteria.length > 0 ? Math.round(criteria.reduce((sum, c) => sum + c.weight, 0) * 100) : 0;

  return (
    <div class="rubric-panel">
      <div class="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span class="panel-toggle">{collapsed ? "▶" : "▼"}</span>
        <h3>Evaluation Rubric</h3>
        {criteria.length > 0 && (
          <span class="panel-badge">{scoredCount}/{criteria.length} scored</span>
        )}
        {consolidatedScore !== null && (
          <span class="consolidated-score">{consolidatedScore}/10</span>
        )}
      </div>

      {error && <div class="panel-error">{error}</div>}

      {!collapsed && (
        <>
          {criteria.length === 0 ? (
            <div class="rubric-empty">
              <p>No rubric yet. Generate one tailored to this idea.</p>
              <button
                class="btn-primary"
                onClick={() => handleGenerate()}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate Rubric"}
              </button>
            </div>
          ) : (
            <>
              <div class="rubric-actions">
                <button
                  class="ai-assist-btn"
                  onClick={() => handleGenerate(true)}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Regenerate Rubric"}
                </button>
              </div>

              {consolidatedScore !== null && (
                <div class="score-bar-container">
                  <div class="score-bar">
                    <div
                      class="score-bar-fill"
                      style={{ width: `${(consolidatedScore / 10) * 100}%` }}
                    />
                  </div>
                  <span class="score-bar-label">{consolidatedScore} / 10</span>
                </div>
              )}

              {weightSum !== 100 && (
                <div class="weight-warning">
                  Weights add up to {weightSum}% — should be 100%
                </div>
              )}

              <div class="rubric-criteria">
                {criteria.map((c, i) => (
                  <div class="criterion" key={i}>
                    <div class="criterion-header">
                      <div class="criterion-info">
                        <input
                          class="criterion-name-input"
                          value={c.name}
                          onInput={(e) => updateCriterion(i, { name: (e.target as HTMLInputElement).value })}
                        />
                        <input
                          class="criterion-desc-input"
                          value={c.description}
                          onInput={(e) => updateCriterion(i, { description: (e.target as HTMLInputElement).value })}
                        />
                      </div>
                      <div class="criterion-controls">
                        <div class="criterion-weight">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={Math.round(c.weight * 100)}
                            onInput={(e) => {
                              const val = parseInt((e.target as HTMLInputElement).value) || 1;
                              updateWeight(i, Math.max(1, Math.min(100, val)));
                            }}
                            class="weight-input"
                          />
                          <span class="weight-pct">%</span>
                        </div>
                        <button
                          class="criterion-remove"
                          onClick={() => removeCriterion(i)}
                          title="Remove criterion"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div class="criterion-scoring">
                      <label>Score:</label>
                      <div class="score-buttons">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button
                            key={n}
                            class={`score-btn ${c.score === n ? "active" : ""}`}
                            onClick={() => updateCriterion(i, { score: c.score === n ? null : n })}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div class="notes-row">
                      <button
                        class="notes-toggle"
                        onClick={() => toggleNotes(i)}
                      >
                        {expandedNotes.has(i) ? "Hide notes" : "Notes"}{c.notes ? " *" : ""}
                      </button>
                      {expandedNotes.has(i) && voiceSupported && (
                        <button
                          class={`field-mic ${dictatingIndex === i ? "recording" : ""}`}
                          onClick={() => toggleDictation(i)}
                          title={dictatingIndex === i ? "Stop dictation" : "Dictate"}
                        >
                          {dictatingIndex === i ? "⏹" : "🎤"}
                        </button>
                      )}
                    </div>

                    {expandedNotes.has(i) && (
                      <textarea
                        class="criterion-notes"
                        placeholder="Research, to-dos, evidence..."
                        value={c.notes}
                        onInput={(e) => updateCriterion(i, { notes: (e.target as HTMLTextAreaElement).value })}
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div class="rubric-add">
                <button class="add-criterion-btn" onClick={addCriterion}>
                  + Add Criterion
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
