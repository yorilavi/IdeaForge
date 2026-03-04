export type Stage = "captured" | "clarified" | "evaluated" | "decided";
export type Source = "pwa" | "voice" | "shortcut" | "api";
export type AiStatus = "none" | "pending" | "done" | "failed";
export type Decision = "pursue" | "shelve" | "merge" | "drop";

export interface Clarification {
  value_proposition: string;
  problem: string;
  target_audience: string;
  key_differentiator: string;
  technical_feasibility: string;
  market_feasibility: string;
  market_attractiveness: string;
  notes: string;
}

export interface RubricCriterion {
  name: string;
  description: string;
  weight: number;
  score: number | null;
  notes: string;
}

export interface Rubric {
  criteria: RubricCriterion[];
}

export interface IdeaFrontmatter {
  id: string;
  title: string;
  created: string;
  updated: string;
  stage: Stage;
  category: string;
  tags: string[];
  source: Source;
  ai_status: AiStatus;
  decision: Decision | null;
  decision_technical_feasibility: string;
  decision_market_feasibility: string;
  decision_window_of_opportunity: string;
  decision_six_month_vision: string;
  score: number | null;
  clarification: Clarification | null;
  rubric: Rubric | null;
}

export interface Idea extends IdeaFrontmatter {
  body: string;
}

export interface IdeaSummary extends IdeaFrontmatter {
  excerpt: string;
}

export interface CreateIdeaInput {
  title: string;
  body?: string;
  source?: Source;
  category?: string;
  tags?: string[];
}

export interface QuickCaptureInput {
  text: string;
  source?: Source;
}

export interface UpdateIdeaInput {
  title?: string;
  body?: string;
  category?: string;
  tags?: string[];
  stage?: Stage;
  score?: number;
  decision?: Decision;
  decision_technical_feasibility?: string;
  decision_market_feasibility?: string;
  decision_window_of_opportunity?: string;
  decision_six_month_vision?: string;
  clarification?: Clarification;
  rubric?: Rubric;
}

export interface Category {
  name: string;
  description: string;
  color: string;
}

export interface CategoryFile {
  version: number;
  categories: Category[];
  retired: { name: string }[];
}

export interface IdeasListResponse {
  ideas: IdeaSummary[];
  total: number;
}
