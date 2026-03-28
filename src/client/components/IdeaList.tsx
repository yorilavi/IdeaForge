import { useState } from "preact/hooks";
import { IdeaCard } from "./IdeaCard.js";

interface IdeaSummary {
  id: string;
  title: string;
  created: string;
  updated: string;
  stage: string;
  category: string;
  tags: string[];
  source: string;
  ai_status: string;
  excerpt: string;
}

interface Category {
  name: string;
  description: string;
  color: string;
}

interface Props {
  ideas: IdeaSummary[];
  categories: Category[];
  onSelect: (id: string) => void;
  onFilterChange: (filters: { stage?: string; decision?: string; category?: string; search?: string }) => void;
}

const STAGES = ["", "captured", "clarified", "evaluated", "decided"];
const DECISIONS = ["pursue", "shelve", "merge", "drop"];

export function IdeaList({ ideas, categories, onSelect, onFilterChange }: Props) {
  const [stage, setStage] = useState("");
  const [decision, setDecision] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const applyFilters = (overrides: Record<string, string> = {}) => {
    const filters = {
      stage: overrides.stage ?? stage,
      decision: overrides.decision ?? decision,
      category: overrides.category ?? category,
      search: overrides.search ?? search,
    };
    onFilterChange({
      stage: filters.stage || undefined,
      decision: filters.decision || undefined,
      category: filters.category || undefined,
      search: filters.search || undefined,
    });
  };

  const handleStage = (v: string) => {
    setStage(v);
    if (v !== "decided" && decision) {
      setDecision("");
      applyFilters({ stage: v, decision: "" });
    } else {
      applyFilters({ stage: v });
    }
  };

  const handleDecision = (v: string) => {
    setDecision(v);
    applyFilters({ decision: v });
  };

  const handleCategory = (v: string) => {
    setCategory(v);
    applyFilters({ category: v });
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => applyFilters({ search: v }), 250);
    setSearchTimeout(t);
  };

  return (
    <div class="idea-list">
      <div class="list-filters">
        <input
          class="filter-search"
          type="text"
          placeholder="Search ideas..."
          value={search}
          onInput={(e) => handleSearch((e.target as HTMLInputElement).value)}
        />
        <div class="filter-row">
          <select
            class="filter-select"
            value={stage}
            onChange={(e) => handleStage((e.target as HTMLSelectElement).value)}
          >
            <option value="">All stages</option>
            {STAGES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {stage === "decided" && (
            <select
              class="filter-select"
              value={decision}
              aria-label="Filter by decision"
              onChange={(e) => handleDecision((e.target as HTMLSelectElement).value)}
            >
              <option value="">All decisions</option>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          <select
            class="filter-select"
            value={category}
            onChange={(e) => handleCategory((e.target as HTMLSelectElement).value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {ideas.length === 0 ? (
        <div class="idea-list-empty">
          <p>{search || stage || category ? "No matching ideas." : "No ideas yet. Capture your first one above!"}</p>
        </div>
      ) : (
        <>
          <p class="list-count">{ideas.length} idea{ideas.length !== 1 ? "s" : ""}</p>
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onClick={() => onSelect(idea.id)} />
          ))}
        </>
      )}
    </div>
  );
}
