import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The API sends monetary values as decimal strings (class-validator
 * @IsNumberString). Never coerce through a float for display of large
 * sums — Number() is fine here since these are UI-only formats, but
 * keep the source string for anything sent back to the API.
 *
 * Uses the "NGN" prefix instead of the ₦ symbol (Intl's currency
 * formatter) deliberately — neither Inter nor IBM Plex Mono carry a
 * correct glyph for U+20A6, so Windows substitutes a fallback glyph
 * that renders as a struck-through N. Plain ASCII "NGN" has zero
 * glyph-coverage risk on any device/font.
 */
export function formatMoney(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
  return `NGN ${formatted}`;
}

export function formatNumber(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-NG").format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function initials(first?: string | null, last?: string | null) {
  return `${(first ?? "?").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase();
}

export type Tone = "primary" | "secondary" | "danger" | "info" | "neutral";

/** Maps every status enum used across the API to a single tone so the
 * <StatusPill> component looks consistent across every page. */
export function statusTone(status: string | null | undefined): Tone {
  const s = (status ?? "").toLowerCase();
  if (["active", "approved", "completed", "credited", "success", "paid"].includes(s))
    return "primary";
  if (["pending", "processing", "in_review", "submitted"].includes(s)) return "secondary";
  if (["suspended", "blocked", "rejected", "failed", "debited", "cancelled", "canceled"].includes(s))
    return "danger";
  if (["closed", "resolved"].includes(s)) return "info";
  return "neutral";
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidNigerianPhone(value: string) {
  if (!value) return true; // optional field
  return /^(\+234|0)[789][01]\d{8}$/.test(value.trim());
}

export function isValidUsername(value: string) {
  return /^[a-zA-Z0-9_]{3,30}$/.test(value.trim());
}

/**
 * Resolves a possibly-relative file URL (e.g. "/uploads/xyz.png", as
 * returned by our own upload endpoint) against the API's origin, so
 * links/images work regardless of whether the frontend and backend are
 * on different hosts. Absolute URLs are returned unchanged.
 */
export function resolveFileUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  return `${apiUrl.replace(/\/api$/, "")}${url}`;
}
