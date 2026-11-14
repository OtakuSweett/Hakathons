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
  const irrigationReason = trigger.reason === 'W_never_crosses_Wcrit'
    ? (lang === 'es' ? 'La reserva de agua no cruza el umbral crítico durante el periodo analizado.' : 'Water storage does not cross the critical threshold during the analysis period.')
    : trigger.reason === 'W_already_below_Wcrit'
      ? (lang === 'es' ? 'La reserva de agua ya está por debajo del umbral crítico.' : 'Water storage is already below the critical threshold.')
      : trigger.reason;

  return (
    <div role={isImminent ? 'alert' : 'status'} aria-live={isImminent ? 'assertive' : 'polite'} className={`early-warning rounded-xl p-4 sm:p-5 border transition-all ${
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
                {tStar !== null
                  ? (lang === 'es' ? 'RIEGO SUGERIDO' : 'IRRIGATION SUGGESTION')
                  : (lang === 'es' ? 'ESTADO DEL AGUA EN EL SUELO' : 'SOIL WATER STATUS')}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
              {tStar !== null ? (
                lang === 'es'
                  ? `Se estima que el suelo llegará a un nivel crítico en unos ${Math.ceil(tStar)} días.`
                  : `Soil moisture is expected to reach a critical level in about ${Math.ceil(tStar)} days.`
              ) : (
                <span className="text-zinc-200">
                  {irrigationReason || (lang === 'es' ? 'Nivel de agua en suelo seguro dentro de la reserva aprovechable.' : 'Soil moisture safely within available water capacity.')}
                </span>
              )}
            </h3>
            {tStar !== null && <p className="mt-1 text-xs text-zinc-300">
              {deltaI !== null
                ? (lang === 'es' ? `Riego sugerido: ${deltaI.toFixed(1)} mm para recuperar la reserva de agua del suelo.` : `Suggested irrigation: ${deltaI.toFixed(1)} mm to restore soil water storage.`)
                : (lang === 'es' ? 'Revisa la humedad del suelo antes de programar el riego.' : 'Check soil moisture before scheduling irrigation.')}
            </p>}
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
