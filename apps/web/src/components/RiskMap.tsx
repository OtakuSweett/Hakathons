import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Language } from '../types/index.js';

interface RiskMapProps {
  lat: number;
  lon: number;
  parcelName: string;
  eonetAlerts: Array<{
    eventId: string;
    title: string;
    distanceKm: number;
    nearestCoordinates: [number, number];
    magnitudeKts?: number;
    pulsePrecipitationMm: number;
  }>;
  areaHa: number;
  onAreaChange: (newHa: number) => void;
  waterRegime: 'temporal' | 'goteo' | 'gravedad';
  onWaterRegimeChange: (regime: 'temporal' | 'goteo' | 'gravedad') => void;
  lang: Language;
  onMapClick: (lat: number, lon: number) => void;
  onSelectRegion: (lat: number, lon: number, name: string) => void;
}

const REGION_PRESETS = [
  { name: 'El Marqués, Querétaro (El Bajío MX)', lat: 20.5922, lon: -100.1972 },
  { name: 'San Juan del Río, Qro (Valle Agrícola MX)', lat: 20.3869, lon: -99.9947 },
  { name: 'Celaya / Bajío Guanajuatense (MX)', lat: 20.5231, lon: -100.8138 },
  { name: 'Colón Semidesierto (Agostadero/Secano MX)', lat: 20.725, lon: -100.045 },
  { name: 'Prairie View, Iowa (US Corn Belt)', lat: 42.0308, lon: -93.6319 },
  { name: 'Pergamino, Pampa Húmeda (Argentina)', lat: -33.8911, lon: -60.5736 }
];

