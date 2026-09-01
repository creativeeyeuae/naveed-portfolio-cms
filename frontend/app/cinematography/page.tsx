import { api } from "@/lib/api";

export default async function CinematographyPage() {
  const albums = (await api.albums.list({ type: "cinematography" }).catch(() => [])) as any[];

  return (
    <section className="pt-28">
      <div className="mx-auto max-w-7xl px-6">
        <h1 className="mb-8 font-serif text-4xl">Cinematography</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <a key={album.id} href={`/cinematography/${album.slug}`} className="group block">
              <div className="aspect-video overflow-hidden rounded-md bg-white/5">
                {album.coverMedia && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.coverMedia.webUrl ?? "/placeholder.jpg"}
                    alt={album.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <h3 className="mt-3 font-serif text-lg">{album.title}</h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
