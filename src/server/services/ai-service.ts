import { config } from "../lib/config.js";
import { getCategoryNames } from "./category-service.js";
import type { Clarification, Rubric } from "../lib/types.js";

interface AiResult {
  category: string;
  tags: string[];
}

export function isAiEnabled(): boolean {
  return !!config.claudeApiKey;
}

export async function categorizeIdea(
  title: string,
  body: string
): Promise<AiResult> {
  if (!config.claudeApiKey) {
    throw new Error("Claude API key not configured");
  }

  const categoryNames = await getCategoryNames();

  const prompt = `You are categorizing an idea for a personal idea capture system.

Available categories: ${categoryNames.join(", ")}

Idea title: ${title}
${body ? `Idea body: ${body}` : ""}

Respond with ONLY a JSON object (no markdown, no explanation):
{"category": "<one of the available categories>", "tags": ["tag1", "tag2"]}

Rules:
- Pick the single best category from the list. If none fit well, use "Unsorted".
- Suggest 1-3 short, lowercase tags that describe the idea.
- Tags should be specific and useful for filtering (not generic like "idea" or "new").`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";

  // Parse JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as AiResult;

  // Validate category is in the list
  if (!categoryNames.includes(parsed.category)) {
    parsed.category = "Unsorted";
  }

  // Sanitize tags
  parsed.tags = (parsed.tags || [])
    .filter((t: unknown): t is string => typeof t === "string")
    .map((t: string) => t.toLowerCase().trim())
    .filter(Boolean)
    .slice(0, 5);

  return parsed;
}

export async function summarizeText(text: string): Promise<string> {
  if (!config.claudeApiKey) {
    throw new Error("Claude API key not configured");
  }

  const prompt = `Summarize this voice transcript into a short idea title (under 80 characters). Return ONLY the title text, nothing else.

Transcript: ${text}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text || text.slice(0, 80)).trim();
}

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  if (!config.claudeApiKey) {
    throw new Error("Claude API key not configured");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function generateClarification(title: string, body: string): Promise<Clarification> {
  const prompt = `You are helping someone clarify a new idea. Based on the idea below, draft a clarification with 7 fields.

Idea title: ${title}
${body ? `Idea details: ${body}` : ""}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "value_proposition": "<what value does this idea deliver? 1-2 sentences>",
  "problem": "<what specific problem does it solve? 1-2 sentences>",
  "target_audience": "<who is this for? be specific>",
  "key_differentiator": "<what makes this novel or uniquely effective? 1-2 sentences>",
  "technical_feasibility": "<can this be built? what tech is needed? complexity assessment, 1-2 sentences>",
  "market_feasibility": "<can this reach the market? distribution channels, regulations, barriers, 1-2 sentences>",
  "market_attractiveness": "<how big is the opportunity? market size, growth potential, demand, competition, 1-2 sentences>"
}`;

  const text = await callClaude(prompt, 800);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");
  const parsed = JSON.parse(jsonMatch[0]) as Clarification;
  return {
    value_proposition: String(parsed.value_proposition || ""),
    problem: String(parsed.problem || ""),
    target_audience: String(parsed.target_audience || ""),
    key_differentiator: String(parsed.key_differentiator || ""),
    technical_feasibility: String(parsed.technical_feasibility || ""),
    market_feasibility: String(parsed.market_feasibility || ""),
    market_attractiveness: String(parsed.market_attractiveness || ""),
    notes: "",
  };
}

export async function generateRubric(
  title: string,
  body: string,
  clarification: Clarification | null
): Promise<Rubric> {
  let context = `Idea title: ${title}`;
  if (body) context += `\nIdea details: ${body}`;
  if (clarification) {
    context += `\nValue proposition: ${clarification.value_proposition}`;
    context += `\nProblem: ${clarification.problem}`;
    context += `\nTarget audience: ${clarification.target_audience}`;
    context += `\nKey differentiator: ${clarification.key_differentiator}`;
  }

  const prompt = `You are creating an evaluation rubric for a specific idea. Generate 4-6 criteria that are highly relevant to evaluating THIS particular idea (not generic criteria).

${context}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "criteria": [
    {
      "name": "<short criterion name>",
      "description": "<what this criterion evaluates, 1 sentence>",
      "weight": <number 0-1, all weights must sum to 1.0>
    }
  ]
}

Rules:
- Generate 4-6 criteria specific to this idea's domain and context
- Weights must sum to exactly 1.0
- Higher weight = more important for this specific idea
- Be specific to the idea, not generic (e.g. "Recipe database coverage" not "Feasibility")`;

  const text = await callClaude(prompt, 800);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");
  const parsed = JSON.parse(jsonMatch[0]);

  const criteria = (parsed.criteria || []).map((c: Record<string, unknown>) => ({
    name: String(c.name || ""),
    description: String(c.description || ""),
    weight: Math.max(0, Math.min(1, Number(c.weight) || 0)),
    score: null,
    notes: "",
  }));

  // Normalize weights to sum to 1.0
  const totalWeight = criteria.reduce((sum: number, c: { weight: number }) => sum + c.weight, 0);
  if (totalWeight > 0) {
    for (const c of criteria) {
      c.weight = Math.round((c.weight / totalWeight) * 100) / 100;
    }
    // Fix rounding to ensure exact 1.0
    const diff = 1 - criteria.reduce((sum: number, c: { weight: number }) => sum + c.weight, 0);
    if (criteria.length > 0) criteria[0].weight = Math.round((criteria[0].weight + diff) * 100) / 100;
  }

  return { criteria };
}
