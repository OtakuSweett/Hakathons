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

  const [showGibs, setShowGibs] = useState<boolean>(true);
  const gibsLayerRef = useRef<L.TileLayer | null>(null);

  const t = {
    es: {
      title: 'Delimitación de Parcela y Mapa de Riesgos',
      subtitle: 'Exploración geográfica mundial con capas NASA GIBS WMTS, alertas EONET v3 y dimensionamiento de hectáreas.',
      searchLabel: 'Región Rápida o Búsqueda:',
      areaLabel: 'Tamaño de Parcela:',
      regimeLabel: 'Régimen Hídrico:',
      temporal: 'Temporal / Secano',
      goteo: 'Riego por Goteo (Tecnificado)',
      gravedad: 'Riego por Gravedad / Rodado',
      gibsToggle: 'Capa NASA GIBS (NDVI)',
      volLabel: 'Demanda de Agua Estimada:',
      coordsLabel: 'Coordenadas:',
      clickHint: 'Haz clic en cualquier punto del planeta para analizar una nueva parcela.'
    },
    en: {
      title: 'Parcel Delimitation & Multi-Hazard Map',
      subtitle: 'Global planetary exploration with NASA GIBS WMTS, EONET v3 hazards, and dynamic hectare sizing.',
      searchLabel: 'Quick Region Search:',
      areaLabel: 'Parcel Area:',
      regimeLabel: 'Water Regime:',
      temporal: 'Rainfed (Temporal)',
      goteo: 'Drip Irrigation (Tech)',
      gravedad: 'Gravity / Furrow',
      gibsToggle: 'NASA GIBS Overlay (NDVI)',
      volLabel: 'Estimated Water Demand:',
      coordsLabel: 'Coordinates:',
      clickHint: 'Click anywhere on Earth to analyze a new agricultural parcel.'
    }
  }[lang];

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 12,
        zoomControl: true
      });

      // CartoDB Dark Base Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

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

  // Update GIBS layer visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !gibsLayerRef.current) return;
    if (showGibs) {
      gibsLayerRef.current.addTo(mapInstanceRef.current);
    } else {
      gibsLayerRef.current.remove();
    }
  }, [showGibs]);

  // Update Parcel Marker & Sized Polygon
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
      html: `<div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 14px #10b981;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker([lat, lon], { icon: parcelIcon }).addTo(map);
    marker.bindPopup(`<b>${parcelName}</b><br/>${areaHa} ha<br/>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`).openPopup();
    markerRef.current = marker;

    // Draw scaled parcel polygon around the center point (approx 1 ha = 100x100m)
    const sideKm = Math.sqrt(areaHa * 0.01) / 2.0; // half-side in km
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
      fillOpacity: 0.3,
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
        fillOpacity: 0.25,
        radius: 60000
      })
        .addTo(map)
        .bindPopup(`<b>Alerta EONET: ${alert.title}</b><br/>Distancia: ${alert.distanceKm.toFixed(1)} km`);

      alertLayersRef.current.push(stormCircle);
    });
  }, [lat, lon, parcelName, areaHa, eonetAlerts]);

  // Rough seasonal water volume estimate: 450 mm avg requirement
  const estimatedVolM3 = Math.round(450 * areaHa * 10);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm">{t.title}</h3>
            <p className="text-slate-400 text-[11px]">{t.subtitle}</p>
          </div>

          {/* Quick Region Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{t.searchLabel}</span>
            <select
              onChange={(e) => {
                const target = REGION_PRESETS.find((r) => r.name === e.target.value);
                if (target) {
                  onSelectRegion(target.lat, target.lon, target.name);
                }
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">{lang === 'es' ? 'Seleccionar región...' : 'Select region...'}</option>
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

        {/* Legend / Status Overlay */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-xs p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 shadow-lg space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>{parcelName} ({areaHa} ha)</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {t.coordsLabel} {lat.toFixed(4)}°, {lon.toFixed(4)}°
          </div>
          {eonetAlerts.length > 0 && (
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>{eonetAlerts.length} alerta(s) EONET activa(s)</span>
            </div>
          )}
        </div>

        {/* Click hint badge */}
        <div className="absolute top-3 right-3 z-20 bg-slate-900/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-800 text-[10px] text-slate-400 shadow">
          {t.clickHint}
        </div>
      </div>
    </div>
  );
};
