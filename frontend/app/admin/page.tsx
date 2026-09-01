"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { StatsCards } from "../../../../admin/dashboard/StatsCards";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/summary`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStats([
        { label: "Page Views", value: data.pageViews ?? 0 },
        { label: "Gallery Views", value: data.galleryViews ?? 0 },
        { label: "Downloads", value: data.downloads ?? 0 },
        { label: "Bookings", value: data.bookings ?? 0 },
      ]);
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl">Dashboard</h1>
      <StatsCards stats={stats} />
    </div>
  );
}
