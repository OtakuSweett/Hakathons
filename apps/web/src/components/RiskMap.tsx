import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Language } from '../types/index.js';
import { apiFetch } from '../services/api.js';

type GeoBounds = [[number, number], [number, number]];
interface GeocodePlace { lat: number; lon: number; name: string; type: string; bounds: GeoBounds | null }

const cropNames: Record<string, [string, string]> = {
  maize: ['Maíz', 'Maize'], sorghum: ['Sorgo', 'Sorghum'], wheat: ['Trigo', 'Wheat'], barley: ['Cebada', 'Barley'], beans: ['Frijol', 'Beans'], chickpea: ['Garbanzo', 'Chickpea'],
  alfalfa: ['Alfalfa', 'Alfalfa'], broccoli: ['Brócoli', 'Broccoli'], tomato: ['Jitomate', 'Tomato'], onion: ['Cebolla', 'Onion'], garlic: ['Ajo', 'Garlic'], strawberry: ['Fresa', 'Strawberry'],
  oats: ['Avena', 'Oats'], vetch: ['Veza', 'Vetch'], chili_pepper: ['Chile', 'Chili pepper'], asparagus: ['Espárrago', 'Asparagus'], soybean: ['Soya', 'Soybean'],
  sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola']
};
const placeTypes: Record<string, [string, string]> = {
  city: ['Ciudad', 'City'], town: ['Pueblo', 'Town'], village: ['Localidad', 'Village'], municipality: ['Municipio', 'Municipality'],
  county: ['Condado', 'County'], state: ['Estado', 'State'], country: ['País', 'Country'], suburb: ['Colonia', 'Suburb'], farm: ['Granja', 'Farm'], hamlet: ['Poblado', 'Hamlet']
};
const placeTypeName = (type: string, lang: Language) => placeTypes[type]?.[lang === 'es' ? 0 : 1] || type;

