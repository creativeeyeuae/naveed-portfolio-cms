import { api } from "@/lib/api";
import { MasonryGrid, type MasonryItem } from "@/components/MasonryGrid";

export default async function HomePage() {
  const featured = (await api.albums.list({ featured: true }).catch(() => [])) as any[];

  const items: MasonryItem[] = featured.flatMap((album) =>
    album.coverMedia
      ? [{
          id: album.coverMedia.id,
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
        <h1 className="mb-2 font-serif text-5xl">Creative Fusion</h1>
        <p className="mb-10 max-w-xl text-white/70">
          Cinematic photography and film by Naveed Anjum — over 20 years crafting
          imagery across landscape, portrait, editorial, commercial, and beyond.
        </p>
        {items.length > 0 ? (
          <MasonryGrid items={items} />
        ) : (
          <p className="text-white/40">Featured work will appear here once albums are published.</p>
        )}
      </div>
    </section>
  );
}
