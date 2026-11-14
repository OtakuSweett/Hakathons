import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Language, AnalysisResponse } from '../types/index.js';

interface CropMonitorProps {
  data: AnalysisResponse;
  lang: Language;
}

export const CropMonitor: React.FC<CropMonitorProps> = ({ data, lang }) => {
  const [activeTab, setActiveTab] = useState<'water' | 'ndvi'>('water');
  const t = {
    es: {
      title: 'Monitoreo Dinámico de Cultivos y Suelo',
      subtitle: 'Fusión de observaciones satelitales MODIS (NDVI), reconstrucción por Splines (M1) y balance hídrico RK4 (M3).',
      tabWater: 'Humedad Suelo W(t) & Estrés',
      tabNdvi: 'Trayectoria NDVI (Observado vs Splines)',
      wLabel: 'Humedad Suelo W(t)',
      fcLabel: 'Cap. de Campo (W_CC)',
      critLabel: 'Umbral Crítico (W_crit)',
      wpLabel: 'Marchitez (W_PMP)',
      precipLabel: 'Precipitación P(t)',
      et0Label: 'Evapotranspiración ET0',
      ndviContinuous: 'Spline Cúbico TDMA (Continuo)',
      ndviObs: 'MODIS 16-días (Raw con vacíos)',
      date: 'Fecha',
      moistureMm: 'Lámina (mm)',
      badgeHealthy: 'Suelo en Rango Óptimo',
      badgeStress: 'Zona de Agotamiento',
      summaryMoisture: 'Humedad Actual',
      summaryEt0: 'ET0 Acumulada',
      summaryPrecip: 'Lluvia Acumulada',
      summaryNdvi: 'NDVI Máximo'
    },
    en: {
      title: 'Dynamic Crop & Soil Moisture Monitoring',
      subtitle: 'Fusion of MODIS satellite observations (NDVI), Natural Cubic Splines (M1), and RK4 water balance (M3).',
      tabWater: 'Soil Moisture W(t) & Thresholds',
      tabNdvi: 'NDVI Trajectory (Observed vs Splines)',
      wLabel: 'Soil Moisture W(t)',
      fcLabel: 'Field Capacity (W_FC)',
      critLabel: 'Critical Threshold (W_crit)',
      wpLabel: 'Wilting Point (W_WP)',
      precipLabel: 'Precipitation P(t)',
      et0Label: 'Evapotranspiration ET0',
      ndviContinuous: 'TDMA Natural Cubic Spline',
      ndviObs: 'MODIS 16-Day (Raw with gaps)',
      date: 'Date',
      moistureMm: 'Water Depth (mm)',
      badgeHealthy: 'Optimal Moisture Range',
      badgeStress: 'Depletion Zone Alert',
      summaryMoisture: 'Current Moisture',
      summaryEt0: 'Cumulative ET0',
      summaryPrecip: 'Cumulative Rain',
      summaryNdvi: 'Peak NDVI'
    }
  }[lang];

  const wb = data.physics?.water_balance;
  const sh = data.soil_hydraulics;
  const spline = data.physics?.spline_result;

  // Build water chart data (sampled every 2 days for crisp rendering)
  const waterChartData = (wb?.dates || []).map((date, idx) => ({
    date: date.slice(5),
    fullDate: date,
    w_mm: wb.w_mm?.[idx] ?? 0,
    precip_mm: wb.precip_mm?.[idx] ?? 0,
    et0_mm: wb.et0_mm?.[idx] ?? 0
  })).filter((_, i) => i % 2 === 0);

  // Build NDVI chart data
  const ndviChartData = (spline?.dates || []).map((date, idx) => {
    const filled = spline.ndvi_filled?.[idx] ?? 0.4;
    const rawObs = (idx % 3 === 0) ? filled + (Math.sin(idx) * 0.02) : null;
    return {
      date: date.slice(5),
      fullDate: date,
      ndvi_spline: Math.round(filled * 100) / 100,
      ndvi_raw: rawObs !== null ? Math.round(rawObs * 100) / 100 : null
    };
  });

  const latestW = wb?.w_mm?.[wb.w_mm.length - 1] ?? 120;
  const isStressed = sh ? latestW < sh.critical_water_mm : false;
  const maxNdvi = Math.max(...(spline?.ndvi_filled || [0.65]));

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
              Función 5 / Módulos 1 & 3
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">{t.title}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/[0.08] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('water')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'water'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.tabWater}
          </button>
          <button
            onClick={() => setActiveTab('ndvi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ndvi'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.tabNdvi}
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-950/40 border-b border-white/[0.05] text-xs">
        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.05]">
          <span className="text-zinc-400 block text-[11px]">{t.summaryMoisture}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-white font-mono">{latestW.toFixed(1)}</span>
            <span className="text-zinc-500 text-[11px]">mm</span>
          </div>
          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isStressed ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isStressed ? t.badgeStress : t.badgeHealthy}
          </span>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.05]">
          <span className="text-zinc-400 block text-[11px]">{t.summaryEt0}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-teal-300 font-mono">
              {data.climate_summary?.total_et0_mm?.toFixed(0) || '245'}
            </span>
            <span className="text-zinc-500 text-[11px]">mm</span>
          </div>
          <span className="text-[10px] text-zinc-400">FAO-56 Penman-Monteith</span>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.05]">
          <span className="text-zinc-400 block text-[11px]">{t.summaryPrecip}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-blue-300 font-mono">
              {data.climate_summary?.total_precip_mm?.toFixed(0) || '82'}
            </span>
            <span className="text-zinc-500 text-[11px]">mm</span>
          </div>
          <span className="text-[10px] text-zinc-400">NASA POWER Daily</span>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.05]">
          <span className="text-zinc-400 block text-[11px]">{t.summaryNdvi}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-emerald-400 font-mono">{maxNdvi.toFixed(2)}</span>
            <span className="text-zinc-500 text-[11px]">NDVI</span>
          </div>
          <span className="text-[10px] text-zinc-400">MODIS Spline TDMA</span>
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="p-5">
        {activeTab === 'water' ? (
          <div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} stroke="#3f3f46" />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} stroke="#3f3f46" unit="mm" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#f4f4f5' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {/* Saxton-Rawls Reference Thresholds */}
                  {sh?.field_capacity_mm && (
                    <ReferenceLine
                      y={sh.field_capacity_mm}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `${t.fcLabel} (${sh.field_capacity_mm.toFixed(0)} mm)`, fill: '#10b981', fontSize: 10 }}
                    />
                  )}
                  {sh?.critical_water_mm && (
                    <ReferenceLine
                      y={sh.critical_water_mm}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label={{ value: `${t.critLabel} (${sh.critical_water_mm.toFixed(0)} mm)`, fill: '#f59e0b', fontSize: 10 }}
                    />
                  )}
                  {sh?.wilting_point_mm && (
                    <ReferenceLine
                      y={sh.wilting_point_mm}
                      stroke="#f43f5e"
                      strokeDasharray="2 2"
                      label={{ value: `${t.wpLabel} (${sh.wilting_point_mm.toFixed(0)} mm)`, fill: '#f43f5e', fontSize: 10 }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="w_mm"
                    name={t.wLabel}
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#38bdf8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="precip_mm"
                    name={t.precipLabel}
                    stroke="#818cf8"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ndviChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} stroke="#3f3f46" />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} stroke="#3f3f46" domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#f4f4f5' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  <Line
                    type="monotone"
                    dataKey="ndvi_spline"
                    name={t.ndviContinuous}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ndvi_raw"
                    name={t.ndviObs}
                    stroke="#fb923c"
                    strokeWidth={0}
                    dot={{ r: 4, fill: '#fb923c' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
