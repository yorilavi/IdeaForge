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
  score: number | null;
  decision: string | null;
}

interface Props {
  idea: IdeaSummary;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function IdeaCard({ idea, onClick }: Props) {
  return (
    <div class={`idea-card stage-${idea.stage}`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}>
      <div class="idea-card-header">
        <h3 class="idea-card-title">{idea.title}</h3>
        <span class="idea-card-time">{timeAgo(idea.created)}</span>
      </div>
      {idea.excerpt && <p class="idea-card-excerpt">{idea.excerpt}</p>}
      <div class="idea-card-meta">
        <span class={`idea-card-stage stage-${idea.stage}`}>{idea.stage}</span>
        {idea.category !== "Unsorted" && (
          <span class="idea-card-category">{idea.category}</span>
        )}
        {idea.score !== null && idea.score !== undefined && (
          <span class="idea-card-score">{idea.score}/10</span>
        )}
        {idea.decision && (
          <span class={`idea-card-stage stage-decided`}>{idea.decision}</span>
        )}
        {idea.tags.map((tag) => (
          <span key={tag} class="idea-card-tag">{tag}</span>
        ))}
        {idea.ai_status === "pending" && (
          <span class="idea-card-ai ai-pending">AI...</span>
        )}
        {idea.ai_status === "failed" && (
          <span class="idea-card-ai ai-failed">AI err</span>
        )}
        <span class="idea-card-source">{idea.source}</span>
      </div>
    </div>
  );
}
