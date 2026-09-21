import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isBefore, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, fmt = "MMM d, yyyy") {
  if (!date) return "—";
  try {
    return format(typeof date === "string" ? parseISO(date) : date, fmt);
  } catch {
    return "—";
  }
}

export function formatDateTime(date: string | Date | null | undefined, fmt = "MMM d, yyyy h:mm a") {
  if (!date) return "—";
  try {
    return format(typeof date === "string" ? parseISO(date) : date, fmt);
  } catch {
    return "—";
  }
}

export function timeAgo(date: string | Date | null | undefined) {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function isDueToday(date: string | Date | null | undefined) {
  if (!date) return false;
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return isToday(d);
  } catch {
    return false;
  }
}

export function isOverdue(date: string | Date | null | undefined) {
  if (!date) return false;
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return isBefore(d, new Date());
  } catch {
    return false;
  }
}

export function stripNonDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Build a clean tel: href from a phone number */
export function telHref(phone: string | null | undefined) {
  if (!phone) return "#";
  const digits = stripNonDigits(phone);
  return digits.length ? `tel:+${digits}` : "#";
}

/** Build a wa.me deep link. Removes spaces/dashes; keeps country format friendly. */
export function whatsappHref(phone: string | null | undefined) {
  if (!phone) return "#";
  const digits = stripNonDigits(phone);
  if (!digits.length) return "#";
  const withCountry = /^1|^52|^44|^91|^971/.test(digits)
    ? digits
    : digits.length <= 10
      ? `1${digits}`
      : digits;
  return `https://wa.me/${withCountry}`;
}

export function mailtoHref(email: string | null | undefined) {
  if (!email) return "#";
  return `mailto:${email}`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function toISODateTimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function dateInputValue(date: string | Date | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function download(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;