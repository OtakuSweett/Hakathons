import { AppError } from '../utils/errors.js';

export interface PlaceSearchResult {
  lat: number;
  lon: number;
  name: string;
  type: string;
  bounds: [[number, number], [number, number]] | null;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  addresstype?: string;
  boundingbox?: [string, string, string, string];
}

let requestQueue = Promise.resolve();
let lastRequestAt = 0;
const resultsCache = new Map<string, { expiresAt: number; results: PlaceSearchResult[] }>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function limitedNominatimRequest(url: URL): Promise<Response> {
  const request = requestQueue.then(async () => {
    const delay = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (delay) await wait(delay);
    lastRequestAt = Date.now();
    const contact = process.env.GEOCODER_CONTACT?.trim();
    return fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'application/json',
        'User-Agent': contact ? `CampoClaro/1.0 (${contact})` : 'CampoClaro/1.0'
      }
    });
  });
  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}

export async function searchPlaces(query: string, language: string): Promise<PlaceSearchResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 3 || cleanQuery.length > 120) {
    throw new AppError('INVALID_GEOCODE_QUERY', 'Search text must contain between 3 and 120 characters.', 400);
  }

  const cacheKey = `${language}:${cleanQuery.toLocaleLowerCase()}`;
  const cached = resultsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const url = new URL(process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', cleanQuery);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', language === 'en' ? 'en' : 'es');

  let response: Response;
  try {
    response = await limitedNominatimRequest(url);
  } catch (error) {
    throw new AppError('GEOCODER_UNAVAILABLE', 'Place search is temporarily unavailable. You can still select a point on the map or enter coordinates.', 503, {
      provider: geocoderProvider(),
      cause: error instanceof Error ? error.message : 'network error'
    });
  }
  if (!response.ok) {
    throw new AppError('GEOCODER_UNAVAILABLE', `Place search returned HTTP ${response.status}. You can still select a point on the map or enter coordinates.`, 503, {
      provider: geocoderProvider(),
      upstream_status: response.status
    });
  }

  let rows: NominatimResult[];
  try {
    rows = await response.json() as NominatimResult[];
  } catch {
    throw new AppError('GEOCODER_INVALID_RESPONSE', 'Place search returned an unreadable response.', 502, { provider: geocoderProvider() });
  }

  const results = rows.flatMap((row) => {
    const lat = Number(row.lat);
    const lon = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
    const box = row.boundingbox?.map(Number);
    const bounds: PlaceSearchResult['bounds'] = box?.length === 4 && box.every(Number.isFinite)
      ? [[box[0], box[2]], [box[1], box[3]]]
      : null;
    return [{ lat, lon, name: row.display_name || row.name || `${lat}, ${lon}`, type: row.addresstype || row.type || 'place', bounds }];
  });
  resultsCache.set(cacheKey, { expiresAt: Date.now() + 86_400_000, results });
  if (resultsCache.size > 500) resultsCache.delete(resultsCache.keys().next().value!);
  return results;
}

export const geocoderProvider = () => process.env.GEOCODER_PROVIDER || 'OpenStreetMap Nominatim';
export const geocoderAttribution = () => process.env.GEOCODER_ATTRIBUTION || '© OpenStreetMap contributors';
