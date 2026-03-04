import { Hono } from "hono";
import {
  loadCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../services/category-service.js";

const categories = new Hono();

categories.get("/", async (c) => {
  const data = await loadCategories();
  return c.json(data);
});

categories.post("/", async (c) => {
  try {
    const { name, description, color } = await c.req.json();
    if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
    const data = await addCategory({
      name: name.trim(),
      description: description?.trim() || "",
      color: color || "#95A5A6",
    });
    return c.json(data, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add category";
    return c.json({ error: msg }, 400);
  }
});

categories.put("/:name", async (c) => {
  try {
    const name = decodeURIComponent(c.req.param("name"));
    const updates = await c.req.json();
    const data = await updateCategory(name, updates);
    return c.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update category";
    return c.json({ error: msg }, 400);
  }
});

categories.delete("/:name", async (c) => {
  try {
    const name = decodeURIComponent(c.req.param("name"));
    const data = await deleteCategory(name);
    return c.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete category";
    return c.json({ error: msg }, 400);
  }
});

export { categories };
