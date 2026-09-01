"use client";

export interface AlbumListItem {
  id: string;
  title: string;
  type: "photography" | "cinematography";
  isPublished: boolean;
  isFeatured: boolean;
}

export function AlbumList({
  albums,
  onEdit,
  onDelete,
}: {
  albums: AlbumListItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-white/50">
        <tr>
          <th className="py-2">Title</th>
          <th className="py-2">Type</th>
          <th className="py-2">Status</th>
          <th className="py-2">Featured</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {albums.map((album) => (
          <tr key={album.id} className="border-t border-white/10">
            <td className="py-3">{album.title}</td>
            <td className="py-3 capitalize">{album.type}</td>
            <td className="py-3">{album.isPublished ? "Published" : "Draft"}</td>
            <td className="py-3">{album.isFeatured ? "★" : "—"}</td>
            <td className="py-3 text-right">
              <button onClick={() => onEdit(album.id)} className="mr-3 text-gold hover:underline">Edit</button>
              <button onClick={() => onDelete(album.id)} className="text-red-400 hover:underline">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
