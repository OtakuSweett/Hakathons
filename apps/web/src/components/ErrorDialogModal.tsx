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
        ? 'ISRIC SoilGrids v2.0 clasifica estas coordenadas como cuerpo de agua, área urbana o roca expuesta. Puedes mover el marcador a una parcela de cultivo cercana o capturar los datos de un análisis de suelo de laboratorio.'
        : errorMessage || 'Ocurrió un inconveniente al consultar las fuentes de datos satelitales en vivo.',
      btnMove: 'Mover marcador al campo',
      btnManual: 'Ingresar análisis de suelo',
      btnRetry: 'Reintentar consulta',
      btnBenchmark: 'Abrir ejemplo guardado (Offline)',
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
        ? 'ISRIC SoilGrids v2.0 classifies this location as water, urban concrete, or bare rock. Move the marker to a nearby agricultural field or provide lab test results.'
        : errorMessage || 'An issue occurred while querying live satellite services.',
      btnMove: 'Move marker to field',
      btnManual: 'Enter soil test',
      btnRetry: 'Retry query',
      btnBenchmark: 'Open saved benchmark (Offline)',
      btnClose: 'Dismiss'
    }
  }[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs transition-opacity duration-300"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
      aria-describedby="error-modal-desc"
    >
      <div className="relative w-full max-w-lg bg-[#fffef8] rounded-2xl border border-[#d2dbcc] shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Header with gentle badge */}
        <div className="px-6 py-5 bg-[#fafbf9] border-b border-[#e2eae5]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isNonArable ? 'bg-[#f7efe6] text-[#935222] border border-[#e8d5be]' : 'bg-[#faede9] text-[#a43b29] border border-[#ebd0c8]'
            }`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#738378]">
                {t.tag}
              </span>
              {errorCode && (
                <span className="ml-2 font-mono text-[10px] text-[#859489] bg-[#eef3f0] px-1.5 py-0.5 rounded border border-[#dce6df]">
                  {errorCode}
                </span>
              )}
              <h3 id="error-modal-title" className="text-sm sm:text-base font-bold text-[#1b362b] mt-0.5 leading-snug">
                {t.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 text-xs text-[#4b6053] leading-relaxed">
          <p id="error-modal-desc">
            {t.desc}
          </p>
        </div>

        {/* Action buttons matching site design */}
        <div className="px-6 py-4 bg-[#f6f9f7] border-t border-[#e2eae5] flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="text-action cursor-pointer px-2"
          >
            {t.btnClose}
          </button>

          {onUseBenchmark && (
            <button
              type="button"
              onClick={onUseBenchmark}
              className="outline-button cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <svg className="w-3.5 h-3.5 text-[#52765f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>{t.btnBenchmark}</span>
            </button>
          )}

          {onEnterManualSoil && (
            <button
              type="button"
              onClick={onEnterManualSoil}
              className="outline-button cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <svg className="w-3.5 h-3.5 text-[#52765f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2v6a2 2 0 0 0 .5 1.5l4.5 5.5a2 2 0 0 1-1.5 3H6.5a2 2 0 0 1-1.5-3L9.5 9.5A2 2 0 0 0 10 8V2"/>
                <line x1="8" y1="2" x2="16" y2="2"/>
              </svg>
              <span>{t.btnManual}</span>
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="outline-button cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <svg className="w-3.5 h-3.5 text-[#52765f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>{t.btnRetry}</span>
            </button>
          )}

          {onMoveMap && (
            <button
              type="button"
              onClick={onMoveMap}
              className="primary-button cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{t.btnMove}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
