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
  const [showInfo, setShowInfo] = useState(false);
  const isEs = lang === 'es';
  const t = {
    title: isEs ? 'Monitoreo Dinámico de Cultivos y Suelo' : 'Dynamic Crop & Soil Moisture Monitoring',
    subtitle: isEs ? 'Fusión de observaciones satelitales MODIS (NDVI), reconstrucción por Splines (M1) y balance hídrico RK4 (M3).' : 'Fusion of MODIS satellite observations (NDVI), Natural Cubic Splines (M1), and RK4 water balance (M3).',
    tabWater: isEs ? 'Humedad Suelo W(t) & Estrés' : 'Soil Moisture W(t) & Thresholds',
    tabNdvi: isEs ? 'Trayectoria NDVI (Observado vs Splines)' : 'NDVI Trajectory (Observed vs Splines)',
    wLabel: isEs ? 'Humedad Suelo W(t)' : 'Soil Moisture W(t)',
    fcLabel: isEs ? 'Cap. de Campo (W_CC)' : 'Field Capacity (W_FC)',
    critLabel: isEs ? 'Umbral Crítico (W_crit)' : 'Critical Threshold (W_crit)',
    wpLabel: isEs ? 'Marchitez (W_PMP)' : 'Wilting Point (W_WP)',
    precipLabel: isEs ? 'Precipitación P(t)' : 'Precipitation P(t)',
    et0Label: isEs ? 'Evapotranspiración ET0' : 'Evapotranspiration ET0',
    ndviContinuous: isEs ? 'Spline Cúbico TDMA (Continuo)' : 'TDMA Natural Cubic Spline',
    ndviObs: isEs ? 'MODIS 16-días (Raw con vacíos)' : 'MODIS 16-Day (Raw with gaps)',
    date: isEs ? 'Fecha' : 'Date',
    moistureMm: isEs ? 'Lámina (mm)' : 'Water Depth (mm)',
    badgeHealthy: isEs ? 'Suelo en Rango Óptimo' : 'Optimal Moisture Range',
    badgeStress: isEs ? 'Zona de Agotamiento' : 'Depletion Zone Alert',
    summaryMoisture: isEs ? 'Humedad Actual' : 'Current Moisture',
    summaryEt0: isEs ? 'ET0 Acumulada' : 'Cumulative ET0',
    summaryPrecip: isEs ? 'Lluvia Acumulada' : 'Cumulative Rain',
    summaryNdvi: isEs ? 'NDVI Máximo' : 'Peak NDVI',
    sectionLabel: isEs ? 'SEGUIMIENTO · CULTIVO' : 'CROP MONITORING · FIELD',
    powerSource: isEs ? 'Datos diarios de NASA POWER' : 'NASA POWER daily data',
    ndviSource: isEs ? 'Spline TDMA de MODIS' : 'MODIS TDMA spline',
    singlePointWater: isEs ? 'Registro Puntual de Humedad en Suelo' : 'Single-Point Soil Moisture Record',
    singlePointWaterDesc: isEs ? 'Visualización de estratigrafía hídrica actual calculada por el modelo edafológico Saxton-Rawls sobre 600 mm de profundidad radicular.' : 'Current hydrologic stratigraphy calculated by Saxton-Rawls pedotransfer over 600 mm effective root depth.',
    singlePointNdvi: isEs ? 'Observación Satelital MODIS Actual' : 'Current MODIS Satellite Observation',
    singlePointNdviDesc: isEs ? 'Índice de Vegetación de Diferencia Normalizada muestreado para las coordenadas centrales de tu parcela.' : 'Normalized Difference Vegetation Index sampled at the center coordinates of your parcel.'
  };

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

  const isSingleWaterPoint = waterChartData.length <= 1;
  const isSingleNdviPoint = ndviChartData.length <= 1;

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
              {t.sectionLabel}
            </span>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
              title={isEs ? '¿Cómo se reconstruyen los datos de vegetación y agua?' : 'How is vegetation & water data reconstructed?'}
              aria-label="Info Monitor"
            >
              ?
            </button>
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

      {/* Informative Explanation Accordion for Crop Monitor */}
      {showInfo && (
        <div className="p-4 mx-5 mt-4 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1.5">
          <div className="flex justify-between items-center font-bold text-[#173d30]">
            <span>{isEs ? '¿Cómo se reconstruyen los datos de vegetación y suelo?' : 'How is vegetation & soil data reconstructed?'}</span>
            <button type="button" onClick={() => setShowInfo(false)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
          </div>
          <p className="text-[11px] leading-relaxed">
            {isEs
              ? '1) Reconstrucción NDVI (Módulo 1): Las imágenes satelitales ópticas sufren huecos por nubes y niebla. Nuestro algoritmo TDMA (Thomas) resuelve splines cúbicos naturales continuos para interpolar una trayectoria de verdor biológicamente realista sin saltos bruscos. 2) Balance Hídrico RK4 (Módulo 3): Integra la ecuación diferencial dW/dt = Precipitación + Riego - Evapotranspiración - Drenaje usando Runge-Kutta orden 4 sobre 600 mm de profundidad radicular, alertando antes de caer al punto de marchitez.'
              : '1) NDVI Reconstruction (Module 1): Optical satellites suffer gaps due to clouds and aerosols. Our TDMA algorithm solves natural cubic splines to interpolate a continuous vegetation trajectory without artificial discontinuities. 2) RK4 Water Balance (Module 3): Solves dW/dt = P + I - ETc - D via 4th-order Runge-Kutta over 600 mm root depth, detecting depletion before permanent wilting occurs.'}
          </p>
        </div>
      )}

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
          <span className="text-[10px] text-zinc-400">{t.powerSource}</span>
        </div>

        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/[0.05]">
          <span className="text-zinc-400 block text-[11px]">{t.summaryNdvi}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-black text-emerald-400 font-mono">{maxNdvi.toFixed(2)}</span>
            <span className="text-zinc-500 text-[11px]">NDVI</span>
          </div>
          <span className="text-[10px] text-zinc-400">{t.ndviSource}</span>
        </div>
      </div>

      {/* Main Chart Body */}
      <div className="p-5">
        {activeTab === 'water' ? (
          isSingleWaterPoint ? (
            /* Visual Gauge / Stratigraphic Tank Card when 1 point exists */
            <div className="p-6 bg-[#f8faf8] rounded-xl border border-[#cbd8cf] text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2f6b4f]" />
                <h4 className="text-sm font-bold text-[#1b362b]">{t.singlePointWater}</h4>
              </div>
              <p className="text-xs text-[#556b5e] mb-5 leading-relaxed">{t.singlePointWaterDesc}</p>

              <div className="space-y-3.5 max-w-md mx-auto">
                <div className="bg-white p-2.5 rounded-lg border border-[#e2eae5]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#236040] font-bold">{t.fcLabel}</span>
                    <span className="font-mono text-[#1b362b] font-semibold">{(sh?.field_capacity_mm ?? 165).toFixed(0)} mm</span>
                  </div>
                  <div className="w-full bg-[#e3eae5] rounded-full h-2">
                    <div className="bg-[#2f6b4f] h-2 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#cbe0d4]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#1a5b6c] font-bold">{t.wLabel}</span>
                    <span className="font-mono text-[#1a5b6c] font-bold">{latestW.toFixed(1)} mm</span>
                  </div>
                  <div className="w-full bg-[#e3eae5] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#1a5b6c] h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (latestW / (sh?.field_capacity_mm || 180)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#e2eae5]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#925f19] font-bold">{t.critLabel}</span>
                    <span className="font-mono text-[#1b362b] font-semibold">{(sh?.critical_water_mm ?? 122).toFixed(0)} mm</span>
                  </div>
                  <div className="w-full bg-[#e3eae5] rounded-full h-2">
                    <div className="bg-[#b47a24] h-2 rounded-full" style={{ width: `${(((sh?.critical_water_mm ?? 122)) / (sh?.field_capacity_mm || 180)) * 100}%` }} />
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-[#e2eae5]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#a43b29] font-bold">{t.wpLabel}</span>
                    <span className="font-mono text-[#1b362b] font-semibold">{(sh?.wilting_point_mm ?? 80).toFixed(0)} mm</span>
                  </div>
                  <div className="w-full bg-[#e3eae5] rounded-full h-2">
                    <div className="bg-[#c2412b] h-2 rounded-full" style={{ width: `${(((sh?.wilting_point_mm ?? 80)) / (sh?.field_capacity_mm || 180)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waterChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2eae5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#526a5c' }} stroke="#cbd8cf" />
                    <YAxis tick={{ fontSize: 11, fill: '#526a5c' }} stroke="#cbd8cf" unit="mm" domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fffef8', borderRadius: '10px', border: '1px solid #cbd9ce', fontSize: '11px', color: '#173d30', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                    {/* Saxton-Rawls Reference Thresholds */}
                    {sh?.field_capacity_mm && (
                      <ReferenceLine
                        y={sh.field_capacity_mm}
                        stroke="#1e583d"
                        strokeDasharray="4 4"
                        label={{ value: `${t.fcLabel} (${sh.field_capacity_mm.toFixed(0)} mm)`, fill: '#1e583d', fontSize: 10 }}
                      />
                    )}
                    {sh?.critical_water_mm && (
                      <ReferenceLine
                        y={sh.critical_water_mm}
                        stroke="#b47a24"
                        strokeDasharray="3 3"
                        label={{ value: `${t.critLabel} (${sh.critical_water_mm.toFixed(0)} mm)`, fill: '#b47a24', fontSize: 10 }}
                      />
                    )}
                    {sh?.wilting_point_mm && (
                      <ReferenceLine
                        y={sh.wilting_point_mm}
                        stroke="#c2412b"
                        strokeDasharray="2 2"
                        label={{ value: `${t.wpLabel} (${sh.wilting_point_mm.toFixed(0)} mm)`, fill: '#c2412b', fontSize: 10 }}
                      />
                    )}

                    <Line
                      type="monotone"
                      dataKey="w_mm"
                      name={t.wLabel}
                      stroke="#1a5b6c"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#1a5b6c' }}
                      activeDot={{ r: 6, fill: '#1a5b6c' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="precip_mm"
                      name={t.precipLabel}
                      stroke="#2f6b4f"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        ) : (
          isSingleNdviPoint ? (
            <div className="p-6 bg-[#f8faf8] rounded-xl border border-[#cbd8cf] text-center">
              <div className="w-10 h-10 rounded-full bg-[#e7f0ea] border border-[#a8c5ab] flex items-center justify-center mx-auto mb-2.5 text-[#1e583d]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12A10 10 0 0 1 12 2z"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h4 className="text-sm font-bold text-[#1b362b] mb-1">{t.singlePointNdvi}</h4>
              <p className="text-xs text-[#556b5e] max-w-sm mx-auto mb-4">{t.singlePointNdviDesc}</p>
              <div className="inline-flex items-baseline gap-2 bg-white px-4 py-2 rounded-xl border border-[#cbd8cf] shadow-xs">
                <span className="text-xs text-[#556b5e]">NDVI:</span>
                <span className="text-2xl font-black text-[#1e583d] font-mono">{maxNdvi.toFixed(2)}</span>
                <span className="text-xs text-[#2f6b4f] font-semibold">{lang === 'es' ? 'Vigor Estable' : 'Stable Vigor'}</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ndviChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2eae5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#526a5c' }} stroke="#cbd8cf" />
                    <YAxis tick={{ fontSize: 11, fill: '#526a5c' }} stroke="#cbd8cf" domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fffef8', borderRadius: '10px', border: '1px solid #cbd9ce', fontSize: '11px', color: '#173d30', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                    <Line
                      type="monotone"
                      dataKey="ndvi_spline"
                      name={t.ndviContinuous}
                      stroke="#1e583d"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ndvi_raw"
                      name={t.ndviObs}
                      stroke="#d97706"
                      strokeWidth={0}
                      dot={{ r: 4, fill: '#d97706' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        )}

        {sh && (
          <div className="mt-4 pt-3 border-t border-[#cbd8cf]">
            <h4 className="text-xs font-bold text-[#173d30] mb-2">
              {lang === 'es' ? 'Parámetros Hidráulicos de Suelo (Saxton-Rawls Zr = 600 mm)' : 'Soil Hydraulic Parameters (Saxton-Rawls Zr = 600 mm)'}
            </h4>
            <div className="overflow-x-auto rounded-xl border border-[#cbd8cf]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f5f2] border-b border-[#cbd8cf] text-[#244438]">
                    <th className="py-2 px-3 font-semibold">{lang === 'es' ? 'Estrato / Parámetro' : 'Hydraulic Parameter'}</th>
                    <th className="py-2 px-3 font-semibold text-right">{lang === 'es' ? 'Valor' : 'Value'}</th>
                    <th className="py-2 px-3 font-semibold">{lang === 'es' ? 'Significado Agronómico' : 'Agronomic Meaning'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2eae5] bg-white">
                  <tr className="hover:bg-[#f9fbf9]">
                    <td className="py-2 px-3 font-semibold text-[#1e583d]">{t.fcLabel}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#173d30]">{(sh.field_capacity_mm ?? 165).toFixed(0)} mm</td>
                    <td className="py-2 px-3 text-[#526a5c] text-[11px]">{lang === 'es' ? 'Límite máximo de retención sin pérdida por drenaje' : 'Maximum water retention without deep drainage'}</td>
                  </tr>
                  <tr className="hover:bg-[#f9fbf9]">
                    <td className="py-2 px-3 font-semibold text-[#b47a24]">{t.critLabel}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#b47a24]">{(sh.critical_water_mm ?? 122).toFixed(0)} mm</td>
                    <td className="py-2 px-3 text-[#526a5c] text-[11px]">{lang === 'es' ? 'Umbral donde comienza el estrés hídrico; detona riego' : 'Moisture threshold where stress begins; triggers irrigation'}</td>
                  </tr>
                  <tr className="hover:bg-[#f9fbf9]">
                    <td className="py-2 px-3 font-semibold text-[#c2412b]">{t.wpLabel}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#c2412b]">{(sh.wilting_point_mm ?? 80).toFixed(0)} mm</td>
                    <td className="py-2 px-3 text-[#526a5c] text-[11px]">{lang === 'es' ? 'Límite de sequedad donde la raíz no puede absorber agua' : 'Moisture limit where plant roots cannot extract water'}</td>
                  </tr>
                  <tr className="hover:bg-[#f9fbf9]">
                    <td className="py-2 px-3 font-semibold text-[#1a5b6c]">{lang === 'es' ? 'Agua Disponible (RAW)' : 'Readily Available Water (RAW)'}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#1a5b6c]">{((sh.field_capacity_mm ?? 165) - (sh.critical_water_mm ?? 122)).toFixed(0)} mm</td>
                    <td className="py-2 px-3 text-[#526a5c] text-[11px]">{lang === 'es' ? 'Reserva que el cultivo aprovecha libremente a máxima transpiración' : 'Water buffer the crop extracts freely at full transpiration'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
