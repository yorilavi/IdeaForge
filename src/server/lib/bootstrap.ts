import { mkdir, access, writeFile } from "fs/promises";
import { join } from "path";
import { stringify } from "yaml";
import { config } from "./config.js";

// Default taxonomy written to a fresh data directory so the app works
// out-of-the-box on a clean clone or an empty mounted volume.
const DEFAULT_CATEGORIES = {
  version: 1,
  categories: [
    { name: "Product Ideas", description: "New products, features, or services", color: "#4A90D9" },
    { name: "Business", description: "Business models, revenue, partnerships", color: "#D9534F" },
    { name: "Content & Writing", description: "Blog posts, essays, talks", color: "#5CB85C" },
    { name: "Technical", description: "Engineering approaches, tools, architecture", color: "#F0AD4E" },
    { name: "Personal", description: "Life improvements, habits, hobbies", color: "#9B59B6" },
    { name: "Creative", description: "Art, music, design, side projects", color: "#4baf9b" },
    { name: "Unsorted", description: "Not yet categorized", color: "#95A5A6" },
  ],
  retired: [],
};

// Ensure the ideas data directory exists and has a categories.yaml.
// Idempotent: never overwrites an existing taxonomy.
export async function bootstrapDataDir(): Promise<void> {
  await mkdir(config.ideasDir, { recursive: true });

  const categoriesPath = join(config.ideasDir, "categories.yaml");
  try {
    await access(categoriesPath);
  } catch {
    await writeFile(categoriesPath, stringify(DEFAULT_CATEGORIES, { lineWidth: 120 }), "utf-8");
    console.log(`Created default categories.yaml in ${config.ideasDir}`);
  }
}
