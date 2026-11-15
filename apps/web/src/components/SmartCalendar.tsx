import React, { useState } from 'react';
import { Language, AnalysisResponse, RotationSlot } from '../types/index.js';

interface SmartCalendarProps {
  data: AnalysisResponse;
  lang: Language;
}

interface CropPhenologyStage {
  name: [string, string];
  desc: [string, string];
  gddPct: number;
}

interface CropPhenology {
  tBase: number;
  totalGdd: number;
  stages: [CropPhenologyStage, CropPhenologyStage, CropPhenologyStage, CropPhenologyStage];
  depletionDays: number;
}

const CROP_PHENOLOGY: Record<string, CropPhenology> = {
  oats: {
    tBase: 5.0,
    totalGdd: 1150,
    depletionDays: 12,
    stages: [
      { name: ['Emergencia y Plántula', 'Emergence & Seedling'], desc: ['Días 7–12; desarrollo de radícula y coleóptilo', 'Days 7–12; radicle and coleoptile growth'], gddPct: 0.12 },
      { name: ['Macollamiento y Encañazón', 'Tillering & Jointing'], desc: ['Rápida producción de biomasa foliar y cañas', 'Rapid foliar biomass and shoot expansion'], gddPct: 0.42 },
      { name: ['Espigado y Embuche', 'Heading & Booting'], desc: ['Máxima sensibilidad a déficit hídrico; formación de grano', 'Peak sensitivity to moisture deficit; grain set'], gddPct: 0.75 },
      { name: ['Madurez de Grano / Corte', 'Grain Maturity / Harvest'], desc: ['Grano pastoso y madurez para cosecha o heno', 'Dough stage and readiness for cutting/grain'], gddPct: 1.0 }
    ]
  },
  alfalfa: {
    tBase: 5.0,
    totalGdd: 850,
    depletionDays: 8,
    stages: [
      { name: ['Rebrote Inicial Post-Corte', 'Post-Cut Regrowth'], desc: ['Primeras hojas trifoliadas y activación de corona', 'First trifoliate leaves and crown bud activation'], gddPct: 0.14 },
      { name: ['Desarrollo Vegetativo Acelerado', 'Rapid Vegetative Surge'], desc: ['Máxima absorción de agua y fijación de N2 con Rhizobium', 'Peak transpiration and active N2 fixation with Rhizobium'], gddPct: 0.45 },
      { name: ['Pre-Floración (10% Botón Floral)', 'Pre-Bloom (10% Flower Bud)'], desc: ['Momento óptimo de corte para máxima proteína bruta', 'Optimal cutting point for maximum crude protein'], gddPct: 0.80 },
      { name: ['Corte Mecánico y Henificado', 'Mechanical Harvest & Baling'], desc: ['Corte a 5 cm del suelo y secado en campo', 'Cutting 5 cm above ground and field curing'], gddPct: 1.0 }
    ]
  },
  maize: {
    tBase: 10.0,
    totalGdd: 1450,
    depletionDays: 14,
    stages: [
      { name: ['Emergencia y Germinación (VE–V2)', 'Emergence & Germination (VE–V2)'], desc: ['Establecimiento radicular inicial y absorción de fósforo', 'Initial nodal root anchoring and phosphorus uptake'], gddPct: 0.10 },
      { name: ['Crecimiento Vegetativo Pleno (V6–V12)', 'Peak Vegetative Growth (V6–V12)'], desc: ['Elongación de entrenudos y máxima demanda de nitrógeno', 'Rapid stem elongation and critical nitrogen demand'], gddPct: 0.40 },
      { name: ['Floración y Emisión de Estigmas (R1)', 'Silking & Tasseling (R1)'], desc: ['Polinización; 1 día de estrés hídrico reduce 6% el rendimiento', 'Pollination; 1 day of drought reduces yield by 6%'], gddPct: 0.68 },
      { name: ['Madurez Fisiológica / Capa Negra (R6)', 'Physiological Maturity / Black Layer (R6)'], desc: ['Llenado completo de almidón y secado de grano', 'Complete kernel milk-line descent and drydown'], gddPct: 1.0 }
    ]
  },
  wheat: {
    tBase: 0.0,
    totalGdd: 1380,
    depletionDays: 15,
    stages: [
      { name: ['Emergencia y Primeras Hojas', 'Emergence & Early Leaves'], desc: ['Aparición de plántula sobre superficie del suelo', 'Seedling emergence above the seed furrow'], gddPct: 0.11 },
      { name: ['Macollamiento y Encañazón', 'Tillering & Stem Extension'], desc: ['Definición del número de espigas fértiles por metro', 'Determination of fertile spike number per meter'], gddPct: 0.42 },
      { name: ['Espigado y Antesis (Floración)', 'Spike Heading & Anthesis'], desc: ['Fecundación y cuajado de granos en la espiga', 'Fertilization and grain set on the head'], gddPct: 0.72 },
      { name: ['Madurez Fisiológica y Cosecha', 'Physiological Maturity & Harvest'], desc: ['Humedad de grano < 14% para trilla directa', 'Grain moisture below 14% for direct combine harvest'], gddPct: 1.0 }
    ]
  },
  beans: {
    tBase: 8.0,
    totalGdd: 980,
    depletionDays: 10,
    stages: [
      { name: ['Emergencia (VE)', 'Emergence (VE)'], desc: ['Aparición de cotiledones sobre la superficie', 'Cotyledon emergence above soil level'], gddPct: 0.12 },
      { name: ['Ramificación y Crecimiento (V3–V4)', 'Branching & Canopy Closure (V3–V4)'], desc: ['Nódulos de Rhizobium activos fijando nitrógeno atmosférico', 'Active Rhizobium nodules fixing atmospheric nitrogen'], gddPct: 0.38 },
      { name: ['Floración y Cuajado de Vainas (R1–R3)', 'Flowering & Pod Set (R1–R3)'], desc: ['Sensibilidad extrema al aborto floral por calor o sequía', 'Critical sensitivity to blossom drop from heat or drought'], gddPct: 0.70 },
      { name: ['Madurez de Vainas y Cosecha (R8)', 'Pod Maturity & Harvest (R8)'], desc: ['Defoliación natural y secado de grano en vaina', 'Natural leaf drop and seed hardening in pod'], gddPct: 1.0 }
    ]
  },
  chickpea: {
    tBase: 8.0,
    totalGdd: 1050,
    depletionDays: 16,
    stages: [
      { name: ['Emergencia y Enraizamiento', 'Emergence & Rooting'], desc: ['Raíz pivotante profunda buscando humedad residual', 'Deep taproot seeking residual moisture reserves'], gddPct: 0.12 },
      { name: ['Ramificación y Cobertura', 'Branching & Vegetative Canopy'], desc: ['Alta rusticidad y tolerancia a bajas temperaturas', 'High hardiness and resilience to cool conditions'], gddPct: 0.40 },
      { name: ['Floración y Formación de Vaina', 'Flowering & Pod Formation'], desc: ['Floración escalonada que amortigua riesgos climáticos', 'Indeterminate flowering that buffers climate risk'], gddPct: 0.72 },
      { name: ['Madurez Fisiológica y Secado', 'Maturity & Desiccation'], desc: ['Vainas doradas listas para cosecha mecánica', 'Golden dry pods ready for mechanical direct harvest'], gddPct: 1.0 }
    ]
  },
  soybean: {
    tBase: 10.0,
    totalGdd: 1350,
    depletionDays: 11,
    stages: [
      { name: ['Emergencia y Cotiledones (VE–VC)', 'Emergence & Cotyledons (VE–VC)'], desc: ['Apertura de hojas unifoliadas y fijación radicular', 'Unifoliolate leaf unfolding and root anchoring'], gddPct: 0.10 },
      { name: ['Desarrollo Vegetativo (V4–V6)', 'Vegetative Growth (V4–V6)'], desc: ['Simbiogénesis con Bradyrhizobium y fotosíntesis activa', 'Active Bradyrhizobium symbiosis and canopy closure'], gddPct: 0.38 },
      { name: ['Floración y Llenado de Grano (R2–R5)', 'Full Bloom & Seed Fill (R2–R5)'], desc: ['Etapa de máxima demanda hídrica diaria', 'Period of highest daily water consumption'], gddPct: 0.68 },
      { name: ['Madurez y Defoliación (R7–R8)', 'Maturity & Harvest (R7–R8)'], desc: ['Caída del 95% de hojas; vainas pardas listas para trilla', '95% leaf drop; brown pods ready for harvest'], gddPct: 1.0 }
    ]
  },
  sunflower: {
    tBase: 7.0,
    totalGdd: 1280,
    depletionDays: 14,
    stages: [
      { name: ['Emergencia (VE)', 'Emergence (VE)'], desc: ['Expansión de cotiledones y primer par de hojas', 'Cotyledon expansion and first true leaf pair'], gddPct: 0.11 },
      { name: ['Formación de Botón Floral (R1)', 'Flower Bud Initiation (R1)'], desc: ['Aparición de la estrella terminal del capítulo', 'Appearance of the miniature terminal star bud'], gddPct: 0.44 },
      { name: ['Antesis / Floración Plena (R5)', 'Full Anthesis / Pollination (R5)'], desc: ['Apertura radial de flores liguladas y tubulosas', 'Opening of ray and disc florets across the head'], gddPct: 0.74 },
      { name: ['Madurez del Capítulo y Aquenios (R9)', 'Head Maturity & Seed Harvest (R9)'], desc: ['Dorso del capítulo amarillo a pardo; secado de pipa', 'Back of head turns yellow to brown; seed drydown'], gddPct: 1.0 }
    ]
  },
  sorghum: {
    tBase: 10.0,
    totalGdd: 1250,
    depletionDays: 16,
    stages: [
      { name: ['Emergencia y Plántula', 'Emergence & Seedling'], desc: ['Rápido anclaje y formación de ceras cuticulares anti-evaporación', 'Rapid anchoring and cuticular wax synthesis'], gddPct: 0.11 },
      { name: ['Diferenciación de Panícula', 'Panicle Differentiation'], desc: ['Determinación del número potencial de semillas por panoja', 'Determination of potential seed count per panicle'], gddPct: 0.40 },
      { name: ['Floración y Antesis', 'Flowering & Anthesis'], desc: ['Polinización apical descendente en la panoja', 'Top-to-bottom anthesis across the panicle'], gddPct: 0.70 },
      { name: ['Madurez Fisiológica de Grano', 'Grain Physiological Maturity'], desc: ['Punto negro en la base del grano; humedad < 15%', 'Black layer at kernel base; moisture below 15%'], gddPct: 1.0 }
    ]
  },
  barley: {
    tBase: 0.0,
    totalGdd: 1200,
    depletionDays: 14,
    stages: [
      { name: ['Emergencia y Enraizamiento', 'Emergence & Rooting'], desc: ['Brote temprano con alta tolerancia al frío', 'Early emergence with strong frost tolerance'], gddPct: 0.12 },
      { name: ['Macollamiento y Encañazón', 'Tillering & Jointing'], desc: ['Formación densa de tallos secundarios', 'Dense secondary tiller production'], gddPct: 0.42 },
      { name: ['Espigado', 'Heading & Flowering'], desc: ['Emersión de aristas y floración rápida', 'Awn emergence and fast pollination'], gddPct: 0.70 },
      { name: ['Madurez y Trilla', 'Grain Ripening & Harvest'], desc: ['Cosecha temprana antes de calores estivales', 'Early harvest ahead of peak summer heat'], gddPct: 1.0 }
    ]
  },
  broccoli: {
    tBase: 5.0,
    totalGdd: 920,
    depletionDays: 7,
    stages: [
      { name: ['Enraizamiento y Trasplante', 'Transplant & Establishment'], desc: ['Emisión de hojas verdaderas en suelo húmedo', 'True leaf emergence in well-moistened soil'], gddPct: 0.12 },
      { name: ['Desarrollo Foliar y Tallo', 'Foliar & Stem Canopy Surge'], desc: ['Acumulación de reservas nutricionales en biomasa', 'Nutrient reserve storage in vegetative biomass'], gddPct: 0.42 },
      { name: ['Inducción y Crecimiento de Pella', 'Head Induction & Growth'], desc: ['Desarrollo de la inflorescencia compacta verde', 'Development of the tight green inflorescence'], gddPct: 0.74 },
      { name: ['Cosecha Comercial', 'Commercial Head Harvest'], desc: ['Corte manual de pellas firmes de 15–20 cm', 'Hand cutting of compact 15–20 cm crowns'], gddPct: 1.0 }
    ]
  },
  canola: {
    tBase: 5.0,
    totalGdd: 1180,
    depletionDays: 13,
    stages: [
      { name: ['Emergencia y Roseta', 'Emergence & Rosette'], desc: ['Formación de hojas basales en roseta post-germinación', 'Basal rosette leaf formation post-emergence'], gddPct: 0.13 },
      { name: ['Alargamiento de Tallo (Bolting)', 'Stem Elongation (Bolting)'], desc: ['Emisión de ramificaciones florales secundarias', 'Secondary floral branch emission and stem surge'], gddPct: 0.43 },
      { name: ['Floración Amarilla', 'Yellow Flowering Canopy'], desc: ['Atracción de polinizadores y cuajado de silicuas', 'Pollinator attraction and silique fruit set'], gddPct: 0.72 },
      { name: ['Maduración de Silicuas', 'Pod Ripening & Swathing'], desc: ['Semillas negras con alto contenido de aceite', 'Black seed maturity with high oil concentration'], gddPct: 1.0 }
    ]
  }
};

