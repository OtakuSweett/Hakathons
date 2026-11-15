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
import { Language, AnalysisResponse, ParetoPoint, RotationSlot } from '../types/index.js';

interface EconomicEvaluationProps {
  data: AnalysisResponse;
  lang: Language;
}

export const findClosestParetoPoint = (points: ParetoPoint[], lambda: number): ParetoPoint | undefined => points.reduce<ParetoPoint | undefined>((best, point) => {
  if (!best) return point;
  return Math.abs(point.lambda_weight - lambda) < Math.abs(best.lambda_weight - lambda) ? point : best;
}, undefined);

const cropNames: Record<string, [string, string]> = {
  maize: ['Maíz', 'Maize'], sorghum: ['Sorgo', 'Sorghum'], wheat: ['Trigo', 'Wheat'], barley: ['Cebada', 'Barley'], beans: ['Frijol', 'Beans'], chickpea: ['Garbanzo', 'Chickpea'],
  alfalfa: ['Alfalfa', 'Alfalfa'], broccoli: ['Brócoli', 'Broccoli'], tomato: ['Jitomate', 'Tomato'], onion: ['Cebolla', 'Onion'], garlic: ['Ajo', 'Garlic'], strawberry: ['Fresa', 'Strawberry'],
  oats: ['Avena', 'Oats'], vetch: ['Veza', 'Vetch'], chili_pepper: ['Chile', 'Chili pepper'], asparagus: ['Espárrago', 'Asparagus'], soybean: ['Soya', 'Soybean'],
  sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola'],
  fallow: ['Barbecho', 'Fallow']
};

