"use client";

import { useState } from "react";

export interface AlbumFormValues {
  type: "photography" | "cinematography";
  title: string;
  slug: string;
  description?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export function AlbumForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<AlbumFormValues>;
  onSubmit: (values: AlbumFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<AlbumFormValues>({
    type: initial?.type ?? "photography",
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    isFeatured: initial?.isFeatured ?? false,
    isPublished: initial?.isPublished ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        value={values.type}
        onChange={(e) => setValues({ ...values, type: e.target.value as AlbumFormValues["type"] })}
        className="w-full rounded bg-white/5 px-4 py-2"
      >
        <option value="photography">Photography</option>
        <option value="cinematography">Cinematography</option>
      </select>

      <input
        placeholder="Title"
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        className="w-full rounded bg-white/5 px-4 py-2"
      />
      <input
        placeholder="Slug"
        value={values.slug}
        onChange={(e) => setValues({ ...values, slug: e.target.value })}
        className="w-full rounded bg-white/5 px-4 py-2"
      />
      <textarea
        placeholder="Description"
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        className="w-full rounded bg-white/5 px-4 py-2"
        rows={3}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isFeatured}
          onChange={(e) => setValues({ ...values, isFeatured: e.target.checked })}
        />
        Featured
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isPublished}
          onChange={(e) => setValues({ ...values, isPublished: e.target.checked })}
        />
        Published
      </label>

      <button type="submit" disabled={saving} className="rounded bg-gold px-5 py-2 font-medium text-ink disabled:opacity-50">
        {saving ? "Saving…" : "Save Album"}
      </button>
    </form>
  );
}
