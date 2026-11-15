import React, { useState } from 'react';
import { Language, AnalysisResponse } from '../types/index.js';

interface AgroLayers3DProps {
  data: AnalysisResponse;
  lang: Language;
  areaHa: number;
}

export const AgroLayers3D: React.FC<AgroLayers3DProps> = ({ data, lang, areaHa }) => {
  const [activeLayer, setActiveLayer] = useState<'all' | 'atmosphere' | 'canopy' | 'topsoil' | 'subsoil'>('all');
  const [viewMode, setViewMode] = useState<'3d' | 'flat'>('3d');

  const sh = data.soil_hydraulics;
  const cs = data.climate_summary;
  const wb = data.physics?.water_balance;
  const latestW = wb?.w_mm?.[wb.w_mm.length - 1] ?? 120;
  const maxNdvi = Math.max(...(data.physics?.spline_result?.ndvi_filled || [0.65]));

  const t = {
    es: {
      title: 'Gemelo Digital 3D: Columna Edafoclimática',
      subtitle: 'Visualización tridimensional interactiva de telemetría orbital y estratigrafía física del suelo (0–60 cm).',
      sectionLabel: 'INNOVACIÓN · PERSPECTIVA 3D',
      toggle3D: 'Vista Isométrica 3D',
      toggleFlat: 'Corte Estratigráfico',
      layerAtmosphere: '1. Órbita & Atmósfera (NASA POWER)',
      layerCanopy: '2. Dosel Vegetal & NDVI (MODIS)',
      layerTopsoil: '3. Estrato Superficial 0–30 cm (SoilGrids)',
      layerSubsoil: '4. Zona Radicular Profunda 30–60 cm',
      allLayers: 'Todas las capas',
      meanTemp: 'Temperatura Media',
      precip: 'Precipitación',
      et0: 'Evapotranspiración ET0',
      ndviPeak: 'Vigor Vegetativo (NDVI)',
      soilMoisture: 'Humedad Almacenada W(t)',
      fieldCap: 'Capacidad de Campo (W_CC)',
      wiltPoint: 'Punto de Marchitez (W_PMP)',
      soilPh: 'Acidez del Suelo',
      claySand: 'Arcilla / Arena',
      soc: 'Carbono Orgánico',
      percolation: 'Drenaje Profundo / Acuífero',
      interactionHint: 'Toca cada estrato para aislar sus variables satelitales y biofísicas.'
    },
    en: {
      title: '3D Digital Twin: Biophysical Field Column',
      subtitle: 'Interactive 3D visualization of orbital telemetry and physical soil stratigraphy (0–60 cm).',
      sectionLabel: 'INNOVATION · 3D PERSPECTIVE',
      toggle3D: 'Isometric 3D View',
      toggleFlat: 'Stratigraphic Slice',
      layerAtmosphere: '1. Orbit & Atmosphere (NASA POWER)',
      layerCanopy: '2. Crop Canopy & NDVI (MODIS)',
      layerTopsoil: '3. Topsoil Layer 0–30 cm (SoilGrids)',
      layerSubsoil: '4. Deep Root Zone 30–60 cm',
      allLayers: 'All layers',
      meanTemp: 'Mean Temperature',
      precip: 'Precipitation',
      et0: 'Evapotranspiration ET0',
      ndviPeak: 'Vegetative Vigor (NDVI)',
      soilMoisture: 'Stored Soil Water W(t)',
      fieldCap: 'Field Capacity (W_FC)',
      wiltPoint: 'Wilting Point (W_WP)',
      soilPh: 'Soil pH',
      claySand: 'Clay / Sand',
      soc: 'Organic Carbon',
      percolation: 'Deep Drainage / Aquifer Recharge',
      interactionHint: 'Tap any stratum to isolate its satellite and biophysical variables.'
    }
  }[lang];

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">
              {t.sectionLabel}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">{t.title}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/[0.08] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === '3d'
                ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.toggle3D}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'flat'
                ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.toggleFlat}
          </button>
        </div>
      </div>

      {/* Layer selector pills */}
      <div className="px-5 py-3 bg-zinc-950/40 border-b border-white/[0.05] flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveLayer('all')}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeLayer === 'all'
              ? 'bg-zinc-800 text-white border border-white/20'
              : 'text-zinc-400 hover:text-white bg-zinc-900/60'
          }`}
        >
          {t.allLayers}
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer('atmosphere')}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeLayer === 'atmosphere'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-zinc-400 hover:text-sky-300 bg-zinc-900/60'
          }`}
        >
          🛰️ {t.layerAtmosphere.split(' ')[1]}
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer('canopy')}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeLayer === 'canopy'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-emerald-300 bg-zinc-900/60'
          }`}
        >
          🌿 {t.layerCanopy.split(' ')[1]}
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer('topsoil')}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeLayer === 'topsoil'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-zinc-400 hover:text-amber-300 bg-zinc-900/60'
          }`}
        >
          🟤 {t.layerTopsoil.split(' ')[1]} (0–30 cm)
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer('subsoil')}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
            activeLayer === 'subsoil'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-zinc-400 hover:text-indigo-300 bg-zinc-900/60'
          }`}
        >
          💧 {t.layerSubsoil.split(' ')[1]} (30–60 cm)
        </button>
      </div>

      {/* 3D Isometric Canvas Container */}
      <div className="agro-3d-viewport p-6 relative min-h-[380px] flex items-center justify-center bg-radial from-cyan-950/20 via-zinc-950 to-zinc-950 overflow-hidden">
        {/* Ambient grid glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

        <div className={`agro-3d-stage w-full max-w-xl ${viewMode === '3d' ? 'isometric' : 'flat'}`}>
          {/* Layer 1: Atmosphere & Satellite Orbital Data */}
          {(activeLayer === 'all' || activeLayer === 'atmosphere') && (
            <div
              onClick={() => setActiveLayer(activeLayer === 'atmosphere' ? 'all' : 'atmosphere')}
              className={`mb-4 p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 to-cyan-950/60 border border-sky-400/40 backdrop-blur-md shadow-lg shadow-sky-900/20 cursor-pointer transition-all hover:border-sky-300 hover:translate-y-[-2px] ${
                activeLayer === 'atmosphere' ? 'ring-2 ring-sky-400' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <span className="animate-spin text-sm">🛰️</span> {t.layerAtmosphere}
                </span>
                <span className="text-[10px] font-mono text-sky-400/80 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  LST Solar Time
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-sky-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.meanTemp}</span>
                  <span className="font-mono font-bold text-sky-200">
                    {cs?.mean_temperature_c?.toFixed(1) || '21.4'} °C
                  </span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-sky-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.et0}</span>
                  <span className="font-mono font-bold text-teal-300">
                    {cs?.total_et0_mm?.toFixed(0) || '245'} mm
                  </span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-sky-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.precip}</span>
                  <span className="font-mono font-bold text-blue-300">
                    {cs?.total_precip_mm?.toFixed(0) || '82'} mm
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Layer 2: Canopy & NDVI Trajectory */}
          {(activeLayer === 'all' || activeLayer === 'canopy') && (
            <div
              onClick={() => setActiveLayer(activeLayer === 'canopy' ? 'all' : 'canopy')}
              className={`mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-400/40 backdrop-blur-md shadow-lg shadow-emerald-900/20 cursor-pointer transition-all hover:border-emerald-300 hover:translate-y-[-2px] ${
                activeLayer === 'canopy' ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>🌿</span> {t.layerCanopy}
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  MOD13A2 Splines
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.ndviPeak}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-black text-emerald-300 text-sm">{maxNdvi.toFixed(2)}</span>
                    <span className="text-emerald-500 text-[10px]">NDVI</span>
                  </div>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-zinc-400 block text-[10px]">{lang === 'es' ? 'Superficie de Parcela' : 'Field Area'}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-black text-white text-sm">{areaHa.toFixed(1)}</span>
                    <span className="text-zinc-400 text-[10px]">ha</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layer 3: Topsoil 0–30 cm */}
          {(activeLayer === 'all' || activeLayer === 'topsoil') && (
            <div
              onClick={() => setActiveLayer(activeLayer === 'topsoil' ? 'all' : 'topsoil')}
              className={`mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border border-amber-400/40 backdrop-blur-md shadow-lg shadow-amber-900/20 cursor-pointer transition-all hover:border-amber-300 hover:translate-y-[-2px] ${
                activeLayer === 'topsoil' ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🟤</span> {t.layerTopsoil}
                </span>
                <span className="text-[10px] font-mono text-amber-400/80 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  {sh?.usda_texture_class || 'Clay Loam'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-amber-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.soilMoisture}</span>
                  <span className="font-mono font-bold text-cyan-300">{latestW.toFixed(1)} mm</span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-amber-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.fieldCap}</span>
                  <span className="font-mono font-bold text-emerald-400">{sh?.field_capacity_mm.toFixed(0)} mm</span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-amber-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.soilPh}</span>
                  <span className="font-mono font-bold text-amber-300">{sh?.soil_ph.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Layer 4: Deep Subsoil & Root Zone 30–60 cm */}
          {(activeLayer === 'all' || activeLayer === 'subsoil') && (
            <div
              onClick={() => setActiveLayer(activeLayer === 'subsoil' ? 'all' : 'subsoil')}
              className={`p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-blue-950/60 border border-indigo-400/40 backdrop-blur-md shadow-lg shadow-indigo-900/20 cursor-pointer transition-all hover:border-indigo-300 hover:translate-y-[-2px] ${
                activeLayer === 'subsoil' ? 'ring-2 ring-indigo-400' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>💧</span> {t.layerSubsoil}
                </span>
                <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                  Saxton-Rawls Zr=600mm
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-indigo-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.wiltPoint}</span>
                  <span className="font-mono font-bold text-rose-400">{sh?.wilting_point_mm.toFixed(0)} mm</span>
                </div>
                <div className="bg-zinc-950/60 p-2 rounded-lg border border-indigo-500/20">
                  <span className="text-zinc-400 block text-[10px]">{t.percolation}</span>
                  <span className="font-mono font-bold text-blue-300">D(W) = max(0, 0.25*(W - W_CC))</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 bg-zinc-950/80 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-400">
        <span>💡 {t.interactionHint}</span>
        <span className="font-mono text-emerald-400">NASA POWER · SoilGrids · Saxton-Rawls</span>
      </div>
    </div>
  );
};
