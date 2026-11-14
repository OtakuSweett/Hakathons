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
      shadowPriceDesc: 'Valor marginal de 1 mm adicional de agua en la rotación optimizada (derivada parcial ∂Z*/∂Agua).',
      shadowAdviceHigh: 'Recomendación: El precio sombra supera el costo de mercado del agua; conviene invertir en tecnificación de riego o compra de agua.',
      shadowAdviceLow: 'Recomendación: El agua no es el factor limitante principal en esta temporada; priorizar manejo de fertilidad y suelo.',
      paretoChartTitle: 'Frontera de Pareto de Soluciones No Dominadas',
      waterSaved: 'Agua Ahorrada (mm)',
      profitUsd: 'Ganancia Neta (USD/ha)',
      nFixed: 'N Fijado (kg/ha)',
      schedule: 'Rotación recomendada para este λ',
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
      shadowAdviceHigh: 'Recommendation: Shadow price exceeds water market cost; investing in drip tech or extra water rights is economically justified.',
      shadowAdviceLow: 'Recommendation: Water is not the binding constraint; focus capital on soil organic matter and seeds.',
      paretoChartTitle: 'Pareto Efficient Frontier (Non-Dominated Solutions)',
      waterSaved: 'Water Saved (mm)',
      profitUsd: 'Net Profit (USD/ha)',
      nFixed: 'Biological N Fixed (kg/ha)',
      schedule: 'Optimal crop sequence for current λ',
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
      schedule: [
        { slot_index: 0, cycle_code: 'PV', crop_id: 'bean' },
        { slot_index: 1, cycle_code: 'OI', crop_id: 'chickpea' }
      ]
    },
    {
      lambda_weight: 0.25,
      profit_mxn_ha: 19800,
      water_saved_mm: 95,
      n_fixed_kg_ha: 60,
      water_shadow_price_mxn_mm: 22.0,
      n_shadow_price_mxn_kg_ha: 9.5,
      schedule: [
        { slot_index: 0, cycle_code: 'PV', crop_id: 'sorghum' },
        { slot_index: 1, cycle_code: 'OI', crop_id: 'bean' }
      ]
    },
    {
      lambda_weight: 0.5,
      profit_mxn_ha: 26500,
      water_saved_mm: 65,
      n_fixed_kg_ha: 45,
      water_shadow_price_mxn_mm: 28.4,
      n_shadow_price_mxn_kg_ha: 8.0,
      schedule: [
        { slot_index: 0, cycle_code: 'PV', crop_id: 'maize' },
        { slot_index: 1, cycle_code: 'OI', crop_id: 'chickpea' }
      ]
    },
    {
      lambda_weight: 0.75,
      profit_mxn_ha: 31200,
      water_saved_mm: 35,
      n_fixed_kg_ha: 25,
      water_shadow_price_mxn_mm: 34.0,
      n_shadow_price_mxn_kg_ha: 5.5,
      schedule: [
        { slot_index: 0, cycle_code: 'PV', crop_id: 'maize' },
        { slot_index: 1, cycle_code: 'OI', crop_id: 'wheat' }
      ]
    },
    {
      lambda_weight: 1.0,
      profit_mxn_ha: 35800,
      water_saved_mm: 0,
      n_fixed_kg_ha: 0,
      water_shadow_price_mxn_mm: 42.0,
      n_shadow_price_mxn_kg_ha: 0.0,
      schedule: [
        { slot_index: 0, cycle_code: 'PV', crop_id: 'maize' },
        { slot_index: 1, cycle_code: 'OI', crop_id: 'barley' }
      ]
    }
  ];

  // Find closest pareto point for current slider value
  const activePoint = paretoPoints.reduce((prev, curr) =>
    Math.abs(curr.lambda_weight - lambdaVal) < Math.abs(prev.lambda_weight - lambdaVal) ? curr : prev
  );

  const shadowPrice = activePoint.water_shadow_price_mxn_mm || 28.4;
  const isHighShadow = shadowPrice > 25.0;

  // Chart data formatting
  const chartData = paretoPoints.map((p) => ({
    x: p.water_saved_mm,
    y: p.profit_mxn_ha,
    lambda: p.lambda_weight,
    n_fixed: p.n_fixed_kg_ha
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
          <span className="text-xs uppercase tracking-wider text-teal-300 font-semibold">Función 8 / Módulos 6 & 7</span>
        </div>
        <h2 className="text-xl font-bold mt-1">{t.title}</h2>
        <p className="text-xs text-emerald-200 mt-0.5">{t.subtitle}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Interactive Pareto Slider */}
        <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t.sliderTitle}</h3>
              <p className="text-xs text-gray-500">{t.sliderDesc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">λ =</span>
              <span className="text-base font-bold text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                {lambdaVal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={lambdaVal}
              onChange={(e) => setLambdaVal(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 font-medium">
              <span>{t.maxResilience} (0.0)</span>
              <span>{t.balanced} (0.5)</span>
              <span>{t.maxProfit} (1.0)</span>
            </div>
          </div>

          {/* Dynamic KPI readout for current Lambda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-200/60">
            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-gray-500 text-[11px] block">{t.metricProfit}</span>
              <span className="text-lg font-bold text-emerald-900">
                ${activePoint.profit_mxn_ha.toLocaleString()} USD/ha
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-gray-500 text-[11px] block">{t.metricWaterSaved}</span>
              <span className="text-lg font-bold text-blue-900">
                +{activePoint.water_saved_mm} mm
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-gray-500 text-[11px] block">{t.metricNitrogen}</span>
              <span className="text-lg font-bold text-teal-900">
                +{activePoint.n_fixed_kg_ha} kg N/ha
              </span>
            </div>
          </div>
        </div>

        {/* Dual Water Shadow Price (y_water) Card */}
        <div className="p-5 rounded-2xl border border-teal-100 bg-teal-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  {t.shadowPriceTitle}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-200/70 text-teal-900">
                  ∂Z*/∂b_agua
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 mt-1">
                {shadowPrice.toFixed(2)} USD / mm-ha
              </h4>
            </div>
            <span className={`self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full ${
              isHighShadow ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {isHighShadow ? 'Agua en Estado Crítico / Restricción Activa' : 'Disponibilidad Suficiente'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t.shadowPriceDesc}</p>
          <div className="mt-3 p-3 bg-white rounded-xl border border-teal-100 text-xs text-teal-950 font-medium">
            {isHighShadow ? t.shadowAdviceHigh : t.shadowAdviceLow}
          </div>
        </div>

        {/* Pareto Frontier Scatter Chart */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">{t.paretoChartTitle}</h3>
          <p className="text-xs text-gray-500 mb-4">
            {lang === 'es'
              ? 'Cada punto representa una solución óptima no dominada. Ganancia vs. Ahorro de agua.'
              : 'Each point represents an efficient non-dominated solution. Profit vs. Water saved.'}
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={t.waterSaved}
                  unit=" mm"
                  tick={{ fontSize: 11 }}
                  label={{ value: t.waterSaved, position: 'insideBottom', offset: -5, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={t.profitUsd}
                  unit=" $"
                  tick={{ fontSize: 11 }}
                  label={{ value: t.profitUsd, angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d1fae5', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Scatter name="Frontera de Pareto (M7)" data={chartData} fill="#059669" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
