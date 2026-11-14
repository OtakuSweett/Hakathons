import React from 'react';
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
  const cropNames: Record<string, [string, string]> = {
    maize: ['Maíz', 'Maize'], sorghum: ['Sorgo', 'Sorghum'], wheat: ['Trigo', 'Wheat'], barley: ['Cebada', 'Barley'], beans: ['Frijol', 'Beans'], chickpea: ['Garbanzo', 'Chickpea'],
    alfalfa: ['Alfalfa', 'Alfalfa'], broccoli: ['Brócoli', 'Broccoli'], tomato: ['Jitomate', 'Tomato'], onion: ['Cebolla', 'Onion'], garlic: ['Ajo', 'Garlic'], strawberry: ['Fresa', 'Strawberry'],
    oats: ['Avena', 'Oats'], vetch: ['Veza', 'Vetch'], chili_pepper: ['Chile', 'Chili pepper'], asparagus: ['Espárrago', 'Asparagus'], soybean: ['Soya', 'Soybean'],
    sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola']
  };
  const cropLabel = (id: string) => cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ');

  return (
    <div className="bento-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {lang === 'es' ? 'Viabilidad Agronómica (Pre-Solver M5)' : 'Agronomic Feasibility Advisor (M5)'}
            </h2>
          </div>
          <span className="text-xs bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-xl border border-white/[0.08] font-mono">
            pH: <b className="text-emerald-400">{soilPh.toFixed(1)}</b>
          </span>
        </div>

        <div className="space-y-4 mt-4">
          {/* Viable Crops */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {lang === 'es' ? `Cultivos Viables (${viableCropIds.length})` : `Feasible Species (${viableCropIds.length})`}
              </span>
              <span className="text-[10px] text-zinc-400">{lang === 'es' ? 'GDD y pH adecuados' : 'GDD & pH suitable'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {viableCropIds.map((cid) => (
                <span
                  key={cid}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium capitalize hover:border-emerald-500/40 transition-colors"
                >
                  {cropLabel(cid)}
                </span>
              ))}
            </div>
          </div>

          {/* Discarded Crops with Diagnostic Reasons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {lang === 'es' ? `Cultivos Descartados (${discarded.length})` : `Filtered Out (${discarded.length})`}
              </span>
              <span className="text-[10px] text-zinc-500">{lang === 'es' ? 'Motivos agronómicos' : 'Agronomic reasons'}</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {discarded.slice(0, 6).map((disc) => (
                <div
                  key={disc.crop_id}
                  className="text-[11px] p-2 rounded-lg bg-zinc-900/60 border border-white/[0.05] text-zinc-300 flex items-start justify-between gap-2"
                >
                  <span className="font-semibold text-zinc-200 capitalize shrink-0">
                    {cropLabel(disc.crop_id)}:
                  </span>
                  <span className="text-zinc-400 text-right truncate">
                    {lang === 'es' ? disc.reason_text_es : disc.reason_text_en}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.05] text-[10px] text-zinc-400 flex items-center justify-between">
        <span>FAO-56 Eco-Crop Rules</span>
        <span className="text-emerald-400 font-mono">{lang === 'es' ? 'Estado: evaluado' : 'Status: evaluated'}</span>
      </div>
    </div>
  );
};
