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
      fungalRisk: 'Riesgo de Enfermedades Fúngicas',
      fungalDesc: 'Hongos foliares (Roya, Tizón tardío, Mildiu). Favorecidos por humedad relativa > 80% y condensación.',
      insectRisk: 'Riesgo de Plagas de Insectos',
      insectDesc: 'Insectos chupadores y barrenadores (Pulgón, Gusano cogollero). Acelerados por estrés térmico y sequedad.',
      semaphoreLow: 'Bajo Riesgo',
      semaphoreMedium: 'Riesgo Moderado',
      semaphoreHigh: 'Alerta Alta',
      preventiveActions: 'Acciones Preventivas Recomendadas (Manejo Agroecológico)',
      fungalActions: [
        'Evitar riegos vespertinos o nocturnos para minimizar horas con hoja mojada.',
        'Favorecer la ventilación del dosel mediante espaciamiento adecuado entre hileras.',
        'Aplicación preventiva de caldos minerales (bórdeles) o biofungicidas a base de Bacillus subtilis.'
      ],
      insectActions: [
        'Instalar trampas de feromonas o cromáticas amarillas en los bordes de la parcela.',
        'Fomentar corredores de biodiversidad para atraer fauna benéfica (crisopas, mariquitas).',
        'Monitorear el envés de las hojas cada 3 días en busca de posturas de huevos.'
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
      preventiveActions: 'Recommended Preventive Actions (Agro-ecological IPM)',
      fungalActions: [
        'Avoid evening or overhead irrigation to minimize continuous leaf wetness duration.',
        'Improve canopy aeration by maintaining optimal row spacing and weeding.',
        'Apply preventive organic bio-fungicides (e.g. Bacillus subtilis or mild copper broth).'
      ],
      insectActions: [
        'Deploy yellow sticky or pheromone monitoring traps along field perimeter.',
        'Maintain floral buffer strips to foster beneficial predators (lacewings, ladybugs).',
        'Inspect the underside of leaves every 3 days for early egg masses.'
      ],
      metricsTitle: 'Driving Atmospheric Conditions'
    }
  }[lang];

  // Derive dynamic risk levels from climate summary
  const meanTemp = data.climate_summary?.mean_temperature_c || 21.5;
  const totalRain = data.climate_summary?.total_precip_mm || 65;

  // Fungal conditions: high rain / moderate-warm temp
  const isHighFungal = totalRain > 70 && meanTemp >= 16 && meanTemp <= 26;
  const isMedFungal = totalRain > 35 || (meanTemp >= 18 && meanTemp <= 28);
  const fungalLevel = isHighFungal ? 'high' : (isMedFungal ? 'medium' : 'low');

  // Insect conditions: higher temps
  const isHighInsect = meanTemp > 24 && totalRain < 40;
  const isMedInsect = meanTemp > 20;
  const insectLevel = isHighInsect ? 'high' : (isMedInsect ? 'medium' : 'low');

  const getSemaphoreBadge = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            {t.semaphoreHigh}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {t.semaphoreMedium}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            {t.semaphoreLow}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Función 7 / NASA POWER & Microclima</span>
        </div>
        <h2 className="text-xl font-bold mt-1">{t.title}</h2>
        <p className="text-xs text-emerald-200 mt-0.5">{t.subtitle}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Dual Semaphore Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fungal Card */}
          <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {lang === 'es' ? 'Patógenos Fúngicos' : 'Fungal Pathogens'}
                </span>
                {getSemaphoreBadge(fungalLevel)}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{t.fungalRisk}</h3>
              <p className="text-xs text-gray-600 mb-4">{t.fungalDesc}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 text-xs">
              <span className="font-semibold text-gray-700 block mb-2">{t.preventiveActions}:</span>
              <ul className="space-y-1.5 text-gray-600">
                {t.fungalActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Insect Card */}
          <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {lang === 'es' ? 'Insectos y Vectores' : 'Insects & Vectors'}
                </span>
                {getSemaphoreBadge(insectLevel)}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{t.insectRisk}</h3>
              <p className="text-xs text-gray-600 mb-4">{t.insectDesc}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 text-xs">
              <span className="font-semibold text-gray-700 block mb-2">{t.preventiveActions}:</span>
              <ul className="space-y-1.5 text-gray-600">
                {t.insectActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Driving Meteorological Snapshot */}
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-xs flex flex-wrap items-center justify-between gap-4">
          <span className="font-semibold text-emerald-950">{t.metricsTitle}:</span>
          <div className="flex items-center gap-6 text-gray-700">
            <div>
              <span className="text-gray-400 block text-[10px]">T2M Media:</span>
              <span className="font-bold text-gray-900">{meanTemp.toFixed(1)} °C</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Lluvia Período:</span>
              <span className="font-bold text-gray-900">{totalRain.toFixed(0)} mm</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Humedad Relativa:</span>
              <span className="font-bold text-gray-900">~62% RH2M</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
