import { INDUSTRIES } from "@/lib/constants";

/**
 * Shared lead-quality helpers: normalization, dedupe fingerprints and a
 * transparent, explainable lead score. Used by lead generation, CSV import,
 * manual creation and AI research so every path stamps leads identically.
 */

/** Digits only — the canonical key for phone comparison. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits || null;
}

/** Lowercased, trimmed email — the canonical key for email comparison. */
export function normalizeEmail(raw: string | null | undefined): string | null {
  const e = (raw ?? "").trim().toLowerCase();
  return e || null;
}

/** Web URL's hostname without www/m. subdomains. */
export function normalizeDomain(raw: string | null | undefined): string | null {
  let url = (raw ?? "").trim().toLowerCase();
  if (!url) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(url)) url = `https://${url}`;
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/^m\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}

/** Business-name key: lowercased, whitespace collapsed, legal suffix stripped. */
export function normalizeName(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(
      /\b(inc|llc|ltd|limited|corp|corporation|co|company|gmbh|srl|plc|pvt|lp|llp)\b\.?$/i,
      ""
    )
    .trim()
    .toLowerCase();
  return cleaned || null;
}

export interface FingerprintInput {
  name?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
}

/** Compute the normalized dedupe keys for a lead/business. */
export function fingerprint(input: FingerprintInput): {
  fp_domain: string | null;
  fp_phone: string | null;
  fp_name_city: string | null;
  fp_name_address: string | null;
} {
  const name = normalizeName(input.name);
  const city = (input.city ?? "").trim().toLowerCase() || null;
  const address = normalizeName(input.address);
  return {
    fp_domain: normalizeDomain(input.website),
    fp_phone: normalizePhone(input.phone),
    fp_name_city: name && city ? `${name}|${city}` : null,
    fp_name_address: name && address ? `${name}|${address}` : null,
  };
}

export interface ScoreInput {
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
}

/**
 * Transparent, explainable lead score (max 50). Every point maps to a reason
 * the user can see — there are no opaque/averaged factors.
 */
export function computeLeadScore(input: ScoreInput): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  const grant = (label: string, points: number, ok: boolean) => {
    if (ok) {
      score += points;
      reasons.push(label);
    }
  };

  grant("Website", 10, Boolean(input.website));
  grant("Phone", 10, Boolean(input.phone));
  grant("Email", 10, Boolean(input.email));
  grant("Complete address", 5, Boolean(input.address));
  grant("Known industry", 10, Boolean(input.industry && input.industry !== "Other"));
  grant("Business location", 5, Boolean(input.city && input.country));

  return { score, reasons };
}

/** Tags: split a comma-separated string into a clean required-unique array. */
export function parseTags(raw: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (raw ?? "")
        .split(/[\n,]/)
        .map((t) => t.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .map((t) => t[0].toUpperCase() + t.slice(1))
    )
  ).slice(0, 20);
}

/**
 * Map any raw industry label (OSM tag, Google category, AI output, free text)
 * to an allowed pipeline industry. Returns `fallback` (default "Other") when
 * nothing matches, so every lead lands on a valid pipeline column.
 */
export function mapToAllowedIndustry(
  raw: string | null | undefined,
  fallback: string | null = "Other"
): string | null {
  const v = (raw ?? "").trim();
  if (!v) return fallback;
  const allowed = INDUSTRIES as readonly string[];
  const lower = v.toLowerCase();

  const exact = allowed.find((i) => i.toLowerCase() === lower);
  if (exact) return exact;

  const map: Array<[RegExp, string]> = [
    [/restaurant|diner|bakery|cafe|coffee|bar|pub|food/i, "Food & Beverage"],
    [/hotel|inn|resort|hostel|bed and breakfast/i, "Hospitality"],
    [/dentist|clinic|hospital|pharmac|doctor|medic|health|physio/i, "Healthcare"],
    [/gym|fitness|yoga|spa|wellness|pilates/i, "Wellness & Fitness"],
    [/salon|barber|beauty|nail|tanning/i, "Beauty & Personal Care"],
    [/lawyer|attorney|legal|notary|law ?firm/i, "Legal Services"],
    [/accountant|bookkeeping|insurance|bank|cpa|financial/i, "Financial Services"],
    [/estate|property|realtor|rental agency/i, "Real Estate"],
    [/software|computer|developer|digital|web|it ?services|technology/i, "IT Services"],
    [/automotive|auto repair|car wash|dealer|garage|mechanic/i, "Automotive"],
    [/school|tutor|education|training|academy|college/i, "Education"],
    [/construct|contractor|roof|plumb|electric|hvac|paint|remodel/i, "Construction"],
    [/home|cleaning|lawn|landscap|janitorial/i, "Home Services"],
    [/supermarket|grocery|market|store|shop|retail|mall|outlet/i, "Retail"],
    [/logistics|freight|delivery|transport|shipping|warehouse/i, "Logistics"],
    [/manufactur|factory|industrial|machine/i, "Manufacturing"],
    [/travel|tour|cruise/i, "Travel & Tourism"],
    [/vet|pet|grooming/i, "Pet Services"],
    [/consult|lobby|strategy/i, "Consulting"],
    [/media|news|advertis|marketing/i, "Media"],
    [/telecom|phone|mobile|internet provider/i, "Telecom"],
    [/energy|solar|electric|oil|gas|utility/i, "Energy"],
    [/farm|agriculture|agri/i, "Agriculture"],
    [/landscap|garden center/i, "Cleaning & Landscaping"],
    [/accounting|tax/i, "Financial Services"],
  ];
  for (const [re, ind] of map) if (re.test(lower)) return ind;
  return fallback;
}