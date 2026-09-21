export function getPlacesKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY;
}

export interface RawBusiness {
  name: string;
  phone: string;
  internationalPhone: string;
  website: string;
  address: string;
  rating: number | null;
  types: string[];
  placeId: string;
}

interface TextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
  rating?: number;
  business_status?: string;
}

interface PlaceDetailsResult {
  result?: {
    name?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    types?: string[];
    rating?: number;
    business_status?: string;
  };
  status: string;
}

/** Map a raw Google types array onto our INDUSTRIES vocabulary. */
export function mapIndustry(types: string[] = []): string {
  const t = types.join(" ").toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/restaurant|food|bakery|cafe|bar\b|meal|grocery|fast food/i, "Hospitality"],
    [/hotel|lodging|hostel|travel/i, "Hospitality"],
    [/bank|finance|insurance|atm|credit union/i, "Finance"],
    [/hospital|doctor|dental|health|clinic|pharmac|medical|physio/i, "Healthcare"],
    [/software|computer|internet|technology|it |data|saas|developer/i, "Software"],
    [/school|university|college|academy|training|education|tutor/i, "Education"],
    [/store|shop|market|retail|mall|outlet/i, "Retail"],
    [/factory|manufactur|industrial|plant/i, "Manufacturing"],
    [/real_estate|real estate|property|apartment|condo/i, "Real Estate"],
    [/logistics|shipping|freight|courier|warehouse|storage/i, "Logistics"],
    [/media|news|publishing|entertainment|film|broadcast/i, "Media"],
    [/energy|solar|electric|utility|oil|gas/i, "Energy"],
    [/telecom|telecommunication|mobile network|internet_provider/i, "Telecom"],
    [/consult|accounting|lawyer|attorney|legal/i, "Consulting"],
    [/lawyer|attorney|law firm|legal/i, "Legal"],
    [/car|auto|automotive|mechanic|dealership/i, "Automotive"],
    [/construction|contractor|builder|roofing|plumb|electrician|hvac/i, "Construction"],
    [/farm|agricultur|landscape|nursery/i, "Agriculture"],
  ];
  for (const [re, industry] of rules) {
    if (re.test(t)) return industry;
  }
  return "Other";
}

/**
 * Search Google Places for businesses and return rich, real data
 * (name, phone, website, address, types). Uses the legacy Places API.
 */
export async function searchBusinesses(
  query: string,
  options: { limit?: number } = {}
): Promise<RawBusiness[]> {
  const key = getPlacesKey();
  if (!key) {
    throw new Error(
      "Google Places is not configured. Add a GOOGLE_PLACES_API_KEY in your environment."
    );
  }
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 20);

  const searchUrl =
    "https://maps.googleapis.com/maps/api/place/textsearch/json" +
    `?query=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json().catch(() => null);

  if (!searchRes.ok || !searchData) {
    throw new Error(`Google Places search failed (${searchRes.status}).`);
  }
  if (searchData.status !== "OK") {
    const reason =
      searchData.status === "REQUEST_DENIED"
        ? "Places API key is denied. Enable the Places API in Google Cloud and check your key."
        : searchData.status === "ZERO_RESULTS"
          ? `No businesses found for "${query}".`
          : `Google Places error: ${searchData.status}`;
    throw new Error(reason);
  }

  const results: TextSearchResult[] = (searchData.results ?? []).slice(0, limit);
  const businesses: RawBusiness[] = [];

  for (const r of results) {
    const details = await fetchPlaceDetails(r.place_id, key);
    businesses.push({
      name: details?.result?.name ?? r.name,
      phone: details?.result?.formatted_phone_number ?? "",
      internationalPhone: details?.result?.international_phone_number ?? "",
      website: details?.result?.website ?? "",
      address: details?.result?.formatted_address ?? r.formatted_address ?? "",
      rating: details?.result?.rating ?? r.rating ?? null,
      types: details?.result?.types ?? r.types ?? [],
      placeId: r.place_id,
    });
  }

  return businesses;
}

async function fetchPlaceDetails(
  placeId: string,
  key: string
): Promise<PlaceDetailsResult | null> {
  const url =
    "https://maps.googleapis.com/maps/api/place/details/json" +
    `?place_id=${encodeURIComponent(placeId)}` +
    "&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,types,rating,business_status" +
    `&key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as PlaceDetailsResult;
    if (data?.status === "OK") return data;
    return null;
  } catch {
    return null;
  }
}