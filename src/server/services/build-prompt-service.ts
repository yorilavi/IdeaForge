import type { Clarification, Idea } from "../lib/types.js";
import { isAiEnabled, generateBuildScope } from "./ai-service.js";

// The three clarification fields a build prompt can't be written without.
const REQUIRED_FIELDS: { key: keyof Clarification; label: string }[] = [
  { key: "value_proposition", label: "value proposition" },
  { key: "problem", label: "problem solved" },
  { key: "target_audience", label: "target audience" },
];

// Used when AI is not configured: Claude Code derives the scope itself,
// guided by the same structure the AI scope follows.
const DEFAULT_SCOPE = `Derive the scope from the idea above and include it in your plan:

- **Platform:** the form factor that fits how this audience would use it (web app, mobile-first web app, CLI, browser extension, ...).
- **Core user journey:** the shortest path from a first-time user arriving to them getting the value described above.
- **MVP features:** 3-6 features, each directly addressing part of the problem.
- **Screens and data model:** only what those features need.
- **Sample data:** realistic seed content written for this audience, so the demo feels real on first run.
- **Out of scope:** what you are deliberately leaving out (auth, payments, real integrations, ...) and what you mock instead.`;

// "a", "a and b", "a, b and c"
export function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function missingBuildPromptFields(clarification: Clarification | null): string[] {
  return REQUIRED_FIELDS
    .filter((f) => !clarification?.[f.key]?.trim())
    .map((f) => f.label);
}

export async function createBuildPrompt(idea: Idea): Promise<string> {
  const c = idea.clarification!;
  const scope = isAiEnabled()
    ? await generateBuildScope(idea.title, idea.body, c)
    : DEFAULT_SCOPE;

  const ideaLines = [
    `**Value proposition:** ${c.value_proposition.trim()}`,
    `**Problem it solves:** ${c.problem.trim()}`,
    `**Target audience:** ${c.target_audience.trim()}`,
  ];
  if (c.key_differentiator?.trim()) ideaLines.push(`**What makes it different:** ${c.key_differentiator.trim()}`);
  if (c.technical_feasibility?.trim()) ideaLines.push(`**Technical notes:** ${c.technical_feasibility.trim()}`);
  if (c.notes?.trim()) ideaLines.push(`**Notes:** ${c.notes.trim()}`);
  if (idea.body.trim()) ideaLines.push(`**Original description:** ${idea.body.trim()}`);

  return `# Build a working demo: ${idea.title}

I have a product idea and want to see it working. Build a runnable first version that someone from the target audience could actually use: not a mockup or a slide deck, but a real app with working interactions and realistic data.

## The idea

${ideaLines.join("\n\n")}

## What to build

${scope}

## How to work

- Start with a short plan in \`PLAN.md\` covering the stack, project layout, and build order. Then build it; only stop to ask if something is genuinely ambiguous.
- Choose a simple, mainstream stack that installs and runs locally with one command. Running the demo must not require external databases, accounts, or API keys.
- Build the core journey end to end before adding anything else. One flow that works and feels finished matters more than breadth.
- Mock third-party services (payments, email, external APIs, AI calls) behind a small interface so they can be swapped for real ones later.
- Make it look intentional: clean layout, readable typography, and sensible empty and loading states. The audience should take it seriously at first glance.
- Run the app and walk through the core journey yourself. Fix whatever breaks before calling it done.

## Done when

- A single documented command starts the app locally.
- A first-time user from the target audience can complete the core journey without help.
- The value proposition is obvious within the first minute of use.
- \`README.md\` explains how to run it, what is real versus mocked, and what you would build next.
`;
}