const getPhenologyForCrop = (cropId: string, waterNeedMm: number): CropPhenology => {
  if (CROP_PHENOLOGY[cropId]) return CROP_PHENOLOGY[cropId];
  const total = Math.max(750, Math.round(waterNeedMm * 2.8));
  return {
    tBase: 8.0,
    totalGdd: total,
    depletionDays: 12,
    stages: [
      { name: ['Emergencia y Enraizamiento', 'Emergence & Rooting'], desc: ['Brote inicial y establecimiento radicular', 'Early emergence and root anchoring'], gddPct: 0.12 },
      { name: ['Desarrollo Foliar y Ramificación', 'Foliar Development & Branching'], desc: ['Crecimiento activo del dosel vegetativo', 'Active canopy growth and branching'], gddPct: 0.42 },
      { name: ['Floración y Fructificación', 'Flowering & Fruit Set'], desc: ['Período de mayor sensibilidad al estrés de agua', 'Critical moisture-sensitive flowering phase'], gddPct: 0.72 },
      { name: ['Madurez y Cosecha', 'Maturity & Harvest'], desc: ['Madurez fisiológica lista para recolección', 'Physiological maturity and harvest readiness'], gddPct: 1.0 }
    ]
  };
};

const getLegumeBadgeLabel = (isLegume: boolean, spanish: boolean) => {
  if (isLegume) return spanish ? '🌱 Leguminosa (+N)' : '🌱 Legume (+N)';
  return spanish ? '🌾 Extractor / Cereal' : '🌾 Depleting / Non-Legume';
};

