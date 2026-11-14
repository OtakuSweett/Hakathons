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
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-base">🌱</span>
          <h2 className="text-sm font-bold text-white tracking-wide">
            {lang === 'es' ? '3. Recomendaciones Agronómicas (Pre-Solver Módulo 5)' : '3. Crop Feasibility & Agronomic Advisor'}
          </h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
          pH {lang === 'es' ? 'Suelo' : 'Soil'}: <b className="text-emerald-400">{soilPh.toFixed(1)}</b>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Viable Crops */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center space-x-1.5">
            <span>✅</span>
            <span>{lang === 'es' ? `Cultivos Viables (${viableCropIds.length})` : `Feasible Crops (${viableCropIds.length})`}</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {viableCropIds.map((cid) => (
              <span
                key={cid}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 font-medium capitalize"
              >
                {cid.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Discarded Crops */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
            <span>🚫</span>
            <span>{lang === 'es' ? `Cultivos No Aptos (${discarded.length})` : `Discarded Crops (${discarded.length})`}</span>
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {discarded.map((d, idx) => (
              <div
                key={idx}
                className="text-xs p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-slate-200 capitalize">{d.crop_id}: </span>
                  <span className="text-slate-400">{lang === 'es' ? d.reason_text_es : d.reason_text_en}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-900 font-mono shrink-0">
                  {d.reason_code}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
