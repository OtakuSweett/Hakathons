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
      slotTitle: 'Ciclo Agrícola',
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
      irrigationSchedule: 'Fechas de Riego Programadas (Módulo 4)',
      recommendedIrrigation: 'Riego Recomendado',
      noStressDetected: 'No se requiere riego de emergencia; la reserva hídrica permanece sobre el umbral crítico.',
      depthMm: 'Lámina a aplicar:',
      dayLabel: 'Día proyectado:'
    },
    en: {
      title: 'Smart Agronomic Calendar',
      subtitle: 'Multi-year optimized timeline (M6), GDD thermal milestones (M2), and Newton-Raphson irrigation triggers (M4).',
      cyclePV: 'Spring - Summer (PV)',
      cycleOI: 'Fall - Winter (OI)',
      slotTitle: 'Agricultural Cycle',
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
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
            <span className="text-xs uppercase tracking-wider text-teal-300 font-semibold">Función 6 / Módulos 2, 4 & 6</span>
          </div>
          <h2 className="text-xl font-bold mt-1">{t.title}</h2>
          <p className="text-xs text-emerald-200 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* Rotation Timeline Selector */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {lang === 'es' ? 'Secuencia de Rotación Multianual (3-4 Años)' : 'Multi-Year Rotation Sequence (3-4 Years)'}
          </span>
          <span className="text-xs text-emerald-700 font-medium">
            {rotation.length} {lang === 'es' ? 'ciclos optimizados' : 'optimized cycles'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {rotation.map((slot, index) => {
            const isSelected = index === selectedSlotIndex;
            const yearNum = Math.floor(index / 2) + 1;
            return (
              <button
                key={slot.slot_index}
                onClick={() => setSelectedSlotIndex(index)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] opacity-80 mb-1">
                  <span>Año {yearNum}</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {slot.cycle_code}
                  </span>
                </div>
                <div className="font-bold text-sm capitalize truncate">
                  {slot.crop_id.replace('_', ' ')}
                </div>
                <div className="text-[11px] mt-1.5 opacity-90">
                  {slot.water_need_mm.toFixed(0)} mm
                </div>
                {slot.is_legume && (
                  <span className={`inline-block mt-1 text-[10px] px-1 rounded ${
                    isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-teal-50 text-teal-700'
                  }`}>
                    +N Legume
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Pane for the Selected Slot */}
      {activeSlot && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Fenología y GDD (Módulo 2 Simpson) */}
          <div className="bg-emerald-50/40 rounded-xl p-5 border border-emerald-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-emerald-950 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {t.gddMilestones}
              </h3>
              <span className="text-xs bg-emerald-200/60 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {latestGdd.toFixed(0)} GDD Total
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{t.germination}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    120 - 180 GDD (aprox. día 7 a 14)
                  </div>
                </div>
                <span className="text-emerald-700 font-bold">150 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{t.vegetative}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Máxima demanda de nitrógeno y evaporación
                  </div>
                </div>
                <span className="text-teal-700 font-bold">580 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{t.flowering}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Sensibilidad crítica a déficit de agua
                  </div>
                </div>
                <span className="text-amber-700 font-bold">950 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{t.maturity}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Secado natural y fecha estimada de siega
                  </div>
                </div>
                <span className="text-blue-700 font-bold">{latestGdd.toFixed(0)} GDD</span>
              </div>
            </div>
          </div>

          {/* Right Column: Riego Predictivo Newton-Raphson (Módulo 4) */}
          <div className="bg-teal-50/40 rounded-xl p-5 border border-teal-100 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-teal-950 text-sm flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                {t.irrigationSchedule}
              </h3>

              {trigger?.t_star_days ? (
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs mb-3">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    {t.recommendedIrrigation}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {lang === 'es'
                      ? 'La raíz del agotamiento W(t) = W_crítico fue hallada por Newton-Raphson.'
                      : 'The root crossing W(t) = W_crit was solved via Newton-Raphson.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-amber-50 p-2.5 rounded-lg">
                      <span className="text-gray-500 block">{t.dayLabel}</span>
                      <span className="text-base font-bold text-amber-900">
                        Día +{trigger.t_star_days.toFixed(0)}
                      </span>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-lg">
                      <span className="text-gray-500 block">{t.depthMm}</span>
                      <span className="text-base font-bold text-blue-900">
                        {trigger.delta_i_mm?.toFixed(1) || '45.0'} mm
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs mb-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {t.noStressDetected}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {trigger?.reason || 'W(t) permanece en reserva de agua fácilmente aprovechable (RAW).'}
                  </p>
                </div>
              )}
            </div>

            {/* Nitrogen and Economics summary for slot */}
            <div className="bg-white p-4 rounded-xl border border-teal-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t.legumeFixation}:</span>
                <span className="font-semibold text-emerald-800">
                  {activeSlot.is_legume ? t.legumeYes : t.legumeNo}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-500">{t.profit}:</span>
                <span className="font-bold text-emerald-900 text-sm">
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