interface RiskMapProps {
  lat: number;
  lon: number;
  regionLat: number;
  regionLon: number;
  selectionBounds?: GeoBounds | null;
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
  selectedCropIds?: string[];
  onAreaChange: (newHa: number) => void;
  waterRegime: 'temporal' | 'goteo' | 'gravedad';
  onWaterRegimeChange: (regime: 'temporal' | 'goteo' | 'gravedad') => void;
  lang: Language;
  onMapClick: (lat: number, lon: number) => void;
  onLocationSearch: (lat: number, lon: number, bounds?: GeoBounds | null) => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({
  lat,
  lon,
  regionLat,
  regionLon,
  selectionBounds,
  parcelName,
  eonetAlerts,
  areaHa,
  selectedCropIds = [],
  onAreaChange,
  waterRegime,
  onWaterRegimeChange,
  lang,
  onMapClick,
  onLocationSearch
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const haloRef = useRef<L.CircleMarker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const selectionBoundsRef = useRef<L.Rectangle | null>(null);
  const alertLayersRef = useRef<L.Circle[]>([]);

  const [baseMapType, setBaseMapType] = useState<'satellite' | 'streets'>('satellite');
  const [showGibs, setShowGibs] = useState<boolean>(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodePlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttribution, setSearchAttribution] = useState('');
  const [mapTileError, setMapTileError] = useState(false);

  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const gibsLayerRef = useRef<L.TileLayer | null>(null);

  const sideMeters = Math.round(Math.sqrt(areaHa * 10000));

  const t = {
    es: {
      title: 'Delimitación de Parcela y Mapa de Riesgos',
      subtitle: 'Exploración geográfica con imágenes satelitales Esri/NASA, alertas EONET v3 y dimensionamiento en hectáreas.',
      searchLabel: 'Busca ciudad, dirección o coordenadas',
      areaLabel: 'Tamaño de Parcela:',
      regimeLabel: 'Régimen Hídrico:',
      temporal: 'Temporal / Secano',
      goteo: 'Riego por Goteo (Tecnificado)',
      gravedad: 'Riego por Gravedad / Rodado',
      gibsToggle: 'Capa NASA GIBS (NDVI)',
      volLabel: 'Demanda de Agua Estimada:',
      coordsLabel: 'Coordenadas:',
      satellite: 'Satelital HD',
      streets: 'Calles / Relieve',
      clickHint: 'Toca el mapa para marcar tu parcela o usa el buscador de localidades.',
      searchPlaceholder: 'Ej. El Marqués, Querétaro',
      searchButton: 'Buscar',
      resultLabel: 'Elige el lugar correcto',
      noResults: 'No encontramos ese lugar. Prueba con ciudad y país o marca el mapa.',
      searchHelp: 'La búsqueda se envía solo al pulsar Buscar. También acepta latitud, longitud.',
      alertLegend: 'Círculo rojo: radio de referencia de 60 km alrededor de una alerta EONET activa.',
      mapTileError: 'No se pudieron cargar algunas imágenes del mapa. Prueba Calles / Relieve o revisa tu conexión.',
      btnFocusField: '🎯 Enfocar Parcela (Zoom 16)',
      btnRegionView: '🗺️ Visión Regional (Zoom 11)',
      btnCenter: '↺ Centrar',
      dimensionsLabel: 'Dimensiones estimadas:'
    },
    en: {
      title: 'Parcel Delimitation & Multi-Hazard Map',
      subtitle: 'Geographic exploration with Esri/NASA satellite imagery, EONET v3 hazards, and dynamic hectare sizing.',
      searchLabel: 'Search a city, address, or coordinates',
      areaLabel: 'Parcel Area:',
      regimeLabel: 'Water Regime:',
      temporal: 'Rainfed (Temporal)',
      goteo: 'Drip Irrigation (Tech)',
      gravedad: 'Gravity / Furrow',
      gibsToggle: 'NASA GIBS Overlay (NDVI)',
      volLabel: 'Estimated Water Demand:',
      coordsLabel: 'Coordinates:',
      satellite: 'Satellite HD',
      streets: 'Streets / Terrain',
      clickHint: 'Tap anywhere on the map to place your field or use the location search.',
      searchPlaceholder: 'e.g. Ames, Iowa',
      searchButton: 'Search',
      resultLabel: 'Choose the right place',
      noResults: 'We could not find that place. Try city and country or select the map.',
      searchHelp: 'Your search is sent only when you press Search. Coordinates are accepted too.',
      alertLegend: 'Red circle: 60 km reference radius around an active EONET alert.',
      mapTileError: 'Some map imagery could not load. Try Streets / Terrain or check your connection.',
      btnFocusField: '🎯 Focus Field (Zoom 16)',
      btnRegionView: '🗺️ Regional View (Zoom 11)',
      btnCenter: '↺ Center',
      dimensionsLabel: 'Estimated dimensions:'
    }
  }[lang];

  const searchLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = locationQuery.trim();
    if (!query) return;
    setSearchError('');
    setSearchResults([]);
    const coordinateMatch = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinateMatch) {
      const searchedLat = Number(coordinateMatch[1]);
      const searchedLon = Number(coordinateMatch[2]);
      if (searchedLat < -90 || searchedLat > 90 || searchedLon < -180 || searchedLon > 180) {
        setSearchError(lang === 'es' ? 'Coordenadas fuera del rango válido.' : 'Coordinates are outside the valid range.');
        return;
      }
      setLocationQuery(`${searchedLat.toFixed(5)}, ${searchedLon.toFixed(5)}`);
      mapInstanceRef.current?.setView([searchedLat, searchedLon], 16);
      onLocationSearch(searchedLat, searchedLon);
      return;
    }
    setIsSearching(true);
    try {
      const response = await apiFetch(`/api/geocode?q=${encodeURIComponent(query)}&lang=${lang}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || body?.error?.code || `HTTP ${response.status}`);
      setSearchAttribution(body.attribution || '');
      const results = Array.isArray(body.results) ? body.results as GeocodePlace[] : [];
      if (!results.length) setSearchError(t.noResults);
      else setSearchResults(results);
    } catch {
      setSearchError(lang === 'es' ? 'No se pudo buscar el lugar. Revisa tu conexión e inténtalo de nuevo.' : 'Place search failed. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (place: GeocodePlace) => {
    setLocationQuery(place.name);
    setSearchResults([]);
    setSearchError('');
    const map = mapInstanceRef.current;
    if (place.bounds) {
      map?.fitBounds(place.bounds, { padding: [28, 28], maxZoom: 15 });
    } else {
      map?.setView([place.lat, place.lon], 15);
    }
    onLocationSearch(place.lat, place.lon, place.bounds);
  };

  const zoomToParcel = () => {
    mapInstanceRef.current?.setView([lat, lon], 16, { animate: true });
  };

  const zoomToRegion = () => {
    mapInstanceRef.current?.setView([lat, lon], 11, { animate: true });
  };

  const recenterMap = () => {
    mapInstanceRef.current?.panTo([lat, lon], { animate: true });
  };

  // Initialize Leaflet map with optimal field zoom
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 15,
        zoomControl: true
      });

      if (selectionBounds) {
        selectionBoundsRef.current = L.rectangle(selectionBounds, {
          color: '#d4ec79',
          weight: 1.5,
          opacity: 0.7,
          fillColor: '#d4ec79',
          fillOpacity: 0.03,
          dashArray: '5 5',
          interactive: false
        }).addTo(map);
      }

      // NASA GIBS WMTS NDVI Layer
      const gibs = L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
        {
          attribution: 'NASA Earthdata / GIBS',
          opacity: 0.35,
          maxZoom: 9
        }
      );
      gibsLayerRef.current = gibs;

      mapInstanceRef.current = map;
    } else {
      if (selectionBounds && selectionBoundsRef.current) {
        selectionBoundsRef.current.setBounds(selectionBounds);
      }
    }
  }, [lat, lon, regionLat, regionLon, selectionBounds]);

  useEffect(() => () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.off();
      map.remove();
    }
    mapInstanceRef.current = null;
    markerRef.current = null;
    haloRef.current = null;
    polygonRef.current = null;
    selectionBoundsRef.current = null;
    baseLayerRef.current = null;
    gibsLayerRef.current = null;
    alertLayersRef.current = [];
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const handleClick = (event: L.LeafletMouseEvent) => onMapClick(event.latlng.lat, event.latlng.lng);
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [onMapClick]);

  // Handle Base Map Type Switch (Esri Satellite vs OpenStreetMap)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setMapTileError(false);

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
      sat.on('tileerror', () => setMapTileError(true));
      sat.addTo(map);
      baseLayerRef.current = sat;
    } else {
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });
      osm.on('tileerror', () => setMapTileError(true));
      osm.addTo(map);
      baseLayerRef.current = osm;
    }

    // Ensure GIBS layer stays on top if enabled
    if (showGibs && gibsLayerRef.current) {
      gibsLayerRef.current.bringToFront();
    }
  }, [baseMapType]);

  // Update GIBS layer visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !gibsLayerRef.current) return;
    if (showGibs) {
      gibsLayerRef.current.on('tileerror', () => setMapTileError(true));
      gibsLayerRef.current.addTo(mapInstanceRef.current);
      gibsLayerRef.current.bringToFront();
    } else {
      gibsLayerRef.current.remove();
    }
  }, [showGibs]);

  // Update Parcel Marker & High-Visibility Sized Polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }
    if (haloRef.current) {
      haloRef.current.remove();
    }
    if (polygonRef.current) {
      polygonRef.current.remove();
    }

    const selectionHalo = L.circleMarker([lat, lon], {
      radius: 22,
      color: '#10b981',
      weight: 2,
      fillColor: '#34d399',
      fillOpacity: 0.25,
      interactive: false
    }).addTo(map);
    haloRef.current = selectionHalo;

    const parcelIcon = L.divIcon({
      className: 'field-marker-icon',
      html: '<svg class="field-marker-svg" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 2.5C10.6 2.5 3 10 3 19.2c0 12.1 17 26.3 17 26.3s17-14.2 17-26.3C37 10 29.4 2.5 20 2.5Z" fill="#059669" stroke="#ffffff" stroke-width="3"/><circle cx="20" cy="19" r="5.5" fill="#ffffff"/></svg>',
      iconSize: [44, 52],
      iconAnchor: [22, 47]
    });

    const marker = L.marker([lat, lon], { icon: parcelIcon }).addTo(map);
    marker.bindPopup(`<b>${parcelName}</b><br/>${lang === 'es' ? 'Superficie' : 'Area'}: ${areaHa} ha (~${sideMeters} m × ${sideMeters} m)<br/>Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`);
    marker.bindTooltip(`${parcelName} · ${areaHa} ha`, {
      permanent: true,
      direction: 'top',
      offset: [0, -48],
      className: 'field-tooltip'
    });
    marker.getElement()?.setAttribute('aria-label', `${lang === 'es' ? 'Centro de parcela' : 'Field center'}: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    markerRef.current = marker;

    // Draw scaled parcel polygon around the center point (1 ha = 10,000 m2)
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
      fillOpacity: 0.18,
      weight: 2.5,
      dashArray: '5 5'
    }).addTo(map);
    polygonRef.current = poly;
    poly.bringToFront();
    marker.setZIndexOffset(1000);

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
        .bindPopup(`<b>${lang === 'es' ? 'Alerta EONET' : 'EONET alert'}: ${alert.title}</b><br/>${lang === 'es' ? 'Distancia a la parcela' : 'Distance to field'}: ${alert.distanceKm.toFixed(1)} km<br/>${lang === 'es' ? 'El círculo muestra un radio visual de referencia de 60 km.' : 'The circle shows a 60 km reference radius.'}`);

      alertLayersRef.current.push(stormCircle);
    });
  }, [lat, lon, parcelName, areaHa, sideMeters, eonetAlerts, lang]);

  const cropDemandMm: Record<string, number> = { maize: 550, sorghum: 450, wheat: 450, barley: 400, beans: 350, chickpea: 300, alfalfa: 600, broccoli: 380, tomato: 600, onion: 450, garlic: 400, strawberry: 500, oats: 380, vetch: 260, chili_pepper: 580, asparagus: 480, soybean: 450, sunflower: 400, potato: 500, canola: 380 };
  const irrigationEfficiency = waterRegime === 'goteo' ? 0.9 : waterRegime === 'gravedad' ? 0.6 : 1;
  const cropWaterEstimates = selectedCropIds.map((id) => ({ id, m3: Math.round((cropDemandMm[id] || 450) * areaHa * 10 / irrigationEfficiency) }));
  const estimateRange = cropWaterEstimates.length > 1
    ? `${Math.min(...cropWaterEstimates.map((item) => item.m3)).toLocaleString()}–${Math.max(...cropWaterEstimates.map((item) => item.m3)).toLocaleString()}`
    : (cropWaterEstimates[0]?.m3 ?? 0).toLocaleString();

  return (
    <div className="map-card overflow-hidden flex flex-col">
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

          {/* Perspective & Layer Switcher Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Zoom Actions */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={zoomToParcel}
                className="px-2 py-1 rounded text-[11px] font-semibold text-emerald-300 hover:text-white hover:bg-slate-700 transition-colors"
                title={t.btnFocusField}
              >
                {t.btnFocusField}
              </button>
              <button
                type="button"
                onClick={zoomToRegion}
                className="px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title={t.btnRegionView}
              >
                {t.btnRegionView}
              </button>
            </div>

            {/* Base map layer switcher */}
            <div className="map-toggle-group flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
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
          </div>
        </div>

        <form className="map-search" onSubmit={(event) => void searchLocation(event)}>
          <label htmlFor="field-location-search">{t.searchLabel}</label>
          <div className="map-search-control">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <input id="field-location-search" type="search" value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setSearchError(''); setSearchResults([]); }} placeholder={t.searchPlaceholder} autoComplete="off" minLength={2} maxLength={120} />
            <button type="submit" disabled={isSearching || locationQuery.trim().length < 2}>{isSearching ? (lang === 'es' ? 'Buscando…' : 'Searching…') : t.searchButton}</button>
          </div>
          <small>{t.searchHelp}</small>
          {searchResults.length > 0 && <div className="place-search-results" role="listbox" aria-label={t.resultLabel}>
            <strong>{t.resultLabel}</strong>
            {searchResults.map((place, index) => <button key={`${place.lat}-${place.lon}-${index}`} type="button" role="option" aria-selected="false" onClick={() => selectPlace(place)}><span>{place.name}</span><small>{placeTypeName(place.type, lang)}</small></button>)}
          </div>}
          {searchAttribution && <small className="place-attribution">{searchAttribution}</small>}
          {searchError && <p className="map-search-error" role="alert">{searchError}</p>}
        </form>

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
              <span className="font-bold text-cyan-300">{cropWaterEstimates.length ? `~${estimateRange}` : '—'} m³</span>
            </div>
            <small className="water-estimate-note">{lang === 'es' ? 'Por ciclo y cultivo si ocupa toda el área; catálogo, sin descontar lluvia.' : 'Per cycle and crop if it covers the full area; catalog value, rainfall not deducted.'}</small>
            {cropWaterEstimates.length > 0 && <div className="crop-water-hints">{cropWaterEstimates.map(({ id, m3 }) => <span key={id}>{cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ')} · {m3.toLocaleString()} m³</span>)}</div>}
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
      <div className="relative h-88 sm:h-96 w-full">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Clean HUD Status Overlay in bottom-left */}
        <div className="map-selection-readout absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-1.5 max-w-xs">
          <div className="flex items-center justify-between gap-2 font-bold text-white">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="truncate">{parcelName}</span>
            </div>
            <button
              type="button"
              onClick={recenterMap}
              className="text-[10px] text-emerald-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
            >
              {t.btnCenter}
            </button>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>{t.coordsLabel} {lat.toFixed(4)}°, {lon.toFixed(4)}°</span>
            <span className="text-emerald-400 font-bold">{areaHa} ha</span>
          </div>
          <div className="text-[10px] text-emerald-300 font-mono">
            {t.dimensionsLabel} ~{sideMeters} m × {sideMeters} m
          </div>
          {eonetAlerts.length > 0 && (
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[10px] pt-1 border-t border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>{eonetAlerts.length} {lang === 'es' ? 'alertas activas de EONET' : 'active EONET alerts'}</span>
            </div>
          )}
          {mapTileError && <p className="map-tile-error" role="status">{t.mapTileError}</p>}
          {eonetAlerts.length > 0 && <small className="alert-radius-legend"><i aria-hidden="true" />{t.alertLegend}</small>}
        </div>

        {/* Non-intrusive Hint Bar at top right */}
        <div className="absolute top-3 right-3 z-20 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-emerald-300 shadow">
          {t.clickHint}
        </div>
      </div>
    </div>
  );
};
