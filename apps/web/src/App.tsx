import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { PrivacyPage } from './components/PrivacyPage.js';
import { ModernLoadingModal } from './components/ModernLoadingModal.js';
import { ErrorDialogModal } from './components/ErrorDialogModal.js';
import { apiFetch } from './services/api.js';

type WaterRegime = 'temporal' | 'goteo' | 'gravedad';
type GeoBounds = [[number, number], [number, number]];
const stepLabels = {
  es: ['Ubicación', 'Cultivos', 'Resultados'],
  en: ['Location', 'Crops', 'Results']
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
const cropCatalogIds = Object.keys(cropNames.es);
const provenanceMessages = (data: AnalysisResponse, lang: Language) => {
  const provenance = data.data_provenance;
  if (!provenance) return [];
  const messages: string[] = [];
  if (provenance.climate?.retrieval === 'live_fallback') {
    messages.push(lang === 'es' ? 'Clima: se usó Open-Meteo Archive porque NASA POWER no entregó una serie completa. Son datos meteorológicos históricos de esta ubicación.' : 'Climate: Open-Meteo Archive was used because NASA POWER did not provide a complete series. These are historical weather data for this location.');
  }
  if (provenance.soil?.retrieval === 'preset_fallback') {
    messages.push(lang === 'es' ? `Suelo de referencia regional (${provenance.soil.preset_id || 'benchmark'}); no es una medición de esta parcela.` : `Regional reference soil (${provenance.soil.preset_id || 'benchmark'}); this is not a measurement from this field.`);
  }
  if (provenance.soil?.retrieval === 'manual') {
    messages.push(lang === 'es' ? 'Suelo: datos capturados de tu análisis. No son una lectura satelital ni una estimación de SoilGrids.' : 'Soil: values entered from your soil test. They are not satellite readings or a SoilGrids estimate.');
  }
  if (provenance.eonet?.retrieval === 'unavailable') {
    messages.push(lang === 'es' ? 'NASA EONET no respondió; no tener alertas cargadas no significa que no existan eventos.' : 'NASA EONET did not respond; an empty alert list does not mean there are no events.');
  }
  if ((provenance.workers?.fallback || []).length) {
    messages.push(lang === 'es' ? `Cálculo alternativo del servidor: ${(provenance.workers?.fallback || []).join(', ')}.` : `Server calculation fallback: ${(provenance.workers?.fallback || []).join(', ')}.`);
  }
  return messages;
};
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
  const privacyPath = '/datos-y-privacidad';
  const [currentPage, setCurrentPage] = useState<'app' | 'privacy'>(() => window.location.pathname === privacyPath ? 'privacy' : 'app');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('agro-dss-language');
    if (saved === 'es' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  });
  const [step, setStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('el_marques_qro');
  const [mapRegionCenter, setMapRegionCenter] = useState({ lat: 20.5922, lon: -100.1972 });
  const [mapSelectionBounds, setMapSelectionBounds] = useState<GeoBounds | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(() => !navigator.onLine);
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalysisResponse>(() => getMockAnalysis('el_marques_qro'));
  const [selectedCoordinates, setSelectedCoordinates] = useState(() => getMockAnalysis('el_marques_qro').coordinates);
  const [dataSource, setDataSource] = useState<'live' | 'benchmark'>('benchmark');
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportAfterLocation, setReportAfterLocation] = useState(false);
  const [areaHa, setAreaHa] = useState(15);
  const [waterRegime, setWaterRegime] = useState<WaterRegime>('goteo');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([DEMO_PRESETS_LIST[0].cropId]);
  const [parcelRejected, setParcelRejected] = useState(false);
  const [mapRequestFailed, setMapRequestFailed] = useState(false);
  const [cookieNotice, setCookieNotice] = useState(() => localStorage.getItem('agro-dss-notice') !== 'accepted');
  const [locationMessage, setLocationMessage] = useState('');
  const [manualSoilOpen, setManualSoilOpen] = useState(false);
  const [manualSoilActive, setManualSoilActive] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const [manualSoilProfile, setManualSoilProfile] = useState({ clay_pct: '', sand_pct: '', soil_ph: '', soc_g_kg: '', nitrogen_g_kg: '' });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalCode, setErrorModalCode] = useState<string | undefined>(undefined);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('agro-dss-language', lang);
    document.documentElement.lang = lang;
    document.title = currentPage === 'privacy'
      ? (lang === 'es' ? 'Datos y privacidad · NASA Agro-DSS' : 'Data and privacy · NASA Agro-DSS')
      : 'NASA Agro-DSS';
  }, [lang, currentPage]);

  useEffect(() => {
    const syncPageWithPath = () => setCurrentPage(window.location.pathname === privacyPath ? 'privacy' : 'app');
    window.addEventListener('popstate', syncPageWithPath);
    return () => window.removeEventListener('popstate', syncPageWithPath);
  }, []);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) setLanguageMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [languageMenuOpen]);

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

  const loadAnalysis = useCallback(async (presetId: string) => {
    setIsLoading(true);
    const mock = getMockAnalysis(presetId);
    setData(mock);
    setSelectedCoordinates(mock.coordinates);
    setDataSource('benchmark');
    setSelectedCrops(presetCropSelection(presetId, mock));
    const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === presetId);
    if (preset) setMapRegionCenter({ lat: preset.lat, lon: preset.lon });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (hasStarted && isOfflineMode) void loadAnalysis(selectedPresetId);
  }, [hasStarted, selectedPresetId, isOfflineMode, loadAnalysis]);

  const handleMapCoordinateSelect = (lat: number, lon: number) => {
    setSelectedCoordinates({ lat, lon });
    setManualSoilActive(false);
    if (!isOfflineMode) setSelectedCrops([]);
    setParcelRejected(false);
    setMapRequestFailed(false);
    setLocationMessage('');
  };

  const handleLocationSearch = (lat: number, lon: number, bounds?: GeoBounds | null) => {
    setMapRegionCenter({ lat, lon });
    setMapSelectionBounds(bounds || null);
    handleMapCoordinateSelect(lat, lon);
  };

  const handleSimulate = async (deltaPrecip: number, deltaTemp: number, eonetPulse: boolean) => {
    setIsLoading(true);
    const applyLocalSimulation = (fallbackMessage?: string) => {
      if (fallbackMessage && !isOfflineMode) {
        setLocationMessage(fallbackMessage);
      }
      setData((prev) => {
        const wb = prev.physics.water_balance;
        const factor = 1 + deltaPrecip / 100;
        const newW = wb.w_mm.map((w, i) => Math.max(40, w * factor + (i === 15 && eonetPulse ? 65 : 0) - deltaTemp * 1.5));
        const isCritical = newW.some((w) => w < prev.soil_hydraulics.critical_water_mm);
        return {
          ...prev,
          physics: {
            ...prev.physics,
            water_balance: { ...wb, w_mm: newW },
            irrigation_trigger: {
              t_star_days: isCritical ? 9 : null,
              delta_i_mm: isCritical ? 48 : null,
              reason: isCritical ? 'Stress simulated by what-if scenario' : null
            }
          }
        };
      });
    };

    if (isOfflineMode) {
      applyLocalSimulation();
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId: data.parcel_id, deltaPrecipPct: deltaPrecip, deltaTempC: deltaTemp, injectEonetPulse: eonetPulse })
      });
      if (!res.ok) {
        applyLocalSimulation(text('El servicio de simulación no respondió; aplicamos un cálculo local para que puedas seguir explorando.', 'The simulation service did not respond; a local calculation is active so you can keep exploring.'));
        return;
      }
      const simData = await res.json();
      setData((prev) => ({ ...prev, physics: simData.physics || prev.physics, optimization: simData.optimization || prev.optimization }));
    } catch {
      applyLocalSimulation(text('El servicio de simulación no respondió; aplicamos un cálculo local para que puedas seguir explorando.', 'The simulation service did not respond; a local calculation is active so you can keep exploring.'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCrop = (cropId: string) => setSelectedCrops((current) => current.includes(cropId) ? current.filter((id) => id !== cropId) : [...current, cropId]);

  const useRegionalBenchmark = () => {
    const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === selectedPresetId);
    const benchmark = getMockAnalysis(selectedPresetId);
    setData(benchmark);
    setSelectedCoordinates(benchmark.coordinates);
    setDataSource('benchmark');
    setMapSelectionBounds(null);
    setMapRegionCenter({ lat: preset?.lat ?? benchmark.coordinates.lat, lon: preset?.lon ?? benchmark.coordinates.lon });
    setSelectedCrops(presetCropSelection(selectedPresetId, benchmark));
    setParcelRejected(false);
    setMapRequestFailed(false);
    setIsOfflineMode(true);
    setLocationMessage(text('Continuamos con el ejemplo guardado de Querétaro. El marcador volvió a sus coordenadas de referencia.', 'Continuing with the saved Querétaro example. The marker returned to its reference coordinates.'));
    setStep(2);
  };

  const applyCropSelection = async () => {
    if (!selectedCrops.length) return;
    if (isOfflineMode) {
      setStep(3);
      return;
    }
    const hasCustomPoint = !sameAsAnalyzed;
    const requestCoordinates = hasCustomPoint ? selectedCoordinates : data.coordinates;
    const requestParcelId = hasCustomPoint ? `custom_${requestCoordinates.lat.toFixed(4)}_${requestCoordinates.lon.toFixed(4)}` : data.parcel_id;
    setIsLoading(true);
    setLocationMessage('');
    let apiErrorCode = '';
    try {
      const response = await apiFetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcel_id: requestParcelId,
          lat: requestCoordinates.lat,
          lon: requestCoordinates.lon,
          source: hasCustomPoint || data.parcel_id.startsWith('custom_') ? 'live' : 'preset',
          crop_id: selectedCrops[0],
          candidate_crops: selectedCrops,
          area_ha: areaHa,
          ...(manualSoilActive ? { soil_profile: {
            clay_pct: Number(manualSoilProfile.clay_pct), sand_pct: Number(manualSoilProfile.sand_pct), soil_ph: Number(manualSoilProfile.soil_ph), soc_g_kg: Number(manualSoilProfile.soc_g_kg),
            ...(manualSoilProfile.nitrogen_g_kg === '' ? {} : { nitrogen_g_kg: Number(manualSoilProfile.nitrogen_g_kg) })
          } } : {})
        })
      });
      if (response.status === 422) {
        const body = await response.json();
        const code = body?.error?.code;
        setParcelRejected(code === 'NON_ARABLE_LAND');
        if (code === 'NON_ARABLE_LAND') setManualSoilOpen(true);
        const localizedValidationMessage = code === 'INVALID_SOIL_PROFILE'
          ? text('El análisis requiere arcilla, arena, pH y carbono orgánico válidos; el nitrógeno es opcional.', 'The soil test needs valid clay, sand, pH, and organic carbon values; nitrogen is optional.')
          : body?.error?.message;
        const finalMsg = code === 'NON_ARABLE_LAND'
          ? (lang === 'es'
            ? `SoilGrids no tiene datos de suelo para este punto (${requestCoordinates.lat.toFixed(4)}, ${requestCoordinates.lon.toFixed(4)}). Puede ser una zona urbana, cuerpo de agua o roca desnuda. Mueve el marcador a una parcela agrícola o proporciona un análisis de suelo de laboratorio.`
            : `SoilGrids has no soil data for this point (${requestCoordinates.lat.toFixed(4)}, ${requestCoordinates.lon.toFixed(4)}). It may be urban, water, or bedrock. Move the marker to an agricultural field or provide a laboratory soil test.`)
          : (localizedValidationMessage || (code
            ? text(`No se pudo validar la parcela (${code}).`, `The field could not be validated (${code}).`)
            : text('No se pudo validar la parcela.', 'The field could not be validated.')));
        setLocationMessage(finalMsg);
        setErrorModalCode(code);
        setErrorModalMessage(finalMsg);
        setErrorModalOpen(true);
        setStep(1);
        return;
      }
      if (!response.ok) {
        setServiceAvailable(false);
        let detail = '';
        try {
          const body = await response.json();
          const code = body?.error?.code;
          apiErrorCode = typeof code === 'string' ? code : '';
          const message = body?.error?.message || body?.message || '';
          const localizedErrors: Record<string, [string, string]> = {
            CLIMATE_SOURCES_UNAVAILABLE: ['No pudimos obtener datos meteorológicos para esta ubicación.', 'Weather data are unavailable for this location.'],
            SOILGRIDS_UNAVAILABLE: ['El servicio de suelo no respondió. Intenta de nuevo o captura un análisis de laboratorio.', 'The soil service is unavailable. Retry or enter soil test results.'],
            INVALID_SOIL_PROFILE: ['Revisa los valores del análisis de suelo.', 'Check the soil test values.'],
            INTERNAL_SERVER_ERROR: ['El servidor no pudo completar el análisis.', 'The server could not complete the analysis.']
          };
          detail = code && localizedErrors[code]
            ? `${code}: ${localizedErrors[code][lang === 'es' ? 0 : 1]}`
            : code ? text(`El servidor devolvió el error ${code}.`, `The server returned error ${code}.`) : message;
        } catch { /* The gateway may return an empty or non-JSON error. */ }

        if (apiErrorCode === 'SOILGRIDS_UNAVAILABLE') {
          setParcelRejected(true);
          setManualSoilOpen(true);
          setMapRequestFailed(false);
          setStep(1);
          const soilMsg = text(
            'SoilGrids no está disponible ahora para esta parcela. Puedes capturar un análisis de suelo y volver a consultar el clima y las alertas.',
            'SoilGrids is unavailable for this field right now. Enter a soil test to continue querying climate and hazard data.'
          );
          setLocationMessage(soilMsg);
          setErrorModalCode('SOILGRIDS_UNAVAILABLE');
          setErrorModalMessage(soilMsg);
          setErrorModalOpen(true);
          return;
        }

        setMapRequestFailed(true);
        const errMsg = detail || `HTTP ${response.status}`;
        const failureMsg = lang === 'es'
          ? `El servicio de análisis no respondió (${errMsg}). Conservamos tu ubicación y cultivos; puedes reintentar.`
          : `The analysis service did not respond (${errMsg}). Your location and crops are saved; you can retry.`;
        setLocationMessage(failureMsg);
        setErrorModalCode(apiErrorCode || `HTTP_${response.status}`);
        setErrorModalMessage(failureMsg);
        setErrorModalOpen(true);
        return;
      }
      const analysis = await response.json() as AnalysisResponse;
      setData(analysis);
      setSelectedCoordinates(analysis.coordinates);
      setServiceAvailable(true);
      setDataSource(hasCustomPoint || data.parcel_id.startsWith('custom_') ? 'live' : 'benchmark');
      setStep(3);
    } catch (error) {
      setServiceAvailable(false);
      setMapRequestFailed(true);
      const reason = error instanceof TypeError
        ? (lang === 'es' ? 'no hay conexión con el servicio de análisis' : 'the analysis service is unreachable')
        : error instanceof Error ? error.message : '';
      const failureMsg = lang === 'es'
        ? `El servicio de análisis no respondió${reason ? ` (${reason})` : ''}. Conservamos tu ubicación y cultivos; puedes reintentar.`
        : `The analysis service did not respond${reason ? ` (${reason})` : ''}. Your location and crops are saved; you can retry.`;
      setLocationMessage(failureMsg);
      setErrorModalCode(apiErrorCode || 'SERVICE_UNAVAILABLE');
      setErrorModalMessage(failureMsg);
      setErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };
  const currentPreset = DEMO_PRESETS_LIST.find((p) => p.presetId === selectedPresetId);
  const currentPresetName = data.parcel_id.startsWith('custom_')
    ? (lang === 'es' ? 'Parcela seleccionada' : 'Selected field')
    : currentPreset?.parcelName || data.parcel_id;
  const orderedCropOptions = [...selectedCrops, ...cropCatalogIds.filter((id) => !selectedCrops.includes(id))]
    .map((id) => ({ id, label: cropLabel(id, lang) }));
  const title = lang === 'es' ? 'Planifica con el clima de tu parcela' : 'Plan with the climate of your field';
  const subtitle = lang === 'es' ? 'Un diagnóstico agronómico, construido paso a paso con datos satelitales y del suelo.' : 'An agronomic assessment, built step by step from satellite and soil data.';
  const text = (es: string, en: string) => lang === 'es' ? es : en;
  const sourceLabel = !hasStarted
    ? text('Listo para comenzar', 'Ready when you are')
    : !browserOnline
    ? text('Modo Resiliencia Offline', 'Offline Resilience Mode')
    : isOfflineMode
      ? text('Calibración Regional', 'Regional Benchmark')
      : serviceAvailable === false
        ? text('Datos Calibrados', 'Calibrated Data')
        : dataSource === 'live'
          ? text('Telemetría Satelital', 'Satellite Telemetry')
          : serviceAvailable
            ? text('Benchmark regional', 'Regional benchmark')
            : text('Listo para analizar', 'Ready to analyze');
  const sourceDescription = !hasStarted
    ? text('El análisis inicia al seleccionar la parcela.', 'Analysis starts upon parcel selection.')
    : isOfflineMode
    ? text('NASA POWER & SoilGrids v2.0', 'NASA POWER & SoilGrids v2.0')
    : serviceAvailable === false
      ? text('Respaldo agronómico de alta resolución', 'Verified high-resolution fallback')
      : dataSource === 'live'
        ? text('Satélites NASA POWER, SoilGrids y EONET', 'NASA POWER, SoilGrids & EONET satellites')
      : text('La ubicación se consulta al calcular el análisis.', 'Location is queried when analysis runs.');
  const sameAsAnalyzed = (dataSource === 'live' || isOfflineMode)
    && Math.abs(selectedCoordinates.lat - data.coordinates.lat) < 0.00001
    && Math.abs(selectedCoordinates.lon - data.coordinates.lon) < 0.00001;
  const needsLiveAnalysis = !isOfflineMode && !sameAsAnalyzed;
  const needsBenchmarkReset = isOfflineMode && !sameAsAnalyzed;
  const visibleStep = step === 3 ? 2 : step >= 2 ? 1 : 0;

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage(text('Este navegador no ofrece ubicación. Escribe las coordenadas de tu parcela.', 'Location is unavailable in this browser. Enter your field coordinates.')); return; }
    setLocationMessage(text('Esperando permiso de ubicación…', 'Waiting for location permission…'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapRegionCenter({ lat: coords.latitude, lon: coords.longitude });
        setMapSelectionBounds(null);
        void handleMapCoordinateSelect(coords.latitude, coords.longitude);
        setStep(0);
        if (reportAfterLocation) {
          setIsReportModalOpen(true);
          setReportAfterLocation(false);
        }
      },
      () => setLocationMessage(text('No se obtuvo ubicación. Puedes continuar eligiendo un punto en el mapa.', 'Location was not shared. You can choose a point on the map instead.')),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const openFieldReport = () => {
    if (!hasStarted || (!isOfflineMode && dataSource !== 'live')) {
      setHasStarted(true);
      setStep(0);
      setReportAfterLocation(true);
      setLocationMessage(text('Elige primero la ubicación que quieres reportar.', 'Choose the location you want to report first.'));
      return;
    }
    setIsReportModalOpen(true);
  };

  const openPrivacyPage = () => {
    if (window.location.pathname !== privacyPath) window.history.pushState({}, '', privacyPath);
    setCurrentPage('privacy');
    window.scrollTo({ top: 0 });
  };

  const returnToApp = () => {
    if (window.location.pathname === privacyPath) window.history.pushState({}, '', '/');
    setCurrentPage('app');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <header className="site-header">
        <a href="/" className="brand" aria-label={text('NASA Agro-DSS, inicio', 'NASA Agro-DSS, home')} onClick={(event) => { event.preventDefault(); returnToApp(); }}>
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M7 23c7-1 12-6 14-15 5 8 3 17-6 19-3 1-6 0-8-4Z" stroke="currentColor" strokeWidth="2"/><path d="M8 26c3-5 7-8 13-11" stroke="currentColor" strokeWidth="2"/></svg></span>
          <span><strong>NASA Agro-DSS</strong><small>{text('Decisiones para cada parcela', 'Decisions for every field')}</small></span>
        </a>
        <div className="header-actions">
          {currentPage === 'app' && <div className={`source-control ${isOfflineMode || !browserOnline || serviceAvailable === false ? 'local' : ''}`}>
            <span className="source-indicator" aria-hidden="true"><i /></span>
            <span className="source-copy"><strong>{sourceLabel}</strong><small>{sourceDescription}</small></span>
          </div>}
          <div className="language-picker" aria-label={text('Idioma de la interfaz', 'Interface language')} ref={languageMenuRef}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 12h17M12 3c2.2 2.4 3.2 5.4 3.2 9s-1 6.6-3.2 9c-2.2-2.4-3.2-5.4-3.2-9S9.8 5.4 12 3Z" stroke="currentColor" strokeWidth="1.4"/></svg>
            <button type="button" className="language-current" aria-label={text('Idioma: Español', 'Language: English')} aria-haspopup="menu" aria-expanded={languageMenuOpen} onClick={() => setLanguageMenuOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'Escape') setLanguageMenuOpen(false); }}>{lang === 'es' ? 'Español' : 'English'}<svg className="language-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            {languageMenuOpen && <div className="language-menu" role="menu" aria-label={text('Seleccionar idioma', 'Choose language')}>
              <button type="button" role="menuitemradio" aria-checked={lang === 'es'} onClick={() => { setLang('es'); setLanguageMenuOpen(false); }}>Español <span>{lang === 'es' ? '✓' : ''}</span></button>
              <button type="button" role="menuitemradio" aria-checked={lang === 'en'} onClick={() => { setLang('en'); setLanguageMenuOpen(false); }}>English <span>{lang === 'en' ? '✓' : ''}</span></button>
            </div>}
          </div>
          {currentPage === 'app' && <button className="report-button" type="button" onClick={openFieldReport}>{text('Observación de campo', 'Field observation')}</button>}
        </div>
      </header>

      <main id="inicio" className="page-wrap">
        {currentPage === 'privacy' ? <PrivacyPage lang={lang} onBack={returnToApp} /> : !hasStarted ? <section className="welcome-panel">
          <div className="welcome-copy">
            <span className="step-kicker">{text('CAMPO CLARO · PLANIFICACIÓN AGRÍCOLA', 'CAMPO CLARO · FIELD PLANNING')}</span>
            <h1>{text('Decide con el clima, el suelo y el agua de tu parcela.', 'Plan with your field’s climate, soil, and water.')}</h1>
            <p>{text('Explora condiciones de tu parcela, compara cultivos y anticipa decisiones de agua con datos de NASA, SoilGrids y observaciones de productores.', 'Explore your field conditions, compare crops, and plan water decisions with NASA, SoilGrids, and farmer observations.')}</p>
            <div className="welcome-actions"><button className="primary-button" type="button" onClick={() => setHasStarted(true)}>{text('Planear mi parcela', 'Plan my field')} <span aria-hidden="true">→</span></button><button className="welcome-secondary" type="button" onClick={openFieldReport}>{text('Registrar observación', 'Report a field observation')}</button></div>
          <small>{text('Busca una ciudad, dirección o coordenadas, o marca tu parcela en el mapa. Los ejemplos guardados solo se usan sin conexión.', 'Search for a city, address, or coordinates, or mark your field on the map. Saved examples are only used offline.')}</small>
          </div>
          <div className="welcome-map" aria-label={text('Ilustración topográfica de una parcela', 'Topographic field illustration')}><div className="welcome-map-grid"/><svg viewBox="0 0 480 340" fill="none" aria-hidden="true"><path d="M31 184c35-52 87-70 138-39 40 24 72 13 101-31 38-58 89-64 130-24 29 29 47 31 70 15M22 218c43-60 93-77 147-45 43 25 82 15 112-31 39-58 94-67 140-22 20 19 34 26 53 18M19 252c44-57 100-78 158-44 49 29 91 20 120-27 36-59 96-70 146-25 13 12 23 19 35 18M58 286c46-47 91-56 139-30 50 28 100 20 132-27 35-51 89-59 132-24" stroke="currentColor" strokeWidth="2"/><path d="M247 109c-22 0-40 18-40 40 0 28 40 62 40 62s40-34 40-62c0-22-18-40-40-40Z" fill="#d4ec79" stroke="#1e4936" strokeWidth="4"/><circle cx="247" cy="149" r="11" fill="#1e4936"/><path d="M92 152h58m158 87h78M136 94h48" stroke="#d4ec79" strokeWidth="2" strokeDasharray="5 7"/></svg><span className="welcome-map-label">{text('Tu parcela, en contexto', 'Your field, in context')}</span></div>
          <div className="welcome-steps"><div><span>01</span><b>{text('Ubica', 'Locate')}</b><small>{text('Usa GPS, coordenadas o el mapa.', 'Use GPS, coordinates, or the map.')}</small></div><div><span>02</span><b>{text('Describe', 'Describe')}</b><small>{text('Elige cultivos y manejo actual.', 'Choose crops and current practices.')}</small></div><div><span>03</span><b>{text('Decide', 'Decide')}</b><small>{text('Consulta agua, alertas y rotación.', 'Review water, risks, and rotation.')}</small></div></div>
          <div className="welcome-sources"><span>{text('Fuentes', 'Data')}</span><b>NASA POWER</b><b>NASA EONET</b><b>NASA GIBS</b><b>ISRIC SoilGrids</b></div>
        </section> : <>
        <section className="intro-row">
          <div className="intro-copy-block"><p className="eyebrow">{text('HERRAMIENTA DE PLANIFICACIÓN AGRÍCOLA', 'FIELD PLANNING TOOL')}</p><h1>{title}</h1><p className="intro-copy">{subtitle}</p></div>
          <div className="topographic-art" aria-hidden="true"><svg viewBox="0 0 440 190" fill="none"><path d="M-18 147c44-37 70-35 111-4 49 37 82 34 118-10 39-48 84-47 124-6 35 35 66 36 123 1M-20 126c49-42 80-41 124-8 44 33 72 30 105-11 43-54 94-55 139-11 35 34 66 35 111 8M-22 104c57-46 91-45 136-12 39 29 60 23 94-19 48-60 106-61 155-15 33 31 62 34 102 15M-20 81c61-48 99-47 146-15 34 23 51 15 85-26 52-62 116-66 169-17 31 29 58 32 92 23M-15 57c67-48 108-48 157-17 31 20 45 8 80-32 57-64 127-68 183-17 27 24 50 30 78 28" stroke="currentColor" strokeWidth="1.4"/></svg></div>
          <div className="season-note"><span className="season-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 24c7-1 13-7 15-17 5 9 2 18-6 21-4 1-7 0-9-4Z" stroke="currentColor" strokeWidth="1.7"/><path d="M7 27c4-5 8-9 14-13" stroke="currentColor" strokeWidth="1.7"/></svg></span><span><b>{text('Perspectiva estacional', 'Seasonal outlook')}</b><small>{text('Clima · suelo · agua · rotación', 'Climate · soil · water · rotation')}</small></span></div>
        </section>

        <nav className="stepper" aria-label={text('Pasos del análisis', 'Analysis steps')}>
          {stepLabels[lang].map((label, index) => <button key={label} type="button" className={`step-item ${visibleStep === index ? 'active' : ''} ${visibleStep > index ? 'complete' : ''}`} onClick={() => index <= visibleStep && setStep([0, 2, 3][index])} aria-current={visibleStep === index ? 'step' : undefined}><span className="step-number">{visibleStep > index ? '✓' : index + 1}</span><span>{label}</span></button>)}
          <span className="step-progress" aria-hidden="true"><i style={{ width: `${(visibleStep / 2) * 100}%` }} /></span>
        </nav>

        {hasStarted && isLoading && <div className="loading-line" role="status" aria-live="polite"><i /><span><b>{text('Consultando datos de tu parcela', 'Checking your field data')}</b><small>{text('Suelo, clima y alertas. Conservamos tu selección mientras termina.', 'Soil, climate, and alerts. Your selection stays saved while this runs.')}</small></span></div>}

        {step === 0 && <section className="setup-panel location-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('PASO 1 · UBICACIÓN', 'STEP 1 · LOCATION')}</span><h2>{text('Encuentra tu parcela', 'Find your field')}</h2><p>{text('Busca tu ciudad o dirección, ingresa coordenadas o marca tu predio en el mapa. El motor consultará satélites NASA en vivo; los benchmarks sirven de calibración o respaldo.', 'Search for a city or address, enter coordinates, or mark your field on the map. The engine queries NASA satellites live; benchmarks provide ground-truth calibration.')}</p></div></div>
          <div className="location-options"><button className="location-option" type="button" onClick={requestLocation}><span className="location-option-icon" aria-hidden="true">◎</span><span><b>{text('Usar mi ubicación actual', 'Use my current location')}</b><small>{text('El navegador pedirá permiso. Solo se comparte cuando solicitas el análisis.', 'Your browser will ask permission. The location is shared only when you request analysis.')}</small></span><span aria-hidden="true">→</span></button></div>
          {locationMessage && <p className="inline-message" role="alert">{locationMessage}</p>}
          <div className="location-map-heading"><div><b>{text('O marca el punto en el mapa', 'Or mark the point on the map')}</b><small>{text('Acerca el mapa y toca el centro aproximado de tu parcela.', 'Zoom in and tap near the center of your field.')}</small></div><span className="coordinate-readout">{selectedCoordinates.lat.toFixed(4)}°, {selectedCoordinates.lon.toFixed(4)}°</span></div>
          <RiskMap lat={selectedCoordinates.lat} lon={selectedCoordinates.lon} regionLat={mapRegionCenter.lat} regionLon={mapRegionCenter.lon} selectionBounds={mapSelectionBounds} parcelName={text('Centro de parcela', 'Field center')} eonetAlerts={[]} areaHa={areaHa} selectedCropIds={selectedCrops} onAreaChange={setAreaHa} waterRegime={waterRegime} onWaterRegimeChange={setWaterRegime} lang={lang} onMapClick={handleMapCoordinateSelect} onLocationSearch={handleLocationSearch} />
          <div className="panel-actions"><span className="coordinate-readout">{text('Ubicación elegida', 'Selected location')} <b>{selectedCoordinates.lat.toFixed(4)}°, {selectedCoordinates.lon.toFixed(4)}°</b></span><button className="primary-button" type="button" onClick={() => setStep(2)}>{text('Elegir cultivos', 'Choose crops')} <span aria-hidden="true">→</span></button></div>
          <details className="demo-options"><summary>{text('Cargar benchmark regional de calibración (Modo Resiliencia)', 'Load regional calibration benchmark (Resilience Mode)')}</summary><div className="region-options" role="radiogroup" aria-label={text('Benchmarks regionales de calibración', 'Regional calibration benchmarks')}>
            {DEMO_PRESETS_LIST.map((preset) => <button key={preset.presetId} type="button" role="radio" aria-checked={selectedPresetId === preset.presetId} onClick={() => {
              const benchmark = getMockAnalysis(preset.presetId);
              setSelectedPresetId(preset.presetId);
              setMapRegionCenter({ lat: preset.lat, lon: preset.lon });
              setMapSelectionBounds(null);
              setData(benchmark);
              setSelectedCoordinates(benchmark.coordinates);
              setSelectedCrops(presetCropSelection(preset.presetId, benchmark));
              setIsOfflineMode(true);
              setStep(2);
            }} className={`region-option ${selectedPresetId === preset.presetId ? 'selected' : ''}`}>
              <span className="region-info"><b>{preset.region}</b><small>{preset.country} · {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°</small><em>{cropLabel(preset.cropId, lang)} · {preset.areaHa} ha</em></span><span className="radio-mark" />
            </button>)}
          </div></details>
        </section>}

        {step === 1 && <section className="setup-panel map-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('VALIDACIÓN DE PARCELA', 'FIELD VALIDATION')}</span><h2>{text('Revisa el punto o aporta datos de suelo', 'Check the location or enter soil results')}</h2><p>{text('Esta pantalla aparece solo si no encontramos datos de suelo para tu punto.', 'This screen appears only when soil data are unavailable for your point.')}</p></div><button className="text-action" type="button" onClick={() => setStep(0)}>← {text('Volver al mapa', 'Back to map')}</button></div>
          {locationMessage && <div className={`inline-message ${parcelRejected ? 'inline-error' : ''}`} role={parcelRejected || mapRequestFailed ? 'alert' : 'status'}><span>{locationMessage}</span>{mapRequestFailed && <button type="button" className="fallback-button" onClick={useRegionalBenchmark}>{text('Abrir ejemplo guardado', 'Open saved example')}</button>}</div>}
          {parcelRejected && <section className="manual-soil-panel" aria-labelledby="manual-soil-title">
            <div><h3 id="manual-soil-title">{text('¿Tienes un análisis de suelo?', 'Do you have a soil test?')}</h3><p>{text('Puedes capturar los resultados de laboratorio. Se usarán solo para esta parcela y quedarán identificados como datos proporcionados por ti.', 'Enter your lab results. They will be used only for this field and labeled as grower-provided data.')}</p></div>
            {!manualSoilOpen ? <button className="outline-button" type="button" onClick={() => setManualSoilOpen(true)}>{text('Ingresar datos del análisis', 'Enter soil test results')}</button> : <form className="manual-soil-form" onSubmit={(event) => { event.preventDefault(); const values = Object.values(manualSoilProfile).map(Number); if (values.some((value) => !Number.isFinite(value)) || Number(manualSoilProfile.clay_pct) + Number(manualSoilProfile.sand_pct) > 100) return; setManualSoilActive(true); setParcelRejected(false); setLocationMessage(text('Análisis manual listo. Elige tus cultivos y calcula para consultar clima y alertas en esta ubicación.', 'Manual soil data is ready. Choose crops and calculate to fetch climate and alerts for this location.')); setStep(2); }}>
              <label>{text('Arcilla (%)', 'Clay (%)')}<input required type="number" min="0" max="100" step="0.1" value={manualSoilProfile.clay_pct} onChange={(e) => setManualSoilProfile({ ...manualSoilProfile, clay_pct: e.target.value })}/></label>
              <label>{text('Arena (%)', 'Sand (%)')}<input required type="number" min="0" max="100" step="0.1" value={manualSoilProfile.sand_pct} onChange={(e) => setManualSoilProfile({ ...manualSoilProfile, sand_pct: e.target.value })}/></label>
              <label>pH<input required type="number" min="0" max="14" step="0.1" value={manualSoilProfile.soil_ph} onChange={(e) => setManualSoilProfile({ ...manualSoilProfile, soil_ph: e.target.value })}/></label>
              <label>{text('Carbono orgánico (g/kg)', 'Organic carbon (g/kg)')}<input required type="number" min="0" step="0.1" value={manualSoilProfile.soc_g_kg} onChange={(e) => setManualSoilProfile({ ...manualSoilProfile, soc_g_kg: e.target.value })}/></label>
              <label>{text('Nitrógeno (g/kg, opcional)', 'Nitrogen (g/kg, optional)')}<input type="number" min="0" step="0.01" value={manualSoilProfile.nitrogen_g_kg} onChange={(e) => setManualSoilProfile({ ...manualSoilProfile, nitrogen_g_kg: e.target.value })}/></label>
              {Number(manualSoilProfile.clay_pct || 0) + Number(manualSoilProfile.sand_pct || 0) > 100 && <p className="form-error">{text('Arcilla y arena no pueden sumar más de 100%.', 'Clay and sand cannot total over 100%.')}</p>}
              <p className="manual-soil-note">{text('Referencia preferida: análisis de laboratorio para 0–30 cm. Los campos de suelo dejan de depender de SoilGrids; clima y alertas seguirán consultándose en vivo.', 'Preferred reference: a 0–30 cm lab test. Soil fields will use your values; climate and alerts will still be queried live.')}</p>
              <button className="primary-button" type="submit">{text('Usar estos datos', 'Use these soil results')}</button>
            </form>}
          </section>}
          {(needsLiveAnalysis || needsBenchmarkReset) && !locationMessage && <p className="map-selection-hint" role="status">{needsLiveAnalysis
            ? text('Punto marcado. Continúa para elegir tus cultivos; los datos se consultan al calcular el análisis.', 'Point marked. Continue to choose crops; data is fetched when you calculate the analysis.')
            : text('Punto seleccionado. En modo de calibración regional, vuelve a la coordenada del benchmark o conecta con satélites para nuevas coordenadas.', 'Point selected. In regional calibration mode, return to benchmark coordinates or connect to satellites for new coordinates.')}</p>}
          <div className="field-location-summary"><span className="field-location-pin" aria-hidden="true">⌖</span><div><b>{sameAsAnalyzed ? currentPresetName : text('Centro seleccionado', 'Selected center')}</b><span>{selectedCoordinates.lat.toFixed(5)}°, {selectedCoordinates.lon.toFixed(5)}°</span></div><button className="text-action" type="button" onClick={() => setStep(0)}>{text('Corregir punto', 'Change point')}</button></div>
          <div className="panel-actions"><span className="coordinate-readout">{text('Centro seleccionado', 'Selected center')} <b>{selectedCoordinates.lat.toFixed(4)}°, {selectedCoordinates.lon.toFixed(4)}°</b></span>{needsLiveAnalysis
            ? <button className="primary-button" type="button" disabled={parcelRejected} onClick={() => setStep(2)}>{text('Elegir cultivos', 'Choose crops')} <span aria-hidden="true">→</span></button>
            : needsBenchmarkReset
              ? <button className="primary-button" type="button" onClick={() => { const preset = DEMO_PRESETS_LIST.find((item) => item.presetId === selectedPresetId); setMapRegionCenter({ lat: preset?.lat ?? data.coordinates.lat, lon: preset?.lon ?? data.coordinates.lon }); handleMapCoordinateSelect(data.coordinates.lat, data.coordinates.lon); }}>{text('Volver al punto guardado', 'Return to saved point')} <span aria-hidden="true">↺</span></button>
              : <button className="primary-button" type="button" disabled={parcelRejected} onClick={() => setStep(2)}>{text('Elegir cultivos', 'Choose crops')} <span aria-hidden="true">→</span></button>}</div>
        </section>}

        {step === 2 && <section className="setup-panel crop-panel">
          <div className="setup-heading"><div><span className="step-kicker">{text('TERCERO', 'THIRD')}</span><h2>{text('¿Qué cultivas hoy?', 'What do you grow today?')}</h2><p>{text('Marca los cultivos que ya están en tu parcela. Los no compatibles se enviarán al análisis para mostrarte el motivo.', 'Mark the crops already in your field. Any that do not fit will be checked and explained in the analysis.')}</p></div><span className="soil-chip">pH {data.soil_hydraulics.soil_ph.toFixed(1)} · {data.soil_hydraulics.usda_texture_class}</span></div>
          <div className="crop-list-heading"><h3>{text('Cultivos del catálogo', 'Crops in catalog')}</h3><span>{selectedCrops.length} {text('seleccionados', 'selected')}</span></div>
          <div className="crop-choices">{cropCatalogIds.map((cropId) => {
            const warning = data.optimization?.presolver_summary?.discarded?.some((crop) => crop.crop_id === cropId) || false;
            const feasible = data.optimization?.presolver_summary?.feasible_crop_ids?.includes(cropId) || false;
            const chosen = selectedCrops.includes(cropId);
            return <button key={cropId} type="button" aria-pressed={chosen} onClick={() => toggleCrop(cropId)} className={`crop-choice ${chosen ? 'chosen' : ''} ${warning ? 'needs-review' : ''}`}>
              <span className="crop-glyph">{cropGlyph(cropId)}</span>
              <span className="crop-copy"><b>{cropLabel(cropId, lang)}</b><small>{chosen ? text('En mi parcela', 'In my field') : warning ? text('Revisar compatibilidad', 'Review suitability') : feasible ? text('Adecuado en referencia', 'Fits regional reference') : text('Sin evaluar aquí', 'Not evaluated here')}</small></span>
              <span className="crop-check" aria-hidden="true">{chosen ? '✓' : '+'}</span>
            </button>;
          })}</div>
          <p className="selection-note">{!selectedCrops.length
            ? text('Selecciona al menos un cultivo para continuar.', 'Select at least one crop to continue.')
            : isOfflineMode
              ? text('Tus cultivos quedan registrados; la rotación mostrada optimiza la resiliencia del predio.', 'Your selected crops are registered; the displayed rotation optimizes farm resilience.')
              : text('El análisis se limitará a los cultivos que marcaste.', 'The analysis will be limited to the crops you selected.')}</p>
          {(data.optimization?.presolver_summary?.discarded?.length || 0) > 0 && <details className="discarded-list"><summary>{text('Ver por qué no se recomiendan', 'See why some are not recommended')}</summary><p>{data.optimization.presolver_summary.discarded.map((crop) => `${cropLabel(crop.crop_id, lang)}: ${lang === 'es' ? crop.reason_text_es : crop.reason_text_en}`).join(' · ')}</p></details>}
          {needsLiveAnalysis && <p className="selection-note">{text('Compatibilidad orientativa de la región de referencia. Tu punto se evaluará al calcular el análisis.', 'Suitability is based on the regional reference. Your selected point will be evaluated when analysis runs.')}</p>}
          {mapRequestFailed && locationMessage && <div className="inline-message inline-error" role="alert"><span>{locationMessage}</span><button type="button" className="fallback-button" disabled={isLoading} onClick={() => void applyCropSelection()}>{text('Reintentar análisis', 'Retry analysis')}</button></div>}
          <div className="panel-actions"><button className="text-action" type="button" onClick={() => setStep(0)}>← {text('Volver al mapa', 'Back to map')}</button><button className="primary-button" type="button" disabled={!selectedCrops.length || isLoading} onClick={() => void applyCropSelection()}>{text('Calcular análisis', 'Calculate field analysis')} <span aria-hidden="true">→</span></button></div>
        </section>}

        {step === 3 && <>
          <div className="analysis-heading"><div><span className="step-kicker">{text('ANÁLISIS DE PARCELA', 'FIELD ANALYSIS')}</span><h2>{currentPresetName}</h2><p>{data.coordinates.lat.toFixed(4)}°, {data.coordinates.lon.toFixed(4)}° <span>·</span> {areaHa.toFixed(1)} ha <span>·</span> {selectedCrops.map((crop) => cropLabel(crop, lang)).join(', ') || text('sin cultivos seleccionados', 'no crops selected')}</p></div><button className="outline-button" type="button" onClick={() => setStep(0)}>{text('Editar parcela', 'Edit field')}</button></div>
          {provenanceMessages(data, lang).length > 0 && <aside className="data-quality-notice" role="status"><b>{text('Origen y disponibilidad de los datos', 'Data source and availability')}</b>{provenanceMessages(data, lang).map((message) => <p key={message}>{message}</p>)}</aside>}
          <EarlyWarningBanner trigger={data.physics?.irrigation_trigger || { t_star_days: null, delta_i_mm: null, reason: null }} eonetCount={data.eonet_hazard_alerts?.length || 0} meanTempC={data.climate_summary?.mean_temperature_c || 21} lang={lang} />
          <ShiftingLands data={data} areaHa={areaHa} waterRegime={waterRegime} lang={lang} />
          <section className="analysis-grid main-analysis-grid">
            <div className="span-7"><RiskMap lat={data.coordinates.lat} lon={data.coordinates.lon} regionLat={mapRegionCenter.lat} regionLon={mapRegionCenter.lon} selectionBounds={mapSelectionBounds} parcelName={currentPresetName} eonetAlerts={data.eonet_hazard_alerts || []} areaHa={areaHa} selectedCropIds={selectedCrops} onAreaChange={setAreaHa} waterRegime={waterRegime} onWaterRegimeChange={setWaterRegime} lang={lang} onMapClick={(lat, lon) => { handleMapCoordinateSelect(lat, lon); setStep(0); }} onLocationSearch={(lat, lon, bounds) => { handleLocationSearch(lat, lon, bounds); setStep(0); }} /></div>
            <div className="span-5"><CropAdvisor viableCropIds={data.optimization?.presolver_summary?.feasible_crop_ids || []} discarded={data.optimization?.presolver_summary?.discarded || []} soilPh={data.soil_hydraulics?.soil_ph || 6.8} lang={lang} /></div>
          </section>
          <section className="analysis-grid"><div className="span-7"><CropMonitor data={data} lang={lang} /></div><div className="span-5"><ClimateSimulator onSimulate={handleSimulate} isLoading={isLoading} lang={lang} /></div></section>
          <section className="analysis-grid"><div className="span-7"><SmartCalendar data={data} lang={lang} /></div><div className="span-5"><PestDetector data={data} lang={lang} /></div></section>
          <EconomicEvaluation data={data} lang={lang} />
        </>}
        </>}
      </main>

      {cookieNotice && currentPage === 'app' && <aside className="consent-note" aria-label={text('Aviso de privacidad', 'Privacy notice')}><p>{text('Guardamos tu idioma y que cerraste este aviso. Si buscas un lugar, la consulta se envía al geocodificador; las coordenadas y cultivos se envían cuando solicitas el análisis. Consulta nuestro', 'We store your language and that you dismissed this notice. Place searches go to the geocoder; coordinates and crops are sent when you request an analysis. Read our')} <button type="button" className="inline-link" onClick={openPrivacyPage}>{text('aviso de datos y privacidad', 'data and privacy notice')}</button>.</p><button type="button" className="consent-accept" onClick={() => { localStorage.setItem('agro-dss-notice', 'accepted'); setCookieNotice(false); }}>{text('Entendido', 'Got it')}</button></aside>}
      <footer className="site-footer"><span>NASA Agro-DSS <span>·</span> {text('Planificación agrícola informada', 'Evidence-led field planning')}</span><span>NASA POWER · SoilGrids · EONET · FAO-56</span><button type="button" onClick={openPrivacyPage}>{text('Datos, privacidad y uso', 'Data, privacy & terms')}</button></footer>
      <FarmerReportsModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} lat={selectedCoordinates.lat} lon={selectedCoordinates.lon} parcelId={dataSource === 'live' && sameAsAnalyzed ? data.parcel_id : isOfflineMode ? data.parcel_id : `custom_${selectedCoordinates.lat.toFixed(4)}_${selectedCoordinates.lon.toFixed(4)}`} cropOptions={orderedCropOptions} lang={lang} />
      <ModernLoadingModal isOpen={isLoading} lang={lang} onCancel={() => setIsLoading(false)} />
      <ErrorDialogModal
        isOpen={errorModalOpen}
        errorCode={errorModalCode}
        errorMessage={errorModalMessage}
        lang={lang}
        onClose={() => setErrorModalOpen(false)}
        onRetry={() => { setErrorModalOpen(false); void applyCropSelection(); }}
        onEnterManualSoil={() => { setErrorModalOpen(false); setManualSoilOpen(true); setStep(1); }}
        onUseBenchmark={() => { setErrorModalOpen(false); useRegionalBenchmark(); }}
        onMoveMap={() => { setErrorModalOpen(false); setStep(0); }}
      />
      {locationMessage && ((step === 0 && !hasStarted) || step > 1) && <div className={`toast-message ${mapRequestFailed ? 'toast-error' : ''}`} role={mapRequestFailed ? 'alert' : 'status'}><span>{locationMessage}</span><button type="button" onClick={() => setLocationMessage('')} aria-label={text('Cerrar aviso', 'Dismiss notice')}>×</button></div>}
    </div>
  );
};
