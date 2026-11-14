import React, { useState, useEffect, useCallback } from 'react';
import { Language, AnalysisResponse } from './types/index.js';
import { DEMO_PRESETS_LIST, getMockAnalysis } from './services/mockData.js';
import { Navbar } from './components/Navbar.js';
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

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('el_marques_qro');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [data, setData] = useState<AnalysisResponse>(() => getMockAnalysis('el_marques_qro'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [areaHa, setAreaHa] = useState<number>(15.0);
  const [waterRegime, setWaterRegime] = useState<'temporal' | 'goteo' | 'gravedad'>('goteo');

  // Load parcel analysis data
  const loadAnalysis = useCallback(async (presetId: string, forceOffline: boolean) => {
    setIsLoading(true);
    if (forceOffline) {
      setData(getMockAnalysis(presetId));
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/analyze?presetId=${presetId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(getMockAnalysis(presetId));
      }
    } catch {
      setData(getMockAnalysis(presetId));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalysis(selectedPresetId, isOfflineMode);
  }, [selectedPresetId, isOfflineMode, loadAnalysis]);

  // Handle live Earth coordinate selection from RiskMap click
  const handleMapCoordinateSelect = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcel_id: `custom_${lat.toFixed(2)}_${lon.toFixed(2)}`,
          coordinates: { lat, lon }
        })
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData((prev) => ({
          ...prev,
          coordinates: { lat, lon },
          parcel_id: `custom_${lat.toFixed(2)}_${lon.toFixed(2)}`
        }));
      }
    } catch {
      setData((prev) => ({
        ...prev,
        coordinates: { lat, lon },
        parcel_id: `custom_${lat.toFixed(2)}_${lon.toFixed(2)}`
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Climate Simulator "What-If" updates
  const handleSimulate = async (deltaPrecip: number, deltaTemp: number, eonetPulse: boolean) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: selectedPresetId,
          deltaPrecipPct: deltaPrecip,
          deltaTempC: deltaTemp,
          injectEonetPulse: eonetPulse
        })
      });

      if (res.ok) {
        const simData = await res.json();
        setData((prev) => ({
          ...prev,
          physics: simData.physics || prev.physics,
          optimization: simData.optimization || prev.optimization
        }));
      } else {
        applyLocalSimulation(deltaPrecip, deltaTemp, eonetPulse);
      }
    } catch {
      applyLocalSimulation(deltaPrecip, deltaTemp, eonetPulse);
    } finally {
      setIsLoading(false);
    }
  };

  const applyLocalSimulation = (deltaPrecip: number, deltaTemp: number, eonetPulse: boolean) => {
    setData((prev) => {
      const wb = prev.physics.water_balance;
      const factor = 1.0 + deltaPrecip / 100.0;
      const extraPulse = eonetPulse ? 65.0 : 0.0;
      const newW = wb.w_mm.map((w, i) =>
        Math.max(40.0, w * factor + (i === 15 ? extraPulse : 0) - deltaTemp * 1.5)
      );

      const isCritical = newW.some((w) => w < prev.soil_hydraulics.critical_water_mm);

      return {
        ...prev,
        physics: {
          ...prev.physics,
          water_balance: {
            ...wb,
            w_mm: newW
          },
          irrigation_trigger: {
            t_star_days: isCritical ? 9 : null,
            delta_i_mm: isCritical ? 48.0 : null,
            reason: isCritical ? 'Stress simulated by what-if scenario' : null
          }
        }
      };
    });
  };

  const currentPresetName =
    DEMO_PRESETS_LIST.find((p) => p.presetId === selectedPresetId)?.parcelName ||
    data.parcel_id;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navigation */}
      <Navbar
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
        isOfflineMode={isOfflineMode}
        onToggleOffline={() => setIsOfflineMode((prev) => !prev)}
        presets={DEMO_PRESETS_LIST}
        activePresetId={selectedPresetId}
        onSelectPreset={setSelectedPresetId}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            {lang === 'es' ? 'Computando modelos físicos y optimización...' : 'Computing physical models & solver...'}
          </div>
        )}

        {/* Función 2: Alertas Anticipadas */}
        <EarlyWarningBanner
          trigger={data.physics?.irrigation_trigger || { t_star_days: null, delta_i_mm: null, reason: null }}
          eonetCount={data.eonet_hazard_alerts?.length || 0}
          meanTempC={data.climate_summary?.mean_temperature_c || 21.0}
          lang={lang}
        />

        {/* Shifting Lands: Motor de Desplazamiento Agroclimático & Adaptación de Granjas (Core Challenge) */}
        <ShiftingLands
          data={data}
          areaHa={areaHa}
          waterRegime={waterRegime}
          lang={lang}
        />

        {/* Row 1: Delimitación de Parcela y Mapa de Riesgos (F1) & Recomendaciones Agrícolas (F3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <RiskMap
              lat={data.coordinates.lat}
              lon={data.coordinates.lon}
              parcelName={currentPresetName}
              eonetAlerts={data.eonet_hazard_alerts || []}
              areaHa={areaHa}
              onAreaChange={setAreaHa}
              waterRegime={waterRegime}
              onWaterRegimeChange={setWaterRegime}
              lang={lang}
              onMapClick={handleMapCoordinateSelect}
              onSelectRegion={(rLat, rLon) => handleMapCoordinateSelect(rLat, rLon)}
            />
          </div>
          <div className="lg:col-span-5">
            <CropAdvisor
              viableCropIds={data.optimization?.presolver_summary?.feasible_crop_ids || []}
              discarded={data.optimization?.presolver_summary?.discarded || []}
              soilPh={data.soil_hydraulics?.soil_ph || 6.8}
              lang={lang}
            />
          </div>
        </div>

        {/* Row 2: Monitoreo de Cultivos (F5) & Simulador Climático (F4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <CropMonitor data={data} lang={lang} />
          </div>
          <div className="lg:col-span-5">
            <ClimateSimulator
              onSimulate={handleSimulate}
              isLoading={isLoading}
              lang={lang}
            />
          </div>
        </div>

        {/* Row 3: Calendario Inteligente (F6) & Detector de Plagas (F7) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <SmartCalendar data={data} lang={lang} />
          </div>
          <div className="lg:col-span-5">
            <PestDetector data={data} lang={lang} />
          </div>
        </div>

        {/* Row 4: Evaluación Económica & Frontera de Pareto (F8) */}
        <div>
          <EconomicEvaluation data={data} lang={lang} />
        </div>
      </main>

      {/* Función 9: Modal de Reportes de Agricultores */}
      <FarmerReportsModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        lat={data.coordinates.lat}
        lon={data.coordinates.lon}
        parcelId={data.parcel_id}
        lang={lang}
      />

      {/* Global Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-200 text-sm">Global Crop Rotation & Water Resilience DSS</span>
            <p className="text-[11px] text-emerald-400 mt-0.5">
              NASA Space Apps Challenge 2026 — Desplazamiento de campo: Adaptando granjas con datos de la NASA
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>NASA POWER (Meteorology)</span>
            <span>•</span>
            <span>ISRIC SoilGrids v2.0 (Hydraulics)</span>
            <span>•</span>
            <span>NASA EONET v3 (Hazards)</span>
            <span>•</span>
            <span>FAO-56 Penman-Monteith</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
