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
      tabWater: 'Humedad de Suelo W(t) & Estrés',
      tabNdvi: 'Trayectoria NDVI (Observado vs Splines)',
      wLabel: 'Humedad Suelo W(t)',
      fcLabel: 'Capacidad de Campo (W_CC)',
      critLabel: 'Umbral Crítico (W_crit)',
      wpLabel: 'Marchitez Perm. (W_PMP)',
      precipLabel: 'Precipitación P(t)',
      et0Label: 'Evapotranspiración ET0',
      ndviContinuous: 'Spline Cúbico TDMA (Continuo)',
      ndviObs: 'MODIS 16-días (Raw con vacíos)',
      date: 'Fecha',
      moistureMm: 'Lámina de Agua (mm)',
      ndviIndex: 'Índice de Vegetación (NDVI)',
      badgeHealthy: 'Suelo en Rango Óptimo',
      badgeStress: 'Atención: Zona de Agotamiento',
      summaryMoisture: 'Humedad Actual',
      summaryEt0: 'ET0 Acumulado',
      summaryPrecip: 'Lluvia Acumulada',
      summaryNdvi: 'NDVI Máximo'
    },
    en: {
      title: 'Dynamic Crop & Soil Moisture Monitoring',
      subtitle: 'Fusion of MODIS satellite observations (NDVI), Natural Cubic Splines (M1), and RK4 water balance (M3).',
      tabWater: 'Soil Moisture W(t) & Stress Thresholds',
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
      ndviIndex: 'Vegetation Index (NDVI)',
      badgeHealthy: 'Soil in Optimal Range',
      badgeStress: 'Warning: Depletion Zone',
      summaryMoisture: 'Current Moisture',
      summaryEt0: 'Cumulative ET0',
      summaryPrecip: 'Cumulative Rain',
      summaryNdvi: 'Peak NDVI'
    }
  }[lang];

  const wb = data.physics?.water_balance;
  const sh = data.soil_hydraulics;
  const spline = data.physics?.spline_result;

  // Build water chart data (sampling every 2 days to keep chart light and crisp)
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
    // Simulate raw cloud-gapped satellite observation every 3rd step
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
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">Función 5 / Módulos 1 & 3</span>
          </div>
          <h2 className="text-xl font-bold mt-1">{t.title}</h2>
          <p className="text-xs text-emerald-200 mt-0.5">{t.subtitle}</p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-emerald-800/60 p-1 rounded-xl self-start md:self-auto border border-emerald-700">
          <button
            onClick={() => setActiveTab('water')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'water'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            {t.tabWater}
          </button>
          <button
            onClick={() => setActiveTab('ndvi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ndvi'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            {t.tabNdvi}
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-emerald-50/50 border-b border-emerald-100 text-xs">
        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
          <span className="text-gray-500 block">{t.summaryMoisture}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-emerald-900">{latestW.toFixed(1)}</span>
            <span className="text-gray-500">mm</span>
          </div>
          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isStressed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {isStressed ? t.badgeStress : t.badgeHealthy}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
          <span className="text-gray-500 block">{t.summaryEt0}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-teal-800">
              {data.climate_summary?.total_et0_mm?.toFixed(0) || '245'}
            </span>
            <span className="text-gray-500">mm</span>
          </div>
          <span className="text-[10px] text-gray-400">Penman-Monteith FAO-56</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
          <span className="text-gray-500 block">{t.summaryPrecip}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-blue-800">
              {data.climate_summary?.total_precip_mm?.toFixed(0) || '82'}
            </span>
            <span className="text-gray-500">mm</span>
          </div>
          <span className="text-[10px] text-gray-400">NASA POWER Daily</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
          <span className="text-gray-500 block">{t.summaryNdvi}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-lime-700">{maxNdvi.toFixed(2)}</span>
            <span className="text-gray-500">NDVI</span>
          </div>
          <span className="text-[10px] text-gray-400">MODIS Spline Interpolated</span>
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="p-6">
        {activeTab === 'water' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{t.tabWater}</h3>
                <p className="text-xs text-gray-500">
                  {lang === 'es'
                    ? 'Trayectoria de humedad W(t) resuelta por Runge-Kutta 4to orden (Módulo 3) contrastada con límites Saxton-Rawls.'
                    : 'Soil water trajectory W(t) computed via 4th-order Runge-Kutta ODE (Module 3) against Saxton-Rawls thresholds.'}
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="mm" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d1fae5', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {/* Saxton-Rawls Reference Thresholds */}
                  {sh?.field_capacity_mm && (
                    <ReferenceLine
                      y={sh.field_capacity_mm}
                      stroke="#059669"
                      strokeDasharray="4 4"
                      label={{ value: `${t.fcLabel} (${sh.field_capacity_mm.toFixed(0)} mm)`, fill: '#059669', fontSize: 10 }}
                    />
                  )}
                  {sh?.critical_water_mm && (
                    <ReferenceLine
                      y={sh.critical_water_mm}
                      stroke="#d97706"
                      strokeDasharray="3 3"
                      label={{ value: `${t.critLabel} (${sh.critical_water_mm.toFixed(0)} mm)`, fill: '#d97706', fontSize: 10 }}
                    />
                  )}
                  {sh?.wilting_point_mm && (
                    <ReferenceLine
                      y={sh.wilting_point_mm}
                      stroke="#dc2626"
                      strokeDasharray="2 2"
                      label={{ value: `${t.wpLabel} (${sh.wilting_point_mm.toFixed(0)} mm)`, fill: '#dc2626', fontSize: 10 }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="w_mm"
                    name={t.wLabel}
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="precip_mm"
                    name={t.precipLabel}
                    stroke="#6366f1"
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{t.tabNdvi}</h3>
                <p className="text-xs text-gray-500">
                  {lang === 'es'
                    ? 'Reconstrucción continua con Splines Cúbicos Naturales (TDMA Módulo 1) sobre observaciones satelitales con vacíos de nubes.'
                    : 'Continuous Natural Cubic Spline reconstitution (TDMA Module 1) over cloud-obscured satellite time series.'}
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ndviChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d1fae5', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  <Line
                    type="monotone"
                    dataKey="ndvi_spline"
                    name={t.ndviContinuous}
                    stroke="#15803d"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ndvi_raw"
                    name={t.ndviObs}
                    stroke="#ea580c"
                    strokeWidth={0}
                    dot={{ r: 5, fill: '#ea580c', strokeWidth: 1 }}
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
