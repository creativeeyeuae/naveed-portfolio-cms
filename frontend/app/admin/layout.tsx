import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/portfolio", label: "Photography & Cinematography" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink text-white">
      <aside className="w-64 border-r border-white/10 p-6">
        <h2 className="mb-8 font-serif text-xl">Creative Fusion Admin</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
