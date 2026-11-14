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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
        <span className="text-base">🎛️</span>
        <h2 className="text-sm font-bold text-white tracking-wide">
          {lang === 'es' ? '4. Simulador Climático "What-If"' : '4. "What-If" Climate Simulator'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Delta Precipitation */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-slate-300">
              🌧️ {lang === 'es' ? 'Variación de Precipitación (ΔP):' : 'Precipitation Delta (ΔP):'}
            </span>
            <span className={`font-mono ${deltaP > 0 ? 'text-cyan-400' : deltaP < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
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
            className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
            <span>-40% (Sequía Severa)</span>
            <span>0%</span>
            <span>+40% (Exceso Hídrico)</span>
          </div>
        </div>

        {/* Delta Temperature */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-slate-300">
              🌡️ {lang === 'es' ? 'Calentamiento Global (ΔT):' : 'Temperature Increase (ΔT):'}
            </span>
            <span className={`font-mono ${deltaT > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              +{deltaT.toFixed(1)}°C
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="4.0"
            step="0.5"
            value={deltaT}
            onChange={(e) => setDeltaT(parseFloat(e.target.value))}
            className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
            <span>+0.0°C</span>
            <span>+2.0°C (IPCC 2050)</span>
            <span>+4.0°C</span>
          </div>
        </div>

        {/* Inject Extreme Storm Pulse */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="flex items-center space-x-2">
            <span>🌪️</span>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {lang === 'es' ? 'Inyectar Pulso de Tormenta NASA EONET' : 'Inject NASA EONET Extreme Storm'}
              </p>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' ? '+60 mm en día 15 para evaluar anegamiento' : '+60 mm pulse to model waterlogging'}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={injectStorm}
            onChange={(e) => setInjectStorm(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </div>

        {/* Run Simulation Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? (lang === 'es' ? 'Simulando en Vivo...' : 'Simulating Live...') : (lang === 'es' ? '▶ Re-evaluar Escenario What-If' : '▶ Re-run What-If Scenario')}
        </button>
      </form>
    </div>
  );
};
