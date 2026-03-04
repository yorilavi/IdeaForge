import { readdir, readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import type { Idea, IdeaFrontmatter } from "../lib/types.js";
import { config } from "../lib/config.js";

const EXCERPT_LENGTH = 200;

export async function readIdeaFile(id: string): Promise<Idea | null> {
  const filePath = join(config.ideasDir, `${id}.md`);
  try {
    const raw = await readFile(filePath, "utf-8");
    const { data, content } = matter(raw);
    return {
      ...(data as IdeaFrontmatter),
      body: content.trim(),
    };
  } catch {
    return null;
  }
}

export async function writeIdeaFile(idea: Idea): Promise<void> {
  const filePath = join(config.ideasDir, `${idea.id}.md`);
  const { body, ...frontmatter } = idea;
  const content = matter.stringify(`\n${body}\n`, frontmatter);
  await writeFile(filePath, content, "utf-8");
}

export async function deleteIdeaFile(id: string): Promise<boolean> {
  const filePath = join(config.ideasDir, `${id}.md`);
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readAllIdeaFiles(): Promise<Idea[]> {
  const files = await readdir(config.ideasDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const ideas: Idea[] = [];
  for (const file of mdFiles) {
    const raw = await readFile(join(config.ideasDir, file), "utf-8");
    try {
      const { data, content } = matter(raw);
      if (data.id) {
        ideas.push({
          ...(data as IdeaFrontmatter),
          body: content.trim(),
        });
      }
    } catch {
      // Skip malformed files
    }
  }
  return ideas;
}

export function excerpt(body: string): string {
  if (body.length <= EXCERPT_LENGTH) return body;
  return body.slice(0, EXCERPT_LENGTH).trimEnd() + "...";
}
