import { useState } from "preact/hooks";

interface Category {
  name: string;
  description: string;
  color: string;
}

interface Props {
  categories: Category[];
  onBack: () => void;
  onChanged: () => void;
}

export function CategoryManager({ categories, onBack, onChanged }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#95A5A6");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (cat: Category) => {
    setEditing(cat.name);
    setName(cat.name);
    setDescription(cat.description);
    setColor(cat.color);
    setAdding(false);
    setError("");
  };

  const startAdd = () => {
    setAdding(true);
    setEditing(null);
    setName("");
    setDescription("");
    setColor("#95A5A6");
    setError("");
  };

  const cancel = () => {
    setEditing(null);
    setAdding(false);
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      if (adding) {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim(), color }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to add");
          return;
        }
      } else if (editing) {
        const res = await fetch(`/api/categories/${encodeURIComponent(editing)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim(), color }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update");
          return;
        }
      }
      cancel();
      onChanged();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (catName: string) => {
    if (!confirm(`Delete category "${catName}"? Ideas using it will keep their current category.`)) return;
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(catName)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete");
        return;
      }
      onChanged();
    } catch {
      setError("Network error");
    }
  };

  const isEditing = editing || adding;

  return (
    <div class="category-manager">
      <div class="detail-header">
        <button class="back-btn" onClick={onBack}>← Back</button>
        <h2>Manage Categories</h2>
      </div>

      {error && <div class="capture-flash error">{error}</div>}

      {isEditing && (
        <div class="category-form">
          <input
            type="text"
            class="capture-title"
            placeholder="Category name\u2026"
            aria-label="Category name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            disabled={saving}
          />
          <input
            type="text"
            class="capture-title"
            placeholder="Description (optional)\u2026"
            aria-label="Category description"
            value={description}
            onInput={(e) => setDescription((e.target as HTMLInputElement).value)}
            disabled={saving}
          />
          <div class="category-color-row">
            <label>Color:</label>
            <input
              type="color"
              value={color}
              onInput={(e) => setColor((e.target as HTMLInputElement).value)}
              disabled={saving}
            />
            <span class="color-preview" style={{ background: color }}>{color}</span>
          </div>
          <div class="category-form-actions">
            <button class="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving\u2026" : adding ? "Add" : "Save"}
            </button>
            <button class="btn-secondary" onClick={cancel} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      <div class="category-list">
        {categories.map((cat) => (
          <div class="category-item" key={cat.name}>
            <span class="category-swatch" style={{ background: cat.color }} />
            <div class="category-info">
              <strong>{cat.name}</strong>
              {cat.description && <span class="category-desc">{cat.description}</span>}
            </div>
            {cat.name !== "Unsorted" && (
              <div class="category-actions">
                <button class="btn-small" onClick={() => startEdit(cat)}>Edit</button>
                <button class="btn-small btn-danger" onClick={() => handleDelete(cat.name)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!isEditing && (
        <button class="btn-primary add-category-btn" onClick={startAdd}>+ Add Category</button>
      )}
    </div>
  );
}
