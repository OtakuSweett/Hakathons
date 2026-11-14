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

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('agro-dss-language');
    if (saved === 'es' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  });
  const [step, setStep] = useState(0);
  const [selectedPresetId, setSelectedPresetId] = useState('el_marques_qro');
  const [mapRegionCenter, setMapRegionCenter] = useState({ lat: 20.5922, lon: -100.1972 });
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [data, setData] = useState<AnalysisResponse>(() => getMockAnalysis('el_marques_qro'));
  const [dataSource, setDataSource] = useState<'live' | 'benchmark'>('benchmark');
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [areaHa, setAreaHa] = useState(15);
  const [waterRegime, setWaterRegime] = useState<WaterRegime>('goteo');
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['wheat']);
  const [parcelRejected, setParcelRejected] = useState(false);
  const [cookieNotice, setCookieNotice] = useState(() => localStorage.getItem('agro-dss-notice') !== 'accepted');
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('agro-dss-language', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const loadAnalysis = useCallback(async (presetId: string, forceOffline: boolean) => {
    setIsLoading(true);
    if (forceOffline) {
      const mock = getMockAnalysis(presetId);
      setData(mock);
      setDataSource('benchmark');
      setSelectedCrops(mock.optimization?.presolver_summary?.feasible_crop_ids?.slice(0, 2) || []);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/api/analyze?presetId=${encodeURIComponent(presetId)}`);
      if (!res.ok) throw new Error('Analysis unavailable');
      const json = await res.json() as AnalysisResponse;
      setData(json);
      setDataSource('benchmark');
      setSelectedCrops(json.optimization?.presolver_summary?.feasible_crop_ids?.slice(0, 2) || []);
    } catch {
      const mock = getMockAnalysis(presetId);
      setData(mock);
      setDataSource('benchmark');
      setSelectedCrops(mock.optimization?.presolver_summary?.feasible_crop_ids?.slice(0, 2) || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnalysis(selectedPresetId, isOfflineMode); }, [selectedPresetId, isOfflineMode, loadAnalysis]);

  const handleMapCoordinateSelect = async (lat: number, lon: number) => {
    if (isOfflineMode) {
      setParcelRejected(true);
      setDataSource('benchmark');
      setData((prev) => ({ ...prev, coordinates: { lat, lon }, parcel_id: `custom_${lat.toFixed(4)}_${lon.toFixed(4)}` }));
      setLocationMessage(lang === 'es' ? 'Modo sin conexión: se muestra el benchmark regional, no un análisis calculado para estas coordenadas.' : 'Offline mode: the regional benchmark is shown, not an analysis calculated for these coordinates.');
      return;
    }
    setIsLoading(true);
    setLocationMessage('');
    setParcelRejected(false);
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
      setDataSource('live');
      setSelectedCrops(analysis.optimization?.presolver_summary?.feasible_crop_ids?.slice(0, 2) || []);
      setParcelRejected(false);
    } catch {
      setData((prev) => ({ ...prev, coordinates: { lat, lon }, parcel_id: `custom_${lat.toFixed(4)}_${lon.toFixed(4)}` }));
      setParcelRejected(true);
      setDataSource('benchmark');
      setLocationMessage(lang === 'es' ? 'Análisis en vivo no disponible. Se conserva la ubicación; los indicadores siguen usando el benchmark seleccionado.' : 'Live analysis unavailable. Location is saved; indicators still use the selected benchmark.');
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
      setDataSource(data.parcel_id.startsWith('custom_') ? 'live' : 'benchmark');
      setStep(3);
    } catch {
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

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage(text('Este navegador no ofrece ubicación. Elige una región de la lista.', 'Location is unavailable in this browser. Choose a region from the list.')); return; }
    setLocationMessage(text('Esperando permiso de ubicación…', 'Waiting for location permission…'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapRegionCenter({ lat: coords.latitude, lon: coords.longitude });
        void handleMapCoordinateSelect(coords.latitude, coords.longitude);
        setLocationMessage('');
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
          <span className={`source-status ${dataSource !== 'live' ? 'offline' : ''}`}><i />{dataSource === 'live' ? text('Análisis en vivo', 'Live analysis') : text(isOfflineMode ? 'Benchmark sin conexión' : 'Benchmark regional', isOfflineMode ? 'Offline benchmark' : 'Regional benchmark')}</span>
          <button className="plain-button" type="button" onClick={() => setIsOfflineMode((v) => !v)}>{isOfflineMode ? text('Usar datos en vivo', 'Use live data') : text('Modo sin conexión', 'Offline mode')}</button>
          <button className="language-button" type="button" onClick={() => setLang((v) => v === 'es' ? 'en' : 'es')} aria-label={text('Cambiar idioma a inglés', 'Change language to Spanish')}>{lang === 'es' ? 'ES / EN' : 'EN / ES'}</button>
          <button className="report-button" type="button" onClick={() => setIsReportModalOpen(true)}>{text('Reporte de campo', 'Field report')}</button>
        </div>
      </header>

      <main id="inicio" className="page-wrap">
        <section className="intro-row">
          <div><p className="eyebrow">{text('HERRAMIENTA DE PLANIFICACIÓN AGRÍCOLA', 'FIELD PLANNING TOOL')}</p><h1>{title}</h1><p className="intro-copy">{subtitle}</p></div>
          <div className="season-note"><span className="season-icon" aria-hidden="true">⌁</span><span><b>{text('Perspectiva estacional', 'Seasonal outlook')}</b><small>{text('Clima · suelo · agua · rotación', 'Climate · soil · water · rotation')}</small></span></div>
        </section>

        <nav className="stepper" aria-label={text('Pasos del análisis', 'Analysis steps')}>
          {stepLabels[lang].map((label, index) => <button key={label} type="button" className={`step-item ${step === index ? 'active' : ''} ${step > index ? 'complete' : ''}`} onClick={() => index <= step && setStep(index)} aria-current={step === index ? 'step' : undefined}><span className="step-number">{step > index ? '✓' : index + 1}</span><span>{label}</span></button>)}
          <span className="step-progress" aria-hidden="true"><i style={{ width: `${(step / 3) * 100}%` }} /></span>
        </nav>

        {isLoading && <div className="loading-line" role="status"><i />{text('Actualizando el análisis de la parcela…', 'Updating field analysis…')}</div>}

        {step === 0 && <section className="setup-panel region-panel">
          <div className="panel-copy"><span className="step-kicker">{text('PRIMERO', 'FIRST')}</span><h2>{text('¿Dónde está tu parcela?', 'Where is your field?')}</h2><p>{text('Selecciona una región demostrativa para cargar sus condiciones de suelo y clima. Puedes usar otro punto dentro de esa región en el siguiente paso.', 'Choose a demonstration region to load its soil and climate conditions. You can choose another point within that region in the next step.')}</p></div>
          <div className="region-options" role="radiogroup" aria-label={text('Seleccionar región', 'Choose region')}>
            {DEMO_PRESETS_LIST.map((preset) => <button key={preset.presetId} type="button" role="radio" aria-checked={selectedPresetId === preset.presetId} onClick={() => { setSelectedPresetId(preset.presetId); setMapRegionCenter({ lat: preset.lat, lon: preset.lon }); setData(getMockAnalysis(preset.presetId)); }} className={`region-option ${selectedPresetId === preset.presetId ? 'selected' : ''}`}>
              <span className="region-pin" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7"/></svg></span>
              <span className="region-info"><b>{preset.region}</b><small>{preset.country} · {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°</small></span><span className="radio-mark" />
            </button>)}
          </div>
          <div className="panel-foot"><p>{text('También puedes usar tu ubicación actual; el navegador pedirá permiso antes de compartirla.', 'You can also use your current location; your browser will ask before sharing it.')}</p><button className="text-action" type="button" onClick={requestLocation}>{text('Usar mi ubicación', 'Use my location')} <span aria-hidden="true">↗</span></button></div>
          {locationMessage && <p className="inline-message" role="status">{locationMessage}</p>}
          <div className="panel-actions"><span>{text('Benchmark sin conexión disponible para 4 regiones', 'Offline benchmark available for 4 regions')}</span><button className="primary-button" type="button" onClick={() => setStep(1)}>{text('Continuar a la parcela', 'Continue to field')} <span aria-hidden="true">→</span></button></div>
        </section>}

        {step === 1 && <section className="setup-panel map-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('SEGUNDO', 'SECOND')}</span><h2>{text('Marca tu parcela en el mapa', 'Mark your field on the map')}</h2><p>{text('El mapa permanece dentro de la región seleccionada. Haz clic para ubicar el centro de tu parcela.', 'The map stays within your selected region. Click to place the center of your field.')}</p></div><button className="text-action" type="button" onClick={() => setStep(0)}>← {text('Cambiar región', 'Change region')}</button></div>
          {locationMessage && <p className="inline-message" role="status">{locationMessage}</p>}
          <RiskMap lat={data.coordinates.lat} lon={data.coordinates.lon} regionLat={mapRegionCenter.lat} regionLon={mapRegionCenter.lon} parcelName={currentPresetName} eonetAlerts={data.eonet_hazard_alerts || []} areaHa={areaHa} onAreaChange={setAreaHa} waterRegime={waterRegime} onWaterRegimeChange={setWaterRegime} lang={lang} onMapClick={handleMapCoordinateSelect} />
          <div className="panel-actions"><span className="coordinate-readout">{text('Centro seleccionado', 'Selected center')} <b>{data.coordinates.lat.toFixed(4)}°, {data.coordinates.lon.toFixed(4)}°</b></span><button className="primary-button" type="button" disabled={parcelRejected} onClick={() => setStep(2)}>{text('Elegir cultivos', 'Choose crops')} <span aria-hidden="true">→</span></button></div>
        </section>}

        {step === 2 && <section className="setup-panel crop-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('TERCERO', 'THIRD')}</span><h2>{text('¿Qué cultivas hoy?', 'What do you grow today?')}</h2><p>{text('Elige los cultivos que ya manejas. Las recomendaciones muestran qué opciones son compatibles con el clima y el suelo de esta parcela.', 'Choose the crops you currently manage. Recommendations show which options fit this field’s climate and soil.')}</p></div><span className="soil-chip">pH {data.soil_hydraulics.soil_ph.toFixed(1)} · {data.soil_hydraulics.usda_texture_class}</span></div>
          <h3 className="crop-group-title">{text('Compatibles con esta parcela', 'Suitable for this field')} <span>{data.optimization?.presolver_summary?.feasible_crop_ids?.length || 0}</span></h3>
          <div className="crop-choices">{(data.optimization?.presolver_summary?.feasible_crop_ids || []).map((cropId) => <button key={cropId} type="button" aria-pressed={selectedCrops.includes(cropId)} onClick={() => toggleCrop(cropId)} className={`crop-choice ${selectedCrops.includes(cropId) ? 'chosen' : ''}`}><span className="crop-check">{selectedCrops.includes(cropId) ? '✓' : '+'}</span><span>{cropId.replaceAll('_', ' ')}</span></button>)}</div>
          <p className="selection-note">{selectedCrops.length ? text(`${selectedCrops.length} cultivos seleccionados para el contexto de planificación.`, `${selectedCrops.length} crops selected for planning context.`) : text('Selecciona uno o más cultivos para continuar.', 'Select one or more crops to continue.')}</p>
          {(data.optimization?.presolver_summary?.discarded?.length || 0) > 0 && <details className="discarded-list"><summary>{text('Ver opciones no recomendadas', 'See crops not recommended')}</summary><p>{data.optimization.presolver_summary.discarded.map((crop) => `${crop.crop_id}: ${lang === 'es' ? crop.reason_text_es : crop.reason_text_en}`).join(' · ')}</p></details>}
          <div className="panel-actions"><button className="text-action" type="button" onClick={() => setStep(1)}>← {text('Volver al mapa', 'Back to map')}</button><button className="primary-button" type="button" disabled={!selectedCrops.length || isLoading} onClick={() => void applyCropSelection()}>{text('Ver análisis de parcela', 'View field analysis')} <span aria-hidden="true">→</span></button></div>
        </section>}

        {step === 3 && <>
          {isOfflineMode && <div className="offline-note" role="status">{text('Vista de benchmark: la selección de cultivos se conserva como contexto, pero el plan no se recalcula sin conexión.', 'Benchmark view: your crop selection is kept as context, but the plan is not recalculated offline.')}</div>}
          <div className="analysis-heading"><div><span className="step-kicker">{text('ANÁLISIS DE PARCELA', 'FIELD ANALYSIS')}</span><h2>{currentPresetName}</h2><p>{data.coordinates.lat.toFixed(4)}°, {data.coordinates.lon.toFixed(4)}° <span>·</span> {areaHa.toFixed(1)} ha <span>·</span> {selectedCrops.map((crop) => crop.replaceAll('_', ' ')).join(', ') || text('sin cultivos seleccionados', 'no crops selected')}</p></div><button className="outline-button" type="button" onClick={() => setStep(1)}>{text('Editar parcela', 'Edit field')}</button></div>
          <EarlyWarningBanner trigger={data.physics?.irrigation_trigger || { t_star_days: null, delta_i_mm: null, reason: null }} eonetCount={data.eonet_hazard_alerts?.length || 0} meanTempC={data.climate_summary?.mean_temperature_c || 21} lang={lang} />
          <ShiftingLands data={data} areaHa={areaHa} waterRegime={waterRegime} lang={lang} />
          <section className="analysis-grid main-analysis-grid">
            <div className="span-7"><RiskMap lat={data.coordinates.lat} lon={data.coordinates.lon} regionLat={mapRegionCenter.lat} regionLon={mapRegionCenter.lon} parcelName={currentPresetName} eonetAlerts={data.eonet_hazard_alerts || []} areaHa={areaHa} onAreaChange={setAreaHa} waterRegime={waterRegime} onWaterRegimeChange={setWaterRegime} lang={lang} onMapClick={handleMapCoordinateSelect} /></div>
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
