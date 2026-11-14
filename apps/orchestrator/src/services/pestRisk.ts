/**
 * Module: Preventive Pest and Disease Risk Detector.
 * Evaluates moving windows of T2M, RH2M, and PRECTOTCORR to compute
 * fungal and insect vulnerability semaphores according to schemas.json.
 */

export interface WeatherWindowForPests {
  dates: string[];
  tMeanC: number[];
  rhMeanPct: number[];
  precipMm: number[];
}

export interface PestAlert {
  pestId: string;
  pestName: string;
  category: 'fungal' | 'insect' | 'bacterial';
  riskLevel: 'bajo' | 'moderado' | 'alto';
  triggerCondition: string;
  symptoms: string[];
  recommendation: string;
}

export interface PestRiskOutput {
  parcelId: string;
  evaluatedAt: string;
  overallRiskLevel: 'bajo' | 'moderado' | 'alto';
  pests: PestAlert[];
  preventiveActions: string[];
}

export function evaluatePestRisk(
  parcelId: string,
  weather: WeatherWindowForPests,
  cropId = 'maize'
): PestRiskOutput {
  const n = weather.dates.length;
  const t = weather.tMeanC;
  const rh = weather.rhMeanPct;
  const p = weather.precipMm;

  const alerts: PestAlert[] = [];

  // 1. High Humidity + Mild Temperature -> Fungal Risk (Roya / Tizón foliar)
  // Check if >= 3 days have RH >= 75% and 14 <= T <= 28
  let highHumidityCount = 0;
  for (let i = 0; i < n; i++) {
    if (rh[i] >= 75.0 && t[i] >= 14.0 && t[i] <= 28.0) {
      highHumidityCount++;
    }
  }

  if (highHumidityCount >= 3) {
    alerts.push({
      pestId: 'foliar_blight',
      pestName: 'Tizón Foliar y Mancha de Asfalto (Phyllachora maydis)',
      category: 'fungal',
      riskLevel: highHumidityCount >= 3 ? 'alto' : 'moderado',
      triggerCondition: `${highHumidityCount} días acumulados con humedad relativa > 75% y temperatura templada (15-28°C)`,
      symptoms: [
        'Pústulas circulares o alargadas en hojas inferiores',
        'Necrosis intervenal y amarillamiento prematuro',
        'Caída de área foliar fotosintética activa'
      ],
      recommendation: 'Aplicar fungicidas preventivos a base de cobre o triazoles al inicio del amacollamiento; asegurar drenaje parcelario.'
    });

    alerts.push({
      pestId: 'common_rust',
      pestName: 'Roya Común (Puccinia sorghi)',
      category: 'fungal',
      riskLevel: 'moderado',
      triggerCondition: 'Rocío matutino prolongado y humedad relativa sostenida',
      symptoms: ['Pústulas de color café rojizo en ambas caras de la hoja'],
      recommendation: 'Monitorear el tercio inferior del cultivo y evitar densidades excesivas de siembra para favorecer la aireación.'
    });
  }

  // 2. High Temperature + Low Rainfall -> Insect Risk (Gusano Cogollero / Spodoptera frugiperda)
  let warmDryDays = 0;
  for (let i = 0; i < n; i++) {
    if (t[i] >= 24.0 && p[i] < 1.0) {
      warmDryDays++;
    }
  }

  if (warmDryDays >= 4) {
    alerts.push({
      pestId: 'fall_armyworm',
      pestName: 'Gusano Cogollero (Spodoptera frugiperda)',
      category: 'insect',
      riskLevel: warmDryDays >= 7 ? 'alto' : 'moderado',
      triggerCondition: `${warmDryDays} días secos con temperaturas > 24°C favorables para oviposición y eclosión larvaria`,
      symptoms: [
        'Ventaneo y perforaciones irregulares en cogollo',
        'Presencia de aserrín fresco en las hojas tiernas',
        'Destrucción del meristemo apical'
      ],
      recommendation: 'Monitoreo diario de cogollos; instalar trampas con feromonas y liberar crisopas o aplicar Bacillus thuringiensis antes del estadio L3.'
    });
  }

  // Determine overall risk
  let overall: 'bajo' | 'moderado' | 'alto' = 'bajo';
  if (alerts.some(a => a.riskLevel === 'alto')) {
    overall = 'alto';
  } else if (alerts.some(a => a.riskLevel === 'moderado')) {
    overall = 'moderado';
  }

  const preventiveActions = [
    'Rotar parcelas con cultivos no hospederos (frijol, garbanzo, alfalfa) para romper ciclos biológicos de plagas.',
    'Evitar el exceso de fertilización nitrogenada que genera tejidos blandos susceptibles a hongos.',
    'Mantener despejadas las acequias y bordos de malezas hospedantes.'
  ];

  return {
    parcelId,
    evaluatedAt: new Date().toISOString(),
    overallRiskLevel: overall,
    pests: alerts,
    preventiveActions
  };
}
