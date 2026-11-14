import React, { useState } from 'react';
import { Language } from '../types/index.js';

interface ClimateSimulatorProps {
  lang: Language;
  onSimulate: (deltaP: number, deltaT: number, storm: boolean) => void;
  isLoading: boolean;
}

export const ClimateSimulator: React.FC<ClimateSimulatorProps> = ({
  lang,
  onSimulate,
  isLoading
}) => {
  const [deltaP, setDeltaP] = useState<number>(0);
  const [deltaT, setDeltaT] = useState<number>(0);
  const [injectStorm, setInjectStorm] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate(deltaP, deltaT, injectStorm);
  };

  return (
    <div className="bento-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {lang === 'es' ? 'Simulador Climático "What-If"' : '"What-If" Climate Simulator'}
            </h2>
          </div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-lg border border-white/[0.08]">
            {lang === 'es' ? 'Escenarios' : 'Scenarios'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Delta Precipitation */}
          <div>
            <div className="flex justify-between font-semibold mb-1.5">
              <span className="text-zinc-300">
                {lang === 'es' ? 'Variación de Precipitación (ΔP):' : 'Precipitation Delta (ΔP):'}
              </span>
              <span className={`font-mono font-bold ${deltaP > 0 ? 'text-cyan-400' : deltaP < 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                {deltaP > 0 ? `+${deltaP}%` : `${deltaP}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="5"
              value={deltaP}
              onChange={(e) => setDeltaP(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>{lang === 'es' ? '-40% (Sequía severa)' : '-40% (Severe drought)'}</span>
              <span>{lang === 'es' ? 'Normal' : 'Normal'}</span>
              <span>{lang === 'es' ? '+40% (Lluvias extra)' : '+40% (Extra rainfall)'}</span>
            </div>
          </div>

          {/* Delta Temperature */}
          <div>
            <div className="flex justify-between font-semibold mb-1.5">
              <span className="text-zinc-300">
                {lang === 'es' ? 'Anomalía Térmica (+ΔT):' : 'Thermal Heatwave (+ΔT):'}
              </span>
              <span className={`font-mono font-bold ${deltaT > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                +{deltaT.toFixed(1)}°C
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="0.5"
              value={deltaT}
              onChange={(e) => setDeltaT(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>{lang === 'es' ? '0°C (Base)' : '0°C (Baseline)'}</span>
              <span>{lang === 'es' ? '+2°C (Olas de calor)' : '+2°C (Heat waves)'}</span>
              <span>{lang === 'es' ? '+4°C (Crítico)' : '+4°C (Critical)'}</span>
            </div>
          </div>

          {/* Extreme Event Injection Toggle */}
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  {lang === 'es' ? 'Pulso Tormenta EONET (+65 mm)' : 'EONET Storm Pulse (+65 mm)'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {lang === 'es' ? 'Simula saturación y riesgo de inundación' : 'Simulates flash waterlogging'}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={injectStorm}
              onChange={(e) => setInjectStorm(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-emerald-500 text-zinc-950 hover:from-cyan-400 hover:to-emerald-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
          >
            {isLoading ? (
              <span>{lang === 'es' ? 'Recalculando EDO y Solver...' : 'Recomputing ODE & Solver...'}</span>
            ) : (
              <span>{lang === 'es' ? 'Ejecutar Simulación Dinámica' : 'Run Dynamic Simulation'}</span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.05] text-[10px] text-zinc-400 flex items-center justify-between">
        <span>{lang === 'es' ? 'EDO Runge-Kutta de 4.º orden' : 'Runge-Kutta 4th order ODE'}</span>
        <span className="text-cyan-400 font-mono">{lang === 'es' ? 'Perturbación ΔP/ΔT' : 'ΔP/ΔT perturbation'}</span>
      </div>
    </div>
  );
};
