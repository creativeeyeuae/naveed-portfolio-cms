// Thin fetch wrapper to the Cloudflare Workers backend.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: options.cache ?? "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  albums: {
    list: (params?: { type?: "photography" | "cinematography"; featured?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set("type", params.type);
      if (params?.featured) qs.set("featured", "true");
      return request(`/albums?${qs.toString()}`);
    },
    get: (slug: string) => request(`/albums/${slug}`),
    create: (data: unknown, token: string) =>
      request("/albums", { method: "POST", body: JSON.stringify(data) }, token),
    update: (id: string, data: unknown, token: string) =>
      request(`/albums/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
    remove: (id: string, token: string) =>
      request(`/albums/${id}`, { method: "DELETE" }, token),
  },
  bookings: {
    create: (data: unknown) => request("/bookings", { method: "POST", body: JSON.stringify(data) }),
    list: (token: string) => request("/bookings", {}, token),
    updateStatus: (id: string, status: string, token: string) =>
      request(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  },
  contact: {
    create: (data: unknown) => request("/contact", { method: "POST", body: JSON.stringify(data) }),
  },
  testimonials: {
    list: () => request("/testimonials"),
  },
  settings: {
    list: () => request<Record<string, unknown>>("/settings"),
    update: (key: string, value: unknown, token: string) =>
      request(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }, token),
  },
  galleryAccess: {
    unlock: (albumId: string, password: string) =>
      request("/gallery-access/unlock", { method: "POST", body: JSON.stringify({ albumId, password }) }),
  },
};
