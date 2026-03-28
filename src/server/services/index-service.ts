import type { Idea, IdeaSummary, Stage } from "../lib/types.js";
import { excerpt } from "./file-service.js";

interface IndexEntry {
  idea: IdeaSummary;
  searchText: string; // lowercase title + body for search
}

const index = new Map<string, IndexEntry>();

export function buildIndex(ideas: Idea[]): void {
  index.clear();
  for (const idea of ideas) {
    addToIndex(idea);
  }
}

export function addToIndex(idea: Idea): void {
  const summary: IdeaSummary = {
    id: idea.id,
    title: idea.title,
    created: idea.created,
    updated: idea.updated,
    stage: idea.stage,
    category: idea.category,
    tags: idea.tags,
    source: idea.source,
    ai_status: idea.ai_status,
    decision: idea.decision,
    score: idea.score,
    excerpt: excerpt(idea.body),
  };
  index.set(idea.id, {
    idea: summary,
    searchText: `${idea.title} ${idea.body}`.toLowerCase(),
  });
}

export function removeFromIndex(id: string): void {
  index.delete(id);
}

export function getFromIndex(id: string): IdeaSummary | null {
  return index.get(id)?.idea ?? null;
}

export interface ListOptions {
  stage?: Stage;
  decision?: string;
  category?: string;
  search?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export function listFromIndex(opts: ListOptions = {}): {
  ideas: IdeaSummary[];
  total: number;
} {
  let entries = Array.from(index.values());

  // Filter
  if (opts.stage) {
    entries = entries.filter((e) => e.idea.stage === opts.stage);
  }
  if (opts.decision) {
    entries = entries.filter((e) => e.idea.decision === opts.decision);
  }
  if (opts.category) {
    entries = entries.filter((e) => e.idea.category === opts.category);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    entries = entries.filter((e) => e.searchText.includes(q));
  }

  // Sort
  const sortField = opts.sort || "created";
  const orderMul = opts.order === "asc" ? 1 : -1;
  entries.sort((a, b) => {
    const aVal = a.idea[sortField];
    const bVal = b.idea[sortField];
    return aVal < bVal ? -orderMul : aVal > bVal ? orderMul : 0;
  });

  const total = entries.length;

  // Paginate
  const offset = opts.offset || 0;
  const limit = opts.limit || 50;
  const paged = entries.slice(offset, offset + limit);

  return { ideas: paged.map((e) => e.idea), total };
}

export function indexSize(): number {
  return index.size;
}
