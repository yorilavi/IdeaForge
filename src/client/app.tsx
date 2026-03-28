import { render } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import { CaptureInput } from "./components/CaptureInput.js";
import { IdeaList } from "./components/IdeaList.js";
import { IdeaDetail } from "./components/IdeaDetail.js";
import { CategoryManager } from "./components/CategoryManager.js";
import { useOfflineQueue } from "./hooks/useOfflineQueue.js";

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

function App() {
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [filters, setFilters] = useState<{ stage?: string; decision?: string; category?: string; search?: string }>({});
  const offlineQueue = useOfflineQueue(() => fetchIdeas());

  const fetchIdeas = useCallback(async (f = filters) => {
    try {
      const params = new URLSearchParams({ sort: "created", order: "desc", limit: "100" });
      if (f.stage) params.set("stage", f.stage);
      if (f.decision) params.set("decision", f.decision);
      if (f.category) params.set("category", f.category);
      if (f.search) params.set("search", f.search);
      const res = await fetch(`/api/ideas?${params}`);
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (err) {
      console.error("Failed to fetch ideas:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // Categories are non-critical
    }
  };

  useEffect(() => {
    fetchIdeas();
    fetchCategories();
  }, []);

  const handleFilterChange = (f: { stage?: string; decision?: string; category?: string; search?: string }) => {
    setFilters(f);
    fetchIdeas(f);
  };

  const handleCaptured = () => {
    fetchIdeas();
  };

  const handleBack = () => {
    setSelectedId(null);
    fetchIdeas();
  };

  if (selectedId) {
    return (
      <div class="app">
        <IdeaDetail
          ideaId={selectedId}
          categories={categories}
          onBack={handleBack}
          onDeleted={() => { setSelectedId(null); fetchIdeas(); }}
          onUpdated={() => fetchIdeas()}
        />
      </div>
    );
  }

  if (showCategories) {
    return (
      <div class="app">
        <CategoryManager
          categories={categories}
          onBack={() => { setShowCategories(false); fetchCategories(); }}
          onChanged={fetchCategories}
        />
      </div>
    );
  }

  return (
    <div class="app">
      <header class="app-header">
        <h1>IdeaForge</h1>
        <button class="settings-link" onClick={() => setShowCategories(true)}>Categories</button>
      </header>
      <main>
        <CaptureInput
            onCaptured={handleCaptured}
            onOfflineQueue={offlineQueue.enqueue}
            queueSize={offlineQueue.queueSize}
          />
        {loading ? (
          <p class="loading">Loading ideas\u2026</p>
        ) : (
          <IdeaList
            ideas={ideas}
            categories={categories}
            onSelect={setSelectedId}
            onFilterChange={handleFilterChange}
          />
        )}
      </main>
    </div>
  );
}

render(<App />, document.getElementById("app")!);
