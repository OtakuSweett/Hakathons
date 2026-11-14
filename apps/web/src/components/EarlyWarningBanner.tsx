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
    <div className={`early-warning rounded-xl p-4 sm:p-5 border transition-all ${
      isImminent
        ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900/60 border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.08)]'
        : 'bg-gradient-to-r from-emerald-950/30 via-zinc-900/60 to-zinc-900/60 border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.05)]'
    } backdrop-blur-md`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isImminent
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 glow-amber'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {isImminent ? (
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-zinc-400 tracking-wide uppercase">
                {lang === 'es' ? 'Alertas Anticipadas de Estrés Hídrico (Módulo 4 Newton-Raphson)' : 'Predictive Water Stress Alerts (Module 4 Newton-Raphson)'}
              </span>
              {isImminent && (
                <span className="text-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold px-2 py-0.5 rounded-full uppercase">
                  {lang === 'es' ? 'Acción Preventiva' : 'Action Needed'}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
              {tStar !== null ? (
                <>
                  {lang === 'es' ? 'Riego crítico proyectado para el día:' : 'Critical irrigation projected for day:'}{' '}
                  <span className="text-emerald-400 font-black font-mono text-base sm:text-lg">t* = +{tStar.toFixed(1)}</span>{' '}
                  <span className="text-xs text-zinc-400 font-normal">({lang === 'es' ? 'lámina recomendada' : 'depth'}: {deltaI} mm)</span>
                </>
              ) : (
                <span className="text-zinc-200">
                  {trigger.reason || (lang === 'es' ? 'Nivel de agua en suelo seguro dentro de la reserva aprovechable.' : 'Soil moisture safely within available water capacity.')}
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Hazard Metrics Pill Group */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-white/[0.08] flex items-center space-x-2">
            <span className="text-zinc-400">{lang === 'es' ? 'Temp. Media:' : 'Mean Temp:'}</span>
            <span className="font-bold text-white font-mono">{meanTempC.toFixed(1)}°C</span>
          </div>

          <div className="bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-white/[0.08] flex items-center space-x-2">
            <span className="text-zinc-400">EONET:</span>
            <span className={`font-bold font-mono ${eonetCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {eonetCount} {lang === 'es' ? 'alertas' : 'events'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