export const RiskMap: React.FC<RiskMapProps> = ({
  lat,
  lon,
  parcelName,
  eonetAlerts,
  areaHa,
  onAreaChange,
  waterRegime,
  onWaterRegimeChange,
  lang,
  onMapClick,
  onSelectRegion
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const alertLayersRef = useRef<L.Circle[]>([]);

  const [baseMapType, setBaseMapType] = useState<'satellite' | 'streets'>('satellite');
  const [showGibs, setShowGibs] = useState<boolean>(true);

  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const gibsLayerRef = useRef<L.TileLayer | null>(null);

  const t = {
    es: {
      title: 'Delimitación de Parcela y Mapa de Riesgos',
      subtitle: 'Exploración geográfica con imágenes satelitales Esri/NASA, alertas EONET v3 y dimensionamiento en hectáreas.',
      searchLabel: 'Región Rápida:',
      areaLabel: 'Tamaño de Parcela:',
      regimeLabel: 'Régimen Hídrico:',
      temporal: 'Temporal / Secano',
      goteo: 'Riego por Goteo (Tecnificado)',
      gravedad: 'Riego por Gravedad / Rodado',
      gibsToggle: 'Capa NASA GIBS (NDVI)',
      volLabel: 'Demanda de Agua Estimada:',
      coordsLabel: 'Coordenadas:',
      satellite: '🛰️ Satelital HD',
      streets: '🗺️ Calles / Relieve',
      clickHint: '💡 Clic en cualquier punto del mapa para mover la parcela y consultar el análisis satelital.'
    },
    en: {
      title: 'Parcel Delimitation & Multi-Hazard Map',
      subtitle: 'Geographic exploration with Esri/NASA satellite imagery, EONET v3 hazards, and dynamic hectare sizing.',
      searchLabel: 'Quick Region:',
      areaLabel: 'Parcel Area:',
      regimeLabel: 'Water Regime:',
      temporal: 'Rainfed (Temporal)',
      goteo: 'Drip Irrigation (Tech)',
      gravedad: 'Gravity / Furrow',
      gibsToggle: 'NASA GIBS Overlay (NDVI)',
      volLabel: 'Estimated Water Demand:',
      coordsLabel: 'Coordinates:',
      satellite: '🛰️ Satellite HD',
      streets: '🗺️ Streets / Terrain',
      clickHint: '💡 Click anywhere on the map to relocate the parcel and fetch satellite analysis.'
    }
  }[lang];

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 13,
        zoomControl: true
      });

      // Esri World Imagery (Clean high-resolution satellite imagery, NO watermark)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri, Earthstar Geographics',
          maxZoom: 18
        }
      );
      satLayer.addTo(map);
      baseLayerRef.current = satLayer;

      // NASA GIBS WMTS NDVI Layer
      const gibs = L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
        {
          attribution: 'NASA Earthdata / GIBS',
          opacity: 0.35,
          maxZoom: 9
        }
      );
      gibs.addTo(map);
      gibsLayerRef.current = gibs;

      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lon], mapInstanceRef.current.getZoom());
    }
  }, [lat, lon, onMapClick]);

  // Handle Base Map Type Switch (Esri Satellite vs OpenStreetMap)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      baseLayerRef.current.remove();
    }

    if (baseMapType === 'satellite') {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri, Earthstar Geographics',
          maxZoom: 18
        }
      );
      sat.addTo(map);
      baseLayerRef.current = sat;
    } else {
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });
      osm.addTo(map);
      baseLayerRef.current = osm;
    }

    // Ensure GIBS layer stays on top if enabled
    if (showGibs && gibsLayerRef.current) {
      gibsLayerRef.current.bringToFront();
    }
  }, [baseMapType, showGibs]);

  // Update GIBS layer visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !gibsLayerRef.current) return;
    if (showGibs) {
      gibsLayerRef.current.addTo(mapInstanceRef.current);
      gibsLayerRef.current.bringToFront();
    } else {
      gibsLayerRef.current.remove();
    }
  }, [showGibs]);

  // Update Parcel Marker & Sized Polygon (NO auto-opening popup to prevent clutter)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }
    if (polygonRef.current) {
      polygonRef.current.remove();
    }

    const parcelIcon = L.divIcon({
      className: 'custom-parcel-marker',
      html: `<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px #10b981;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([lat, lon], { icon: parcelIcon }).addTo(map);
    marker.bindPopup(`<b>${parcelName}</b><br/>${areaHa} ha<br/>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
    markerRef.current = marker;

    // Draw scaled parcel polygon around the center point (approx 1 ha = 100x100m)
    const sideKm = Math.sqrt(areaHa * 0.01) / 2.0;
    const dLat = sideKm / 111.0;
    const dLon = sideKm / (111.0 * Math.cos((lat * Math.PI) / 180.0));

    const polygonCoords: [number, number][] = [
      [lat - dLat, lon - dLon],
      [lat - dLat, lon + dLon],
      [lat + dLat, lon + dLon],
      [lat + dLat, lon - dLon]
    ];

    const poly = L.polygon(polygonCoords, {
      color: '#10b981',
      fillColor: '#34d399',
      fillOpacity: 0.25,
      weight: 2
    }).addTo(map);
    polygonRef.current = poly;

    // Clear old EONET alerts and redraw
    alertLayersRef.current.forEach((l) => l.remove());
    alertLayersRef.current = [];

    eonetAlerts.forEach((alert) => {
      const [stormLon, stormLat] = alert.nearestCoordinates;
      const stormCircle = L.circle([stormLat, stormLon], {
        color: '#ef4444',
        fillColor: '#f87171',
        fillOpacity: 0.2,
        radius: 60000
      })
        .addTo(map)
        .bindPopup(`<b>Alerta EONET: ${alert.title}</b><br/>Distancia: ${alert.distanceKm.toFixed(1)} km`);

      alertLayersRef.current.push(stormCircle);
    });
  }, [lat, lon, parcelName, areaHa, eonetAlerts]);

  const estimatedVolM3 = Math.round(450 * areaHa * 10);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {t.title}
            </h3>
            <p className="text-slate-400 text-[11px]">{t.subtitle}</p>
          </div>

          {/* Quick Region Preset Selector & Layer Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setBaseMapType('satellite')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  baseMapType === 'satellite' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.satellite}
              </button>
              <button
                type="button"
                onClick={() => setBaseMapType('streets')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  baseMapType === 'streets' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.streets}
              </button>
            </div>

            <select
              onChange={(e) => {
                const target = REGION_PRESETS.find((r) => r.name === e.target.value);
                if (target) {
                  onSelectRegion(target.lat, target.lon, target.name);
                }
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">{t.searchLabel} {lang === 'es' ? 'Seleccionar...' : 'Select...'}</option>
              {REGION_PRESETS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Parcel Size Slider & Water Regime Config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          {/* Hectares Slider */}
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-semibold">{t.areaLabel}</span>
              <span className="font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {areaHa.toFixed(1)} ha
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              step="1"
              value={areaHa}
              onChange={(e) => onAreaChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Water Regime */}
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 font-semibold block mb-1">{t.regimeLabel}</span>
            <select
              value={waterRegime}
              onChange={(e) => onWaterRegimeChange(e.target.value as any)}
              className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-hidden"
            >
              <option value="temporal">{t.temporal}</option>
              <option value="goteo">{t.goteo}</option>
              <option value="gravedad">{t.gravedad}</option>
            </select>
          </div>

          {/* Volume Metric & Layer Toggle */}
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.volLabel}</span>
              <span className="font-bold text-cyan-300">~{estimatedVolM3.toLocaleString()} m³</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-1 text-slate-300 select-none">
              <input
                type="checkbox"
                checked={showGibs}
                onChange={(e) => setShowGibs(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-0 accent-emerald-500"
              />
              <span>{t.gibsToggle}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="relative h-80 w-full">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Clean HUD Status Overlay in bottom-left */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-1 max-w-xs">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="truncate">{parcelName}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{t.coordsLabel} {lat.toFixed(4)}°, {lon.toFixed(4)}°</span>
            <span className="text-emerald-400 font-bold">{areaHa} ha</span>
          </div>
          {eonetAlerts.length > 0 && (
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[10px] pt-1 border-t border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>{eonetAlerts.length} alerta(s) de ciclón/tormenta EONET activa(s)</span>
            </div>
          )}
        </div>

        {/* Non-intrusive Hint Bar at top right */}
        <div className="absolute top-3 right-3 z-20 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-emerald-300 shadow">
          {t.clickHint}
        </div>
      </div>
    </div>
  );
};
