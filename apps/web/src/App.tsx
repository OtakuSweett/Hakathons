import React, { useState, useEffect, useCallback } from 'react';
import { Language, AnalysisResponse } from './types/index.js';
import { DEMO_PRESETS_LIST, getMockAnalysis } from './services/mockData.js';
import { EarlyWarningBanner } from './components/EarlyWarningBanner.js';
import { RiskMap } from './components/RiskMap.js';
import { CropAdvisor } from './components/CropAdvisor.js';
import { ClimateSimulator } from './components/ClimateSimulator.js';
import { CropMonitor } from './components/CropMonitor.js';
import { SmartCalendar } from './components/SmartCalendar.js';
import { PestDetector } from './components/PestDetector.js';
import { EconomicEvaluation } from './components/EconomicEvaluation.js';
import { ShiftingLands } from './components/ShiftingLands.js';
import { FarmerReportsModal } from './components/FarmerReportsModal.js';

type WaterRegime = 'temporal' | 'goteo' | 'gravedad';
const stepLabels = {
  es: ['Región', 'Parcela', 'Cultivos', 'Análisis'],
  en: ['Region', 'Field', 'Crops', 'Analysis']
};
const cropNames: Record<Language, Record<string, string>> = {
  es: {
    maize: 'Maíz', sorghum: 'Sorgo', wheat: 'Trigo', barley: 'Cebada', beans: 'Frijol', chickpea: 'Garbanzo',
    alfalfa: 'Alfalfa', broccoli: 'Brócoli', tomato: 'Jitomate', onion: 'Cebolla', garlic: 'Ajo', strawberry: 'Fresa',
    oats: 'Avena', vetch: 'Veza común', chili_pepper: 'Chile verde', asparagus: 'Espárrago', soybean: 'Soya',
    sunflower: 'Girasol', potato: 'Papa', canola: 'Canola'
  },
  en: {
    maize: 'Maize', sorghum: 'Sorghum', wheat: 'Wheat', barley: 'Barley', beans: 'Dry beans', chickpea: 'Chickpea',
    alfalfa: 'Alfalfa', broccoli: 'Broccoli', tomato: 'Tomato', onion: 'Onion', garlic: 'Garlic', strawberry: 'Strawberry',
    oats: 'Oats', vetch: 'Common vetch', chili_pepper: 'Green chili', asparagus: 'Asparagus', soybean: 'Soybean',
    sunflower: 'Sunflower', potato: 'Potato', canola: 'Canola'
  }
};

const cropLabel = (cropId: string, language: Language) => cropNames[language][cropId] || cropId.replaceAll('_', ' ');
const presetCropSelection = (presetId: string, analysis: AnalysisResponse) => {
  const presetCrop = DEMO_PRESETS_LIST.find((preset) => preset.presetId === presetId)?.cropId;
  if (!presetCrop) return [];
  const summary = analysis.optimization?.presolver_summary;
  const available = [...(summary?.feasible_crop_ids || []), ...(summary?.discarded || []).map((crop) => crop.crop_id)];
  return available.includes(presetCrop) ? [presetCrop] : [];
};

