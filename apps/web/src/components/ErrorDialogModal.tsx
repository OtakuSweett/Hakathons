import React from 'react';
import { Language } from '../types/index.js';

interface ErrorDialogModalProps {
  isOpen: boolean;
  errorCode?: string;
  errorMessage: string;
  lang: Language;
  onClose: () => void;
  onRetry?: () => void;
  onEnterManualSoil?: () => void;
  onUseBenchmark?: () => void;
  onMoveMap?: () => void;
}

export const ErrorDialogModal: React.FC<ErrorDialogModalProps> = ({
  isOpen,
  errorCode,
  errorMessage,
  lang,
  onClose,
  onRetry,
  onEnterManualSoil,
  onUseBenchmark,
  onMoveMap
}) => {
  if (!isOpen) return null;

  const isNonArable = errorCode === 'NON_ARABLE_LAND';
  const isSoilUnavailable = errorCode === 'SOILGRIDS_UNAVAILABLE';

  const t = {
    es: {
      tag: isNonArable ? 'ZONA NO ARABLE DETECTADA' : 'AVISO DE CONSULTA SATELITAL',
      title: isNonArable
        ? 'El punto seleccionado no tiene cobertura de suelo agrícola'
        : isSoilUnavailable
        ? 'Servicio de suelo temporalmente no disponible'
        : 'No pudimos completar la consulta en vivo',
      desc: isNonArable
        ? 'ISRIC SoilGrids v2.0 clasifica este punto como cuerpo de agua, área urbana o roca desnuda. Para continuar el análisis agronómico, puedes mover el marcador a una parcela de cultivo cercana o ingresar los datos de un análisis de laboratorio.'
        : errorMessage || 'Ocurrió un inconveniente al consultar las fuentes de datos satelitales en vivo.',
      btnMove: '📍 Mover marcador al campo',
      btnManual: '🧪 Ingresar análisis de suelo',
      btnRetry: '🔄 Reintentar consulta',
      btnBenchmark: '📊 Abrir ejemplo guardado (Offline)',
      btnClose: 'Cerrar'
    },
    en: {
      tag: isNonArable ? 'NON-ARABLE LAND DETECTED' : 'SATELLITE QUERY NOTICE',
      title: isNonArable
        ? 'The selected location lacks agricultural soil coverage'
        : isSoilUnavailable
        ? 'Soil service temporarily unavailable'
        : 'Could not complete the live satellite query',
      desc: isNonArable
        ? 'ISRIC SoilGrids v2.0 identifies this coordinate as water, urban area, or bare rock. To proceed with the agronomic assessment, please move the marker to an agricultural field or provide a soil laboratory test.'
        : errorMessage || 'An issue occurred while querying live satellite services.',
      btnMove: '📍 Move marker to field',
      btnManual: '🧪 Enter manual soil test',
      btnRetry: '🔄 Retry query',
      btnBenchmark: '📊 Open saved benchmark (Offline)',
      btnClose: 'Dismiss'
    }
  }[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
      aria-describedby="error-modal-desc"
    >
      <div className="relative w-full max-w-lg bg-zinc-950 border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-left overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Icon and badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl text-rose-400">
            {isNonArable ? '🏜️' : '⚠️'}
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {t.tag}
            </span>
            {errorCode && (
              <span className="ml-2 font-mono text-[10px] text-zinc-500">
                [{errorCode}]
              </span>
            )}
          </div>
        </div>

        {/* Title and description */}
        <h3 id="error-modal-title" className="text-lg font-bold text-white mb-2 leading-snug">
          {t.title}
        </h3>
        <p id="error-modal-desc" className="text-xs text-zinc-300 leading-relaxed mb-6">
          {t.desc}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2 border-t border-white/[0.08]">
          {onMoveMap && (
            <button
              type="button"
              onClick={onMoveMap}
              className="flex-1 min-w-[140px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {t.btnMove}
            </button>
          )}

          {onEnterManualSoil && (
            <button
              type="button"
              onClick={onEnterManualSoil}
              className="flex-1 min-w-[140px] px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-white/[0.1] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {t.btnManual}
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-white/[0.1] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {t.btnRetry}
            </button>
          )}

          {onUseBenchmark && (
            <button
              type="button"
              onClick={onUseBenchmark}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl border border-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {t.btnBenchmark}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {t.btnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
