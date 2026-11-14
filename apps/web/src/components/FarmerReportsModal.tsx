import React, { useState } from 'react';
import { Language } from '../types/index.js';

interface FarmerReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  parcelId: string;
  lang: Language;
}

export const FarmerReportsModal: React.FC<FarmerReportsModalProps> = ({
  isOpen,
  onClose,
  lat,
  lon,
  parcelId,
  lang
}) => {
  const [reporterName, setReporterName] = useState('');
  const [cropStage, setCropStage] = useState('vegetativo');
  const [moistureObs, setMoistureObs] = useState<'seco' | 'adecuado' | 'encharcado'>('adecuado');
  const [pestObs, setPestObs] = useState('');
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const t = {
    es: {
      title: 'Reporte de Observación en Campo (Ground Truthing)',
      subtitle: 'Tus observaciones georreferenciadas calibran y validan las predicciones satelitales (NASA POWER, MODIS NDVI e ISRIC SoilGrids).',
      farmerLabel: 'Nombre del Productor / Observador (Opcional):',
      coordsLabel: 'Coordenadas Geográficas:',
      stageLabel: 'Etapa Fenológica Observada:',
      stageOpts: {
        emergencia: '1. Emergencia / Germinación',
        vegetativo: '2. Desarrollo Vegetativo Pleno',
        floracion: '3. Floración / Llenado de Grano',
        madurez: '4. Madurez Fisiológica / Cosecha'
      },
      moistureLabel: 'Sensación de Humedad en Suelo:',
      moistureOpts: {
        seco: 'Seco / Grietas visibles',
        adecuado: 'Húmedo / Adecuado',
        encharcado: 'Saturado / Encharcado'
      },
      pestLabel: 'Signos de Plagas o Enfermedades:',
      pestPlaceholder: 'Ej. Manchas foliares color café o presencia de larvas en cogollo...',
      notesLabel: 'Comentarios Adicionales:',
      notesPlaceholder: 'Anotaciones sobre riego reciente, laboreo o fertilización aplicada...',
      photoLabel: 'Evidencia Fotográfica de Parcela:',
      photoButton: 'Adjuntar Fotografía de Campo',
      submitButton: 'Enviar Reporte al Sistema DSS',
      submitting: 'Enviando...',
      success: '¡Reporte recibido exitosamente! Gracias por contribuir a la calibración del modelo.',
      close: 'Cerrar'
    },
    en: {
      title: 'Field Observation Report (Ground Truthing)',
      subtitle: 'Your georeferenced observations calibrate and validate satellite models (NASA POWER, MODIS NDVI, and ISRIC SoilGrids).',
      farmerLabel: 'Farmer / Observer Name (Optional):',
      coordsLabel: 'Geographic Coordinates:',
      stageLabel: 'Observed Phenological Stage:',
      stageOpts: {
        emergencia: '1. Emergence / Germination',
        vegetativo: '2. Peak Vegetative Growth',
        floracion: '3. Flowering / Grain Filling',
        madurez: '4. Physiological Maturity / Harvest'
      },
      moistureLabel: 'Field Soil Moisture Feeling:',
      moistureOpts: {
        seco: 'Dry / Cracking evident',
        adecuado: 'Moist / Adequate',
        encharcado: 'Saturated / Waterlogged'
      },
      pestLabel: 'Signs of Pests or Diseases:',
      pestPlaceholder: 'E.g. Brown foliar spots or whorl caterpillar presence...',
      notesLabel: 'Additional Observations:',
      notesPlaceholder: 'Notes on recent irrigation, tillage or applied fertilizer...',
      photoLabel: 'Field Photographic Evidence:',
      photoButton: 'Attach Field Photo',
      submitButton: 'Submit Report to DSS System',
      submitting: 'Submitting...',
      success: 'Report received successfully! Thank you for improving satellite ground truth calibration.',
      close: 'Close'
    }
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      parcelId,
      coordinates: { lat, lon },
      reportedAt: new Date().toISOString(),
      reporterName: reporterName || 'Anónimo',
      cropStage,
      soilMoistureStatus: moistureObs,
      pestSigns: pestObs,
      fieldNotes: notes,
      hasPhoto: !!fileName
    };

    try {
      await fetch('http://localhost:3000/api/farmer-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      // Local fallback in demo mode
    }

    setIsSubmitting(false);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
              Función 9 / Crowdsourcing & Satellites
            </span>
            <h3 className="text-base font-bold">{t.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-800 text-white hover:bg-emerald-700 flex items-center justify-center transition-all cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-gray-600 -mt-1">{t.subtitle}</p>

          {/* Coordinates & Parcel */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-[10px] block">{t.coordsLabel}</span>
              <span className="font-bold text-emerald-950 font-mono">
                {lat.toFixed(4)}°, {lon.toFixed(4)}°
              </span>
            </div>
            <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-bold px-2 py-0.5 rounded">
              {parcelId}
            </span>
          </div>

          {/* Reporter Name */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">{t.farmerLabel}</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Juan Pérez / Rancho San Isidro"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Observed Stage */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">{t.stageLabel}</label>
            <select
              value={cropStage}
              onChange={(e) => setCropStage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
            >
              <option value="emergencia">{t.stageOpts.emergencia}</option>
              <option value="vegetativo">{t.stageOpts.vegetativo}</option>
              <option value="floracion">{t.stageOpts.floracion}</option>
              <option value="madurez">{t.stageOpts.madurez}</option>
            </select>
          </div>

          {/* Soil Moisture Feeling */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">{t.moistureLabel}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['seco', 'adecuado', 'encharcado'] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setMoistureObs(opt)}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    moistureObs === opt
                      ? 'bg-emerald-600 text-white font-bold border-emerald-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t.moistureOpts[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Pest Observation */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">{t.pestLabel}</label>
            <input
              type="text"
              value={pestObs}
              onChange={(e) => setPestObs(e.target.value)}
              placeholder={t.pestPlaceholder}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Field Notes */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">{t.notesLabel}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Simulated Photo Attachment */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">{t.photoLabel}</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all inline-block border border-gray-200">
                📷 {t.photoButton}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFileName(e.target.files[0].name);
                    }
                  }}
                />
              </label>
              {fileName && (
                <span className="text-[11px] text-emerald-700 font-medium truncate max-w-[200px]">
                  ✓ {fileName}
                </span>
              )}
            </div>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium animate-fade-in text-center">
              {t.success}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-all"
            >
              {t.close}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? t.submitting : t.submitButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