export const EconomicEvaluation: React.FC<EconomicEvaluationProps> = ({ data, lang }) => {
  const [lambdaVal, setLambdaVal] = useState<number>(0.5);
  const [activeInfoTopic, setActiveInfoTopic] = useState<'slider' | 'pareto' | 'shadow' | null>(null);
  const isEs = lang === 'es';

  const t = {
    title: isEs ? 'Evaluación Económica, Precios Sombra y Frontera de Pareto' : 'Economic Evaluation, Dual Shadow Prices & Pareto Frontier',
    subtitle: isEs ? 'Optimización multiobjetivo (M6 & M7) balanceando ganancia financiera vs resiliencia de agua y nitrógeno.' : 'Multi-objective optimization (M6 & M7) balancing financial profit vs water conservation and soil nitrogen.',
    sliderTitle: isEs ? 'Control Dinámico de Prioridad Agrícola (Lambda λ)' : 'Agricultural Priority Slider (Lambda λ)',
    sliderDesc: isEs ? 'λ = 1.0 (Máxima Ganancia Financiera) ↔ λ = 0.0 (Máxima Conservación Hídrica y Salud del Suelo)' : 'λ = 1.0 (Pure Financial Profit) ↔ λ = 0.0 (Pure Water Conservation & Soil Health)',
    maxProfit: isEs ? 'Máxima Ganancia' : 'Max Profit',
    balanced: isEs ? 'Equilibrio Resiliente' : 'Resilient Balance',
    maxResilience: isEs ? 'Máxima Conservación' : 'Max Conservation',
    shadowPriceTitle: isEs ? 'Precio Sombra Dual del Agua (y_agua)' : 'Dual Water Shadow Price (y_water)',
    shadowPriceDesc: isEs ? 'Valor marginal de 1 mm adicional de agua en la rotación (derivada parcial ∂Z*/∂Agua). Representa cuánto aumentaría el beneficio neto del productor si dispusiera de 1 mm más de agua.' : 'Marginal value of 1 additional mm of water in the rotation (partial derivative ∂Z*/∂Water). Represents how much net profit would increase if 1 additional mm of water were available.',
    shadowAdviceHigh: isEs ? 'Recomendación: El precio sombra supera el costo del agua; invertir en tecnificación de riego o almacenamiento generará un retorno económico inmediato.' : 'Recommendation: Shadow price exceeds water cost; investing in drip technology or water harvesting yields immediate financial returns.',
    shadowAdviceLow: isEs ? 'Recomendación: El agua no es la restricción limitante principal en esta temporada; conviene orientar el capital a materia orgánica del suelo.' : 'Recommendation: Water is not the binding constraint; focus investment on soil organic matter.',
    paretoChartTitle: isEs ? 'Curva de Frontera: Ganancia frente a ahorro hídrico' : 'Frontier Curve: Profit vs. Water Saved',
    chartNote: isEs ? 'Cada punto de la curva representa un plan óptimo calculado por HiGHS. Más arriba significa mayor ganancia neta; más a la derecha, mayor volumen de agua preservado en el acuífero.' : 'Each curve point represents an optimal rotation computed by HiGHS. Higher means higher net return; farther right means more groundwater conserved.',
    waterSaved: isEs ? 'Agua Ahorrada (mm)' : 'Water Saved (mm)',
    profitUsd: isEs ? 'Ganancia Neta (MXN/ha)' : 'Net Profit (MXN/ha)',
    metricProfit: isEs ? 'Ganancia Proyectada' : 'Projected Profit',
    metricWaterSaved: isEs ? 'Ahorro Hídrico' : 'Water Conservation',
    metricNitrogen: isEs ? 'Nitrógeno Biológico' : 'Biological Nitrogen',
    noPareto: isEs ? 'El optimizador no generó resultados económicos para esta parcela. Revisa los cultivos y vuelve a calcular.' : 'The optimizer did not produce economic results for this field. Review the selected crops and calculate again.',
    sectionLabel: isEs ? 'AGUA · COSTOS · RENTABILIDAD' : 'WATER · COSTS · RETURNS',
    waterConstraint: isEs ? 'Restricción hídrica activa' : 'Active water constraint',
    waterSufficient: isEs ? 'Disponibilidad hídrica suficiente' : 'Sufficient water availability',
    currencyPerHa: isEs ? 'MXN/ha' : 'MXN/ha',
    currencyPerWater: isEs ? 'MXN / mm-ha' : 'MXN / mm-ha',
    singlePointBadge: isEs ? 'Óptimo Global Dominante · Sin Conflicto Hídrico' : 'Dominant Global Optimum · No Water Conflict',
    singlePointDesc: isEs ? 'Para las condiciones edafoclimáticas de tu parcela, el solver MILP determinó una rotación única dominante. La dotación hídrica disponible cubre el 100% de la demanda de los cultivos más productivos sin provocar estrés ni requerir sacrificios económicos.' : 'For this field\'s soil and climate conditions, the MILP solver determined a single dominating rotation. Water availability fully satisfies 100% of high-yield crop demand without inducing moisture stress or requiring financial compromises.',
    decisionTableTitle: isEs ? 'Matriz Comparativa de Decisiones (Planes en la Frontera)' : 'Comparative Decision Matrix (Pareto Frontier Plans)',
    decisionTableSubtitle: isEs ? 'Compara directamente los compromisos calculados entre rentabilidad neta y ahorro hídrico. Haz clic en "Seleccionar" para activar un plan.' : 'Directly compare the computed trade-offs between net profit and water conservation. Click "Select" to activate any plan.',
    colPlan: isEs ? 'Estrategia / Alternativa' : 'Strategy / Alternative',
    colLambda: isEs ? 'Prioridad λ' : 'Priority λ',
    colProfit: isEs ? 'Ganancia Neta (MXN/ha)' : 'Net Margin (MXN/ha)',
    colWater: isEs ? 'Ahorro de Agua (mm)' : 'Water Saved (mm)',
    colNitrogen: isEs ? 'Fijación N₂ (kg/ha)' : 'N₂ Fixation (kg/ha)',
    colShadow: isEs ? 'Precio Sombra y_agua' : 'Shadow Price y_water',
    colAction: isEs ? 'Acción' : 'Action',
    btnSelect: isEs ? 'Seleccionar' : 'Select',
    activeBadge: isEs ? 'Plan Activo' : 'Active Plan',
    rotationTableTitle: isEs ? 'Desglose del Plan Agronómico Seleccionado (3-4 Años)' : 'Optimized Agronomic Plan Breakdown (3-4 Years)',
    colCycle: isEs ? 'Ciclo / Año' : 'Cycle / Year',
    colCrop: isEs ? 'Cultivo Asignado' : 'Assigned Crop',
    colWaterDemand: isEs ? 'Demanda Hídrica' : 'Water Demand',
    colMargin: isEs ? 'Margen Neto' : 'Expected Margin',
    colSoilRole: isEs ? 'Aporte al Suelo' : 'Soil Role',
    colWaterStatus: isEs ? 'Estatus Hídrico' : 'Water Status',
    legumeFix: isEs ? 'Leguminosa (+N biológico)' : 'Legume (+biological N)',
    nonLegume: isEs ? 'Cereal / Extractor' : 'Cereal / Extractive',
    statusNoDeficit: isEs ? 'Pleno abastecimiento (sin estrés)' : 'Fully satisfied (no stress)'
  };

  const paretoPoints = data.optimization?.pareto_front || [];
  const rotation: RotationSlot[] = data.optimization?.selected_rotation || [];
  const activePoint = findClosestParetoPoint(paretoPoints, lambdaVal);
  const shadowPrice = activePoint?.water_shadow_price_mxn_mm;
  const isHighShadow = shadowPrice !== undefined && shadowPrice > 25.0;

  // Filter distinct trade-off points
  const distinctPoints = paretoPoints.filter((point, index, self) =>
    index === self.findIndex((p) =>
      Math.abs(p.water_saved_mm - point.water_saved_mm) < 1.0 &&
      Math.abs(p.profit_mxn_ha - point.profit_mxn_ha) < 10.0
    )
  ).sort((a, b) => b.profit_mxn_ha - a.profit_mxn_ha);

  const hasMultipleTradeOffs = distinctPoints.length > 1;

  // Chart data sorted by water saved ascending
  const chartData = distinctPoints.map((p) => ({
    x: Math.round(p.water_saved_mm * 10) / 10,
    y: Math.round(p.profit_mxn_ha),
    lambda: p.lambda_weight,
    n_fixed: p.n_fixed_kg_ha,
    shadow_price: p.water_shadow_price_mxn_mm
  })).sort((a, b) => a.x - b.x);

  const xValues = chartData.map((point) => point.x);
  const yValues = chartData.map((point) => point.y);
  const minX = xValues.length ? Math.min(...xValues) : 0;
  const maxX = xValues.length ? Math.max(...xValues) : 100;
  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxY = yValues.length ? Math.max(...yValues) : 10000;
  const xSpan = maxX - minX || 10;
  const ySpan = maxY - minY || 1000;
  const xPadding = Math.max(xSpan * 0.1, 5);
  const yPadding = Math.max(ySpan * 0.1, 200);

  const getPlanLabel = (index: number, total: number, lambda: number) => {
    if (total <= 1) return lang === 'es' ? 'Plan Óptimo Global' : 'Global Optimum';
    if (index === 0) return lang === 'es' ? 'Plan A · Máxima Rentabilidad' : 'Plan A · Max Profit';
    if (index === total - 1) return lang === 'es' ? 'Plan C · Máxima Conservación' : 'Plan C · Max Water Conservation';
    return lang === 'es' ? `Plan B · Balance Resiliente (λ=${lambda.toFixed(2)})` : `Plan B · Resilient Balance (λ=${lambda.toFixed(2)})`;
  };

  const getCropLabel = (id: string) => cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ');

  return (
    <div className="bento-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#cbd9ce] bg-[#fffef8] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e583d]"></span>
            <span className="text-[11px] uppercase tracking-wider text-[#1e583d] font-bold">
              {t.sectionLabel}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#173d30] mt-1">{t.title}</h2>
          <p className="text-xs text-[#526a5c] mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Dynamic Priority Slider (rendered when trade-offs exist) */}
        {hasMultipleTradeOffs && (
          <div className="p-4 bg-[#f8faf8] rounded-xl border border-[#cbd8cf]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-[#173d30] text-xs">{t.sliderTitle}</h3>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTopic(activeInfoTopic === 'slider' ? null : 'slider')}
                    className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
                    title={isEs ? '¿Qué es el control lambda λ?' : 'What is the lambda slider?'}
                    aria-label="Info Lambda"
                  >
                    ?
                  </button>
                </div>
                <p className="text-[11px] text-[#526a5c]">{t.sliderDesc}</p>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-[#526a5c]">λ =</span>
                <span className="text-base font-black text-[#1e583d] bg-white px-2.5 py-0.5 rounded-lg border border-[#cbd8cf]">
                  {lambdaVal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Informative Explanation for Lambda Priority Slider */}
            {activeInfoTopic === 'slider' && (
              <div className="p-3 my-2.5 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1">
                <div className="flex justify-between items-center font-bold text-[#173d30]">
                  <span>{isEs ? '¿Cómo funciona la ponderación multiobjetivo λ?' : 'How does multi-objective weighting λ work?'}</span>
                  <button type="button" onClick={() => setActiveInfoTopic(null)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isEs
                    ? 'El optimizador HiGHS (Módulo 6 y 7) resuelve la función escalarizada max [λ · Ganancia + (1-λ) · AhorroHídrico]. Mover el control hacia 1.0 prioriza los cultivos con mayor margen neto inmediato; moverlo hacia 0.0 prioriza la preservación del acuífero y la regeneración de nitrógeno en el suelo para blindar las siguientes temporadas contra la sequía.'
                    : 'The HiGHS optimizer (Modules 6 & 7) solves the scalarized objective max [λ · Profit + (1-λ) · WaterSaved]. Setting λ close to 1.0 maximizes immediate financial margin; setting λ towards 0.0 maximizes aquifer water conservation and soil nitrogen regeneration to buffer upcoming droughts.'}
                </p>
              </div>
            )}

            <div className="mt-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={lambdaVal}
                disabled={!activePoint}
                aria-label={t.sliderTitle}
                onChange={(e) => setLambdaVal(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#dbe5e0] rounded-lg appearance-none cursor-pointer accent-[#1e583d]"
              />
              <div className="flex justify-between text-[10px] text-[#526a5c] mt-1.5 font-medium">
                <span>{t.maxResilience} (0.0)</span>
                <span>{t.balanced} (0.5)</span>
                <span>{t.maxProfit} (1.0)</span>
              </div>
            </div>

            {/* Dynamic KPI readout */}
            {activePoint && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#dbe5e0]">
                <div className="bg-white p-3 rounded-xl border border-[#cbd8cf]">
                  <span className="text-[#526a5c] text-[10px] block font-medium">{t.metricProfit}</span>
                  <span className="text-base sm:text-lg font-black text-[#173d30] font-mono">
                    ${Math.round(activePoint.profit_mxn_ha).toLocaleString()} {t.currencyPerHa}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#cbd8cf]">
                  <span className="text-[#526a5c] text-[10px] block font-medium">{t.metricWaterSaved}</span>
                  <span className="text-base sm:text-lg font-black text-[#1d577a] font-mono">
                    +{Math.round(activePoint.water_saved_mm)} mm
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#cbd8cf]">
                  <span className="text-[#526a5c] text-[10px] block font-medium">{t.metricNitrogen}</span>
                  <span className="text-base sm:text-lg font-black text-[#1e583d] font-mono">
                    +{Math.round(activePoint.n_fixed_kg_ha)} kg N/ha
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dual Water Shadow Price Card */}
        {activePoint && shadowPrice !== undefined && (
          <div className="p-4 rounded-xl border border-[#a8c5ab] bg-[#f3f8f4]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e583d]">
                    {t.shadowPriceTitle}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e3efe6] text-[#1e583d] border border-[#a8c5ab] font-bold">
                    ∂Z*/∂b_agua
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTopic(activeInfoTopic === 'shadow' ? null : 'shadow')}
                    className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
                    title={isEs ? '¿Qué es el precio sombra?' : 'What is the shadow price?'}
                    aria-label="Info Shadow Price"
                  >
                    ?
                  </button>
                </div>
                <h4 className="text-sm font-bold text-[#173d30] font-mono mt-1">
                  ${shadowPrice.toFixed(2)} {t.currencyPerWater}
                </h4>
              </div>
              <span className={`self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${
                isHighShadow ? 'bg-[#fff5df] text-[#805600] border border-[#d6ba78]' : 'bg-[#e7f0ea] text-[#1e583d] border border-[#a8c5ab]'
              }`}>
                {isHighShadow ? t.waterConstraint : t.waterSufficient}
              </span>
            </div>

            {/* Informative Explanation for Dual Shadow Price */}
            {activeInfoTopic === 'shadow' && (
              <div className="p-3 my-2.5 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1">
                <div className="flex justify-between items-center font-bold text-[#173d30]">
                  <span>{isEs ? '¿Cómo ayuda el precio sombra a tomar decisiones de inversión?' : 'How does the shadow price guide investment decisions?'}</span>
                  <button type="button" onClick={() => setActiveInfoTopic(null)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isEs
                    ? 'El precio sombra dual y_agua (Módulo 7) indica cuánto dinero adicional ganaría el productor por cada milímetro adicional de agua disponible en la parcela. Si el precio sombra es alto (ej. > 25 MXN/mm-ha), el agua es el factor que ahoga la rentabilidad, por lo que tecnificar el riego o construir bordos de captación se paga solo en menos de una temporada.'
                    : 'The dual shadow price y_water (Module 7) indicates how much additional revenue the grower gains from 1 extra millimeter of available water. A high shadow price (> 25 MXN/mm-ha) means moisture is the primary bottleneck, proving that investments in drip tech or rainwater harvesting provide immediate payback within one season.'}
                </p>
              </div>
            )}
            <p className="text-[11px] text-[#526a5c] mt-1 leading-relaxed">{t.shadowPriceDesc}</p>
            <div className="mt-2.5 p-2.5 bg-white rounded-lg border border-[#cbd8cf] text-[11px] text-[#244438] font-medium">
              {isHighShadow ? t.shadowAdviceHigh : t.shadowAdviceLow}
            </div>
          </div>
        )}

        {/* Actionable Decision Matrix Table (only when multiple Pareto trade-off options exist) */}
        {hasMultipleTradeOffs && (
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-[#173d30] text-sm">{t.decisionTableTitle}</h3>
              <p className="text-xs text-[#526a5c] mt-0.5">{t.decisionTableSubtitle}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#cbd8cf]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f5f2] border-b border-[#cbd8cf] text-[#244438]">
                    <th className="py-2.5 px-3 font-semibold">{t.colPlan}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{t.colLambda}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.colProfit}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.colWater}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.colNitrogen}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.colShadow}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{t.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2eae5] bg-white">
                  {distinctPoints.map((point, idx) => {
                    const isSelected = Math.abs(point.lambda_weight - lambdaVal) < 0.06;
                    const planName = getPlanLabel(idx, distinctPoints.length, point.lambda_weight);
                    return (
                      <tr
                        key={`pareto-plan-${point.lambda_weight.toFixed(2)}-${idx}`}
                        className={`transition-colors ${
                          isSelected ? 'bg-[#eef5f0] font-semibold' : 'hover:bg-[#f9fbf9]'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-[#173d30]">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#1e583d]' : 'bg-[#cbd8cf]'}`}></span>
                            <span>{planName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#526a5c]">
                          λ = {point.lambda_weight.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#173d30]">
                          ${Math.round(point.profit_mxn_ha).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#1d577a]">
                          +{Math.round(point.water_saved_mm)} mm
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#1e583d]">
                          +{Math.round(point.n_fixed_kg_ha)} kg
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#526a5c]">
                          ${(point.water_shadow_price_mxn_mm ?? 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-[#1e583d] text-white font-bold">
                              {t.activeBadge}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLambdaVal(point.lambda_weight)}
                              className="px-2.5 py-0.5 rounded-md border border-[#cbd8cf] hover:border-[#1e583d] text-[#1e583d] text-[10px] font-semibold bg-white cursor-pointer"
                            >
                              {t.btnSelect}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Visual Frontier Plot (when multiple points exist) */}
        {hasMultipleTradeOffs ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-[#173d30] text-xs">{t.paretoChartTitle}</h3>
                <button
                  type="button"
                  onClick={() => setActiveInfoTopic(activeInfoTopic === 'pareto' ? null : 'pareto')}
                  className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
                  title={isEs ? '¿Qué es la frontera de Pareto?' : 'What is the Pareto frontier?'}
                  aria-label="Info Pareto"
                >
                  ?
                </button>
              </div>
              <span className="text-[10px] text-[#526a5c] font-mono">
                {lang === 'es' ? 'Frontera de Pareto · M7' : 'Pareto Frontier · M7'}
              </span>
            </div>

            {/* Informative Explanation for Pareto Frontier */}
            {activeInfoTopic === 'pareto' && (
              <div className="p-3 my-2.5 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1">
                <div className="flex justify-between items-center font-bold text-[#173d30]">
                  <span>{isEs ? '¿Qué significa cada punto de la Frontera de Soluciones?' : 'What does each point on the Frontier mean?'}</span>
                  <button type="button" onClick={() => setActiveInfoTopic(null)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isEs
                    ? 'Una rotación está en la Frontera de Pareto si es imposible ganar un peso más sin gastar más agua, o ahorrar un litro más sin sacrificar dinero. La línea verde une los planes óptimos matemáticamente no dominados; la estrella dorada indica la rotación activada según tu nivel de prioridad.'
                    : 'A crop rotation lies on the Pareto Frontier if it is impossible to increase profit without consuming more water, or conserve more water without sacrificing return. The green line connects mathematically non-dominated schedules; the gold star highlights your currently selected plan.'}
                </p>
              </div>
            )}

            <p className="economics-chart-note">{t.chartNote}</p>
            <div className="h-60 w-full mt-2 bg-[#fbfdfb] p-3 rounded-xl border border-[#cbd8cf]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 24, left: 18, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2eae5" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={t.waterSaved}
                    domain={[Math.max(0, Math.round(minX - xPadding)), Math.round(maxX + xPadding)]}
                    tick={{ fontSize: 11, fill: '#526a5c' }}
                    stroke="#cbd8cf"
                    tickFormatter={(val: number) => `${Math.round(val)} mm`}
                  >
                    <Label value={t.waterSaved} position="insideBottom" offset={-10} fill="#526a5c" fontSize={11} />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={t.profitUsd}
                    domain={[Math.max(0, Math.round(minY - yPadding)), Math.round(maxY + yPadding)]}
                    tick={{ fontSize: 11, fill: '#526a5c' }}
                    stroke="#cbd8cf"
                    width={85}
                    tickFormatter={(val: number) => `$${Math.round(val).toLocaleString()} MXN`}
                  >
                    <Label value={t.profitUsd} angle={-90} position="insideLeft" offset={8} fill="#526a5c" fontSize={11} />
                  </YAxis>
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: '#1e583d' }}
                    contentStyle={{
                      backgroundColor: '#fffef8',
                      borderRadius: '10px',
                      border: '1px solid #cbd9ce',
                      fontSize: '11px',
                      color: '#173d30',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
                    }}
                    formatter={(value: any, name: any) => [
                      name === t.waterSaved ? `${Math.round(Number(value))} mm` : `$${Math.round(Number(value)).toLocaleString()} MXN/ha`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Scatter
                    name={lang === 'es' ? 'Frontera de Soluciones' : 'Pareto Frontier'}
                    data={chartData}
                    fill="#1e583d"
                    line={{ stroke: '#1e583d', strokeWidth: 2 }}
                    lineType="joint"
                    isAnimationActive={false}
                  />
                  {activePoint && (
                    <Scatter
                      name={lang === 'es' ? 'Prioridad seleccionada' : 'Selected priority'}
                      data={[{ x: Math.round(activePoint.water_saved_mm * 10) / 10, y: Math.round(activePoint.profit_mxn_ha) }]}
                      fill="#d97706"
                      shape="star"
                      isAnimationActive={false}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : activePoint ? (
          /* Deterministic Global Optimum Card (shown when water is sufficient and solutions collapse to single optimum) */
          <div className="p-5 bg-[#f8faf8] rounded-xl border border-[#cbd8cf] text-left space-y-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-[#e7f0ea] text-[#1e583d] border border-[#a8c5ab] font-bold text-[10px] uppercase tracking-wider">
                {t.singlePointBadge}
              </span>
              <p className="text-xs text-[#526a5c] mt-2 leading-relaxed">
                {t.singlePointDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-[#cbd8cf] flex flex-col justify-between">
                <span className="text-[#526a5c] text-[11px] font-semibold">{t.metricProfit}</span>
                <div className="my-2">
                  <span className="text-xl sm:text-2xl font-black text-[#173d30] font-mono">
                    ${Math.round(activePoint.profit_mxn_ha).toLocaleString()}
                  </span>
                  <span className="text-xs text-[#526a5c] ml-1">{t.currencyPerHa}</span>
                </div>
                <span className="text-[10px] text-[#1e583d] font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 text-[#1e583d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{lang === 'es' ? 'Margen neto optimizado' : 'Optimized net margin'}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#cbd8cf] flex flex-col justify-between">
                <span className="text-[#526a5c] text-[11px] font-semibold">{t.metricWaterSaved}</span>
                <div className="my-2">
                  <span className="text-xl sm:text-2xl font-black text-[#1d577a] font-mono">
                    +{Math.round(activePoint.water_saved_mm)}
                  </span>
                  <span className="text-xs text-[#526a5c] ml-1">mm</span>
                </div>
                <span className="text-[10px] text-[#1d577a] font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 text-[#1d577a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                  <span>{lang === 'es' ? 'Ahorro hídrico en rotación' : 'Water conservation in rotation'}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#cbd8cf] flex flex-col justify-between">
                <span className="text-[#526a5c] text-[11px] font-semibold">{t.metricNitrogen}</span>
                <div className="my-2">
                  <span className="text-xl sm:text-2xl font-black text-[#1e583d] font-mono">
                    +{Math.round(activePoint.n_fixed_kg_ha)}
                  </span>
                  <span className="text-xs text-[#526a5c] ml-1">kg/ha</span>
                </div>
                <span className="text-[10px] text-[#1e583d] font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 text-[#1e583d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  <span>{lang === 'es' ? 'Fijación biológica de leguminosas' : 'Biological legume fixation'}</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#f8faf8] border border-[#cbd8cf] text-xs text-[#526a5c]">
            {t.noPareto}
          </div>
        )}

        {/* Multi-Year Rotation Schedule Table */}
        {rotation.length > 0 && (
          <div className="pt-2 border-t border-[#cbd8cf]">
            <div className="mb-2.5">
              <h3 className="font-bold text-[#173d30] text-sm">{t.rotationTableTitle}</h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#cbd8cf]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f0f5f2] border-b border-[#cbd8cf] text-[#244438]">
                    <th className="py-2.5 px-3 font-semibold">{t.colCycle}</th>
                    <th className="py-2.5 px-3 font-semibold">{t.colCrop}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.colWaterDemand}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{t.colMargin}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{t.colSoilRole}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{t.colWaterStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2eae5] bg-white">
                  {rotation.map((slot, index) => {
                    const yearNum = Math.floor(index / 2) + 1;
                    const cycleCode = slot.cycle_code || (index % 2 === 0 ? 'PV' : 'OI');
                    const cycleLabel = cycleCode === 'PV'
                      ? (lang === 'es' ? `Año ${yearNum} · Primavera-Verano (PV)` : `Year ${yearNum} · Spring-Summer (SS)`)
                      : (lang === 'es' ? `Año ${yearNum} · Otoño-Invierno (OI)` : `Year ${yearNum} · Fall-Winter (FW)`);

                    return (
                      <tr key={`eval-slot-${slot.slot_index ?? index}`} className="hover:bg-[#f9fbf9]">
                        <td className="py-2.5 px-3 text-[#173d30] font-medium whitespace-nowrap">
                          {cycleLabel}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#173d30] capitalize">
                          {getCropLabel(slot.crop_id)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#1d577a]">
                          {Math.round(slot.water_need_mm)} mm
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#173d30]">
                          ${Math.round(slot.profit_mxn_ha).toLocaleString()} MXN
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {slot.is_legume ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#e7f0ea] text-[#1e583d] font-bold border border-[#a8c5ab]">
                              {t.legumeFix}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#526a5c]">
                              {t.nonLegume}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#f0f7f3] text-[#23583c] font-medium border border-[#cbd8cf]">
                            <svg className="w-3 h-3 text-[#1e583d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {t.statusNoDeficit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
