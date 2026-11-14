/**
 * Ingestion Module: NASA EONET v3 Natural Disaster Events.
 * Implements Haversine geodesic distance filtering (R <= 150 km) and
 * precipitation pulse generation for intersecting severe storms/cyclones.
 */

export interface EonetGeometry {
  magnitudeValue?: number;
  magnitudeUnit?: string;
  date: string;
  type: string;
  coordinates: [number, number]; // [lon, lat]
}

export interface EonetEvent {
  id: string;
  title: string;
  description?: string;
  categories: Array<{ id: string; title: string }>;
  geometry: EonetGeometry[];
}

export interface IntersectingStormAlert {
  eventId: string;
  title: string;
  distanceKm: number;
  nearestCoordinates: [number, number];
  magnitudeKts?: number;
  pulsePrecipitationMm: number;
  dayOffset: number;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2.0) *
      Math.sin(dLon / 2.0);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
}

export async function fetchEonetStormAlerts(
  lat: number,
  lon: number,
  maxRadiusKm = 150.0
): Promise<{ alerts: IntersectingStormAlert[]; rawEvents: any[] }> {
  const url = 'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=severeStorms&status=open';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { alerts: [], rawEvents: [] };
    }

    const data = await res.json() as Record<string, any>;
    const features = data.features || [];
    const alerts: IntersectingStormAlert[] = [];

    for (const feat of features) {
      const geomType = feat.geometry?.type;
      const coords = feat.geometry?.coordinates;
      if (!coords) continue;

      let minDistance = Infinity;
      let nearestCoord: [number, number] = [0, 0];

      if (geomType === 'Point' && Array.isArray(coords) && coords.length >= 2) {
        const ptLon = coords[0];
        const ptLat = coords[1];
        const dist = haversineDistanceKm(lat, lon, ptLat, ptLon);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCoord = [ptLon, ptLat];
        }
      } else if (geomType === 'LineString' && Array.isArray(coords)) {
        for (const pt of coords) {
          if (Array.isArray(pt) && pt.length >= 2) {
            const dist = haversineDistanceKm(lat, lon, pt[1], pt[0]);
            if (dist < minDistance) {
              minDistance = dist;
              nearestCoord = [pt[0], pt[1]];
            }
          }
        }
      }

      if (minDistance <= maxRadiusKm) {
        // Calculate precipitation pulse proportional to storm proximity and category
        const pulseMm = Math.round(Math.max(30.0, 90.0 * (1.0 - minDistance / maxRadiusKm)));
        alerts.push({
          eventId: feat.id || feat.properties?.id || 'unknown_storm',
          title: feat.properties?.title || 'Severe Tropical Storm',
          distanceKm: Math.round(minDistance * 10.0) / 10.0,
          nearestCoordinates: nearestCoord,
          magnitudeKts: feat.properties?.magnitudeValue || 45,
          pulsePrecipitationMm: pulseMm,
          dayOffset: 1 // Injected into immediate simulation day
        });
      }
    }

    return { alerts, rawEvents: features.slice(0, 20) };
  } catch {
    // Graceful fallback to empty alerts if NASA EONET is unreachable
    return { alerts: [], rawEvents: [] };
  }
}
