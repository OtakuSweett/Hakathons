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
  sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola'],
  fallow: ['Barbecho', 'Fallow']
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
  onSelectPreset?: (presetId: string) => void;
}

interface GlobalBreadbasket {
  id: string;
  flag: string;
  label: { es: string; en: string };
  region: { es: string; en: string };
  lat: number;
  lon: number;
  presetId?: string;
}

const GLOBAL_BREADBASKETS: GlobalBreadbasket[] = [
  { id: 'bajio', flag: '🇲🇽', label: { es: 'El Bajío (Qro)', en: 'El Bajio (Qro)' }, region: { es: 'Acuífero sobreexplotado', en: 'Depleted aquifer' }, lat: 20.5922, lon: -100.1972, presetId: 'el_marques_qro' },
  { id: 'san_juan', flag: '🇲🇽', label: { es: 'San Juan del Río (Qro)', en: 'San Juan del Rio (Qro)' }, region: { es: 'Valle agrícola intensivo', en: 'Intensive agricultural valley' }, lat: 20.4480, lon: -99.9650, presetId: 'san_juan_del_rio_qro' },
  { id: 'celaya', flag: '🇲🇽', label: { es: 'Celaya (Gto)', en: 'Celaya (Gto)' }, region: { es: 'Vertisoles arcillosos', en: 'Clay vertisols' }, lat: 20.5650, lon: -100.7450, presetId: 'celaya_gto' },
  { id: 'semiarid', flag: '🇲🇽', label: { es: 'Semidesierto (Colón)', en: 'Semiarid (Colón)' }, region: { es: 'Secano y nopal/sorgo', en: 'Rainfed & drought-tolerant' }, lat: 20.7250, lon: -100.0450, presetId: 'colon_qro_semiarid' },
  { id: 'yaqui', flag: '🇲🇽', label: { es: 'Valle del Yaqui (Son)', en: 'Yaqui Valley (Son)' }, region: { es: 'Riego gravedad en desierto', en: 'Desert gravity irrigation' }, lat: 27.3684, lon: -109.9280, presetId: 'valle_yaqui_sonora_mx' },
  { id: 'corn_belt', flag: '🇺🇸', label: { es: 'Corn Belt (Iowa)', en: 'Corn Belt (Iowa)' }, region: { es: 'Maíz y soya intensivos', en: 'Intensive corn-soy' }, lat: 42.0850, lon: -93.5850, presetId: 'iowa_corn_belt_us' },
  { id: 'pampa', flag: '🇦🇷', label: { es: 'Pampa Húmeda (Arg)', en: 'Pampa (Argentina)' }, region: { es: 'Hemisferio Sur austral', en: 'Southern Hemisphere austral' }, lat: -33.9500, lon: -60.5500, presetId: 'pampa_pergamino_ar' },
  { id: 'cerrado', flag: '🇧🇷', label: { es: 'Cerrado (Brasil)', en: 'Cerrado (Brazil)' }, region: { es: 'Zafra tropical austral', en: 'Tropical austral double-crop' }, lat: -12.4850, lon: -55.8250, presetId: 'mato_grosso_cerrado_br' },
  { id: 'andalucia', flag: '🇪🇸', label: { es: 'Andalucía (España)', en: 'Andalusia (Spain)' }, region: { es: 'Cuenca del Guadalquivir', en: 'Guadalquivir basin' }, lat: 37.4520, lon: -5.6120, presetId: 'andalucia_guadalquivir_es' },
  { id: 'punjab', flag: '🇮🇳', label: { es: 'Punjab (India)', en: 'Punjab (India)' }, region: { es: 'Estrés hídrico subterráneo', en: 'Groundwater stress crisis' }, lat: 30.8250, lon: 75.7500, presetId: 'punjab_ludhiana_in' }
];

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
  onLocationSearch,
  onSelectPreset
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const haloRef = useRef<L.CircleMarker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const selectionBoundsRef = useRef<L.Rectangle | null>(null);
  const alertLayersRef = useRef<L.Circle[]>([]);

  const [baseMapType, setBaseMapType] = useState<'satellite' | 'relief' | 'streets'>('satellite');
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
  const isEs = lang === 'es';

  const t = {
    title: isEs ? 'Delimitación de Parcela y Mapa de Riesgos' : 'Parcel Delimitation & Multi-Hazard Map',
    subtitle: isEs ? 'Exploración geográfica con imágenes satelitales Esri/NASA, relieve topográfico, alertas EONET v3 y dimensionamiento en hectáreas.' : 'Geographic exploration with Esri/NASA satellite imagery, 3D topographic relief, EONET v3 hazards, and dynamic hectare sizing.',
    searchLabel: isEs ? 'Busca ciudad, dirección o coordenadas' : 'Search a city, address, or coordinates',
    areaLabel: isEs ? 'Tamaño de Parcela:' : 'Parcel Area:',
    regimeLabel: isEs ? 'Régimen Hídrico:' : 'Water Regime:',
    temporal: isEs ? 'Temporal / Secano' : 'Rainfed (Temporal)',
    goteo: isEs ? 'Riego por Goteo (Tecnificado)' : 'Drip Irrigation (Tech)',
    gravedad: isEs ? 'Riego por Gravedad / Rodado' : 'Gravity / Furrow',
    gibsToggle: isEs ? 'Capa NASA GIBS (NDVI)' : 'NASA GIBS Overlay (NDVI)',
    volLabel: isEs ? 'Demanda de Agua Estimada:' : 'Estimated Water Demand:',
    coordsLabel: isEs ? 'Coordenadas:' : 'Coordinates:',
    satellite: isEs ? 'Satelital HD' : 'Satellite HD',
    relief: isEs ? 'Relieve 3D / Topografía' : '3D Relief / Topography',
    streets: isEs ? 'Calles / Base' : 'Streets / Base',
    clickHint: isEs ? 'Toca el mapa para marcar tu parcela o usa el buscador de localidades.' : 'Tap anywhere on the map to place your field or use the location search.',
    searchPlaceholder: isEs ? 'Ej. El Marqués, Querétaro' : 'e.g. Ames, Iowa',
    searchButton: isEs ? 'Buscar' : 'Search',
    resultLabel: isEs ? 'Elige el lugar correcto' : 'Choose the right place',
    noResults: isEs ? 'No encontramos ese lugar. Prueba con ciudad y país o marca el mapa.' : 'We could not find that place. Try city and country or select the map.',
    searchHelp: isEs ? 'La búsqueda se envía solo al pulsar Buscar. También acepta latitud, longitud.' : 'Your search is sent only when you press Search. Coordinates are accepted too.',
    alertLegend: isEs ? 'Círculo rojo: radio de referencia de 60 km alrededor de una alerta EONET activa.' : 'Red circle: 60 km reference radius around an active EONET alert.',
    mapTileError: isEs ? 'No se pudieron cargar algunas imágenes del mapa. Prueba otro tipo de mapa o revisa tu conexión.' : 'Some map imagery could not load. Try another map view or check your connection.',
    btnFocusField: isEs ? 'Enfocar Parcela' : 'Focus Field',
    btnRegionView: isEs ? 'Visión Regional' : 'Regional View',
    btnCenter: isEs ? 'Centrar' : 'Center',
    dimensionsLabel: isEs ? 'Dimensiones estimadas:' : 'Estimated dimensions:',
    globalBreadbasketsTitle: isEs ? 'Graneros del Mundo:' : 'Global Breadbaskets:',
    globalBreadbasketsSub: isEs ? 'Demostración planetaria en cuencas con estrés hídrico' : 'Demonstrate planetary scope across water-stressed basins'
  };

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
          color: '#2f6b4f',
          weight: 1.5,
          opacity: 0.6,
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
    const handleClick = (event: L.LeafletMouseEvent) => {
      const clickedLat = Number(event.latlng.lat.toFixed(5));
      const clickedLon = Number(event.latlng.lng.toFixed(5));
      setLocationQuery(`${clickedLat.toFixed(4)}, ${clickedLon.toFixed(4)}`);
      onMapClick(clickedLat, clickedLon);
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [onMapClick]);

  // Keep location query text synchronized with active parcel coordinates
  useEffect(() => {
    setLocationQuery(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  }, [lat, lon]);

  // Handle Base Map Type Switch (Satellite vs 3D Relief/Topography vs OpenStreetMap)
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
    } else if (baseMapType === 'relief') {
      const relief = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri, DeLorme, USGS, NPS',
          maxZoom: 18
        }
      );
      relief.on('tileerror', () => setMapTileError(true));
      relief.addTo(map);
      baseLayerRef.current = relief;
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

    // Pan map to new parcel center if coordinates shifted (snap instantly without animation lag)
    const center = map.getCenter();
    const distanceMoved = Math.hypot(center.lat - lat, center.lng - lon);
    if (distanceMoved > 0.001) {
      map.setView([lat, lon], map.getZoom() < 12 ? 14 : map.getZoom(), { animate: false });
      map.invalidateSize();
    }

    const popupHtml = `<b>${parcelName}</b><br/>${lang === 'es' ? 'Superficie' : 'Area'}: ${areaHa} ha (~${sideMeters} m × ${sideMeters} m)<br/>Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
    const tooltipText = `${parcelName} · ${areaHa} ha`;

    // Draw scaled parcel polygon around the center point (1 ha = 10,000 m2)
    const sideKm = Math.sqrt(areaHa * 0.01) / 2.0;
    const dLat = sideKm / 111.0;
    const cosLat = Math.cos((lat * Math.PI) / 180.0);
    const safeCos = Math.abs(cosLat) > 1e-4 ? cosLat : 1e-4;
    const dLon = sideKm / (111.0 * safeCos);

    const polygonCoords: [number, number][] = [
      [lat - dLat, lon - dLon],
      [lat - dLat, lon + dLon],
      [lat + dLat, lon + dLon],
      [lat + dLat, lon - dLon]
    ];

    if (haloRef.current) {
      haloRef.current.setLatLng([lat, lon]);
    } else {
      haloRef.current = L.circleMarker([lat, lon], {
        radius: 18,
        color: '#2f6b4f',
        weight: 2,
        fillColor: '#d4ec79',
        fillOpacity: 0.22,
        interactive: false
      }).addTo(map);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      markerRef.current.setPopupContent(popupHtml);
      markerRef.current.setTooltipContent(tooltipText);
      markerRef.current.getElement()?.setAttribute('aria-label', `${lang === 'es' ? 'Centro de parcela' : 'Field center'}: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    } else {
      const parcelIcon = L.divIcon({
        className: 'field-marker-icon',
        html: '<svg class="field-marker-svg" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 2.5C10.6 2.5 3 10 3 19.2c0 12.1 17 26.3 17 26.3s17-14.2 17-26.3C37 10 29.4 2.5 20 2.5Z" fill="#1e583d" stroke="#ffffff" stroke-width="2.5"/><circle cx="20" cy="19" r="5" fill="#d4ec79"/></svg>',
        iconSize: [40, 48],
        iconAnchor: [20, 44]
      });

      const marker = L.marker([lat, lon], { icon: parcelIcon }).addTo(map);
      marker.bindPopup(popupHtml);
      marker.bindTooltip(tooltipText, {
        permanent: true,
        direction: 'top',
        offset: [0, -44],
        className: 'field-tooltip'
      });
      marker.getElement()?.setAttribute('aria-label', `${lang === 'es' ? 'Centro de parcela' : 'Field center'}: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      markerRef.current = marker;
    }

    if (polygonRef.current) {
      polygonRef.current.setLatLngs(polygonCoords);
    } else {
      polygonRef.current = L.polygon(polygonCoords, {
        color: '#2f6b4f',
        fillColor: '#d4ec79',
        fillOpacity: 0.16,
        weight: 2,
        dashArray: '5 4'
      }).addTo(map);
    }

    polygonRef.current.bringToFront();
    markerRef.current.setZIndexOffset(1000);

    requestAnimationFrame(() => {
      mapInstanceRef.current?.invalidateSize();
    });

    // Clear old EONET alerts and redraw
    alertLayersRef.current.forEach((l) => l.remove());
    alertLayersRef.current = [];

    eonetAlerts.forEach((alert) => {
      const [stormLon, stormLat] = alert.nearestCoordinates;
      const stormCircle = L.circle([stormLat, stormLon], {
        color: '#b91c1c',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
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

  const handleSelectBreadbasket = (b: GlobalBreadbasket) => {
    setLocationQuery(`${b.lat.toFixed(4)}, ${b.lon.toFixed(4)}`);
    setSearchResults([]);
    setSearchError('');
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([b.lat, b.lon], 14, { animate: false });
      map.invalidateSize();
    }
    onLocationSearch(b.lat, b.lon, null);
    onMapClick(b.lat, b.lon);
    if (onSelectPreset && b.presetId) {
      onSelectPreset(b.presetId);
    }
  };

  return (
    <div className="map-card overflow-hidden flex flex-col bg-[#fffef8] border border-[#d2dbcc] rounded-xl">
      {/* Top Controls Bar */}
      <div className="p-4 bg-[#f8faf8] border-b border-[#e1e9e3] space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#1b362b] text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2f6b4f]"></span>
              {t.title}
            </h3>
            <p className="text-[#596e62] text-[11px]">{t.subtitle}</p>
          </div>

          {/* Perspective & Layer Switcher Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Zoom Actions with clean SVG icons */}
            <div className="flex bg-[#eaf0eb] p-0.5 rounded-lg border border-[#cbd8cf]">
              <button
                type="button"
                onClick={zoomToParcel}
                className="px-2.5 py-1 rounded text-[11px] font-semibold text-[#1f4a35] hover:text-[#0f2c1f] hover:bg-[#dbe7df] transition-colors flex items-center gap-1.5"
                title={t.btnFocusField}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="22" y1="12" x2="18" y2="12"/>
                  <line x1="6" y1="12" x2="2" y2="12"/>
                  <line x1="12" y1="6" x2="12" y2="2"/>
                  <line x1="12" y1="22" x2="12" y2="18"/>
                </svg>
                <span>{t.btnFocusField}</span>
              </button>
              <button
                type="button"
                onClick={zoomToRegion}
                className="px-2.5 py-1 rounded text-[11px] font-semibold text-[#486354] hover:text-[#1f4a35] hover:bg-[#dbe7df] transition-colors flex items-center gap-1.5"
                title={t.btnRegionView}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                  <line x1="8" y1="2" x2="8" y2="18"/>
                  <line x1="16" y1="6" x2="16" y2="22"/>
                </svg>
                <span>{t.btnRegionView}</span>
              </button>
            </div>

            {/* Base map layer switcher */}
            <div className="map-toggle-group flex bg-[#eaf0eb] p-0.5 rounded-lg border border-[#cbd8cf]">
              <button
                type="button"
                onClick={() => setBaseMapType('satellite')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  baseMapType === 'satellite' ? 'bg-[#2f6b4f] text-white shadow-xs' : 'text-[#486354] hover:text-[#1b362b]'
                }`}
              >
                {t.satellite}
              </button>
              <button
                type="button"
                onClick={() => setBaseMapType('relief')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  baseMapType === 'relief' ? 'bg-[#2f6b4f] text-white shadow-xs' : 'text-[#486354] hover:text-[#1b362b]'
                }`}
              >
                {t.relief}
              </button>
              <button
                type="button"
                onClick={() => setBaseMapType('streets')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  baseMapType === 'streets' ? 'bg-[#2f6b4f] text-white shadow-xs' : 'text-[#486354] hover:text-[#1b362b]'
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

        {/* Global Breadbaskets Quick-Launch */}
        <div className="pt-2 border-t border-[#e2eae4]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#1b362b] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2f6b4f]"></span>
              {t.globalBreadbasketsTitle}
            </span>
            <span className="text-[10px] text-[#596e62]">{t.globalBreadbasketsSub}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {GLOBAL_BREADBASKETS.map((b) => {
              const isActive = Math.abs(lat - b.lat) < 0.02 && Math.abs(lon - b.lon) < 0.02;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBreadbasket(b)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#1e583d] text-white border-[#1e583d] shadow-xs'
                      : 'bg-[#eef4f0] text-[#1f4a35] hover:bg-[#2f6b4f] hover:text-white border-[#cbd8cf]'
                  }`}
                  title={`${b.label[lang]} - ${b.region[lang]}`}
                >
                  <span>{b.flag}</span>
                  <span>{b.label[lang]}</span>
                  {isActive && <span className="ml-0.5 text-[9px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Parcel Size Slider & Water Regime Config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#e1e9e3]">
          {/* Hectares Slider */}
          <div className="bg-[#f2f6f3] p-2.5 rounded-xl border border-[#d6e2d9]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[#4b6053] font-semibold">{t.areaLabel}</span>
              <span className="font-bold text-[#1b4330] bg-white px-2 py-0.5 rounded border border-[#c8d8cd]">
                {areaHa.toFixed(1)} ha
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              step="1"
              value={areaHa}
              aria-label={t.areaLabel}
              onChange={(e) => onAreaChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#ccdcd0] rounded-lg appearance-none cursor-pointer accent-[#2f6b4f]"
            />
          </div>

          {/* Water Regime */}
          <div className="bg-[#f2f6f3] p-2.5 rounded-xl border border-[#d6e2d9]">
            <span className="text-[#4b6053] font-semibold block mb-1">{t.regimeLabel}</span>
            <select
              value={waterRegime}
              onChange={(e) => onWaterRegimeChange(e.target.value as any)}
              className="w-full bg-white text-[#1b362b] border border-[#c8d8cd] rounded-lg px-2 py-1 text-xs focus:outline-hidden"
            >
              <option value="temporal">{t.temporal}</option>
              <option value="goteo">{t.goteo}</option>
              <option value="gravedad">{t.gravedad}</option>
            </select>
          </div>

          {/* Volume Metric & Layer Toggle */}
          <div className="bg-[#f2f6f3] p-2.5 rounded-xl border border-[#d6e2d9] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[#4b6053]">{t.volLabel}</span>
              <span className="font-bold text-[#1a5b6c] font-mono">{cropWaterEstimates.length ? `~${estimateRange}` : '—'} m³</span>
            </div>
            <small className="water-estimate-note text-[#6a7c71]">{lang === 'es' ? 'Por ciclo y cultivo si ocupa toda el área; catálogo, sin descontar lluvia.' : 'Per cycle and crop if it covers the full area; catalog value, rainfall not deducted.'}</small>
            {cropWaterEstimates.length > 0 && <div className="crop-water-hints">{cropWaterEstimates.map(({ id, m3 }) => <span key={id}>{cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ')} · {m3.toLocaleString()} m³</span>)}</div>}
            <label className="flex items-center gap-2 cursor-pointer mt-1 text-[#334c3e] select-none font-medium">
              <input
                type="checkbox"
                checked={showGibs}
                onChange={(e) => setShowGibs(e.target.checked)}
                className="rounded text-[#2f6b4f] focus:ring-0 accent-[#2f6b4f]"
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
        <div className="map-selection-readout absolute bottom-3 left-3 z-20 bg-[#fffef8]/95 backdrop-blur-xs p-3 rounded-xl border border-[#cbd8cf] text-[11px] text-[#2c4739] shadow-md space-y-1.5 max-w-xs">
          <div className="flex items-center justify-between gap-2 font-bold text-[#173d30]">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-[#2f6b4f]"></span>
              <span className="truncate">{parcelName}</span>
            </div>
            <button
              type="button"
              onClick={recenterMap}
              className="text-[10px] text-[#2f6b4f] hover:text-[#173d30] px-2 py-0.5 rounded bg-[#edf4ef] border border-[#cbd8cf] cursor-pointer flex items-center gap-1 font-semibold"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              <span>{t.btnCenter}</span>
            </button>
          </div>
          <div className="text-[10px] text-[#556b5e] flex items-center justify-between">
            <span>{t.coordsLabel} {lat.toFixed(4)}°, {lon.toFixed(4)}°</span>
            <span className="text-[#236040] font-bold">{areaHa} ha</span>
          </div>
          <div className="text-[10px] text-[#2f6b4f] font-mono">
            {t.dimensionsLabel} ~{sideMeters} m × {sideMeters} m
          </div>
          {eonetAlerts.length > 0 && (
            <div className="flex items-center gap-1.5 text-[#a8332a] font-semibold text-[10px] pt-1 border-t border-[#e2eae5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse"></span>
              <span>{eonetAlerts.length} {lang === 'es' ? 'alertas activas de EONET' : 'active EONET alerts'}</span>
            </div>
          )}
          {mapTileError && <p className="map-tile-error" role="status">{t.mapTileError}</p>}
          {eonetAlerts.length > 0 && <small className="alert-radius-legend"><i aria-hidden="true" />{t.alertLegend}</small>}
        </div>

        {/* Non-intrusive Hint Bar at top right */}
        <div className="absolute top-3 right-3 z-20 bg-[#fffef8]/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#cbd8cf] text-[10px] text-[#2f6b4f] shadow-xs font-medium">
          {t.clickHint}
        </div>
      </div>
    </div>
  );
};
