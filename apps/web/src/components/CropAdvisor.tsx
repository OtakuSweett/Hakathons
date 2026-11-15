import React, { useState } from 'react';
import { Language } from '../types/index.js';

interface CropAdvisorProps {
  viableCropIds: string[];
  discarded: Array<{
    crop_id: string;
    reason_code: string;
    reason_text_es: string;
    reason_text_en: string;
  }>;
  soilPh: number;
  lang: Language;
}

export const CropAdvisor: React.FC<CropAdvisorProps> = ({
  viableCropIds,
  discarded,
  soilPh,
  lang
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const cropNames: Record<string, [string, string]> = {
    maize: ['Maíz', 'Maize'], sorghum: ['Sorgo', 'Sorghum'], wheat: ['Trigo', 'Wheat'], barley: ['Cebada', 'Barley'], beans: ['Frijol', 'Beans'], chickpea: ['Garbanzo', 'Chickpea'],
    alfalfa: ['Alfalfa', 'Alfalfa'], broccoli: ['Brócoli', 'Broccoli'], tomato: ['Jitomate', 'Tomato'], onion: ['Cebolla', 'Onion'], garlic: ['Ajo', 'Garlic'], strawberry: ['Fresa', 'Strawberry'],
    oats: ['Avena', 'Oats'], vetch: ['Veza', 'Vetch'], chili_pepper: ['Chile', 'Chili pepper'], asparagus: ['Espárrago', 'Asparagus'], soybean: ['Soya', 'Soybean'],
    sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola']
  };
  const cropLabel = (id: string) => cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ');

  const isEs = lang === 'es';
  const t = {
    title: isEs ? 'Viabilidad Agronómica (Pre-Solver M5)' : 'Agronomic Feasibility Advisor (M5)',
    subtitle: isEs ? 'Filtro biofísico de especies según umbral térmico GDD, pH edáfico y alertas de tormenta EONET.' : 'Biophysical species filter based on GDD thermal sum, edaphic pH, and EONET storm alerts.',
    sectionLabel: isEs ? 'FILTRO BIOFÍSICO · FAO-56' : 'BIOPHYSICAL FILTER · FAO-56',
    tabCards: isEs ? 'Vista Rápida' : 'Quick View',
    tabTable: isEs ? 'Tabla Diagnóstica' : 'Diagnostic Table',
    feasibleTitle: isEs ? 'Cultivos Viables' : 'Feasible Crops',
    feasibleDesc: isEs ? 'Cumplen requerimiento de GDD y tolerancia a pH' : 'Satisfy GDD thermal sum and pH tolerance',
    discardedTitle: isEs ? 'Cultivos Descartados' : 'Discarded Crops',
    discardedDesc: isEs ? 'Restricción agronómica activa' : 'Active agronomic restriction',
    colCrop: isEs ? 'Cultivo' : 'Crop',
    colStatus: isEs ? 'Estado' : 'Status',
    colCriterion: isEs ? 'Criterio Limitante' : 'Binding Criterion',
    colReason: isEs ? 'Diagnóstico Agronómico' : 'Agronomic Diagnosis',
    statusViable: isEs ? 'Viable' : 'Feasible',
    statusDiscarded: isEs ? 'Descartado' : 'Discarded',
    reasonViable: isEs ? 'Requerimiento térmico y pH compatibles con la parcela' : 'Thermal requirement and soil pH are fully compatible',
    phLevel: isEs ? 'pH del Suelo' : 'Soil pH'
  };

  return (
    <div className="bento-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#cbd9ce]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e583d]"></span>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#1e583d] tracking-wider block">
                {t.sectionLabel}
              </span>
              <h2 className="text-sm font-bold text-[#173d30] tracking-tight">
                {t.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#f0f5f2] rounded-lg p-0.5 border border-[#cbd8cf] text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2 py-0.5 rounded ${viewMode === 'cards' ? 'bg-white text-[#1e583d] shadow-xs' : 'text-[#526a5c]'}`}
              >
                {t.tabCards}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-0.5 rounded ${viewMode === 'table' ? 'bg-white text-[#1e583d] shadow-xs' : 'text-[#526a5c]'}`}
              >
                {t.tabTable}
              </button>
            </div>
            <span className="text-xs bg-[#f8faf8] text-[#173d30] px-2.5 py-1 rounded-lg border border-[#cbd8cf] font-mono">
              pH: <b className="text-[#1e583d]">{soilPh.toFixed(1)}</b>
            </span>
          </div>
        </div>

        {viewMode === 'cards' ? (
          <div className="space-y-4 mt-4">
            {/* Viable Crops */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#1e583d] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.feasibleTitle} ({viableCropIds.length})
                </span>
                <span className="text-[10px] text-[#526a5c]">{t.feasibleDesc}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {viableCropIds.map((cid) => (
                  <span
                    key={cid}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#e7f0ea] border border-[#a8c5ab] text-[#1e583d] font-medium capitalize"
                  >
                    {cropLabel(cid)}
                  </span>
                ))}
              </div>
            </div>

            {/* Discarded Crops with Diagnostic Reasons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#526a5c] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#526a5c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t.discardedTitle} ({discarded.length})
                </span>
                <span className="text-[10px] text-[#526a5c]">{t.discardedDesc}</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {discarded.slice(0, 6).map((disc) => (
                  <div
                    key={disc.crop_id}
                    className="text-[11px] p-2 rounded-lg bg-[#f8faf8] border border-[#cbd8cf] text-[#244438] flex items-start justify-between gap-2"
                  >
                    <span className="font-semibold text-[#173d30] capitalize shrink-0">
                      {cropLabel(disc.crop_id)}:
                    </span>
                    <span className="text-[#526a5c] text-right truncate">
                      {lang === 'es' ? disc.reason_text_es : disc.reason_text_en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#cbd8cf] max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#f0f5f2] border-b border-[#cbd8cf] text-[#244438]">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">{t.colCrop}</th>
                  <th className="py-2 px-2.5 font-semibold text-center">{t.colStatus}</th>
                  <th className="py-2 px-2.5 font-semibold">{t.colReason}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae5] bg-white">
                {viableCropIds.slice(0, 4).map((cid) => (
                  <tr key={`advisor-viable-${cid}`} className="hover:bg-[#f9fbf9]">
                    <td className="py-2 px-2.5 font-semibold text-[#173d30] capitalize">
                      {cropLabel(cid)}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#e7f0ea] text-[#1e583d] font-bold border border-[#a8c5ab]">
                        {t.statusViable}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-[#526a5c] text-[11px]">
                      {t.reasonViable}
                    </td>
                  </tr>
                ))}
                {discarded.map((disc, idx) => (
                  <tr key={`advisor-discarded-${disc.crop_id}-${idx}`} className="hover:bg-[#f9fbf9]">
                    <td className="py-2 px-2.5 font-semibold text-[#173d30] capitalize">
                      {cropLabel(disc.crop_id)}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#f8faf8] text-[#526a5c] font-medium border border-[#cbd8cf]">
                        {t.statusDiscarded}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-[#526a5c] text-[11px]">
                      {lang === 'es' ? disc.reason_text_es : disc.reason_text_en}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#cbd8cf] text-[10px] text-[#526a5c] flex items-center justify-between">
        <span>FAO-56 Eco-Crop Biophysical Rules</span>
        <span className="text-[#1e583d] font-mono font-bold">
          {lang === 'es' ? 'Pre-Solver: completado' : 'Pre-Solver: evaluated'}
        </span>
      </div>
    </div>
  );
};
