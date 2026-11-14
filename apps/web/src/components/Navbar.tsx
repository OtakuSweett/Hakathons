import React from 'react';
import { Language, PresetSummary } from '../types/index.js';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  isOfflineMode: boolean;
  onToggleOffline: () => void;
  presets: PresetSummary[];
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  onOpenReportModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  isOfflineMode,
  onToggleOffline,
  presets,
  activePresetId,
  onSelectPreset,
  onOpenReportModal
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <svg className="w-5 h-5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white tracking-tight text-base sm:text-lg">NASA Agro-DSS</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Space Apps 2026
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 -mt-0.5">
              {lang === 'es' ? 'Rotación de Cultivos & Resiliencia Hídrica Global' : 'Global Crop Rotation & Water Resilience'}
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2 bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-1.5 focus-within:border-emerald-500/50 transition-colors">
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs text-zinc-400 hidden sm:inline font-medium">
            {lang === 'es' ? 'Parcela:' : 'Parcel:'}
          </span>
          <select
            value={activePresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-hidden cursor-pointer"
          >
            {presets.map((preset) => (
              <option key={preset.presetId} value={preset.presetId} className="bg-zinc-900 text-zinc-200">
                {preset.parcelName} ({preset.region})
              </option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Offline / Live Indicator */}
          <button
            onClick={onToggleOffline}
            title={isOfflineMode ? 'Modo Offline Forzado' : 'Modo Live API'}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isOfflineMode
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="hidden md:inline">
              {isOfflineMode
                ? (lang === 'es' ? 'Modo Offline Benchmark' : 'Offline Mode')
                : (lang === 'es' ? 'Live Satellites' : 'Live Satellites')}
            </span>
          </button>

          {/* Crowdsourcing Report Button */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{lang === 'es' ? 'Reportar en Campo' : 'Field Report'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 border border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/[0.15] transition-all cursor-pointer"
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>
    </header>
  );
};