const cropGlyph = (cropId: string) => {
  if (['maize', 'sorghum', 'wheat', 'barley', 'oats', 'canola', 'sunflower'].includes(cropId)) {
    return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V7m0 7c-4-1-6-4-6-7 4 0 6 3 6 7Zm0 5c4-1 6-4 6-7-4 0-6 3-6 7Zm-6 8h12M12 11l-2-2m10 8 2-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 4c-2 2-2 4 0 6 2-2 2-4 0-6Z" fill="currentColor"/></svg>;
  }
  if (['beans', 'chickpea', 'soybean', 'vetch', 'alfalfa'].includes(cropId)) {
    return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V11m0 6c-5 0-8-3-8-7 5 0 8 3 8 7Zm0 4c5 0 8-3 8-7-5 0-8 3-8 7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 5c-3 2-3 5 0 7 3-2 3-5 0-7Z" fill="currentColor"/></svg>;
  }
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V14m0 6C9 20 6 16 7 10c6 0 9 3 9 10Zm0-3c7 0 10-4 9-10-6 0-9 3-9 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 5c-2 2-2 4 0 6 2-2 2-4 0-6Z" fill="currentColor"/></svg>;
};

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('agro-dss-language');
    if (saved === 'es' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  });
  const [step, setStep] = useState(0);
  const [selectedPresetId, setSelectedPresetId] = useState('el_marques_qro');
  const [mapRegionCenter, setMapRegionCenter] = useState({ lat: 20.5922, lon: -100.1972 });
  const [isOfflineMode, setIsOfflineMode] = useState(() => !navigator.onLine);
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalysisResponse>(() => getMockAnalysis('el_marques_qro'));
  const [selectedCoordinates, setSelectedCoordinates] = useState(() => getMockAnalysis('el_marques_qro').coordinates);
  const [dataSource, setDataSource] = useState<'live' | 'benchmark'>('benchmark');
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [areaHa, setAreaHa] = useState(15);
  const [waterRegime, setWaterRegime] = useState<WaterRegime>('goteo');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([DEMO_PRESETS_LIST[0].cropId]);
  const [parcelRejected, setParcelRejected] = useState(false);
  const [mapRequestFailed, setMapRequestFailed] = useState(false);
  const [cookieNotice, setCookieNotice] = useState(() => localStorage.getItem('agro-dss-notice') !== 'accepted');
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('agro-dss-language', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => {
      setBrowserOnline(false);
      setIsOfflineMode(true);
      setServiceAvailable(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadAnalysis = useCallback(async (presetId: string, forceOffline: boolean) => {
    setIsLoading(true);
    if (forceOffline) {
      const mock = getMockAnalysis(presetId);
      setData(mock);
      setSelectedCoordinates(mock.coordinates);
      setDataSource('benchmark');
      setSelectedCrops(presetCropSelection(presetId, mock));
      const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === presetId);
      if (preset) setMapRegionCenter({ lat: preset.lat, lon: preset.lon });
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/api/analyze?presetId=${encodeURIComponent(presetId)}`);
      if (!res.ok) throw new Error('Analysis unavailable');
      const json = await res.json() as AnalysisResponse;
      setData(json);
      setSelectedCoordinates(json.coordinates);
      setDataSource('benchmark');
      setServiceAvailable(true);
      setSelectedCrops(presetCropSelection(presetId, json));
      const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === presetId);
      if (preset) setMapRegionCenter({ lat: preset.lat, lon: preset.lon });
    } catch {
      const mock = getMockAnalysis(presetId);
      setData(mock);
      setSelectedCoordinates(mock.coordinates);
      setDataSource('benchmark');
      setServiceAvailable(false);
      setSelectedCrops(presetCropSelection(presetId, mock));
      const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === presetId);
      if (preset) setMapRegionCenter({ lat: preset.lat, lon: preset.lon });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnalysis(selectedPresetId, isOfflineMode); }, [selectedPresetId, isOfflineMode, loadAnalysis]);

  const handleMapCoordinateSelect = (lat: number, lon: number) => {
    setSelectedCoordinates({ lat, lon });
    setParcelRejected(false);
    setMapRequestFailed(false);
    setLocationMessage('');
  };

  const analyzeSelectedLocation = async () => {
    const { lat, lon } = selectedCoordinates;
    setIsLoading(true);
    setLocationMessage('');
    setParcelRejected(false);
    setMapRequestFailed(false);
    try {
      const res = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcel_id: `custom_${lat.toFixed(4)}_${lon.toFixed(4)}`, lat, lon, crop_id: selectedCrops[0] || 'maize', area_ha: areaHa, source: 'live' })
      });
      if (res.status === 422) {
        const body = await res.json();
        setParcelRejected(true);
        setLocationMessage(body?.error?.message || (lang === 'es' ? 'Esta ubicación no parece tener suelo agrícola.' : 'This location does not appear to have arable soil.'));
        return;
      }
      if (!res.ok) throw new Error('Live analysis unavailable');
      const analysis = await res.json() as AnalysisResponse;
      setData(analysis);
      setSelectedCoordinates(analysis.coordinates);
      setDataSource('live');
      setServiceAvailable(true);
      setSelectedCrops([]);
      setParcelRejected(false);
    } catch {
      setMapRequestFailed(true);
      setServiceAvailable(false);
      setLocationMessage(lang === 'es' ? 'El análisis no respondió. El punto sigue marcado; puedes reintentar o continuar con el benchmark guardado.' : 'The analysis did not respond. Your point is still marked; retry or continue with the saved benchmark.');
    } finally { setIsLoading(false); }
  };

  const handleSimulate = async (deltaPrecip: number, deltaTemp: number, eonetPulse: boolean) => {
    setIsLoading(true);
    try {
      if (isOfflineMode) throw new Error('Offline simulation');
      const res = await fetch('http://localhost:3000/api/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId: data.parcel_id, deltaPrecipPct: deltaPrecip, deltaTempC: deltaTemp, injectEonetPulse: eonetPulse })
      });
      if (!res.ok) throw new Error('Simulation unavailable');
      const simData = await res.json();
      setData((prev) => ({ ...prev, physics: simData.physics || prev.physics, optimization: simData.optimization || prev.optimization }));
    } catch {
      setData((prev) => {
        const wb = prev.physics.water_balance;
        const factor = 1 + deltaPrecip / 100;
        const newW = wb.w_mm.map((w, i) => Math.max(40, w * factor + (i === 15 && eonetPulse ? 65 : 0) - deltaTemp * 1.5));
        const isCritical = newW.some((w) => w < prev.soil_hydraulics.critical_water_mm);
        return { ...prev, physics: { ...prev.physics, water_balance: { ...wb, w_mm: newW }, irrigation_trigger: { t_star_days: isCritical ? 9 : null, delta_i_mm: isCritical ? 48 : null, reason: isCritical ? 'Stress simulated by what-if scenario' : null } } };
      });
    } finally { setIsLoading(false); }
  };

  const toggleCrop = (cropId: string) => setSelectedCrops((current) => current.includes(cropId) ? current.filter((id) => id !== cropId) : [...current, cropId]);

  const useRegionalBenchmark = () => {
    const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === selectedPresetId);
    const benchmark = getMockAnalysis(selectedPresetId);
    setData(benchmark);
    setSelectedCoordinates(benchmark.coordinates);
    setDataSource('benchmark');
    setMapRegionCenter({ lat: preset?.lat ?? benchmark.coordinates.lat, lon: preset?.lon ?? benchmark.coordinates.lon });
    setSelectedCrops(presetCropSelection(selectedPresetId, benchmark));
    setParcelRejected(false);
    setMapRequestFailed(false);
    setIsOfflineMode(true);
    setLocationMessage(text('Continuamos con el benchmark regional. El punto del mapa volvió al centro de esa parcela de demostración.', 'Using the regional benchmark. The map returned to the center of that demonstration field.'));
    setStep(2);
  };

  const toggleDataMode = () => {
    if (isOfflineMode) {
      setIsOfflineMode(false);
      return;
    }
    const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === selectedPresetId);
    const benchmark = getMockAnalysis(selectedPresetId);
    setIsOfflineMode(true);
    setData(benchmark);
    setSelectedCoordinates(benchmark.coordinates);
    setDataSource('benchmark');
    setMapRegionCenter({ lat: preset?.lat ?? benchmark.coordinates.lat, lon: preset?.lon ?? benchmark.coordinates.lon });
    setSelectedCrops(presetCropSelection(selectedPresetId, benchmark));
    setParcelRejected(false);
    setMapRequestFailed(false);
  };

  const applyCropSelection = async () => {
    if (!selectedCrops.length) return;
    if (isOfflineMode) {
      setStep(3);
      return;
    }
    setIsLoading(true);
    setLocationMessage('');
    try {
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcel_id: data.parcel_id,
          lat: data.coordinates.lat,
          lon: data.coordinates.lon,
          source: data.parcel_id.startsWith('custom_') ? 'live' : 'preset',
          crop_id: selectedCrops[0],
          candidate_crops: selectedCrops,
          area_ha: areaHa
        })
      });
      if (response.status === 422) {
        const body = await response.json();
        setParcelRejected(true);
        setLocationMessage(body?.error?.message || (lang === 'es' ? 'No se pudo validar la parcela.' : 'The field could not be validated.'));
        setStep(1);
        return;
      }
      if (!response.ok) throw new Error('Analysis unavailable');
      setData(await response.json() as AnalysisResponse);
      setServiceAvailable(true);
      setDataSource(data.parcel_id.startsWith('custom_') ? 'live' : 'benchmark');
      setStep(3);
    } catch {
      setServiceAvailable(false);
      setLocationMessage(lang === 'es' ? 'No se pudo calcular el análisis con estos cultivos. Intenta otra vez o activa el modo sin conexión para consultar el benchmark.' : 'The analysis could not be calculated for these crops. Try again or switch to offline mode to view the benchmark.');
    } finally {
      setIsLoading(false);
    }
  };
  const currentPreset = DEMO_PRESETS_LIST.find((p) => p.presetId === selectedPresetId);
  const currentPresetName = data.parcel_id.startsWith('custom_')
    ? (lang === 'es' ? 'Parcela seleccionada' : 'Selected field')
    : currentPreset?.parcelName || data.parcel_id;
  const title = lang === 'es' ? 'Planifica con el clima de tu parcela' : 'Plan with the climate of your field';
  const subtitle = lang === 'es' ? 'Un diagnóstico agronómico, construido paso a paso con datos satelitales y del suelo.' : 'An agronomic assessment, built step by step from satellite and soil data.';
  const text = (es: string, en: string) => lang === 'es' ? es : en;
  const sourceLabel = !browserOnline
    ? text('Sin conexión', 'Offline')
    : isOfflineMode
      ? text('Demo local activa', 'Local demo active')
      : serviceAvailable === false
        ? text('Servicio no disponible', 'Service unavailable')
        : dataSource === 'live'
          ? text('Análisis en vivo', 'Live analysis')
          : serviceAvailable
            ? text('Benchmark regional', 'Regional benchmark')
            : text('Conectando…', 'Connecting…');
  const sourceDescription = isOfflineMode
    ? text('Paquete guardado · simulador local', 'Saved package · local simulator')
    : serviceAvailable === false
      ? text('El análisis no respondió; puedes usar la demo.', 'Analysis did not respond; use the local demo.')
      : dataSource === 'live'
        ? text('Coordenadas consultadas en vivo', 'Coordinates queried live')
        : text('Datos de referencia de la región', 'Regional reference data');
  const sameAsAnalyzed = Math.abs(selectedCoordinates.lat - data.coordinates.lat) < 0.00001
    && Math.abs(selectedCoordinates.lon - data.coordinates.lon) < 0.00001;
  const needsLiveAnalysis = !isOfflineMode && !sameAsAnalyzed;
  const needsBenchmarkReset = isOfflineMode && !sameAsAnalyzed;

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage(text('Este navegador no ofrece ubicación. Elige una región de la lista.', 'Location is unavailable in this browser. Choose a region from the list.')); return; }
    setLocationMessage(text('Esperando permiso de ubicación…', 'Waiting for location permission…'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const inRegion = Math.abs(coords.latitude - mapRegionCenter.lat) <= 0.55
          && Math.abs(coords.longitude - mapRegionCenter.lon) <= 0.7;
        if (!inRegion) {
          setLocationMessage(text('Tu ubicación está fuera de la región seleccionada. Cambia la región para marcarla.', 'Your location is outside the selected region. Change region to mark it.'));
          return;
        }
        void handleMapCoordinateSelect(coords.latitude, coords.longitude);
      },
      () => setLocationMessage(text('No se obtuvo ubicación. Puedes continuar eligiendo un punto en el mapa.', 'Location was not shared. You can choose a point on the map instead.')),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <header className="site-header">
        <a href="#inicio" className="brand" aria-label="Campo Claro, inicio">
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M7 23c7-1 12-6 14-15 5 8 3 17-6 19-3 1-6 0-8-4Z" stroke="currentColor" strokeWidth="2"/><path d="M8 26c3-5 7-8 13-11" stroke="currentColor" strokeWidth="2"/></svg></span>
          <span><strong>Campo Claro</strong><small>{text('Decisiones para cada parcela', 'Decisions for every field')}</small></span>
        </a>
        <div className="header-actions">
          <div className={`source-control ${isOfflineMode || !browserOnline || serviceAvailable === false ? 'local' : ''}`}>
            <span className="source-indicator" aria-hidden="true"><i /></span>
            <span className="source-copy"><strong>{sourceLabel}</strong><small>{sourceDescription}</small></span>
            <button className="source-action" type="button" onClick={toggleDataMode}>{isOfflineMode ? text('Probar conexión', 'Try connection') : text('Demo local', 'Local demo')}</button>
          </div>
          <label className="language-picker" aria-label={text('Idioma de la interfaz', 'Interface language')}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 12h17M12 3c2.2 2.4 3.2 5.4 3.2 9s-1 6.6-3.2 9c-2.2-2.4-3.2-5.4-3.2-9S9.8 5.4 12 3Z" stroke="currentColor" strokeWidth="1.4"/></svg>
            <select value={lang} onChange={(event) => setLang(event.target.value as Language)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            <svg className="language-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </label>
          <button className="report-button" type="button" onClick={() => setIsReportModalOpen(true)}>{text('Reporte de campo', 'Field report')}</button>
        </div>
      </header>

      <main id="inicio" className="page-wrap">
        <section className="intro-row">
          <div className="intro-copy-block"><p className="eyebrow">{text('HERRAMIENTA DE PLANIFICACIÓN AGRÍCOLA', 'FIELD PLANNING TOOL')}</p><h1>{title}</h1><p className="intro-copy">{subtitle}</p></div>
          <div className="topographic-art" aria-hidden="true"><svg viewBox="0 0 440 190" fill="none"><path d="M-18 147c44-37 70-35 111-4 49 37 82 34 118-10 39-48 84-47 124-6 35 35 66 36 123 1M-20 126c49-42 80-41 124-8 44 33 72 30 105-11 43-54 94-55 139-11 35 34 66 35 111 8M-22 104c57-46 91-45 136-12 39 29 60 23 94-19 48-60 106-61 155-15 33 31 62 34 102 15M-20 81c61-48 99-47 146-15 34 23 51 15 85-26 52-62 116-66 169-17 31 29 58 32 92 23M-15 57c67-48 108-48 157-17 31 20 45 8 80-32 57-64 127-68 183-17 27 24 50 30 78 28" stroke="currentColor" strokeWidth="1.4"/></svg></div>
          <div className="season-note"><span className="season-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 24c7-1 13-7 15-17 5 9 2 18-6 21-4 1-7 0-9-4Z" stroke="currentColor" strokeWidth="1.7"/><path d="M7 27c4-5 8-9 14-13" stroke="currentColor" strokeWidth="1.7"/></svg></span><span><b>{text('Perspectiva estacional', 'Seasonal outlook')}</b><small>{text('Clima · suelo · agua · rotación', 'Climate · soil · water · rotation')}</small></span></div>
        </section>

        <nav className="stepper" aria-label={text('Pasos del análisis', 'Analysis steps')}>
          {stepLabels[lang].map((label, index) => <button key={label} type="button" className={`step-item ${step === index ? 'active' : ''} ${step > index ? 'complete' : ''}`} onClick={() => index <= step && setStep(index)} aria-current={step === index ? 'step' : undefined}><span className="step-number">{step > index ? '✓' : index + 1}</span><span>{label}</span></button>)}
          <span className="step-progress" aria-hidden="true"><i style={{ width: `${(step / 3) * 100}%` }} /></span>
        </nav>

        {isLoading && <div className="loading-line" role="status"><i />{text('Actualizando el análisis de la parcela…', 'Updating field analysis…')}</div>}

        {step === 0 && <section className="setup-panel region-panel">
          <div className="panel-copy"><span className="step-kicker">{text('PRIMERO', 'FIRST')}</span><h2>{text('¿Dónde está tu parcela?', 'Where is your field?')}</h2><p>{text('Selecciona una región demostrativa para cargar sus condiciones de suelo y clima. Puedes usar otro punto dentro de esa región en el siguiente paso.', 'Choose a demonstration region to load its soil and climate conditions. You can choose another point within that region in the next step.')}</p></div>
          <div className="region-options" role="radiogroup" aria-label={text('Seleccionar región', 'Choose region')}>
            {DEMO_PRESETS_LIST.map((preset) => <button key={preset.presetId} type="button" role="radio" aria-checked={selectedPresetId === preset.presetId} onClick={() => {
              const benchmark = getMockAnalysis(preset.presetId);
              setSelectedPresetId(preset.presetId);
              setMapRegionCenter({ lat: preset.lat, lon: preset.lon });
              setData(benchmark);
      setSelectedCoordinates(benchmark.coordinates);
              setSelectedCrops(presetCropSelection(preset.presetId, benchmark));
            }} className={`region-option ${selectedPresetId === preset.presetId ? 'selected' : ''}`}>
              <span className="region-pin" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7"/></svg></span>
              <span className="region-info"><b>{preset.region}</b><small>{preset.country} · {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°</small><em>{cropLabel(preset.cropId, lang)} · {preset.areaHa} ha</em></span>{selectedPresetId === preset.presetId && <span className="region-picked">{text('Elegida', 'Selected')}</span>}<span className="radio-mark" />
            </button>)}
          </div>
          <div className="panel-foot"><p>{text('También puedes usar tu ubicación actual; el navegador pedirá permiso antes de compartirla.', 'You can also use your current location; your browser will ask before sharing it.')}</p><button className="text-action" type="button" onClick={requestLocation}>{text('Usar mi ubicación', 'Use my location')} <span aria-hidden="true">↗</span></button></div>
          {locationMessage && <p className="inline-message" role="status">{locationMessage}</p>}
          <div className="panel-actions"><span>{isOfflineMode
            ? text('Demo local: 4 parcelas guardadas y simulación climática en el navegador.', 'Local demo: 4 saved fields and climate simulation in your browser.')
            : serviceAvailable === false
              ? text('El servicio no respondió. Puedes recorrer el flujo con datos regionales guardados.', 'The service did not respond. You can continue with saved regional data.')
              : text('Elige uno de los 4 benchmarks regionales para explorar el flujo.', 'Choose one of 4 regional benchmarks to explore the workflow.')}</span><button className="primary-button" type="button" onClick={() => setStep(1)}>{text('Continuar a la parcela', 'Continue to field')} <span aria-hidden="true">→</span></button></div>
        </section>}

        {step === 1 && <section className="setup-panel map-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('SEGUNDO', 'SECOND')}</span><h2>{text('Marca tu parcela en el mapa', 'Mark your field on the map')}</h2><p>{text('El mapa permanece dentro de la región seleccionada. Haz clic para ubicar el centro de tu parcela.', 'The map stays within your selected region. Click to place the center of your field.')}</p></div><button className="text-action" type="button" onClick={() => setStep(0)}>← {text('Cambiar región', 'Change region')}</button></div>
          {locationMessage && <div className="inline-message" role="status"><span>{locationMessage}</span>{mapRequestFailed && <button type="button" className="fallback-button" onClick={useRegionalBenchmark}>{text('Usar demo guardada de esta región', 'Use saved demo for this region')}</button>}</div>}
          {(needsLiveAnalysis || needsBenchmarkReset) && !locationMessage && <p className="map-selection-hint" role="status">{needsLiveAnalysis
            ? text('Punto marcado. Analízalo para consultar sus datos; puedes cambiar el punto sin esperar.', 'Point marked. Analyze it to load its data; you can move the marker without waiting.')
            : text('La demo local solo tiene datos del punto guardado. Vuelve a ese punto para continuar con datos coherentes.', 'The local demo only has data for its saved point. Return there to continue with matching data.')}</p>}
          <RiskMap lat={selectedCoordinates.lat} lon={selectedCoordinates.lon} regionLat={mapRegionCenter.lat} regionLon={mapRegionCenter.lon} parcelName={currentPresetName} eonetAlerts={data.eonet_hazard_alerts || []} areaHa={areaHa} onAreaChange={setAreaHa} waterRegime={waterRegime} onWaterRegimeChange={setWaterRegime} lang={lang} onMapClick={handleMapCoordinateSelect} />
          <div className="panel-actions"><span className="coordinate-readout">{text('Centro seleccionado', 'Selected center')} <b>{selectedCoordinates.lat.toFixed(4)}°, {selectedCoordinates.lon.toFixed(4)}°</b></span>{needsLiveAnalysis
            ? <button className="primary-button" type="button" disabled={isLoading || parcelRejected} onClick={() => void analyzeSelectedLocation()}>{mapRequestFailed ? text('Reintentar análisis', 'Retry analysis') : text('Analizar este punto', 'Analyze this point')} <span aria-hidden="true">→</span></button>
            : needsBenchmarkReset
              ? <button className="primary-button" type="button" onClick={() => { handleMapCoordinateSelect(data.coordinates.lat, data.coordinates.lon); }}>{text('Volver al punto guardado', 'Return to saved point')} <span aria-hidden="true">↺</span></button>
              : <button className="primary-button" type="button" disabled={parcelRejected} onClick={() => setStep(2)}>{text('Elegir cultivos', 'Choose crops')} <span aria-hidden="true">→</span></button>}</div>
        </section>}

        {step === 2 && <section className="setup-panel crop-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('TERCERO', 'THIRD')}</span><h2>{text('¿Qué cultivas hoy?', 'What do you grow today?')}</h2><p>{text('Marca los cultivos que ya están en tu parcela. Los no compatibles se enviarán al análisis para mostrarte el motivo.', 'Mark the crops already in your field. Any that do not fit will be checked and explained in the analysis.')}</p></div><span className="soil-chip">pH {data.soil_hydraulics.soil_ph.toFixed(1)} · {data.soil_hydraulics.usda_texture_class}</span></div>
          <div className="crop-list-heading"><h3>{text('Cultivos del catálogo', 'Crops in catalog')}</h3><span>{selectedCrops.length} {text('seleccionados', 'selected')}</span></div>
          <div className="crop-choices">{[...new Set([...(data.optimization?.presolver_summary?.feasible_crop_ids || []), ...(data.optimization?.presolver_summary?.discarded || []).map((crop) => crop.crop_id)])].map((cropId) => {
            const warning = data.optimization?.presolver_summary?.discarded?.some((crop) => crop.crop_id === cropId) || false;
            const chosen = selectedCrops.includes(cropId);
            return <button key={cropId} type="button" aria-pressed={chosen} onClick={() => toggleCrop(cropId)} className={`crop-choice ${chosen ? 'chosen' : ''} ${warning ? 'needs-review' : ''}`}>
              <span className="crop-glyph">{cropGlyph(cropId)}</span>
              <span className="crop-copy"><b>{cropLabel(cropId, lang)}</b><small>{chosen ? text('En mi parcela', 'In my field') : warning ? text('Revisar compatibilidad', 'Check suitability') : text('Agregar a mi parcela', 'Add to my field')}</small></span>
              <span className="crop-check" aria-hidden="true">{chosen ? '✓' : '+'}</span>
            </button>;
          })}</div>
          <p className="selection-note">{!selectedCrops.length
            ? text('Selecciona al menos un cultivo para continuar.', 'Select at least one crop to continue.')
            : isOfflineMode
              ? text('En demo local, tus cultivos quedan como contexto; la rotación mostrada pertenece al benchmark regional.', 'In the local demo, your crops are saved as context; the displayed rotation belongs to the regional benchmark.')
              : text('El análisis se limitará a los cultivos que marcaste.', 'The analysis will be limited to the crops you selected.')}</p>
          {(data.optimization?.presolver_summary?.discarded?.length || 0) > 0 && <details className="discarded-list"><summary>{text('Ver opciones no recomendadas', 'See crops not recommended')}</summary><p>{data.optimization.presolver_summary.discarded.map((crop) => `${crop.crop_id}: ${lang === 'es' ? crop.reason_text_es : crop.reason_text_en}`).join(' · ')}</p></details>}
          <div className="panel-actions"><button className="text-action" type="button" onClick={() => setStep(1)}>← {text('Volver al mapa', 'Back to map')}</button><button className="primary-button" type="button" disabled={!selectedCrops.length || isLoading} onClick={() => void applyCropSelection()}>{isOfflineMode ? text('Ver benchmark guardado', 'View saved benchmark') : text('Calcular análisis', 'Calculate field analysis')} <span aria-hidden="true">→</span></button></div>
        </section>}

        {step === 3 && <>
          {isOfflineMode && <div className="offline-note" role="status"><strong>{text('Demo local', 'Local demo')}</strong><span>{text('El paquete conserva suelo, clima y rotación regional. El simulador climático calcula escenarios aquí mismo; para analizar coordenadas nuevas o recalcular cultivos, vuelve a conectar.', 'The package includes regional soil, climate, and rotation data. The climate simulator runs scenarios here; reconnect to analyze new coordinates or recalculate crop choices.')}</span></div>}
          <div className="analysis-heading"><div><span className="step-kicker">{text('ANÁLISIS DE PARCELA', 'FIELD ANALYSIS')}</span><h2>{currentPresetName}</h2><p>{data.coordinates.lat.toFixed(4)}°, {data.coordinates.lon.toFixed(4)}° <span>·</span> {areaHa.toFixed(1)} ha <span>·</span> {selectedCrops.map((crop) => crop.replaceAll('_', ' ')).join(', ') || text('sin cultivos seleccionados', 'no crops selected')}</p></div><button className="outline-button" type="button" onClick={() => setStep(1)}>{text('Editar parcela', 'Edit field')}</button></div>
          <EarlyWarningBanner trigger={data.physics?.irrigation_trigger || { t_star_days: null, delta_i_mm: null, reason: null }} eonetCount={data.eonet_hazard_alerts?.length || 0} meanTempC={data.climate_summary?.mean_temperature_c || 21} lang={lang} />
          <ShiftingLands data={data} areaHa={areaHa} waterRegime={waterRegime} lang={lang} />
          <section className="analysis-grid main-analysis-grid">
            <div className="span-7"><RiskMap lat={data.coordinates.lat} lon={data.coordinates.lon} regionLat={mapRegionCenter.lat} regionLon={mapRegionCenter.lon} parcelName={currentPresetName} eonetAlerts={data.eonet_hazard_alerts || []} areaHa={areaHa} onAreaChange={setAreaHa} waterRegime={waterRegime} onWaterRegimeChange={setWaterRegime} lang={lang} onMapClick={(lat, lon) => { handleMapCoordinateSelect(lat, lon); setStep(1); }} /></div>
            <div className="span-5"><CropAdvisor viableCropIds={data.optimization?.presolver_summary?.feasible_crop_ids || []} discarded={data.optimization?.presolver_summary?.discarded || []} soilPh={data.soil_hydraulics?.soil_ph || 6.8} lang={lang} /></div>
          </section>
          <section className="analysis-grid"><div className="span-7"><CropMonitor data={data} lang={lang} /></div><div className="span-5"><ClimateSimulator onSimulate={handleSimulate} isLoading={isLoading} lang={lang} /></div></section>
          <section className="analysis-grid"><div className="span-7"><SmartCalendar data={data} lang={lang} /></div><div className="span-5"><PestDetector data={data} lang={lang} /></div></section>
          <EconomicEvaluation data={data} lang={lang} />
        </>}
      </main>

      {cookieNotice && <aside className="consent-note" aria-label={text('Aviso de privacidad', 'Privacy notice')}><p>{text('Guardamos solo tu idioma y este aviso en el navegador. La ubicación se comparte únicamente cuando la solicitas; consulta nuestros', 'We only store your language and this notice in the browser. Location is shared only when you request it; read our')} <button type="button" className="inline-link" onClick={() => setLocationMessage(text('Condiciones de uso: las recomendaciones son orientativas y deben contrastarse con asesoría agronómica local antes de invertir o sembrar. Privacidad: las coordenadas se envían al orquestador para generar el análisis que solicitas. Solo guardamos localmente el idioma y este aviso; no usamos cookies de seguimiento.', 'Terms of use: recommendations are guidance and should be checked with local agronomic advice before planting or investing. Privacy: coordinates are sent to the orchestrator to generate the analysis you request. Only language and this notice are stored locally; no tracking cookies are used.'))}>{text('términos y privacidad', 'terms and privacy')}</button>.</p><button type="button" className="consent-accept" onClick={() => { localStorage.setItem('agro-dss-notice', 'accepted'); setCookieNotice(false); }}>{text('Entendido', 'Got it')}</button></aside>}
      <footer className="site-footer"><span>Campo Claro <span>·</span> {text('Planificación agrícola informada', 'Evidence-led field planning')}</span><span>NASA POWER · SoilGrids · EONET · FAO-56</span><button type="button" onClick={() => setLocationMessage(text('Condiciones de uso: recomendaciones orientativas; verifica decisiones agronómicas en tu contexto local. Privacidad: coordenadas enviadas al orquestador para el análisis solicitado. Idioma y aviso se guardan localmente. No usamos cookies de seguimiento.', 'Terms: recommendations are guidance; verify agronomic decisions in local context. Privacy: coordinates are sent to the orchestrator for the requested analysis. Language and notice are stored locally. No tracking cookies are used.'))}>{text('Términos y privacidad', 'Terms and privacy')}</button></footer>
      <FarmerReportsModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} lat={data.coordinates.lat} lon={data.coordinates.lon} parcelId={data.parcel_id} lang={lang} />
      {locationMessage && step !== 1 && <div className="toast-message" role="status"><span>{locationMessage}</span><button type="button" onClick={() => setLocationMessage('')} aria-label={text('Cerrar aviso', 'Dismiss notice')}>×</button></div>}
    </div>
  );
};
