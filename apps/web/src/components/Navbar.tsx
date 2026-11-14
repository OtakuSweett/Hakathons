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
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 shadow-md">
            🚀
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white tracking-wide text-lg">NASA Agro-DSS</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Space Apps 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'es' ? 'Rotación de Cultivos y Resiliencia Hídrica Global' : 'Global Crop Rotation & Water Resilience DSS'}
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
          <span className="text-xs text-slate-400 hidden sm:inline">
            📍 {lang === 'es' ? 'Parcela:' : 'Parcel:'}
          </span>
          <select
            value={activePresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-transparent text-xs text-emerald-300 font-medium focus:outline-none cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.presetId} value={p.presetId} className="bg-slate-900 text-white">
                {p.parcelName} ({p.country})
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Offline Demo Toggle */}
          <button
            onClick={onToggleOffline}
            title={lang === 'es' ? 'Alternar entre API en vivo y Presets Offline' : 'Toggle between Live API and Offline Presets'}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center space-x-1.5 transition-all ${
              isOfflineMode
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{isOfflineMode ? (lang === 'es' ? 'Modo Offline Demo' : 'Offline Demo') : (lang === 'es' ? 'Live API NASA' : 'NASA Live API')}</span>
          </button>

          {/* Crowdsourced Field Report Modal Button */}
          <button
            onClick={onOpenReportModal}
            className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition-all"
          >
            📋 {lang === 'es' ? 'Reportar Parcela' : 'Field Report'}
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold"
          >
            {lang === 'es' ? '🇺🇸 EN' : '🇲🇽 ES'}
          </button>
        </div>
      </div>
    </header>
  );
};