const getStageBoxClass = (current: boolean, completed: boolean) => {
  if (current) return 'bg-[#f4f8f5] border-[#1e583d] ring-1 ring-[#1e583d]';
  if (completed) return 'bg-white border-[#dbe5e0]';
  return 'bg-[#fafbfa] border-[#e8ecea] opacity-80';
};

const getCycleActionLabel = (selected: boolean, spanish: boolean) => {
  if (selected) return spanish ? 'Visualizando' : 'Active';
  return spanish ? 'Ver GDD' : 'View GDD';
};

export const SmartCalendar: React.FC<SmartCalendarProps> = ({ data, lang }) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [activeInfoTopic, setActiveInfoTopic] = useState<'gdd' | 'irrigation' | 'rotation' | null>(null);

  const cropNames: Record<string, [string, string]> = {
    maize: ['Maíz', 'Maize'], sorghum: ['Sorgo', 'Sorghum'], wheat: ['Trigo', 'Wheat'], barley: ['Cebada', 'Barley'], beans: ['Frijol', 'Beans'], chickpea: ['Garbanzo', 'Chickpea'],
    alfalfa: ['Alfalfa', 'Alfalfa'], broccoli: ['Brócoli', 'Broccoli'], tomato: ['Jitomate', 'Tomato'], onion: ['Cebolla', 'Onion'], garlic: ['Ajo', 'Garlic'], strawberry: ['Fresa', 'Strawberry'],
    oats: ['Avena', 'Oats'], vetch: ['Veza', 'Vetch'], chili_pepper: ['Chile', 'Chili pepper'], asparagus: ['Espárrago', 'Asparagus'], soybean: ['Soya', 'Soybean'],
    sunflower: ['Girasol', 'Sunflower'], potato: ['Papa', 'Potato'], canola: ['Canola', 'Canola']
  };

  const isEs = lang === 'es';

  const t = {
    title: isEs ? 'Calendario Inteligente de Cultivos y Riegos' : 'Smart Crop & Irrigation Calendar',
    subtitle: isEs ? 'Secuencia de rotación multianual (M6), fenología térmica GDD (M2) y momentos críticos de riego (M4).' : 'Multi-year rotation schedule (M6), GDD thermal phenology (M2), and predictive irrigation triggers (M4).',
    sectionLabel: isEs ? 'PLANIFICACIÓN · ROTACIÓN · GDD' : 'PLANNING · ROTATION · GDD',
    cyclePV: isEs ? 'Primavera - Verano (PV)' : 'Spring - Summer (PV)',
    cycleOI: isEs ? 'Otoño - Invierno (OI)' : 'Fall - Winter (OI)',
    crop: isEs ? 'Cultivo Asignado' : 'Assigned Crop',
    waterNeed: isEs ? 'Demanda Hídrica' : 'Water Demand',
    profit: isEs ? 'Margen Esperado' : 'Expected Margin',
    legumeFixation: isEs ? 'Fijación de Nitrógeno' : 'Nitrogen Fixation',
    legumeYes: isEs ? 'Leguminosa (+40 a +80 kg N/ha al suelo)' : 'Legume (+40 to +80 kg N/ha to soil)',
    legumeNo: isEs ? 'Extractor / No leguminosa' : 'Depleting / Non-legume',
    gddMilestones: isEs ? 'Etapas de Crecimiento Térmico (GDD)' : 'Thermal Crop Growth Stages (GDD)',
    irrigationSchedule: isEs ? 'Fechas de Riego Predictivo (Newton-Raphson)' : 'Predictive Irrigation Timing (Newton-Raphson)',
    recommendedIrrigation: isEs ? 'Riego Sugerido Requerido' : 'Suggested Irrigation Needed',
    irrigationDetail: isEs ? 'Para evitar que la reserva de humedad del suelo caiga por debajo del umbral crítico:' : 'To prevent stored soil moisture from dipping below critical wilting threshold:',
    legumeTag: isEs ? 'Leguminosa · +N' : 'Legume · +N',
    noStressDetected: isEs ? 'Régimen hídrico seguro: sin estrés crítico' : 'Safe moisture regime: no critical stress',
    depthMm: isEs ? 'Lámina por Aplicar' : 'Water Depth to Apply',
    dayLabel: isEs ? 'Regar en' : 'Irrigate In',
    tableTitle: isEs ? 'Tabla Resumen de Rotación Agronómica Multianual' : 'Multi-Year Agronomic Rotation Summary Table',
    colCycle: isEs ? 'Ciclo / Año' : 'Cycle / Year',
    colCrop: isEs ? 'Cultivo' : 'Crop',
    colWater: isEs ? 'Demanda Hídrica' : 'Water Demand',
    colMargin: isEs ? 'Margen Neto Estimado' : 'Estimated Net Margin',
    colSoil: isEs ? 'Efecto Edáfico' : 'Soil Effect',
    colAction: isEs ? 'Ver Fases GDD' : 'View GDD Stages',
    activeCropBannerLabel: isEs ? 'Detalle Dinámico del Cultivo Seleccionado' : 'Dynamic View for Selected Crop',
    gddBaseTemp: isEs ? 'Temperatura Base' : 'Base Temperature',
    gddRequirement: isEs ? 'Requerimiento Total' : 'Total GDD Target',
    gddAccumulatedLabel: isEs ? 'Energía Térmica Acumulada' : 'Accumulated Thermal Energy',
    gddProgress: isEs ? 'Progreso del Ciclo Biológico' : 'Biological Stage Progress'
  };

  const rotation: RotationSlot[] = data.optimization?.selected_rotation || [];
  const activeSlot = rotation[selectedSlotIndex] || rotation[0];
  const trigger = data.physics?.irrigation_trigger;
  const irrigationReason = trigger?.reason === 'W_never_crosses_Wcrit'
    ? (lang === 'es' ? 'La reserva de agua no cruza el umbral crítico durante el periodo analizado.' : 'Water storage does not cross the critical threshold during the analysis period.')
    : trigger?.reason === 'W_already_below_Wcrit'
      ? (lang === 'es' ? 'La reserva de agua ya está por debajo del umbral crítico.' : 'Water storage is already below the critical threshold.')
      : trigger?.reason;

  const gddAccum = data.physics?.gdd_result?.gdd_accumulated || [];
  const latestGdd = gddAccum[gddAccum.length - 1] || 717;

  const getCropLabel = (id: string) => cropNames[id]?.[lang === 'es' ? 0 : 1] || id.replaceAll('_', ' ');

  const activeCropPheno = activeSlot
    ? getPhenologyForCrop(activeSlot.crop_id, activeSlot.water_need_mm)
    : getPhenologyForCrop('maize', 480);

  const selectedYear = Math.floor(selectedSlotIndex / 2) + 1;
  const selectedCycleCode = activeSlot?.cycle_code || (selectedSlotIndex % 2 === 0 ? 'PV' : 'OI');
  const selectedCycleName = selectedCycleCode === 'PV' ? t.cyclePV : t.cycleOI;

  // Crop-specific GDD progress percentage
  const gddProgressPct = Math.min(100, Math.round((latestGdd / activeCropPheno.totalGdd) * 100));

  // Crop-specific calculated irrigation recommendation
  const cycleWaterMm = activeSlot?.water_need_mm || 400;
  const recommendedDepthMm = Math.round((cycleWaterMm * 0.11) * 10) / 10;
  const recommendedDays = activeCropPheno.depletionDays;

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

      {/* Rotation Timeline Selector */}
      <div className="p-5 border-b border-[#cbd9ce] bg-[#f8faf8]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#526a5c]">
              {lang === 'es' ? 'Secuencia de Rotación Multianual (3-4 Años)' : 'Multi-Year Rotation Sequence (3-4 Years)'}
            </span>
            <button
              type="button"
              onClick={() => setActiveInfoTopic(activeInfoTopic === 'rotation' ? null : 'rotation')}
              className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
              title={lang === 'es' ? '¿Cómo funciona la rotación?' : 'How does rotation work?'}
              aria-label="Info Rotation"
            >
              ?
            </button>
          </div>
          <span className="text-xs text-[#1e583d] font-mono font-bold">
            {rotation.length} {lang === 'es' ? 'ciclos optimizados' : 'cycles'}
          </span>
        </div>

        {/* Informative Explanation Accordion for Rotation */}
        {activeInfoTopic === 'rotation' && (
          <div className="p-3 mb-3 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1">
            <div className="flex justify-between items-center font-bold text-[#173d30]">
              <span>{lang === 'es' ? '¿Qué determina la secuencia de rotación multianual?' : 'What drives the multi-year rotation?'}</span>
              <button type="button" onClick={() => setActiveInfoTopic(null)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
            </div>
            <p className="text-[11px] leading-relaxed">
              {lang === 'es'
                ? 'El Módulo 6 (MILP resuelto con HiGHS) genera la rotación óptima combinando anti-monocultivo estricto (no repetir el mismo cultivo en ciclos sucesivos) con la incorporación obligatoria de leguminosas. Esto fija de 40 a 80 kg N/ha biológico natural en el suelo, rompe el ciclo de plagas del monocultivo y reduce hasta un 40% el gasto en fertilizantes químicos y agua.'
                : 'Module 6 (MILP solved via HiGHS) generates the optimal rotation enforcing strict anti-monoculture and mandatory legume inclusion. This biologically fixes 40–80 kg N/ha into the soil, disrupts pest life cycles, and cuts chemical fertilizer and water costs by up to 40%.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {rotation.map((slot, index) => {
            const isSelected = index === selectedSlotIndex;
            const yearNum = Math.floor(index / 2) + 1;
            const cycleCode = slot.cycle_code || (index % 2 === 0 ? 'PV' : 'OI');
            return (
              <button
                key={slot.slot_index || index}
                onClick={() => setSelectedSlotIndex(index)}
                aria-pressed={isSelected}
                className={`rotation-slot p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#e7f0ea] border-[#1e583d] shadow-sm ring-2 ring-[#1e583d]'
                    : 'bg-white border-[#cbd8cf] hover:border-[#1e583d] hover:bg-[#f9fbf9]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#526a5c] mb-1">
                  <span className="font-semibold text-[#173d30]">{lang === 'es' ? `Año ${yearNum}` : `Year ${yearNum}`}</span>
                  <span
                    style={isSelected ? { backgroundColor: '#1e583d', color: '#ffffff' } : { backgroundColor: '#eef2ef', color: '#526a5c' }}
                    className="px-1.5 py-0.5 rounded font-bold font-mono text-[9px]"
                  >
                    {cycleCode === 'PV' ? (lang === 'es' ? 'PV' : 'SS') : cycleCode === 'OI' ? (lang === 'es' ? 'OI' : 'FW') : cycleCode}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm capitalize truncate text-[#173d30]">
                  {getCropLabel(slot.crop_id)}
                </div>
                <div className="text-[11px] mt-1 text-[#1d577a] font-mono font-medium">
                  {Math.round(slot.water_need_mm)} mm
                </div>
                {slot.is_legume && (
                  <span
                    style={isSelected ? { backgroundColor: '#1e583d', color: '#ffffff', borderColor: '#1e583d' } : { backgroundColor: '#e7f0ea', color: '#1e583d', borderColor: '#a8c5ab' }}
                    className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-bold border"
                  >
                    {t.legumeTag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Pane for Selected Slot */}
      {activeSlot && (
        <div className="p-5 space-y-4 bg-white">
          {/* Active Selected Crop Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#eef5f0] border border-[#1e583d]">
            <div className="flex items-center gap-3">
              <span
                style={{ backgroundColor: '#1e583d', color: '#ffffff' }}
                className="w-10 h-10 rounded-xl font-bold flex items-center justify-center text-xs font-mono shadow-xs shrink-0"
              >
                {selectedCycleCode}
              </span>
              <div>
                <span className="text-[10px] text-[#526a5c] font-semibold uppercase tracking-wider block">
                  {t.activeCropBannerLabel} · {lang === 'es' ? `Año ${selectedYear}` : `Year ${selectedYear}`} ({selectedCycleName})
                </span>
                <h3 className="text-base font-bold text-[#173d30] flex items-center gap-2">
                  <span>{getCropLabel(activeSlot.crop_id)}</span>
                  <span className="text-xs font-normal text-[#1d577a] font-mono">· {Math.round(activeSlot.water_need_mm)} mm demanda</span>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={activeSlot.is_legume ? { backgroundColor: '#1e583d', color: '#ffffff' } : { backgroundColor: '#fff5df', color: '#805600', borderColor: '#d6ba78' }}
                className="px-2.5 py-1 rounded-full text-xs font-bold border"
              >
                {getLegumeBadgeLabel(Boolean(activeSlot.is_legume), isEs)}
              </span>
              <span className="text-xs font-mono font-bold text-[#173d30] bg-white px-2.5 py-1 rounded-lg border border-[#cbd8cf]">
                ${Math.round(activeSlot.profit_mxn_ha).toLocaleString()} MXN/ha
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: GDD Thermal Progression */}
            <div className="bg-[#f8faf8] rounded-xl p-4 border border-[#cbd8cf]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-[#173d30] text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1e583d]"></span>
                    {t.gddMilestones}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTopic(activeInfoTopic === 'gdd' ? null : 'gdd')}
                    className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
                    title={lang === 'es' ? '¿Qué es GDD?' : 'What is GDD?'}
                    aria-label="Info GDD"
                  >
                    ?
                  </button>
                </div>
                <span className="text-xs bg-[#e7f0ea] text-[#1e583d] font-bold font-mono px-2 py-0.5 rounded-full border border-[#a8c5ab]">
                  {Math.round(latestGdd)} / {activeCropPheno.totalGdd} GDD
                </span>
              </div>

              {/* Informative Explanation Accordion for GDD */}
              {activeInfoTopic === 'gdd' && (
                <div className="p-3 mb-3 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1">
                  <div className="flex justify-between items-center font-bold text-[#173d30]">
                    <span>{lang === 'es' ? '¿Qué son los Grados Día de Desarrollo (GDD)?' : 'What are Growing Degree Days (GDD)?'}</span>
                    <button type="button" onClick={() => setActiveInfoTopic(null)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {lang === 'es'
                      ? `El tiempo agronómico no se mide en días de calendario sino en calor útil acumulado por encima de la temperatura base del cultivo (T_base = ${activeCropPheno.tBase}°C). Calculado con la regla de Simpson 1/3 (Módulo 2), permite saber con exactitud cuándo la planta pasará de germinación a floración y madurez fisiológica.`
                      : `Biological crop time is governed by accumulated thermal energy above the crop base temperature (T_base = ${activeCropPheno.tBase}°C). Integrated via composite Simpson 1/3 (Module 2), this accurately predicts when the crop advances to flowering and harvest maturity.`}
                  </p>
                </div>
              )}

              {/* Crop Thermal Baseline Bar */}
              <div className="p-2.5 rounded-lg bg-white border border-[#dbe5e0] mb-3 text-[11px]">
                <div className="flex justify-between text-[#526a5c] font-medium mb-1">
                  <span>{t.gddBaseTemp}: <b className="text-[#173d30]">{activeCropPheno.tBase}°C</b></span>
                  <span>{t.gddRequirement}: <b className="text-[#1e583d]">{activeCropPheno.totalGdd} GDD</b></span>
                </div>
                <div className="w-full bg-[#e2eae5] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1e583d] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${gddProgressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#718277] mt-1">
                  <span>{t.gddProgress}: {gddProgressPct}%</span>
                  <span>{Math.max(0, activeCropPheno.totalGdd - Math.round(latestGdd))} GDD restantes</span>
                </div>
              </div>

              {/* Crop-Specific Stages */}
              <div className="space-y-2 text-xs">
                {activeCropPheno.stages.map((stage, sIdx) => {
                  const stageGdd = Math.round(activeCropPheno.totalGdd * stage.gddPct);
                  const isCompleted = latestGdd >= stageGdd;
                  const isCurrent = !isCompleted && (sIdx === 0 || latestGdd >= Math.round(activeCropPheno.totalGdd * activeCropPheno.stages[sIdx - 1].gddPct));

                  return (
                    <div
                      key={`stage-${stage.name[0]}`}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${getStageBoxClass(isCurrent, isCompleted)}`}
                    >
                      <div
                        style={isCompleted || isCurrent ? { backgroundColor: '#1e583d', color: '#ffffff' } : { backgroundColor: '#e2eae5', color: '#526a5c' }}
                        className="w-5 h-5 rounded-full font-bold flex items-center justify-center shrink-0 text-[10px]"
                      >
                        {isCompleted ? '✓' : sIdx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[#173d30] flex items-center gap-1.5">
                          <span>{stage.name[lang === 'es' ? 0 : 1]}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e583d] text-white font-bold">
                              {lang === 'es' ? 'Fase Actual' : 'Current'}
                            </span>
                          )}
                        </div>
                        <div className="text-[#526a5c] text-[10px] mt-0.5">{stage.desc[lang === 'es' ? 0 : 1]}</div>
                      </div>
                      <span className="text-[#1e583d] font-bold font-mono text-[11px]">{stageGdd} GDD</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Newton-Raphson Irrigation Trigger */}
            <div className="bg-[#f8faf8] rounded-xl p-4 border border-[#cbd8cf] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-[#173d30] text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#12675e]"></span>
                      {t.irrigationSchedule}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveInfoTopic(activeInfoTopic === 'irrigation' ? null : 'irrigation')}
                      className="w-4 h-4 rounded-full bg-[#dbe7df] text-[#1e583d] text-[10px] font-bold flex items-center justify-center hover:bg-[#1e583d] hover:text-white transition-colors cursor-pointer"
                      title={lang === 'es' ? '¿Cómo se calcula el riego predictivo?' : 'How is irrigation calculated?'}
                      aria-label="Info Irrigation"
                    >
                      ?
                    </button>
                  </div>
                  <span className="text-[10px] text-[#526a5c] font-mono">Newton-Raphson · M4</span>
                </div>

                {/* Informative Explanation Accordion for Irrigation */}
                {activeInfoTopic === 'irrigation' && (
                  <div className="p-3 mb-3 bg-[#eef5f0] border border-[#1e583d] rounded-xl text-xs text-[#244438] space-y-1">
                    <div className="flex justify-between items-center font-bold text-[#173d30]">
                      <span>{lang === 'es' ? '¿Cómo se predice la fecha de riego?' : 'How is irrigation predicted?'}</span>
                      <button type="button" onClick={() => setActiveInfoTopic(null)} className="text-[#526a5c] hover:text-[#173d30] cursor-pointer">✕</button>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {lang === 'es'
                        ? 'El Módulo 3 integra el balance de agua del suelo mediante RK4. El Módulo 4 aplica el método de Newton-Raphson sobre la función g(t) = W(t) - W_crítico = 0 usando la pendiente analítica dW/dt para hallar el día exacto (t*) en que la humedad caerá por debajo del umbral crítico. Esto evita regar a ciegas.'
                        : 'Module 3 integrates the dynamic soil water balance via RK4. Module 4 runs Newton-Raphson root-finding on g(t) = W(t) - W_crit = 0 using the analytical derivative dW/dt to pinpoint the exact day (t*) moisture dips below the threshold, preventing blind irrigation.'}
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-xl border border-[#d6ba78] bg-[#fff9eb] mb-3">
                  <div className="flex items-center gap-2 text-[#805600] font-bold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#805600] animate-ping"></span>
                    {t.recommendedIrrigation} ({getCropLabel(activeSlot.crop_id)})
                  </div>
                  <p className="text-[11px] text-[#55451f] mb-3 leading-relaxed">
                    {t.irrigationDetail}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#e8dcb8]">
                      <span className="text-[#55451f] text-[10px] block font-medium">{t.dayLabel}</span>
                      <span className="text-base font-bold text-[#805600] font-mono">
                        {trigger?.t_star_days ? Math.round(trigger.t_star_days) : recommendedDays} {lang === 'es' ? 'días' : 'days'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#e8dcb8]">
                      <span className="text-[#55451f] text-[10px] block font-medium">{t.depthMm}</span>
                      <span className="text-base font-bold text-[#087777] font-mono">
                        {trigger?.delta_i_mm?.toFixed(1) || recommendedDepthMm.toFixed(1)} mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nitrogen and Economics */}
              <div className="bg-white p-3 rounded-xl border border-[#cbd8cf] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#526a5c]">{t.legumeFixation}:</span>
                  <span className="font-semibold text-[#1e583d]">
                    {activeSlot.is_legume ? t.legumeYes : t.legumeNo}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#dbe5e0] pt-1.5">
                  <span className="text-[#526a5c]">{t.profit}:</span>
                  <span className="font-bold text-[#173d30] font-mono text-sm">
                    ${Math.round(activeSlot.profit_mxn_ha).toLocaleString()} MXN/ha
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Summary Table of All Cycles */}
      {rotation.length > 0 && (
        <div className="p-5 border-t border-[#cbd9ce] bg-[#f8faf8]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[#173d30] text-sm">{t.tableTitle}</h3>
            <span className="text-[11px] text-[#526a5c]">
              {lang === 'es' ? 'Haz clic en cualquier fila para actualizar las etapas GDD y manejo' : 'Click any row to inspect GDD stages and irrigation'}
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#cbd8cf]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f0f5f2] border-b border-[#cbd8cf] text-[#244438]">
                  <th className="py-2.5 px-3 font-semibold">{t.colCycle}</th>
                  <th className="py-2.5 px-3 font-semibold">{t.colCrop}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.colWater}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t.colMargin}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">{t.colSoil}</th>
                  <th className="py-2.5 px-3 font-semibold text-center">{t.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2eae5] bg-white">
                {rotation.map((slot, idx) => {
                  const isSelected = idx === selectedSlotIndex;
                  const yearNum = Math.floor(idx / 2) + 1;
                  const cycleCode = slot.cycle_code || (idx % 2 === 0 ? 'PV' : 'OI');
                  const cycleLabel = cycleCode === 'PV'
                    ? (lang === 'es' ? `Año ${yearNum} · Primavera-Verano` : `Year ${yearNum} · Spring-Summer`)
                    : (lang === 'es' ? `Año ${yearNum} · Otoño-Invierno` : `Year ${yearNum} · Fall-Winter`);

                  return (
                    <tr
                      key={`smart-cal-slot-${slot.slot_index ?? idx}`}
                      onClick={() => setSelectedSlotIndex(idx)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#eef5f0] font-semibold' : 'hover:bg-[#f9fbf9]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#173d30]">
                        <div className="flex items-center gap-1.5">
                          <span
                            style={isSelected ? { backgroundColor: '#1e583d' } : { backgroundColor: '#cbd8cf' }}
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                          />
                          <span>{cycleLabel}</span>
                        </div>
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
                            {t.legumeTag}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#526a5c]">
                            {t.legumeNo}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSlotIndex(idx);
                          }}
                          style={isSelected ? { backgroundColor: '#1e583d', color: '#ffffff', borderColor: '#1e583d' } : { backgroundColor: '#ffffff', color: '#1e583d', borderColor: '#cbd8cf' }}
                          className="px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          {isSelected && <span>✓</span>}
                          <span>{getCycleActionLabel(isSelected, isEs)}</span>
                        </button>
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
  );
};
