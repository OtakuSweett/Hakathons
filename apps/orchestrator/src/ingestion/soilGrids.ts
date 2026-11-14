/**
 * Ingestion Module: ISRIC SoilGrids v2.0 REST API.
 * Handles depth-weighted aggregation over 0-30cm, scaling factors,
 * non-arable land validation, and Saxton-Rawls pedotransfer.
 */

import { AppError } from '../utils/errors.js';
import { computeSoilHydraulics, SoilHydraulicsOutput } from '../services/pedotransfer.js';
import { readCache, writeCache } from '../services/presets.js';

export interface SoilGridsLayer {
  name: string;
  depths: Array<{
    range: { top_depth: number; bottom_depth: number; unit_depth: string };
    label: string;
    values: { mean: number | null };
  }>;
}

export interface SoilGridsResponse {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    layers: SoilGridsLayer[];
  };
}

export async function fetchSoilGrids(
  lat: number,
  lon: number,
  allowFallback = true
): Promise<SoilHydraulicsOutput> {
  const cacheKey = `soil_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return cached as unknown as SoilHydraulicsOutput;
  }

  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=clay&property=sand&property=silt&property=phh2o&property=soc&property=nitrogen&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`SoilGrids returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as SoilGridsResponse;
    const layers = data.properties?.layers || [];

    // Weights: 0-5cm (5/30), 5-15cm (10/30), 15-30cm (15/30)
    const weights = [5.0 / 30.0, 10.0 / 30.0, 15.0 / 30.0];

    const getWeightedMean = (propName: string): number | null => {
      const layer = layers.find(l => l.name === propName);
      if (!layer || !layer.depths || layer.depths.length === 0) return null;

      let sum = 0.0;
      let totalWeight = 0.0;

      for (let i = 0; i < layer.depths.length && i < weights.length; i++) {
        const val = layer.depths[i].values?.mean;
        if (val !== null && val !== undefined) {
          sum += val * weights[i];
          totalWeight += weights[i];
        }
      }

      if (totalWeight === 0.0) return null;
      return sum / totalWeight;
    };

    const clayRaw = getWeightedMean('clay');
    const sandRaw = getWeightedMean('sand');
    const phRaw = getWeightedMean('phh2o');
    const socRaw = getWeightedMean('soc');
    const nRaw = getWeightedMean('nitrogen');

    // Non-arable land validation: If values are null (ocean, urban core, rocky peak), reject with HTTP 422
    if (clayRaw === null && sandRaw === null && phRaw === null) {
      throw new AppError(
        'NON_ARABLE_LAND',
        `The selected coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)}) do not have arable soil data (water body, urban settlement, or barren rock). Please select an agricultural parcel.`,
        422,
        { lat, lon }
      );
    }

    // Apply conversion scaling factors
    const clayPct = (clayRaw || 250) / 10.0;
    const sandPct = (sandRaw || 350) / 10.0;
    const soilPh = (phRaw || 70) / 10.0;
    const socGKg = (socRaw || 150) / 10.0;
    const nitrogenGKg = (nRaw || 150) / 100.0;

    const hydraulics = computeSoilHydraulics({
      clayPct,
      sandPct,
      soilPh,
      socGKg,
      nitrogenGKg
    });

    writeCache(cacheKey, hydraulics as unknown as Record<string, unknown>);
    return hydraulics;
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }

    if (allowFallback) {
      // Offline fallback: typical agricultural loam
      const defaultHydraulics = computeSoilHydraulics({
        clayPct: 28.0,
        sandPct: 32.0,
        soilPh: 6.8,
        socGKg: 14.0,
        nitrogenGKg: 1.4
      });
      return defaultHydraulics;
    }

    throw new AppError('SOILGRIDS_UNAVAILABLE', `Failed to retrieve soil data: ${(err as Error).message}`, 503);
  }
}
