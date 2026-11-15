import React, { useState } from 'react';
import { Language, AnalysisResponse, RotationSlot } from '../types/index.js';

interface SmartCalendarProps {
  data: AnalysisResponse;
  lang: Language;
}

export const SmartCalendar: React.FC<SmartCalendarProps> = ({ data, lang }) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const cropNames: Record<string, [string, string]> = {
    maize: ['Maíz', 'Maize'], sorghum: ['Sorgo', 'Sorghum'], wheat: ['Trigo', 'Wheat'], barley: ['Cebada', 'Barley'], beans: ['Frijol', 'Beans'], chickpea: ['Garbanzo', 'Chickpea'],
    alfalfa: ['Alfalfa', 'Alfalfa'], broccoli: ['Brócoli', 'Broccoli'], tomato: ['Jitomate', 'Tomato'], onion: ['Cebolla', 'Onion'], garlic: ['Ajo', 'Garlic'], strawberry: ['Fresa', 'Strawberry'],
    oats: ['Avena', 'Oats'], vetch: ['Veza', 'Vetch'], chili_pepper: ['Chile', 'Chili pepper'], asparagus: ['Espárrago', 'Asparagus'], soybean: ['Soya', 'Soybean'],
    sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola']
  };

  const t = {
    es: {
      title: 'Calendario Inteligente de Cultivos y Riegos',
      subtitle: 'Secuencia de rotación multianual (M6), fenología térmica GDD (M2) y momentos críticos de riego (M4).',
      sectionLabel: 'PLANIFICACIÓN · ROTACIÓN · GDD',
      cyclePV: 'Primavera - Verano (PV)',
      cycleOI: 'Otoño - Invierno (OI)',
      crop: 'Cultivo Asignado',
      waterNeed: 'Demanda Hídrica',
      profit: 'Margen Esperado',
      legumeFixation: 'Fijación de Nitrógeno',
      legumeYes: 'Leguminosa (+40-80 kg N/ha al suelo)',
      legumeNo: 'Extractor / No leguminosa',
      gddMilestones: 'Etapas de Crecimiento Térmico (GDD)',
      germination: 'Emergencia y Germinación',
      vegetative: 'Desarrollo Vegetativo Pleno',
      flowering: 'Floración y Llenado de Grano',
      maturity: 'Madurez Fisiológica y Cosecha',
      irrigationSchedule: 'Fechas de Riego Predictivo (Newton-Raphson)',
      recommendedIrrigation: 'Riego Sugerido Requerido',
      irrigationDetail: 'Para evitar que la reserva de humedad del suelo caiga por debajo del umbral crítico:',
      legumeTag: 'Leguminosa · +N',
      noStressDetected: 'Régimen hídrico seguro: sin estrés crítico',
      depthMm: 'Lámina por Aplicar',
      dayLabel: 'Regar en',
      tableTitle: 'Tabla Resumen de Rotación Agronómica Multianual',
      colCycle: 'Ciclo / Año',
      colCrop: 'Cultivo',
      colWater: 'Demanda Hídrica',
      colMargin: 'Margen Neto Estimado',
      colSoil: 'Efecto Edáfico',
      colAction: 'Ver Fases GDD'
    },
    en: {
      title: 'Smart Crop & Irrigation Calendar',
      subtitle: 'Multi-year rotation schedule (M6), GDD thermal phenology (M2), and predictive irrigation triggers (M4).',
      sectionLabel: 'PLANNING · ROTATION · GDD',
      cyclePV: 'Spring - Summer (PV)',
      cycleOI: 'Fall - Winter (OI)',
      crop: 'Assigned Crop',
      waterNeed: 'Water Demand',
      profit: 'Expected Margin',
      legumeFixation: 'Nitrogen Fixation',
      legumeYes: 'Legume (+40-80 kg N/ha to soil)',
      legumeNo: 'Depleting / Non-legume',
      gddMilestones: 'Thermal Crop Growth Stages (GDD)',
      germination: 'Emergence & Germination',
      vegetative: 'Peak Vegetative Growth',
      flowering: 'Flowering & Grain Filling',
      maturity: 'Physiological Maturity & Harvest',
      irrigationSchedule: 'Predictive Irrigation Timing (Newton-Raphson)',
      recommendedIrrigation: 'Suggested Irrigation Needed',
      irrigationDetail: 'To prevent stored soil moisture from dipping below critical wilting threshold:',
      legumeTag: 'Legume · +N',
      noStressDetected: 'Safe moisture regime: no critical stress',
      depthMm: 'Water Depth to Apply',
      dayLabel: 'Irrigate In',
      tableTitle: 'Multi-Year Agronomic Rotation Summary Table',
      colCycle: 'Cycle / Year',
      colCrop: 'Crop',
      colWater: 'Water Demand',
      colMargin: 'Estimated Net Margin',
      colSoil: 'Soil Effect',
      colAction: 'View GDD Stages'
    }
  }[lang];

  const rotation: RotationSlot[] = data.optimization?.selected_rotation || [];
  const activeSlot = rotation[selectedSlotIndex] || rotation[0];
  const trigger = data.physics?.irrigation_trigger;
  const irrigationReason = trigger?.reason === 'W_never_crosses_Wcrit'
    ? (lang === 'es' ? 'La reserva de agua no cruza el umbral crítico durante el periodo analizado.' : 'Water storage does not cross the critical threshold during the analysis period.')
    : trigger?.reason === 'W_already_below_Wcrit'
      ? (lang === 'es' ? 'La reserva de agua ya está por debajo del umbral crítico.' : 'Water storage is already below the critical threshold.')
      : trigger?.reason;
  const gddAccum = data.physics?.gdd_result?.gdd_accumulated || [];
  const latestGdd = gddAccum[gddAccum.length - 1] || 1420;

  const getCropLabel = (id: string) => cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ');

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#cbd9ce] bg-[#fffef8] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e583d]"></span>
            <span className="text-[11px] uppercase tracking-wider text-[#1e583d] font-bold">
              {t.sectionLabel}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#173d30] mt-1">{t.title}</h2>
          <p className="text-xs text-[#526a5c] mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* Rotation Timeline Selector */}
      <div className="p-5 border-b border-[#cbd9ce] bg-[#f8faf8]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#526a5c]">
            {lang === 'es' ? 'Secuencia de Rotación Multianual (3-4 Años)' : 'Multi-Year Rotation Sequence (3-4 Years)'}
          </span>
          <span className="text-xs text-[#1e583d] font-mono font-bold">
            {rotation.length} {lang === 'es' ? 'ciclos optimizados' : 'cycles'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {rotation.map((slot, index) => {
            const isSelected = index === selectedSlotIndex;
            const yearNum = Math.floor(index / 2) + 1;
            const cycleCode = slot.cycle_code || (index % 2 === 0 ? 'PV' : 'OI');
            return (
              <button
                key={slot.slot_index || index}
                onClick={() => setSelectedSlotIndex(index)}
                aria-pressed={isSelected}
                className={`rotation-slot p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#e7f0ea] text-[#173d30] border-[#1e583d] shadow-sm ring-1 ring-[#1e583d]'
                    : 'bg-white text-[#244438] border-[#cbd8cf] hover:border-[#1e583d] hover:bg-[#f9fbf9]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#526a5c] mb-1">
                  <span className="font-semibold">{lang === 'es' ? `Año ${yearNum}` : `Year ${yearNum}`}</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold font-mono text-[9px] ${
                    isSelected ? 'bg-[#1e583d] text-white' : 'bg-[#eef2ef] text-[#526a5c]'
                  }`}>
                    {cycleCode === 'PV' ? (lang === 'es' ? 'PV' : 'SS') : cycleCode === 'OI' ? (lang === 'es' ? 'OI' : 'FW') : cycleCode}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm capitalize truncate text-[#173d30]">
                  {getCropLabel(slot.crop_id)}
                </div>
                <div className="text-[11px] mt-1 text-[#1d577a] font-mono font-medium">
                  {Math.round(slot.water_need_mm)} mm
                </div>
                {slot.is_legume && (
                  <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-[#1e583d] text-white' : 'bg-[#e7f0ea] text-[#1e583d] border border-[#a8c5ab]'
                  }`}>
                    {t.legumeTag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Pane for Selected Slot */}
      {activeSlot && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white">
          {/* Left Column: GDD Thermal Progression */}
          <div className="bg-[#f8faf8] rounded-xl p-4 border border-[#cbd8cf]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#173d30] text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1e583d]"></span>
                {t.gddMilestones}
              </h3>
              <span className="text-xs bg-[#e7f0ea] text-[#1e583d] font-bold font-mono px-2 py-0.5 rounded-full border border-[#a8c5ab]">
                {Math.round(latestGdd)} {lang === 'es' ? 'GDD acumulados' : 'accumulated GDD'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-[#dbe5e0]">
                <div className="w-5 h-5 rounded-full bg-[#e7f0ea] text-[#1e583d] font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#173d30]">{t.germination}</div>
                  <div className="text-[#526a5c] text-[10px]">{lang === 'es' ? '120–180 GDD (aprox. día 7 a 14)' : '120–180 GDD (about days 7 to 14)'}</div>
                </div>
                <span className="text-[#1e583d] font-bold font-mono">150 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-[#dbe5e0]">
                <div className="w-5 h-5 rounded-full bg-[#eaf5f1] text-[#12675e] font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#173d30]">{t.vegetative}</div>
                  <div className="text-[#526a5c] text-[10px]">{lang === 'es' ? 'Máxima demanda de nitrógeno y evaporación' : 'Peak nitrogen demand and evaporation'}</div>
                </div>
                <span className="text-[#12675e] font-bold font-mono">580 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-[#dbe5e0]">
                <div className="w-5 h-5 rounded-full bg-[#fff5df] text-[#805600] font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#173d30]">{t.flowering}</div>
                  <div className="text-[#526a5c] text-[10px]">{lang === 'es' ? 'Sensibilidad crítica al déficit hídrico' : 'Critical sensitivity to water deficit'}</div>
                </div>
                <span className="text-[#805600] font-bold font-mono">950 GDD</span>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-[#dbe5e0]">
                <div className="w-5 h-5 rounded-full bg-[#e8f1f8] text-[#1d577a] font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#173d30]">{t.maturity}</div>
                  <div className="text-[#526a5c] text-[10px]">{lang === 'es' ? 'Maduración fisiológica y cosecha' : 'Physiological maturity and harvest'}</div>
                </div>
                <span className="text-[#1d577a] font-bold font-mono">{Math.round(latestGdd)} GDD</span>
              </div>
            </div>
          </div>

          {/* Right Column: Newton-Raphson Irrigation Trigger */}
          <div className="bg-[#f8faf8] rounded-xl p-4 border border-[#cbd8cf] flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-[#173d30] text-xs flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#12675e]"></span>
                {t.irrigationSchedule}
              </h3>

              {trigger?.t_star_days ? (
                <div className="p-3.5 rounded-xl border border-[#d6ba78] bg-[#fff9eb] mb-3">
                  <div className="flex items-center gap-2 text-[#805600] font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#805600] animate-ping"></span>
                    {t.recommendedIrrigation}
                  </div>
                  <p className="text-[11px] text-[#55451f] mb-3 leading-relaxed">
                    {t.irrigationDetail}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#e8dcb8]">
                      <span className="text-[#55451f] text-[10px] block font-medium">{t.dayLabel}</span>
                      <span className="text-base font-bold text-[#805600] font-mono">
                        {Math.round(trigger.t_star_days)} {lang === 'es' ? 'días' : 'days'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#e8dcb8]">
                      <span className="text-[#55451f] text-[10px] block font-medium">{t.depthMm}</span>
                      <span className="text-base font-bold text-[#087777] font-mono">
                        {trigger.delta_i_mm?.toFixed(1) || '45.0'} mm
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#f0f7f2] p-4 rounded-xl border border-[#a8c5ab] mb-3">
                  <div className="flex items-center gap-2 text-[#1e583d] font-bold text-xs mb-1">
                    <svg className="w-4 h-4 text-[#1e583d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {t.noStressDetected}
                  </div>
                  <p className="text-[11px] text-[#526a5c] mt-1 leading-relaxed">
                    {irrigationReason || (lang === 'es' ? 'W(t) permanece en la reserva de agua fácilmente aprovechable (RAW).' : 'W(t) remains safely within the readily available water (RAW) zone.')}
                  </p>
                </div>
              )}
            </div>

            {/* Nitrogen and Economics */}
            <div className="bg-white p-3 rounded-xl border border-[#cbd8cf] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#526a5c]">{t.legumeFixation}:</span>
                <span className="font-semibold text-[#1e583d]">
                  {activeSlot.is_legume ? t.legumeYes : t.legumeNo}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#dbe5e0] pt-1.5">
                <span className="text-[#526a5c]">{t.profit}:</span>
                <span className="font-bold text-[#173d30] font-mono text-sm">
                  ${Math.round(activeSlot.profit_mxn_ha).toLocaleString()} MXN/ha
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Summary Table of All Cycles */}
      {rotation.length > 0 && (
        <div className="p-5 border-t border-[#cbd9ce] bg-[#f8faf8]">
          <h3 className="font-bold text-[#173d30] text-sm mb-2">{t.tableTitle}</h3>
          <div className="overflow-x-auto rounded-xl border border-[#cbd8cf]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f0f5f2] border-b border-[#cbd8cf] text-[#244438]">
                  <th className="py-2.5 px-3 font-semibold">{t.colCycle}</th>
                  <th className="py-2.5 px-3 font-semibold">{t.colCrop}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.colWater}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.colMargin}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">{t.colSoil}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">{t.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae5] bg-white">
                {rotation.map((slot, idx) => {
                  const isSelected = idx === selectedSlotIndex;
                  const yearNum = Math.floor(idx / 2) + 1;
                  const cycleCode = slot.cycle_code || (idx % 2 === 0 ? 'PV' : 'OI');
                  const cycleLabel = cycleCode === 'PV'
                    ? (lang === 'es' ? `Año ${yearNum} · Primavera-Verano` : `Year ${yearNum} · Spring-Summer`)
                    : (lang === 'es' ? `Año ${yearNum} · Otoño-Invierno` : `Year ${yearNum} · Fall-Winter`);

                  return (
                    <tr
                      key={`smart-cal-slot-${slot.slot_index ?? idx}`}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#eef5f0] font-semibold' : 'hover:bg-[#f9fbf9]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#173d30]">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#1e583d]' : 'bg-[#cbd8cf]'}`}></span>
                          <span>{cycleLabel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#173d30] capitalize">
                        {getCropLabel(slot.crop_id)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#1d577a]">
                        {Math.round(slot.water_need_mm)} mm
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#173d30]">
                        ${Math.round(slot.profit_mxn_ha).toLocaleString()} MXN
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {slot.is_legume ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#e7f0ea] text-[#1e583d] font-bold border border-[#a8c5ab]">
                            {t.legumeTag}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#526a5c]">
                            {t.legumeNo}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedSlotIndex(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                            isSelected
                              ? 'bg-[#1e583d] text-white border-[#1e583d]'
                              : 'bg-white text-[#1e583d] border-[#cbd8cf] hover:border-[#1e583d]'
                          }`}
                        >
                          {isSelected ? (lang === 'es' ? 'Visualizando' : 'Active') : (lang === 'es' ? 'Ver GDD' : 'View GDD')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
