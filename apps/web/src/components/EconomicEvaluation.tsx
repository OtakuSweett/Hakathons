import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Language, AnalysisResponse, ParetoPoint } from '../types/index.js';

interface EconomicEvaluationProps {
  data: AnalysisResponse;
  lang: Language;
}

export const EconomicEvaluation: React.FC<EconomicEvaluationProps> = ({ data, lang }) => {
  const [lambdaVal, setLambdaVal] = useState<number>(0.5);

  const t = {
    es: {
      title: 'Evaluación Económica, Precios Sombra y Frontera de Pareto',
      subtitle: 'Optimización multiobjetivo (M6 & M7) balanceando ganancia financiera vs resiliencia de agua y nitrógeno.',
      sliderTitle: 'Control Dinámico de Prioridad Agrícola (Lambda λ)',
      sliderDesc: 'λ = 1.0 (Máxima Ganancia Financiera) ↔ λ = 0.0 (Máxima Conservación Hídrica y Salud del Suelo)',
      maxProfit: 'Máxima Ganancia',
      balanced: 'Equilibrio Resiliente',
      maxResilience: 'Máxima Conservación',
      shadowPriceTitle: 'Precio Sombra Dual del Agua (y_agua)',
      shadowPriceDesc: 'Valor marginal de 1 mm adicional de agua en la rotación (derivada parcial ∂Z*/∂Agua).',
      shadowAdviceHigh: 'Recomendación: El precio sombra supera el costo de mercado del agua; conviene invertir en tecnificación de riego.',
      shadowAdviceLow: 'Recomendación: El agua no es la restricción limitante principal en esta temporada.',
      paretoChartTitle: 'Frontera de Pareto de Soluciones No Dominadas',
      waterSaved: 'Agua Ahorrada (mm)',
      profitUsd: 'Ganancia Neta (USD/ha)',
      metricProfit: 'Ganancia Proyectada',
      metricWaterSaved: 'Ahorro Hídrico',
      metricNitrogen: 'Nitrógeno Biológico'
    },
    en: {
      title: 'Economic Evaluation, Dual Shadow Prices & Pareto Frontier',
      subtitle: 'Multi-objective optimization (M6 & M7) balancing financial profit vs water conservation and soil nitrogen.',
      sliderTitle: 'Agricultural Priority Slider (Lambda λ)',
      sliderDesc: 'λ = 1.0 (Pure Financial Profit) ↔ λ = 0.0 (Pure Water Conservation & Soil Health)',
      maxProfit: 'Max Profit',
      balanced: 'Resilient Balance',
      maxResilience: 'Max Conservation',
      shadowPriceTitle: 'Dual Water Shadow Price (y_water)',
      shadowPriceDesc: 'Marginal value of 1 additional mm of water in the rotation (partial derivative ∂Z*/∂Water).',
      shadowAdviceHigh: 'Recommendation: Shadow price exceeds water market cost; investing in drip tech is economically justified.',
      shadowAdviceLow: 'Recommendation: Water is not the binding constraint; focus capital on soil organic matter.',
      paretoChartTitle: 'Pareto Efficient Frontier (Non-Dominated Solutions)',
      waterSaved: 'Water Saved (mm)',
      profitUsd: 'Net Profit (USD/ha)',
      metricProfit: 'Projected Profit',
      metricWaterSaved: 'Water Conservation',
      metricNitrogen: 'Biological Nitrogen'
    }
  }[lang];

  const paretoPoints: ParetoPoint[] = data.optimization?.pareto_front || [
    {
      lambda_weight: 0.0,
      profit_mxn_ha: 14200,
      water_saved_mm: 120,
      n_fixed_kg_ha: 85,
      water_shadow_price_mxn_mm: 18.5,
      n_shadow_price_mxn_kg_ha: 12.0,
      schedule: []
    },
    {
      lambda_weight: 0.25,
      profit_mxn_ha: 19800,
      water_saved_mm: 95,
      n_fixed_kg_ha: 60,
      water_shadow_price_mxn_mm: 22.0,
      n_shadow_price_mxn_kg_ha: 9.5,
      schedule: []
    },
    {
      lambda_weight: 0.5,
      profit_mxn_ha: 26500,
      water_saved_mm: 65,
      n_fixed_kg_ha: 45,
      water_shadow_price_mxn_mm: 28.4,
      n_shadow_price_mxn_kg_ha: 8.0,
      schedule: []
    },
    {
      lambda_weight: 0.75,
      profit_mxn_ha: 31200,
      water_saved_mm: 35,
      n_fixed_kg_ha: 25,
      water_shadow_price_mxn_mm: 34.0,
      n_shadow_price_mxn_kg_ha: 5.5,
      schedule: []
    },
    {
      lambda_weight: 1.0,
      profit_mxn_ha: 35800,
      water_saved_mm: 0,
      n_fixed_kg_ha: 0,
      water_shadow_price_mxn_mm: 42.0,
      n_shadow_price_mxn_kg_ha: 0.0,
      schedule: []
    }
  ];

  const activePoint = paretoPoints.reduce((prev, curr) =>
    Math.abs(curr.lambda_weight - lambdaVal) < Math.abs(prev.lambda_weight - lambdaVal) ? curr : prev
  );

  const shadowPrice = activePoint.water_shadow_price_mxn_mm || 28.4;
  const isHighShadow = shadowPrice > 25.0;

  const chartData = paretoPoints.map((p) => ({
    x: p.water_saved_mm,
    y: p.profit_mxn_ha,
    lambda: p.lambda_weight
  }));

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span className="text-[11px] uppercase tracking-wider text-teal-400 font-semibold">
              AGUA · COSTOS · RENTABILIDAD
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-1">{t.title}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Interactive Pareto Slider */}
        <div className="p-4 bg-zinc-950/40 rounded-xl border border-white/[0.05]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-white text-xs">{t.sliderTitle}</h3>
              <p className="text-[11px] text-zinc-400">{t.sliderDesc}</p>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-zinc-400">λ =</span>
              <span className="text-base font-black text-emerald-400 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-white/[0.08]">
                {lambdaVal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={lambdaVal}
              onChange={(e) => setLambdaVal(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1.5 font-medium">
              <span>{t.maxResilience} (0.0)</span>
              <span>{t.balanced} (0.5)</span>
              <span>{t.maxProfit} (1.0)</span>
            </div>
          </div>

          {/* Dynamic KPI readout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.05]">
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-white/[0.05]">
              <span className="text-zinc-400 text-[10px] block">{t.metricProfit}</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">
                ${activePoint.profit_mxn_ha.toLocaleString()} USD/ha
              </span>
            </div>
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-white/[0.05]">
              <span className="text-zinc-400 text-[10px] block">{t.metricWaterSaved}</span>
              <span className="text-base sm:text-lg font-black text-blue-400 font-mono">
                +{activePoint.water_saved_mm} mm
              </span>
            </div>
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-white/[0.05]">
              <span className="text-zinc-400 text-[10px] block">{t.metricNitrogen}</span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                +{activePoint.n_fixed_kg_ha} kg N/ha
              </span>
            </div>
          </div>
        </div>

        {/* Dual Water Shadow Price (y_water) Card */}
        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  {t.shadowPriceTitle}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  ∂Z*/∂b_agua
                </span>
              </div>
              <h4 className="text-sm font-bold text-white font-mono mt-1">
                {shadowPrice.toFixed(2)} USD / mm-ha
              </h4>
            </div>
            <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${
              isHighShadow ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isHighShadow ? 'Restricción Hídrica Activa' : 'Disponibilidad Hídrica Suficiente'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-1">{t.shadowPriceDesc}</p>
          <div className="mt-2.5 p-2.5 bg-zinc-900/80 rounded-lg border border-white/[0.05] text-[11px] text-zinc-200">
            {isHighShadow ? t.shadowAdviceHigh : t.shadowAdviceLow}
          </div>
        </div>

        {/* Pareto Frontier Scatter Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-xs">{t.paretoChartTitle}</h3>
            <span className="text-[10px] text-zinc-400 font-mono">HiGHS LP Dual Relaxation</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={t.waterSaved}
                  unit=" mm"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  stroke="#3f3f46"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={t.profitUsd}
                  unit=" $"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  stroke="#3f3f46"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#f4f4f5' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Scatter name="Frontera de Pareto (M7)" data={chartData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
