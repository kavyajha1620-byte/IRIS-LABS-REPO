import { INDUSTRIES } from "@/lib/constants";

export interface OsmBusiness {
  name: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  address: string;
  city: string | null;
  country: string | null;
  tags: Record<string, string>;
  lat: number | null;
  lon: number | null;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA = "IrisLabsCRM/1.0 (admin@irislabs.com)";

async function runOverpass(query: string, timeoutMs = 15_000): Promise<unknown[]> {
  let lastError: string = "OpenStreetMap search failed.";
  for (const url of OVERPASS_URLS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { elements?: unknown[] };
      if (Array.isArray(data?.elements)) return data.elements;
      return [];
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastError);
}

/**
 * Extract the business keyword and the place part from a query like
 * "plumbers in Miami" -> { keyword: "plumbers", place: "Miami" }.
 * The final word(s) after "in" are treated as the place.
 */
export function parseResearchQuery(
  query: string
): { keyword: string; place: string } {
  const q = (query ?? "").trim();
  if (!q) return { keyword: "", place: "" };

  const inMatch = q.match(/^(.*?)\s+in\s+(.+)$/i);
  if (inMatch) {
    return {
      keyword: inMatch[1].trim(),
      place: inMatch[2].trim(),
    };
  }

  // "plumbers miami" — heuristic: last word(s) that geocode as a place.
  const words = q.split(/\s+/);
  if (words.length > 1) {
    return {
      keyword: words[0],
      place: words.slice(1).join(" "),
    };
  }
  return { keyword: q, place: "" };
}

/** Map an OSM tag set to one of the app's industries. */
export function mapIndustry(tags: Record<string, string>): string {
  if (!tags) return "Other";
  const values = [
    tags.shop,
    tags.craft,
    tags.office,
    tags.amenity,
    tags.leisure,
    tags.catering,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  const hay = values.join(" ");

  const rules: Array<[RegExp, string]> = [
    [/restaurant|food|bar|cafe|coffee|bakery|pub|restaurant/i, "Food & Beverage"],
    [/hotel|hostel|motel|guest|resort|bed_and_breakfast/i, "Hospitality"],
    [/dentist|clinic|hospital|pharmacy|doctor|medical|health|physio/i, "Healthcare"],
    [/gym|fitness|yoga|spa|salon|barber|beauty/i, "Wellness & Fitness"],
    [/lawyer|attorney|legal|notary|law/i, "Legal Services"],
    [/accountant|tax|bookkeeping|finance|insurance|bank|invest/i, "Financial Services"],
    [/real_estate|estate_agent|property|realtor/i, "Real Estate"],
    [/supermarket|grocery|convenience|market|pharma|store|shop|retail|mall|outlet/i, "Retail"],
    [/software|it_|computer|tech|telecom|consulting|coding|developer|digital|web/i, "IT Services"],
    [/car|auto|mechanic|garage|vehicle|repair_shop|gas|fuel/i, "Automotive"],
    [/school|college|university|education|training|tutoring|academy/i, "Education"],
    [/construction|builder|contractor|plumbing|plumber|electric|electrical|hvac|roof|paint|renovation/i, "Construction"],
    [/landscap|garden|lawn|cleaning|janitorial/i, "Cleaning & Landscaping"],
    [/logistics|freight|delivery|courier|moving|transport|shipping|warehouse/i, "Logistics"],
    [/manufactur|factory|industrial|metal|machine|fabricat/i, "Manufacturing"],
    [/tattoo|hair|beauty|nail|spa/i, "Beauty & Personal Care"],
    [/travel|tour|agency|cruise|booking/i, "Travel & Tourism"],
    [/pet|veterinary/i, "Pet Services"],
    [/funeral|cemetery|church|worship/i, "Other"],
    [/government|public|police|fire/i, "Other"],
    [/church|worship|religious/i, "Other"],
  ];

  for (const [re, ind] of rules) {
    if (re.test(hay)) return ind;
  }

  const first = values[0];
  const exact = INDUSTRIES.find(
    (i) => i.toLowerCase() === String(first).replace(/_/g, " ").toLowerCase()
  );
  if (exact) return exact;
  return "Other";
}

/** Geocode a place name to a bounding box via Nominatim (free, no key). */
async function geocode(place: string): Promise<{ lat: number; lon: number; bbox: string } | null> {
  if (!place) return null;
  await sleep(1000); // Nominatim requires ~1 req/sec
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(place)}&format=json&limit=1&accept-language=en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      boundingbox: string[];
      display_name: string;
    }>;
    const hit = data[0];
    if (!hit) return null;
    const [s, n, w, e] = hit.boundingbox.map(Number);

    // Clamp to a workable radius so the Overpass query stays fast.
    const maxHalfSpan = 0.1;
    const clat = (s + n) / 2;
    const clon = (w + e) / 2;
    const halfLat = Math.min((n - s) / 2, maxHalfSpan);
    const halfLon = Math.min((e - w) / 2, maxHalfSpan);

    return {
      lat: clat,
      lon: clon,
      bbox: `${(clat - halfLat).toFixed(4)},${(clon - halfLon).toFixed(4)},${(clat + halfLat).toFixed(4)},${(clon + halfLon).toFixed(4)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

const BUSINESS_KEYS = ["shop", "craft", "office", "amenity", "leisure"];

/**
 * Search real businesses from OpenStreetMap (Overpass + Nominatim).
 * Free, no API key, no billing. Returns real names, addresses,
 * industries, and phone/website/email whenever the map data has them.
 */
export async function searchBusinessesOsm(
  query: string,
  options: { limit?: number } = {}
): Promise<OsmBusiness[]> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const { keyword, place } = parseResearchQuery(query);
  if (!keyword && !place) return [];

  const geo = await geocode(place || keyword);
  if (!geo) return [];

  const kw = keyword || "shop";
  const keyFilter = BUSINESS_KEYS.map((k) => `nwr(${geo.bbox})["${k}"~"(?i)${esc(kw)}"]`).join(
    ";"
  );
  const byName = `nwr(${geo.bbox})["name"~"(?i)${esc(kw)}"];`;

  const overpassQuery = `[out:json][timeout:25];(${keyFilter};${byName});out center ${limit};`;

  const data = await runOverpass(overpassQuery);

  const out: OsmBusiness[] = [];
  const seen = new Set<string>();

  for (const rawEl of data) {
    const el = rawEl as Record<string, unknown>;
    const tags = (el.tags as Record<string, string> | undefined) ?? {};
    const name = String(tags.name ?? "").trim();
    if (!name) continue;

    const lat = Number(el.lat ?? (el.center as { lat?: number } | undefined)?.lat ?? NaN);
    const lon = Number(el.lon ?? (el.center as { lon?: number } | undefined)?.lon ?? NaN);

    const phone =
      String(tags["contact:phone"] || tags.phone || "").trim() || null;
    const website =
      String(tags["contact:website"] || tags["website"] || tags.url || "").trim() || null;
    const email =
      String(tags["contact:email"] || tags.email || "").trim().toLowerCase() || null;

    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
    const city = String(tags["addr:city"] || "").trim() || null;
    const zip = String(tags["addr:postcode"] || "").trim();
    const address = [street, [city, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

    const key = `${name.toLowerCase()}|${phone ?? ""}|${address}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ name, phone, website, email, address, city, country: null, tags, lat, lon });
    if (out.length >= limit) break;
  }

  return out;
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}