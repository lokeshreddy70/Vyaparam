import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function toArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.items)) return p.items as T[];
    if (Array.isArray(p.data)) return p.data as T[];
  }
  return [];
}

export function getListMeta(payload: unknown) {
  const fallback = { page: 1, limit: 20, total: 0 };
  if (!payload || typeof payload !== "object") return fallback;
  const p = payload as Record<string, unknown>;

  if (p.meta && typeof p.meta === "object") {
    const m = p.meta as Record<string, unknown>;
    return {
      page: Number(m.page ?? 1),
      limit: Number(m.limit ?? 20),
      total: Number(m.count ?? m.total ?? 0),
    };
  }

  return {
    page: Number(p.page ?? 1),
    limit: Number(p.limit ?? 20),
    total: Number(p.total ?? 0),
  };
}
