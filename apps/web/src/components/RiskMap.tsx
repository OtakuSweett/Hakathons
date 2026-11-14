import React, { useEffect, useRef } from 'react';
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
  lang: Language;
  onMapClick: (lat: number, lon: number) => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({
  lat,
  lon,
  parcelName,
  eonetAlerts,
  lang,
  onMapClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Dynamic import of Leaflet on client side
    if (!mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 9,
        zoomControl: true
      });

      // CartoDB Dark Base Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      // NASA GIBS WMTS NDVI Layer (visual overlay)
      L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
        {
          attribution: 'NASA Earthdata / GIBS',
          opacity: 0.35,
          maxZoom: 9
        }
      ).addTo(map);

      // Click handler for arbitrary planetary coordinate selection
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lon], mapInstanceRef.current.getZoom());
    }

    const map = mapInstanceRef.current;

    // Update parcel marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    const parcelIcon = L.divIcon({
      className: 'custom-parcel-marker',
      html: `<div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px #10b981;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker([lat, lon], { icon: parcelIcon }).addTo(map);
    marker.bindPopup(`<b>${parcelName}</b><br/>Lat: ${lat.toFixed(4)}<br/>Lon: ${lon.toFixed(4)}`).openPopup();
    markerRef.current = marker;

    // Draw EONET disaster alerts
    eonetAlerts.forEach((alert) => {
      const [stormLon, stormLat] = alert.nearestCoordinates;
      L.circle([stormLat, stormLon], {
        color: '#ef4444',
        fillColor: '#f87171',
        fillOpacity: 0.25,
        radius: 60000 // 60 km storm buffer
      })
        .addTo(map)
        .bindPopup(
          `<b>⚠️ ${alert.title}</b><br/>${lang === 'es' ? 'Distancia a la parcela:' : 'Distance to parcel:'} ${alert.distanceKm} km<br/>` +
          `${lang === 'es' ? 'Pulso de lluvia extrema:' : 'Extreme rain pulse:'} +${alert.pulsePrecipitationMm} mm`
        );
    });
  }, [lat, lon, parcelName, eonetAlerts, lang, onMapClick]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
      <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-base">🗺️</span>
          <h2 className="text-sm font-bold text-white tracking-wide">
            {lang === 'es' ? '1. Mapa Geoespacial de Riesgos & GIBS' : '1. Geospatial Hazard & GIBS Map'}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>{lang === 'es' ? 'Parcela' : 'Parcel'}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span>NASA EONET</span>
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[340px]">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        <div className="absolute bottom-3 left-3 z-10 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 pointer-events-none">
          👆 {lang === 'es' ? 'Haz clic en cualquier punto terrestre para analizar' : 'Click anywhere on Earth to inspect parcel'}
        </div>
      </div>
    </div>
  );
};
