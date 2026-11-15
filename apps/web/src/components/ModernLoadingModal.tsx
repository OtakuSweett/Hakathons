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
      icon: '🛰️',
      title: lang === 'es' ? 'Descargando Telemetría NASA POWER' : 'Downloading NASA POWER Telemetry',
      desc: lang === 'es' ? 'Radiación solar global, viento a 2 m, humedad relativa y temperaturas extremas.' : 'Global solar radiation, 2m wind, relative humidity, and extreme temperatures.'
    },
    {
      icon: '🌱',
      title: lang === 'es' ? 'Muestreando Perfil Edáfico ISRIC SoilGrids v2.0' : 'Sampling ISRIC SoilGrids v2.0 Soil Profile',
      desc: lang === 'es' ? 'Fracciones de arcilla, arena, carbono orgánico y pH hasta 60 cm de profundidad.' : 'Clay, sand, organic carbon fractions, and pH up to 60 cm depth.'
    },
    {
      icon: '⚠️',
      title: lang === 'es' ? 'Escaneando Alertas de Peligro NASA EONET v3' : 'Scanning NASA EONET v3 Hazard Alerts',
      desc: lang === 'es' ? 'Ciclones tropicales, tormentas severas y anomalías hidrometeorológicas activas.' : 'Tropical cyclones, severe storms, and active hydrometeorological anomalies.'
    },
    {
      icon: '💧',
      title: lang === 'es' ? 'Integrando Balance Hídrico RK4 & Newton-Raphson' : 'Integrating RK4 Water Balance & Newton-Raphson',
      desc: lang === 'es' ? 'Resolviendo la ecuación diferencial dW/dt y detectando día crítico de estrés t*.' : 'Solving the dW/dt differential equation and detecting critical stress day t*.'
    },
    {
      icon: '🧠',
      title: lang === 'es' ? 'Optimizando Rotación con Solver MILP (HiGHS)' : 'Optimizing Rotation with MILP Solver (HiGHS)',
      desc: lang === 'es' ? 'Construyendo frontera de Pareto multiobjetivo (ganancia neta vs resiliencia hídrica).' : 'Constructing multi-objective Pareto frontier (net profit vs water conservation).'
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [isOpen, steps.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'es' ? 'Procesando análisis agronómico' : 'Processing agronomic analysis'}
    >
      <div className="relative w-full max-w-lg bg-zinc-950 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/50 text-center overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Orbit radar animation */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-teal-500/30 animate-pulse" />
          <div className="absolute inset-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <div className="relative z-10 w-14 h-14 rounded-full bg-zinc-900 border border-emerald-400/50 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
            {steps[currentStep].icon}
          </div>
        </div>

        {/* Title and subtitle */}
        <span className="inline-block px-3 py-1 mb-2 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {lang === 'es' ? 'Motor Planetario en Ejecución' : 'Planetary Engine Running'}
        </span>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          {lang === 'es' ? 'Calculando Diagnóstico Agronómico' : 'Calculating Agronomic Assessment'}
        </h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
          {lang === 'es'
            ? 'Consultando fuentes satelitales en vivo y ejecutando modelos biofísicos para tu parcela.'
            : 'Querying live satellite feeds and solving biophysical models for your field.'}
        </p>

        {/* Dynamic step ticker */}
        <div className="bg-zinc-900/90 border border-white/[0.08] rounded-xl p-4 mb-6 text-left transition-all duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-bounce">{steps[currentStep].icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-emerald-300 truncate">
                {steps[currentStep].title}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                {steps[currentStep].desc}
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-500">
              {currentStep + 1}/{steps.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps indicator dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-6 bg-emerald-400'
                  : idx < currentStep
                  ? 'w-2 bg-emerald-600'
                  : 'w-2 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
          >
            {lang === 'es' ? 'Continuar en segundo plano' : 'Dismiss overlay'}
          </button>
        )}
      </div>
    </div>
  );
};
