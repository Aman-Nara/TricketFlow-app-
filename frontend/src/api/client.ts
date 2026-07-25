import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "eventhub_token";

export type ApiError = { status: number; detail: string };

async function request<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}/api${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || res.statusText || "Request failed";
    const err: ApiError = { status: res.status, detail: String(detail) };
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: any) =>
    request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(p: string, body?: any) =>
    request<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(p: string) => request<T>(p, { method: "DELETE" }),
};

// ---- types ----
export type Role = "user" | "organizer" | "admin";
export type User = { id: string; email: string; name: string; role: Role; created_at: string };
export type Event = {
  id: string; title: string; description: string; category: string; location: string;
  starts_at: string; price: number; capacity: number; cover_image: string;
  organizer_id: string; organizer_name: string; registered_count: number; created_at: string;
};
export type Registration = {
  id: string; event_id: string; user_id: string; ticket_code: string;
  status: string; created_at: string; event?: Event;
};
export type Message = {
  id: string; event_id: string; user_id: string; user_name: string;
  text: string; created_at: string;
};
export type GalleryItem = {
  id: string; event_id: string; user_id: string; user_name: string;
  image: string; caption: string; created_at: string;
};
export type Review = {
  id: string; event_id: string; user_id: string; user_name: string;
  rating: number; comment: string; created_at: string;
};
export type Notification = {
  id: string; user_id: string; title: string; body: string;
  event_id?: string | null; read: boolean; created_at: string;
};
export type AdminStats = {
  total_users: number; total_organizers: number; total_events: number;
  total_registrations: number; total_reviews: number; total_revenue: number;
  recent_events: Event[]; recent_users: User[];
};
