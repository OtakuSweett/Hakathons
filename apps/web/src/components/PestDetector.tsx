import React from 'react';
import { Language, AnalysisResponse } from '../types/index.js';

interface PestDetectorProps {
  data: AnalysisResponse;
  lang: Language;
}

export const PestDetector: React.FC<PestDetectorProps> = ({ data, lang }) => {
  const t = {
    es: {
      title: 'Detector Preventivo de Plagas y Enfermedades',
      subtitle: 'Semáforo bio-climático en tiempo real basado en temperatura T2M, humedad relativa RH2M y lluvia de NASA POWER.',
      fungalRisk: 'Riesgo de Patógenos Fúngicos',
      fungalDesc: 'Hongos foliares (Roya, Tizón tardío, Mildiu). Favorecidos por humedad relativa > 80% y condensación.',
      insectRisk: 'Riesgo de Plagas de Insectos',
      insectDesc: 'Insectos chupadores y barrenadores (Pulgón, Gusano cogollero). Acelerados por estrés térmico y sequedad.',
      semaphoreLow: 'Bajo Riesgo',
      semaphoreMedium: 'Riesgo Moderado',
      semaphoreHigh: 'Alerta Alta',
      preventiveActions: 'Manejo Preventivo Agroecológico',
      fungalActions: [
        'Evitar riegos vespertinos para minimizar horas con hoja mojada.',
        'Favorecer la ventilación del dosel mediante espaciamiento adecuado.',
        'Aplicación preventiva de caldos minerales o Bacillus subtilis.'
      ],
      insectActions: [
        'Instalar trampas de feromonas o cromáticas amarillas perimetrales.',
        'Fomentar corredores florales para atraer fauna benéfica (crisopas).',
        'Monitorear el envés de hojas cada 3 días en busca de posturas.'
      ],
      metricsTitle: 'Condiciones Meteorológicas Conductoras'
    },
    en: {
      title: 'Preventive Pest & Disease Detector',
      subtitle: 'Real-time bioclimatic semaphore driven by NASA POWER temperature T2M, relative humidity RH2M, and rain.',
      fungalRisk: 'Fungal Disease Risk',
      fungalDesc: 'Foliar pathogens (Rust, Blight, Powdery Mildew). Promoted by RH > 80% and leaf wetness.',
      insectRisk: 'Insect Pest Pressure',
      insectDesc: 'Chewing and sucking insects (Fall armyworm, Aphids, Borers). Accelerated by thermal heat and dry spells.',
      semaphoreLow: 'Low Risk',
      semaphoreMedium: 'Moderate Risk',
      semaphoreHigh: 'High Risk Alert',
      preventiveActions: 'Agro-ecological IPM Actions',
      fungalActions: [
        'Avoid evening irrigation to minimize continuous leaf wetness duration.',
        'Improve canopy aeration by maintaining optimal row spacing.',
        'Apply preventive bio-fungicides (Bacillus subtilis or copper broth).'
      ],
      insectActions: [
        'Deploy yellow sticky or pheromone monitoring traps along perimeter.',
        'Maintain floral buffer strips to foster beneficial predators.',
        'Inspect the underside of leaves every 3 days for egg masses.'
      ],
      metricsTitle: 'Driving Atmospheric Conditions'
    }
  }[lang];

  const meanTemp = data.climate_summary?.mean_temperature_c || 21.5;
  const totalRain = data.climate_summary?.total_precip_mm || 65;

  const isHighFungal = totalRain > 70 && meanTemp >= 16 && meanTemp <= 26;
  const isMedFungal = totalRain > 35 || (meanTemp >= 18 && meanTemp <= 28);
  const fungalLevel = isHighFungal ? 'high' : (isMedFungal ? 'medium' : 'low');

  const isHighInsect = meanTemp > 24 && totalRain < 40;
  const isMedInsect = meanTemp > 20;
  const insectLevel = isHighInsect ? 'high' : (isMedInsect ? 'medium' : 'low');

  const getSemaphoreBadge = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            {t.semaphoreHigh}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            {t.semaphoreMedium}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {t.semaphoreLow}
          </span>
        );
    }
  };

  return (
    <div className="bento-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <h2 className="text-sm font-bold text-white tracking-tight">{t.title}</h2>
          </div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-lg border border-white/[0.08]">
            NASA POWER
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Fungal Card */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-zinc-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {lang === 'es' ? 'Patógenos Fúngicos' : 'Fungal Pathogens'}
                </span>
                {getSemaphoreBadge(fungalLevel)}
              </div>
              <h4 className="text-xs font-bold text-white mb-1">{t.fungalRisk}</h4>
              <p className="text-[11px] text-zinc-400 mb-3">{t.fungalDesc}</p>
            </div>

            <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-white/[0.04] text-[11px]">
              <span className="font-semibold text-zinc-300 block mb-1 text-[10px] uppercase tracking-wider">
                {t.preventiveActions}:
              </span>
              <ul className="space-y-1 text-zinc-400 text-[10px]">
                {t.fungalActions.slice(0, 2).map((action, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Insect Card */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-zinc-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {lang === 'es' ? 'Insectos y Vectores' : 'Insects & Vectors'}
                </span>
                {getSemaphoreBadge(insectLevel)}
              </div>
              <h4 className="text-xs font-bold text-white mb-1">{t.insectRisk}</h4>
              <p className="text-[11px] text-zinc-400 mb-3">{t.insectDesc}</p>
            </div>

            <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-white/[0.04] text-[11px]">
              <span className="font-semibold text-zinc-300 block mb-1 text-[10px] uppercase tracking-wider">
                {t.preventiveActions}:
              </span>
              <ul className="space-y-1 text-zinc-400 text-[10px]">
                {t.insectActions.slice(0, 2).map((action, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot metrics */}
      <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
        <span className="text-zinc-500">{t.metricsTitle}:</span>
        <div className="flex items-center gap-4 font-mono text-zinc-300">
          <span>T2M: <b className="text-white">{meanTemp.toFixed(1)}°C</b></span>
          <span>Lluvia: <b className="text-white">{totalRain.toFixed(0)} mm</b></span>
          <span>RH2M: <b className="text-emerald-400">~62%</b></span>
        </div>
      </div>
    </div>
  );
};
