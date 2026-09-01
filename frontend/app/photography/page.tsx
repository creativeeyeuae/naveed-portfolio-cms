import { api } from "@/lib/api";
import { MasonryGrid, type MasonryItem } from "@/components/MasonryGrid";

export default async function PhotographyPage() {
  const albums = (await api.albums.list({ type: "photography" }).catch(() => [])) as any[];

  const items: MasonryItem[] = albums.flatMap((album) =>
    album.coverMedia
      ? [{
          id: album.id,
          title: album.title,
          slug: album.slug,
          orientation: album.coverMedia.orientation ?? "landscape",
          imageUrl: album.coverMedia.webUrl ?? "/placeholder.jpg",
        }]
      : []
  );

  return (
    <section className="pt-28">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="mb-8 font-serif text-4xl">Photography</h1>
        <MasonryGrid items={items} />
      </div>
    </section>
  );
}
