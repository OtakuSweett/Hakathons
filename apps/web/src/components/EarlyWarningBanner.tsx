import React from 'react';
import { IrrigationTrigger, Language } from '../types/index.js';

interface EarlyWarningProps {
  trigger: IrrigationTrigger;
  eonetCount: number;
  meanTempC: number;
  lang: Language;
}

export const EarlyWarningBanner: React.FC<EarlyWarningProps> = ({
  trigger,
  eonetCount,
  meanTempC,
  lang
}) => {
  const tStar = trigger.t_star_days;
  const deltaI = trigger.delta_i_mm;
  const isImminent = tStar !== null && tStar <= 15.0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${
              isImminent
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            {isImminent ? '⚡' : '💧'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                {lang === 'es' ? '2. Alertas Tempranas de Estrés Hídrico (Módulo 4)' : '2. Predictive Early Warnings (Module 4)'}
              </span>
              {isImminent && (
                <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-300 font-bold px-2 py-0.5 rounded-full uppercase">
                  {lang === 'es' ? 'Acción Requerida' : 'Action Required'}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              {tStar !== null ? (
                <>
                  {lang === 'es' ? 'Riego crítico proyectado para el día:' : 'Critical irrigation trigger day:'}{' '}
                  <span className="text-emerald-400 font-extrabold text-lg">t* = {tStar.toFixed(1)}</span>{' '}
                  <span className="text-xs text-slate-400 font-normal">({lang === 'es' ? 'lámina recomendada' : 'depth'}: {deltaI} mm)</span>
                </>
              ) : (
                <span className="text-emerald-400">
                  {lang === 'es' ? 'Sin estrés hídrico inminente en el horizonte analizado.' : 'No critical moisture stress detected in horizon.'}
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Diagnostic Badges */}
        <div className="flex items-center space-x-2">
          {eonetCount > 0 && (
            <div className="bg-red-950/60 border border-red-800/80 rounded-lg px-3 py-1.5 text-xs text-red-300 font-medium flex items-center space-x-1.5">
              <span>🌪️</span>
              <span>{eonetCount} {lang === 'es' ? 'Alerta EONET activa' : 'Active EONET Storm'}</span>
            </div>
          )}
          {meanTempC >= 32.0 && (
            <div className="bg-amber-950/60 border border-amber-800/80 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-medium flex items-center space-x-1.5">
              <span>🔥</span>
              <span>{lang === 'es' ? 'Ola de Calor' : 'Heatwave Risk'}</span>
            </div>
          )}
          {meanTempC <= 4.0 && (
            <div className="bg-cyan-950/60 border border-cyan-800/80 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-medium flex items-center space-x-1.5">
              <span>❄️</span>
              <span>{lang === 'es' ? 'Riesgo de Helada' : 'Frost Warning'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
