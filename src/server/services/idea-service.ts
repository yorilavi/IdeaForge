import { ulid } from "ulidx";
import type {
  Idea,
  CreateIdeaInput,
  QuickCaptureInput,
  UpdateIdeaInput,
} from "../lib/types.js";
import {
  readIdeaFile,
  writeIdeaFile,
  deleteIdeaFile,
  readAllIdeaFiles,
} from "./file-service.js";
import {
  buildIndex,
  addToIndex,
  removeFromIndex,
  listFromIndex,
  indexSize,
  type ListOptions,
} from "./index-service.js";
import { isAiEnabled, categorizeIdea } from "./ai-service.js";

export async function initializeIndex(): Promise<number> {
  const ideas = await readAllIdeaFiles();
  buildIndex(ideas);

  // Retry failed/pending categorizations in the background
  if (isAiEnabled()) {
    const uncategorized = ideas.filter(
      (i) => i.ai_status === "none" || i.ai_status === "failed" || i.ai_status === "pending"
    );
    if (uncategorized.length > 0) {
      console.log(`Retrying AI categorization for ${uncategorized.length} ideas`);
      for (const idea of uncategorized) {
        backgroundCategorize(idea.id, idea.title, idea.body);
      }
    }
  }

  return indexSize();
}

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const now = new Date().toISOString();
  const idea: Idea = {
    id: ulid(),
    title: input.title,
    created: now,
    updated: now,
    stage: "captured",
    category: input.category || "Unsorted",
    tags: input.tags || [],
    source: input.source || "pwa",
    ai_status: "none",
    decision: null,
    decision_technical_feasibility: "",
    decision_market_feasibility: "",
    decision_window_of_opportunity: "",
    decision_six_month_vision: "",
    score: null,
    clarification: null,
    rubric: null,
    body: input.body || "",
  };

  await writeIdeaFile(idea);
  addToIndex(idea);

  // Fire-and-forget AI categorization (never blocks capture)
  if (isAiEnabled() && idea.category === "Unsorted") {
    backgroundCategorize(idea.id, idea.title, idea.body);
  }

  return idea;
}

async function backgroundCategorize(id: string, title: string, body: string): Promise<void> {
  // Mark as pending
  const pending = await readIdeaFile(id);
  if (!pending || pending.ai_status === "done") return;
  pending.ai_status = "pending";
  await writeIdeaFile(pending);
  addToIndex(pending);

  try {
    const result = await categorizeIdea(title, body);
    const current = await readIdeaFile(id);
    if (!current) return;

    // Only apply AI result if user hasn't manually categorized
    if (current.category === "Unsorted") {
      current.category = result.category;
    }
    // Merge AI tags with any existing tags (no duplicates)
    const allTags = new Set([...current.tags, ...result.tags]);
    current.tags = [...allTags];
    current.ai_status = "done";
    current.updated = new Date().toISOString();
    await writeIdeaFile(current);
    addToIndex(current);
    console.log(`AI categorized "${title}" → ${result.category} [${result.tags.join(", ")}]`);
  } catch (err) {
    const current = await readIdeaFile(id);
    if (!current) return;
    current.ai_status = "failed";
    await writeIdeaFile(current);
    addToIndex(current);
    console.error(`AI categorization failed for "${title}":`, err);
  }
}

export async function quickCapture(input: QuickCaptureInput): Promise<Idea> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Text is required for quick capture");
  }

  // First sentence becomes title, rest becomes body
  const sentenceEnd = text.search(/[.!?\n]/);
  let title: string;
  let body: string;

  if (sentenceEnd > 0 && sentenceEnd < 200) {
    title = text.slice(0, sentenceEnd + 1).trim();
    body = text.slice(sentenceEnd + 1).trim();
  } else if (text.length <= 200) {
    title = text;
    body = "";
  } else {
    // Long text with no sentence break — use first 200 chars as title
    const spaceIdx = text.lastIndexOf(" ", 200);
    const breakAt = spaceIdx > 100 ? spaceIdx : 200;
    title = text.slice(0, breakAt).trim();
    body = text.slice(breakAt).trim();
  }

  return createIdea({
    title,
    body,
    source: input.source || "shortcut",
  });
}

export async function getIdea(id: string): Promise<Idea | null> {
  return readIdeaFile(id);
}

export async function updateIdea(
  id: string,
  input: UpdateIdeaInput
): Promise<Idea | null> {
  const existing = await readIdeaFile(id);
  if (!existing) return null;

  const updated: Idea = {
    ...existing,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.body !== undefined && { body: input.body }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.stage !== undefined && { stage: input.stage }),
    ...(input.score !== undefined && { score: input.score }),
    ...(input.decision !== undefined && { decision: input.decision }),
    ...(input.decision_technical_feasibility !== undefined && { decision_technical_feasibility: input.decision_technical_feasibility }),
    ...(input.decision_market_feasibility !== undefined && { decision_market_feasibility: input.decision_market_feasibility }),
    ...(input.decision_window_of_opportunity !== undefined && { decision_window_of_opportunity: input.decision_window_of_opportunity }),
    ...(input.decision_six_month_vision !== undefined && { decision_six_month_vision: input.decision_six_month_vision }),
    ...(input.clarification !== undefined && { clarification: input.clarification }),
    ...(input.rubric !== undefined && { rubric: input.rubric }),
    updated: new Date().toISOString(),
  };

  await writeIdeaFile(updated);
  addToIndex(updated);
  return updated;
}

export async function deleteIdea(id: string): Promise<boolean> {
  const deleted = await deleteIdeaFile(id);
  if (deleted) {
    removeFromIndex(id);
  }
  return deleted;
}

export function listIdeas(opts: ListOptions) {
  return listFromIndex(opts);
}
