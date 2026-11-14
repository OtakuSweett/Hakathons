/**
 * Module: Presets & Persistent Caching Gateway.
 * Manages loading demonstration benchmark presets from data/presets/
 * and persistent disk caching under data/cache/.
 */

import * as fs from 'fs';
import * as path from 'path';

function findPresetsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'data/presets'),
    path.resolve(process.cwd(), '../../data/presets'),
    path.resolve(process.cwd(), '../data/presets')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), '../../data/presets');
}

function findCacheDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'data/cache'),
    path.resolve(process.cwd(), '../../data/cache'),
    path.resolve(process.cwd(), '../data/cache')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const defaultDir = path.resolve(process.cwd(), '../../data/cache');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

const PRESETS_DIR = findPresetsDir();
const CACHE_DIR = findCacheDir();

export interface PresetSummary {
  presetId: string;
  parcelName: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  areaHa: number;
  cropId: string;
}

export function listPresets(): PresetSummary[] {
  if (!fs.existsSync(PRESETS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(PRESETS_DIR).filter(f => f.endsWith('.json'));
  const summaries: PresetSummary[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(PRESETS_DIR, file), 'utf-8');
      const data = JSON.parse(content);
      summaries.push({
        presetId: data.parcel_id || file.replace('.json', ''),
        parcelName: data.parcel_name || file,
        country: data.country || 'Global',
        region: data.region || '',
        lat: data.lat,
        lon: data.lon,
        areaHa: data.area_ha || 10.0,
        cropId: data.crop_id || 'maize'
      });
    } catch {
      // skip unreadable file
    }
  }

  return summaries;
}

export function loadPresetById(presetId: string): Record<string, unknown> | null {
  const directPath = path.join(PRESETS_DIR, `${presetId}.json`);
  if (fs.existsSync(directPath)) {
    return JSON.parse(fs.readFileSync(directPath, 'utf-8'));
  }

  // Search by parcel_id field inside files
  const files = fs.readdirSync(PRESETS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(PRESETS_DIR, file), 'utf-8');
      const data = JSON.parse(content);
      if (
        data.parcel_id === presetId ||
        file.replace('.json', '') === presetId ||
        presetId.includes(file.replace('.json', '')) ||
        file.includes(presetId.replace('_us', '').replace('_ar', '').replace('_qro', ''))
      ) {
        return data;
      }
    } catch {
      // continue
    }
  }

  return null;
}

export function getNearestPreset(lat: number, lon: number): Record<string, unknown> {
  const presets = listPresets();
  if (presets.length === 0) {
    throw new Error('No presets found in data/presets/');
  }

  let nearestId = presets[0].presetId;
  let minDistance = Infinity;

  for (const p of presets) {
    const dLat = p.lat - lat;
    const dLon = p.lon - lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < minDistance) {
      minDistance = distSq;
      nearestId = p.presetId;
    }
  }

  return loadPresetById(nearestId)!;
}

export function readCache(key: string): Record<string, unknown> | null {
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

export function writeCache(key: string, data: Record<string, unknown>): void {
  try {
    const cachePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Non-blocking caching failure
  }
}
