import type { Clarification, Idea, Rubric } from "../lib/types.js";

const STAGE_ORDER = ["captured", "clarified", "evaluated", "decided"];

const CLARIFICATION_FIELDS: { key: keyof Clarification; label: string }[] = [
  { key: "value_proposition", label: "Value Proposition" },
  { key: "problem", label: "Problem Solved" },
  { key: "target_audience", label: "Target Audience" },
  { key: "key_differentiator", label: "Key Differentiator" },
  { key: "technical_feasibility", label: "Technical Feasibility" },
  { key: "market_feasibility", label: "Market Feasibility" },
  { key: "market_attractiveness", label: "Market Attractiveness" },
  { key: "notes", label: "Notes" },
];

const DECISION_FIELDS: { key: keyof Idea; label: string }[] = [
  { key: "decision_technical_feasibility", label: "Technical Feasibility" },
  { key: "decision_market_feasibility", label: "Market Feasibility" },
  { key: "decision_window_of_opportunity", label: "Window of Opportunity" },
  { key: "decision_six_month_vision", label: "6-Month Vision" },
];

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// Hand-edited frontmatter can hold unquoted timestamps, which YAML parses as Dates
function formatDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Same weighting as the rubric panel: weighted average of the scored criteria, out of 10
function rubricScore(rubric: Rubric | null): number | null {
  const scored = (rubric?.criteria || []).filter((c) => c.score !== null);
  const weightSum = scored.reduce((sum, c) => sum + c.weight, 0);
  if (weightSum <= 0) return null;
  const total = scored.reduce((sum, c) => sum + c.weight * (c.score || 0), 0);
  return Math.round((total / weightSum) * 10) / 10;
}

function tableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>").trim() || "—";
}

// Fence longer than any backtick run inside, so embedded code blocks survive
function fenced(content: string): string {
  const longest = Math.max(0, ...(content.match(/`+/g) || []).map((m) => m.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}markdown\n${content.trimEnd()}\n${fence}`;
}

function labelled(label: string, value: string): string {
  return `**${label}**\n\n${value}`;
}

// Renders one idea; `level` is the heading level of its title (1 standalone, deeper when nested)
export function renderIdeaMarkdown(idea: Idea, level = 1): string {
  const h = (depth: number) => "#".repeat(Math.min(6, level + depth));
  const out: string[] = [`${h(0)} ${idea.title}`];

  const score = rubricScore(idea.rubric) ?? idea.score;
  const overview: [string, string][] = [["Stage", capitalize(idea.stage)]];
  if (idea.decision) overview.push(["Decision", capitalize(idea.decision)]);
  if (score !== null && score !== undefined) overview.push(["Score", `${score} / 10`]);
  overview.push(["Category", idea.category]);
  if (idea.tags?.length) overview.push(["Tags", idea.tags.join(", ")]);
  overview.push(["Created", formatDate(idea.created)]);
  overview.push(["Updated", formatDate(idea.updated)]);
  overview.push(["Source", idea.source]);
  out.push(["| | |", "|---|---|", ...overview.map(([k, v]) => `| **${k}** | ${tableCell(v)} |`)].join("\n"));

  if (text(idea.body)) {
    out.push(`${h(1)} Description`, text(idea.body));
  }

  const answered = CLARIFICATION_FIELDS.filter((f) => text(idea.clarification?.[f.key]));
  if (answered.length > 0) {
    out.push(`${h(1)} Clarification`);
    for (const f of answered) out.push(labelled(f.label, text(idea.clarification![f.key])));
  }

  const criteria = idea.rubric?.criteria || [];
  if (criteria.length > 0) {
    out.push(`${h(1)} Evaluation`);
    const scoredCount = criteria.filter((c) => c.score !== null).length;
    const rubricTotal = rubricScore(idea.rubric);
    out.push(rubricTotal !== null
      ? `Weighted score: **${rubricTotal} / 10** (${scoredCount} of ${criteria.length} criteria scored)`
      : `Not scored yet (${criteria.length} criteria)`);
    out.push([
      "| Criterion | Description | Weight | Score | Notes |",
      "|---|---|---|---|---|",
      ...criteria.map((c) =>
        `| ${tableCell(c.name)} | ${tableCell(c.description)} | ${Math.round(c.weight * 100)}% | ${c.score ?? "—"} | ${tableCell(c.notes || "")} |`
      ),
    ].join("\n"));
  }

  const decisionAnswers = DECISION_FIELDS.filter((f) => text(idea[f.key]));
  if (idea.decision || decisionAnswers.length > 0) {
    out.push(`${h(1)} Decision`);
    if (idea.decision) out.push(`**Decision:** ${capitalize(idea.decision)}`);
    for (const f of decisionAnswers) out.push(labelled(f.label, text(idea[f.key])));
  }

  if (text(idea.build_prompt)) {
    out.push(`${h(1)} Build Prompt`, fenced(text(idea.build_prompt)));
  }

  return out.join("\n\n") + "\n";
}

export function renderAllIdeasMarkdown(ideas: Idea[], exportedAt = new Date()): string {
  const byNewest = (a: Idea, b: Idea) => String(b.created).localeCompare(String(a.created));
  const groups = STAGE_ORDER.map((stage) => ({
    name: capitalize(stage),
    ideas: ideas.filter((i) => i.stage === stage).sort(byNewest),
  }));
  const other = ideas.filter((i) => !STAGE_ORDER.includes(i.stage)).sort(byNewest);
  if (other.length > 0) groups.push({ name: "Other", ideas: other });
  const nonEmpty = groups.filter((g) => g.ideas.length > 0);

  const out: string[] = [
    "# IdeaForge Export",
    `Exported ${formatDate(exportedAt)} · ${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}`,
  ];
  if (nonEmpty.length > 0) {
    out.push(nonEmpty.map((g) => `- **${g.name}:** ${g.ideas.length}`).join("\n"));
  }
  for (const g of nonEmpty) {
    out.push(`## ${g.name} (${g.ideas.length})`);
    out.push(g.ideas.map((i) => renderIdeaMarkdown(i, 3).trimEnd()).join("\n\n---\n\n"));
  }
  return out.join("\n\n") + "\n";
}

export function exportFilename(title: string, fallback: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${slug || fallback}.md`;
}
