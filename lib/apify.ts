/**
 * Apify client for business discovery.
 *
 * Operates in FREE_MODE by default:
 *  - Apify accounts get monthly free credits. This app NEVER purchases
 *    credits, upgrades billing, or starts paid usage automatically.
 *  - If the selected Actor requires payment and credits are insufficient,
 *    the run start fails and the error is surfaced to the admin instead.
 */

const API_BASE = "https://api.apify.com/v2";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isApifyConfigured(): boolean {
  return Boolean(process.env.APIFY_API_TOKEN && process.env.APIFY_ACTOR_ID);
}

/** When false, the app is explicitly allowed to consider paid usage. Default: true. */
export const FREE_MODE = process.env.FREE_MODE !== "false";

export function maxLeadsPerJob(): number {
  const n = Number(process.env.MAX_LEADS_PER_JOB ?? 100);
  return Number.isFinite(n) && n > 0 ? Math.min(500, Math.trunc(n)) : 100;
}

export interface ApifyRun {
  id: string;
  status: string;
  datasetId?: string;
  actorId?: string;
}

class ApifyError extends Error {}

function paidUsageMessage() {
  return (
    "This Apify Actor needs credits and the run could not start within the free allowance — " +
    "no purchase was made. Add credits in the Apify Console (https://console.apify.com/billing) " +
    "or pick a free Actor in APIFY_ACTOR_ID, then retry."
  );
}

async function apifyFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new ApifyError("APIFY_API_TOKEN is not set.");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new ApifyError(e instanceof Error ? `Apify unreachable: ${e.message}` : "Apify unreachable.");
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const errBody = (body ?? {}) as { error?: { message?: unknown }; message?: unknown };
    const msg = String(errBody?.error?.message ?? errBody?.message ?? res.statusText);
    const paidLike =
      res.status === 402 ||
      /credit|payment|billing|purchas|insufficient|quota|balance/i.test(msg);
    if (paidLike && FREE_MODE) throw new ApifyError(paidUsageMessage());
    throw new ApifyError(`Apify API error (${res.status}): ${msg}`);
  }

  return body;
}

/** Start an Actor run with the given input. Throws (never auto-purchases) on credit issues. */
export async function startApifyRun(
  actorId: string,
  input: Record<string, unknown>
): Promise<ApifyRun> {
  const wrapped = (await apifyFetch(`/acts/${actorId}/runs`, {
    method: "POST",
    body: JSON.stringify(input),
  })) as { data?: { id?: unknown; status?: unknown; defaultDatasetId?: unknown; actorId?: unknown } };
  const data = wrapped?.data;
  return {
    id: String(data?.id ?? ""),
    status: String(data?.status ?? "READY"),
    datasetId: data?.defaultDatasetId != null ? String(data.defaultDatasetId) : undefined,
    actorId: data?.actorId != null ? String(data.actorId) : undefined,
  };
}

/** Poll a run until it settles (or the poll budget runs out). */
export async function waitForApifyRun(
  runId: string,
  timeoutMs = 90_000
): Promise<ApifyRun> {
  const deadline = Date.now() + timeoutMs;
  let last: ApifyRun = { id: runId, status: "RUNNING" };
  while (Date.now() < deadline) {
    last = await getApifyRun(runId);
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "SUCCEEDED"].includes(last.status)) {
      return last;
    }
    await sleep(2500);
  }
  return last;
}

export async function getApifyRun(runId: string): Promise<ApifyRun> {
  const wrapped = (await apifyFetch(`/actor-runs/${runId}`)) as {
    data?: { status?: unknown; defaultDatasetId?: unknown };
  };
  const data = wrapped?.data;
  return {
    id: runId,
    status: String(data?.status ?? "UNKNOWN"),
    datasetId: data?.defaultDatasetId != null ? String(data.defaultDatasetId) : undefined,
  };
}

export async function getDatasetItems(
  datasetId: string,
  options: { limit?: number } = {}
): Promise<Array<Record<string, unknown>>> {
  const limit = Math.min(Math.max(options.limit ?? 0, 1), 500);
  const body = await apifyFetch(
    `/datasets/${datasetId}/items?format=json&limit=${limit}&desc=1`
  );
  return Array.isArray(body) ? (body as Array<Record<string, unknown>>) : [];
}

/**
 * Best-effort mapping of a Google-Maps-style Actor result into our lead fields.
 * Never fabricates a value — every field is read from the source row or left null.
 */
export function normalizeApifyItem(item: Record<string, unknown>): {
  full_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  industry: string | null;
  source_url: string | null;
  source_id: string | null;
} {
  const str = (v: unknown) => (v == null ? "" : String(v).trim());
  const name = str(item.title || item.name || item.businessName);
  const phone = str(item.phone || item.phoneUnformatted || "").replace(/[^\d+]/g, "") || null;
  const websiteRaw = str(item.website || item.webUrl || item.websiteUrl);
  const mapsUrl = str(item.url);
  // Only accept real business websites; the Google Maps URL is kept as the source.
  const website = /^https?:\/\//i.test(websiteRaw) && !/google\.(com|maps)/i.test(websiteRaw)
    ? websiteRaw
    : websiteRaw.startsWith("www.")
      ? `https://${websiteRaw}`
      : null;

  const lat = Number(item.latitude ?? item.lat ?? NaN);
  const lng = Number(item.longitude ?? item.lon ?? NaN);

  return {
    full_name: name || null,
    company: name || null,
    phone,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(item.email)) ? str(item.email).toLowerCase() : null,
    website,
    address: str(item.address || item.streetAddress || "").split("\n")[0].trim() || null,
    city: str(item.city || item.locality || "").split(",")[0].trim() || null,
    state: str(item.state || item.province) || null,
    country: str(item.countryCode || item.country || "") || null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    industry: str(item.categoryName || item.category || "") || null,
    source_url: /^https?:\/\//i.test(mapsUrl) || mapsUrl.startsWith("www.")
      ? mapsUrl
      : null,
    source_id: str(item.placeId || item.place_id || "") || null,
  };
}