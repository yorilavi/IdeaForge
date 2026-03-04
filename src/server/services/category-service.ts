import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { parse, stringify } from "yaml";
import type { Category, CategoryFile } from "../lib/types.js";
import { config } from "../lib/config.js";

let cached: CategoryFile | null = null;

function filePath(): string {
  return join(config.ideasDir, "categories.yaml");
}

export async function loadCategories(): Promise<CategoryFile> {
  if (cached) return cached;
  const raw = await readFile(filePath(), "utf-8");
  cached = parse(raw) as CategoryFile;
  return cached;
}

async function saveCategories(data: CategoryFile): Promise<void> {
  await writeFile(filePath(), stringify(data, { lineWidth: 120 }), "utf-8");
  cached = data;
}

export function getCategoryNames(): Promise<string[]> {
  return loadCategories().then((f) =>
    f.categories.map((c) => c.name)
  );
}

export async function addCategory(cat: Category): Promise<CategoryFile> {
  const data = await loadCategories();
  if (data.categories.some((c) => c.name === cat.name)) {
    throw new Error(`Category "${cat.name}" already exists`);
  }
  // Insert before "Unsorted" (always last)
  const unsortedIdx = data.categories.findIndex((c) => c.name === "Unsorted");
  if (unsortedIdx >= 0) {
    data.categories.splice(unsortedIdx, 0, cat);
  } else {
    data.categories.push(cat);
  }
  await saveCategories(data);
  return data;
}

export async function updateCategory(name: string, updates: Partial<Category>): Promise<CategoryFile> {
  const data = await loadCategories();
  const idx = data.categories.findIndex((c) => c.name === name);
  if (idx < 0) throw new Error(`Category "${name}" not found`);
  data.categories[idx] = { ...data.categories[idx], ...updates };
  await saveCategories(data);
  return data;
}

export async function deleteCategory(name: string): Promise<CategoryFile> {
  if (name === "Unsorted") throw new Error("Cannot delete Unsorted");
  const data = await loadCategories();
  const idx = data.categories.findIndex((c) => c.name === name);
  if (idx < 0) throw new Error(`Category "${name}" not found`);
  const [removed] = data.categories.splice(idx, 1);
  data.retired.push({ name: removed.name });
  await saveCategories(data);
  return data;
}
