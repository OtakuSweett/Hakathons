import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Label,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Language, AnalysisResponse, ParetoPoint } from '../types/index.js';

interface EconomicEvaluationProps {
  data: AnalysisResponse;
  lang: Language;
}

export const findClosestParetoPoint = (points: ParetoPoint[], lambda: number): ParetoPoint | undefined => points.reduce<ParetoPoint | undefined>((best, point) => {
  if (!best) return point;
  return Math.abs(point.lambda_weight - lambda) < Math.abs(best.lambda_weight - lambda) ? point : best;
}, undefined);

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
      chartNote: 'Cada punto es una combinación evaluada. La línea muestra cómo cambia la ganancia al ahorrar más o menos agua.',
      waterSaved: 'Agua Ahorrada (mm)',
      profitUsd: 'Ganancia Neta (MXN/ha)',
      metricProfit: 'Ganancia Proyectada',
      metricWaterSaved: 'Ahorro Hídrico',
      metricNitrogen: 'Nitrógeno Biológico',
      noPareto: 'El optimizador no generó resultados económicos para esta parcela. Revisa los cultivos y vuelve a calcular.',
      sectionLabel: 'AGUA · COSTOS · RENTABILIDAD',
      waterConstraint: 'Restricción hídrica activa',
      waterSufficient: 'Disponibilidad hídrica suficiente',
      currencyPerHa: 'MXN/ha',
      currencyPerWater: 'MXN / mm-ha'
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
      chartNote: 'Each point is an evaluated option. The line shows how profit changes as water savings increase or decrease.',
      waterSaved: 'Water Saved (mm)',
      profitUsd: 'Net Profit (MXN/ha)',
      metricProfit: 'Projected Profit',
      metricWaterSaved: 'Water Conservation',
      metricNitrogen: 'Biological Nitrogen',
      noPareto: 'The optimizer did not produce economic results for this field. Review the selected crops and calculate again.',
      sectionLabel: 'WATER · COSTS · RETURNS',
      waterConstraint: 'Active water constraint',
      waterSufficient: 'Sufficient water availability',
      currencyPerHa: 'MXN/ha',
      currencyPerWater: 'MXN / mm-ha'
    }
  }[lang];

  const paretoPoints = data.optimization?.pareto_front || [];
  const activePoint = findClosestParetoPoint(paretoPoints, lambdaVal);
  const shadowPrice = activePoint?.water_shadow_price_mxn_mm;
  const isHighShadow = shadowPrice !== undefined && shadowPrice > 25.0;

  const chartData = paretoPoints.map((p) => ({
    x: p.water_saved_mm,
    y: p.profit_mxn_ha,
    lambda: p.lambda_weight
  })).sort((a, b) => a.x - b.x);
  const xValues = chartData.map((point) => point.x);
  const yValues = chartData.map((point) => point.y);
  const xPadding = xValues.length ? Math.max((Math.max(...xValues) - Math.min(...xValues)) * 0.08, 1) : 1;
  const yPadding = yValues.length ? Math.max((Math.max(...yValues) - Math.min(...yValues)) * 0.08, Math.max(Math.abs(Math.max(...yValues)) * 0.02, 1)) : 1;

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span className="text-[11px] uppercase tracking-wider text-teal-400 font-semibold">
              {t.sectionLabel}
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
              disabled={!activePoint}
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
          {activePoint ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.05]">
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-white/[0.05]">
              <span className="text-zinc-400 text-[10px] block">{t.metricProfit}</span>
              <span className="text-base sm:text-lg font-black text-white font-mono">
                ${activePoint.profit_mxn_ha.toLocaleString()} {t.currencyPerHa}
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
          </div> : <p className="mt-4 pt-3 border-t border-white/[0.05] text-sm text-amber-200" role="status">{t.noPareto}</p>}
        </div>

        {/* Dual Water Shadow Price (y_water) Card */}
        {activePoint && shadowPrice !== undefined && <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20">
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
                {shadowPrice.toFixed(2)} {t.currencyPerWater}
              </h4>
            </div>
            <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${
              isHighShadow ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}>
              {lang === 'es'
                ? (isHighShadow ? t.waterConstraint : t.waterSufficient)
                : (isHighShadow ? t.waterConstraint : t.waterSufficient)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-1">{t.shadowPriceDesc}</p>
          <div className="mt-2.5 p-2.5 bg-zinc-900/80 rounded-lg border border-white/[0.05] text-[11px] text-zinc-200">
            {isHighShadow ? t.shadowAdviceHigh : t.shadowAdviceLow}
          </div>
        </div>}

        {/* Pareto Frontier Scatter Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-xs">{t.paretoChartTitle}</h3>
            <span className="text-[10px] text-zinc-400 font-mono">{lang === 'es' ? 'Opciones evaluadas · M7' : 'Evaluated options · M7'}</span>
          </div>
          {paretoPoints.length > 0 && <p className="economics-chart-note">{t.chartNote}</p>}

          {paretoPoints.length ? <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 18, left: 8, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={t.waterSaved}
                  unit=" mm"
                  domain={[Math.min(...xValues) - xPadding, Math.max(...xValues) + xPadding]}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  stroke="#3f3f46"
                ><Label value={t.waterSaved} position="insideBottom" offset={-8} fill="#52675d" fontSize={11} /></XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  name={t.profitUsd}
                  unit=" MXN"
                  domain={[Math.min(...yValues) - yPadding, Math.max(...yValues) + yPadding]}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  stroke="#3f3f46"
                ><Label value={t.profitUsd} angle={-90} position="insideLeft" offset={0} fill="#52675d" fontSize={11} /></YAxis>
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#f4f4f5' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Scatter name={lang === 'es' ? 'Soluciones evaluadas' : 'Evaluated options'} data={chartData} fill="#087f5b" line={{ stroke: '#087f5b', strokeWidth: 2 }} lineType="joint" />
                {activePoint && <Scatter name={lang === 'es' ? 'Prioridad seleccionada' : 'Selected priority'} data={[{ x: activePoint.water_saved_mm, y: activePoint.profit_mxn_ha }]} fill="#d97706" shape="star" />}
              </ScatterChart>
            </ResponsiveContainer>
          </div> : null}
        </div>
      </div>
    </div>
  );
};
