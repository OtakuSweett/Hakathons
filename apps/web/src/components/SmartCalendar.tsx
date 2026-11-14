import React, { useState } from 'react';
import { Language, AnalysisResponse, RotationSlot } from '../types/index.js';

interface SmartCalendarProps {
  data: AnalysisResponse;
  lang: Language;
}

export const SmartCalendar: React.FC<SmartCalendarProps> = ({ data, lang }) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  const t = {
    es: {
      title: 'Calendario Agronómico Inteligente',
      subtitle: 'Cronograma multianual optimizado (M6), hitos térmicos GDD (M2) y fechas de riego por Newton-Raphson (M4).',
      cyclePV: 'Primavera - Verano (PV)',
      cycleOI: 'Otoño - Invierno (OI)',
      crop: 'Cultivo Asignado',
      waterNeed: 'Demanda Hídrica',
      profit: 'Margen Esperado',
      legumeFixation: 'Fijación de Nitrógeno',
      legumeYes: 'Leguminosa (+40-80 kg N/ha al suelo)',
      legumeNo: 'Extractor / No leguminosa',
      gddMilestones: 'Hitos Térmicos Fenológicos (GDD - Módulo 2)',
      germination: 'Emergencia y Germinación',
      vegetative: 'Desarrollo Vegetativo Pleno',
      flowering: 'Floración y Llenado de Grano',
      maturity: 'Madurez Fisiológica y Cosecha',
      irrigationSchedule: 'Programación de Riego (Módulo 4)',
      recommendedIrrigation: 'Riego Preventivo Recomendado',
      noStressDetected: 'No se requiere riego de emergencia; la reserva hídrica permanece sobre el umbral crítico.',
      depthMm: 'Lámina a aplicar:',
      dayLabel: 'Día proyectado:'
    },
    en: {
      title: 'Smart Agronomic Calendar',
      subtitle: 'Multi-year optimized timeline (M6), GDD thermal milestones (M2), and Newton-Raphson irrigation triggers (M4).',
      cyclePV: 'Spring - Summer (PV)',
      cycleOI: 'Fall - Winter (OI)',
      crop: 'Assigned Crop',
      waterNeed: 'Water Demand',
      profit: 'Expected Margin',
      legumeFixation: 'Nitrogen Fixation',
      legumeYes: 'Legume (+40-80 kg N/ha to soil)',
      legumeNo: 'Depleting / Non-legume',
      gddMilestones: 'Phenological Thermal Milestones (GDD - Module 2)',
      germination: 'Emergence & Germination',
      vegetative: 'Peak Vegetative Growth',
      flowering: 'Flowering & Grain Filling',
      maturity: 'Physiological Maturity & Harvest',
      irrigationSchedule: 'Scheduled Irrigation Dates (Module 4)',
      recommendedIrrigation: 'Recommended Irrigation',
      noStressDetected: 'No emergency irrigation needed; soil water stays safely above critical threshold.',
      depthMm: 'Target depth to apply:',
      dayLabel: 'Projected day:'
    }
  }[lang];

  const rotation: RotationSlot[] = data.optimization?.selected_rotation || [];
  const activeSlot = rotation[selectedSlotIndex] || rotation[0];
  const trigger = data.physics?.irrigation_trigger;
  const gddAccum = data.physics?.gdd_result?.gdd_accumulated || [];
  const latestGdd = gddAccum[gddAccum.length - 1] || 1420;

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span className="text-[11px] uppercase tracking-wider text-teal-400 font-semibold">
              Función 6 / Módulos 2, 4 & 6
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">{t.title}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* Rotation Timeline Selector */}
      <div className="p-5 border-b border-white/[0.05] bg-zinc-950/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {lang === 'es' ? 'Secuencia de Rotación Multianual (3-4 Años)' : 'Multi-Year Rotation Sequence (3-4 Years)'}
          </span>
          <span className="text-xs text-emerald-400 font-mono font-medium">
            {rotation.length} {lang === 'es' ? 'ciclos optimizados' : 'cycles'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {rotation.map((slot, index) => {
            const isSelected = index === selectedSlotIndex;
            const yearNum = Math.floor(index / 2) + 1;
            return (
              <button
                key={slot.slot_index}
                onClick={() => setSelectedSlotIndex(index)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 text-white border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                    : 'bg-zinc-900/50 text-zinc-300 border-white/[0.06] hover:border-emerald-500/30 hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Año {yearNum}</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {slot.cycle_code}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm capitalize truncate text-white">
                  {slot.crop_id.replace('_', ' ')}
                </div>
                <div className="text-[11px] mt-1 text-zinc-400 font-mono">
                  {slot.water_need_mm.toFixed(0)} mm
                </div>
                {slot.is_legume && (
                  <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded font-medium ${
                    isSelected ? 'bg-emerald-400 text-zinc-950 font-bold' : 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  }`}>
                    +N Leguminosa
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Pane for Selected Slot */}
      {activeSlot && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column: GDD Thermal Progression */}
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-zinc-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {t.gddMilestones}
              </h3>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                {latestGdd.toFixed(0)} GDD Total
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/70 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">{t.germination}</div>
                  <div className="text-zinc-500 text-[10px]">120 - 180 GDD (aprox. día 7 a 14)</div>
                </div>
                <span className="text-emerald-400 font-bold font-mono">150 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/70 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">{t.vegetative}</div>
                  <div className="text-zinc-500 text-[10px]">Máxima demanda de nitrógeno y evaporación</div>
                </div>
                <span className="text-teal-400 font-bold font-mono">580 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/70 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">{t.flowering}</div>
                  <div className="text-zinc-500 text-[10px]">Sensibilidad crítica a déficit de agua</div>
                </div>
                <span className="text-amber-400 font-bold font-mono">950 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/70 border border-white/[0.04]">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">{t.maturity}</div>
                  <div className="text-zinc-500 text-[10px]">Maduración fisiológica y cosecha</div>
                </div>
                <span className="text-blue-400 font-bold font-mono">{latestGdd.toFixed(0)} GDD</span>
              </div>
            </div>
          </div>

          {/* Right Column: Newton-Raphson Irrigation Trigger */}
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-zinc-200 text-xs flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                {t.irrigationSchedule}
              </h3>

              {trigger?.t_star_days ? (
                <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 mb-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    {t.recommendedIrrigation}
                  </div>
                  <p className="text-[11px] text-zinc-300 mb-3">
                    {lang === 'es'
                      ? 'La raíz del agotamiento W(t) = W_crítico fue hallada por Newton-Raphson.'
                      : 'The root crossing W(t) = W_crit was solved via Newton-Raphson.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-white/[0.05]">
                      <span className="text-zinc-400 text-[10px] block">{t.dayLabel}</span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        Día +{trigger.t_star_days.toFixed(0)}
                      </span>
                    </div>
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-white/[0.05]">
                      <span className="text-zinc-400 text-[10px] block">{t.depthMm}</span>
                      <span className="text-base font-bold text-cyan-400 font-mono">
                        {trigger.delta_i_mm?.toFixed(1) || '45.0'} mm
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 mb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {t.noStressDetected}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {trigger?.reason || 'W(t) permanece en reserva de agua fácilmente aprovechable (RAW).'}
                  </p>
                </div>
              )}
            </div>

            {/* Nitrogen and Economics */}
            <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-white/[0.05] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{t.legumeFixation}:</span>
                <span className="font-semibold text-emerald-400">
                  {activeSlot.is_legume ? t.legumeYes : t.legumeNo}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.05] pt-1.5">
                <span className="text-zinc-400">{t.profit}:</span>
                <span className="font-bold text-white font-mono text-sm">
                  ${activeSlot.profit_mxn_ha.toLocaleString()} USD/ha
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
