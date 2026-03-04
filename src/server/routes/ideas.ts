import { Hono } from "hono";
import type { Stage, Source } from "../lib/types.js";
import {
  createIdea,
  quickCapture,
  getIdea,
  updateIdea,
  deleteIdea,
  listIdeas,
} from "../services/idea-service.js";
import { isAiEnabled, summarizeText, generateClarification, generateRubric } from "../services/ai-service.js";

const ideas = new Hono();

// Create idea
ideas.post("/", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.title?.trim()) {
      return c.json({ error: "Title is required" }, 400);
    }
    const idea = await createIdea({
      title: body.title.trim(),
      body: body.body?.trim() || "",
      source: body.source || "pwa",
      category: body.category,
      tags: body.tags,
    });
    return c.json(idea, 201);
  } catch (err) {
    return c.json({ error: "Failed to create idea" }, 500);
  }
});

// Quick capture (Shortcut-optimized)
ideas.post("/quick", async (c) => {
  try {
    // Accept both JSON and plain text for maximum Shortcut compatibility
    const contentType = c.req.header("content-type") || "";
    let text: string;
    let source: Source | undefined;

    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      text = body.text;
      source = body.source;
    } else {
      text = await c.req.text();
    }

    if (!text?.trim()) {
      return c.json({ ok: false, error: "Text is required" }, 400);
    }
    const idea = await quickCapture({
      text,
      source: source || "shortcut",
    });
    return c.json({ ok: true, id: idea.id, title: idea.title }, 201);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to capture idea";
    return c.json({ ok: false, error: message }, 500);
  }
});

// List ideas
ideas.get("/", async (c) => {
  const stage = c.req.query("stage") as Stage | undefined;
  const category = c.req.query("category");
  const search = c.req.query("search");
  const sort = (c.req.query("sort") as "created" | "updated") || "created";
  const order = (c.req.query("order") as "asc" | "desc") || "desc";
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const result = listIdeas({ stage, category, search, sort, order, limit, offset });
  return c.json(result);
});

// Get single idea
ideas.get("/:id", async (c) => {
  const idea = await getIdea(c.req.param("id"));
  if (!idea) {
    return c.json({ error: "Idea not found" }, 404);
  }
  return c.json(idea);
});

// Update idea
ideas.put("/:id", async (c) => {
  try {
    const body = await c.req.json();
    const idea = await updateIdea(c.req.param("id"), body);
    if (!idea) {
      return c.json({ error: "Idea not found" }, 404);
    }
    return c.json(idea);
  } catch {
    return c.json({ error: "Failed to update idea" }, 500);
  }
});

// Delete idea
ideas.delete("/:id", async (c) => {
  const deleted = await deleteIdea(c.req.param("id"));
  if (!deleted) {
    return c.json({ error: "Idea not found" }, 404);
  }
  return c.json({ success: true });
});

// Summarize text into a title (for voice capture)
ideas.post("/summarize", async (c) => {
  try {
    const { text } = await c.req.json();
    if (!text?.trim()) {
      return c.json({ error: "Text is required" }, 400);
    }
    if (!isAiEnabled()) {
      // Fallback: first sentence or first 80 chars
      const sentenceEnd = text.search(/[.!?\n]/);
      const title = sentenceEnd > 0 && sentenceEnd < 80
        ? text.slice(0, sentenceEnd + 1).trim()
        : text.slice(0, 80).trim();
      return c.json({ title });
    }
    const title = await summarizeText(text.trim());
    return c.json({ title });
  } catch {
    return c.json({ error: "Failed to summarize" }, 500);
  }
});

// AI-generate clarification for an idea
ideas.post("/:id/clarify", async (c) => {
  try {
    const idea = await getIdea(c.req.param("id"));
    if (!idea) return c.json({ error: "Idea not found" }, 404);
    if (!isAiEnabled()) return c.json({ error: "AI not configured" }, 400);

    const clarification = await generateClarification(idea.title, idea.body);
    const updated = await updateIdea(idea.id, { clarification });
    return c.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate clarification";
    return c.json({ error: msg }, 500);
  }
});

// AI-generate evaluation rubric for an idea
ideas.post("/:id/rubric", async (c) => {
  try {
    const idea = await getIdea(c.req.param("id"));
    if (!idea) return c.json({ error: "Idea not found" }, 404);
    if (!isAiEnabled()) return c.json({ error: "AI not configured" }, 400);

    const rubric = await generateRubric(idea.title, idea.body, idea.clarification);
    const updated = await updateIdea(idea.id, { rubric });
    return c.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate rubric";
    return c.json({ error: msg }, 500);
  }
});

export { ideas };
