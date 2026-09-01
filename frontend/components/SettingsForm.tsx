"use client";

import { useState } from "react";

export function SettingsForm({
  settings,
  onSave,
}: {
  settings: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [values, setValues] = useState(settings);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const handleSave = async (key: string) => {
    setSavingKey(key);
    try {
      await onSave(key, values[key]);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(values).map(([key, value]) => (
        <div key={key} className="flex items-center gap-3">
          <label className="w-48 text-sm text-white/60">{key}</label>
          <input
            value={value}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            className="flex-1 rounded bg-white/5 px-3 py-2"
          />
          <button
            onClick={() => handleSave(key)}
            disabled={savingKey === key}
            className="rounded bg-gold px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {savingKey === key ? "Saving…" : "Save"}
          </button>
        </div>
      ))}
    </div>
  );
}
