"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";
import { AlbumList, type AlbumListItem } from "@/components/AlbumList";
import { AlbumForm, type AlbumFormValues } from "@/components/AlbumForm";

export default function AdminPortfolioPage() {
  const [albums, setAlbums] = useState<AlbumListItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  const loadAlbums = async () => {
    const list = (await api.albums.list()) as AlbumListItem[];
    setAlbums(list);
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  const getToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const handleCreate = async (values: AlbumFormValues) => {
    const token = await getToken();
    await api.albums.create(values, token);
    setShowForm(false);
    await loadAlbums();
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    await api.albums.remove(id, token);
    await loadAlbums();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Photography & Cinematography</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded bg-gold px-4 py-2 font-medium text-ink">
          {showForm ? "Cancel" : "New Album"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg bg-white/5 p-6">
          <AlbumForm onSubmit={handleCreate} />
        </div>
      )}

      <AlbumList albums={albums} onEdit={() => {}} onDelete={handleDelete} />
    </div>
  );
}
