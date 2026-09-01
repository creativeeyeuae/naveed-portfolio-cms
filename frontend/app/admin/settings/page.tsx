"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";
import { SettingsForm } from "../../../../admin/settings/SettingsForm";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const data = await api.settings.list();
      setSettings(data as Record<string, string>);
    })();
  }, []);

  const handleSave = async (key: string, value: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await api.settings.update(key, value, session?.access_token ?? "");
  };

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl">Settings</h1>
      <SettingsForm settings={settings} onSave={handleSave} />
    </div>
  );
}
