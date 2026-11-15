import React, { useEffect, useState } from 'react';
import { Language } from '../types/index.js';

interface ModernLoadingModalProps {
  isOpen: boolean;
  lang: Language;
  onCancel?: () => void;
}

export const ModernLoadingModal: React.FC<ModernLoadingModalProps> = ({
  isOpen,
  lang,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'power',
      title: lang === 'es' ? 'Descargando Telemetría NASA POWER' : 'Downloading NASA POWER Telemetry',
      desc: lang === 'es' ? 'Radiación solar global (MJ/m²), viento a 2 m, humedad relativa y temperaturas extremas.' : 'Global solar radiation (MJ/m²), 2 m wind, relative humidity, and daily temperatures.'
    },
    {
      id: 'soil',
      title: lang === 'es' ? 'Muestreando Perfil Edáfico ISRIC SoilGrids v2.0' : 'Sampling ISRIC SoilGrids v2.0 Profile',
      desc: lang === 'es' ? 'Fracciones de arcilla, arena, carbono orgánico y pH hasta 60 cm de profundidad.' : 'Clay, sand, organic carbon fractions, and pH up to 60 cm effective depth.'
    },
    {
      id: 'eonet',
      title: lang === 'es' ? 'Escaneando Alertas de Peligro NASA EONET v3' : 'Scanning NASA EONET v3 Hazard Alerts',
      desc: lang === 'es' ? 'Ciclones tropicales, tormentas severas y anomalías hidrometeorológicas activas.' : 'Tropical cyclones, severe storms, and active hydrometeorological events.'
    },
    {
      id: 'physics',
      title: lang === 'es' ? 'Resolviendo Balance Hídrico RK4 & Newton-Raphson' : 'Solving RK4 Water Balance & Newton-Raphson',
      desc: lang === 'es' ? 'Integración numérica de dW/dt y detección analítica del día crítico de estrés hídrico t*.' : 'Numerical integration of dW/dt and analytical root-crossing of water stress day t*.'
    },
    {
      id: 'optimizer',
      title: lang === 'es' ? 'Optimizando Rotación con Solver MILP (HiGHS)' : 'Optimizing Rotation with MILP Solver (HiGHS)',
      desc: lang === 'es' ? 'Construyendo frontera de Pareto multiobjetivo (ganancia financiera vs resiliencia de agua y nitrógeno).' : 'Building multi-objective Pareto trade-off frontier (net profit vs water conservation).'
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1350);
    return () => clearInterval(interval);
  }, [isOpen, steps.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'es' ? 'Procesando análisis agronómico' : 'Processing agronomic analysis'}
    >
      <div className="relative w-full max-w-md bg-[#fffef8] rounded-2xl border border-[#cbd9ce] shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Header matching site-header / intro-row aesthetic */}
        <div className="px-6 py-5 bg-[#173d30] border-b border-[#254d3b] text-[#f5f3e8]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#d4ec79] font-bold">
              {lang === 'es' ? 'MOTOR PLANETARIO · EN EJECUCIÓN' : 'PLANETARY ENGINE · IN PROGRESS'}
            </span>
            <span className="font-mono text-[11px] text-[#c0d1c1] bg-[#244b39] px-2 py-0.5 rounded border border-[#315847]">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <h3 className="text-base font-bold text-[#faf8ea] mt-1.5 leading-snug">
            {lang === 'es' ? 'Calculando Diagnóstico Agronómico' : 'Calculating Agronomic Assessment'}
          </h3>
          <p className="text-xs text-[#cedbcc] mt-0.5 leading-relaxed">
            {lang === 'es'
              ? 'Consultando fuentes satelitales en vivo y ejecutando modelos biofísicos para tu parcela.'
              : 'Querying live satellite feeds and solving biophysical models for your field.'}
          </p>
        </div>

        {/* Dynamic step visual */}
        <div className="p-6 space-y-4">
          {/* Subtle radar / processing spinner */}
          <div className="flex items-center gap-4 p-3.5 bg-[#f5f8f6] rounded-xl border border-[#dce6df]">
            <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#e7f0ea] border border-[#a8c5ab] text-[#1e583d]">
              {currentStep === 0 && (
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2 5-2"/>
                  <path d="M12 15v5s3.03-.55 4.5-2c1.63-1.62 2-5 2-5"/>
                </svg>
              )}
              {currentStep === 1 && (
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              )}
              {currentStep === 2 && (
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              )}
              {currentStep === 3 && (
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                  <path d="M12 13v4M10 15h4"/>
                </svg>
              )}
              {currentStep === 4 && (
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[#1b362b] truncate">
                {steps[currentStep].title}
              </h4>
              <p className="text-[11px] text-[#55695f] mt-0.5 leading-snug">
                {steps[currentStep].desc}
              </p>
            </div>
          </div>

          {/* Smooth progress line */}
          <div>
            <div className="w-full bg-[#e3eae5] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#2f6b4f] h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#718277] font-mono mt-1.5">
              <span>{steps[currentStep].id.toUpperCase()}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pt-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-5 bg-[#2f6b4f]'
                    : idx < currentStep
                    ? 'w-1.5 bg-[#668e70]'
                    : 'w-1.5 bg-[#d4ded7]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 bg-[#f7f9f7] border-t border-[#e2eae5] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#63756a]">
            {lang === 'es' ? 'Procesando en servidor local/remoto' : 'Computing on server runtime'}
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[#2f6b4f] hover:text-[#173d30] font-semibold text-xs transition-colors cursor-pointer"
            >
              {lang === 'es' ? 'Ocultar pantalla' : 'Hide notice'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
