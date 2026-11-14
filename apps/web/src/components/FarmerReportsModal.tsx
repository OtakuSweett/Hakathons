import React, { useEffect, useState } from 'react';
import { Language } from '../types/index.js';
import { apiFetch } from '../services/api.js';

const compressPhoto = async (file: File): Promise<string> => {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image canvas unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Photo compression failed')), 'image/jpeg', 0.72));
  if (blob.size > 700_000) throw new Error('Photo is too large after compression');
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Photo read failed'));
    reader.readAsDataURL(blob);
  });
};

type PendingReport = Record<string, unknown> & {
  reportedAt?: string;
  cropId?: string;
  reporterName?: string;
  coordinates?: { lat: number; lon: number };
  hasPhoto?: boolean;
};

interface FarmerReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  parcelId: string;
  cropOptions: Array<{ id: string; label: string }>;
  lang: Language;
}

export const FarmerReportsModal: React.FC<FarmerReportsModalProps> = ({
  isOpen,
  onClose,
  lat,
  lon,
  parcelId,
  cropOptions,
  lang
}) => {
  const [reporterName, setReporterName] = useState('');
  const [cropStage, setCropStage] = useState('vegetativo');
  const [observedCropId, setObservedCropId] = useState(cropOptions[0]?.id || '');
  const [moistureObs, setMoistureObs] = useState<'seco' | 'adecuado' | 'encharcado'>('adecuado');
  const [pestObs, setPestObs] = useState('');
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [isSyncingReports, setIsSyncingReports] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setObservedCropId(cropOptions[0]?.id || '');
    setSubmitError('');
    setSuccessMsg(false);
    try {
      setPendingReports(JSON.parse(localStorage.getItem('agro-dss-pending-reports') || '[]') as PendingReport[]);
    } catch {
      setPendingReports([]);
    }
  }, [isOpen, cropOptions[0]?.id]);

  if (!isOpen) return null;

  const t = {
    es: {
      title: 'Reporte de Observación en Campo (Ground Truthing)',
      subtitle: 'Tus observaciones georreferenciadas calibran y validan las predicciones satelitales (NASA POWER, MODIS NDVI e ISRIC SoilGrids).',
      farmerLabel: 'Nombre del Productor / Observador (Opcional):',
      cropLabel: 'Cultivo observado:',
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
      pestPlaceholder: 'Ej. Manchas foliares color café o larvas en cogollo...',
      notesLabel: 'Comentarios Adicionales:',
      notesPlaceholder: 'Anotaciones sobre riego reciente, laboreo o fertilización aplicada...',
      photoLabel: 'Evidencia Fotográfica de Parcela:',
      photoButton: 'Adjuntar Fotografía de Campo',
      submitButton: 'Enviar Reporte al Sistema DSS',
      submitting: 'Enviando...',
      success: '¡Reporte recibido exitosamente! Gracias por contribuir a la calibración del modelo.',
      successLocal: 'Observación guardada en este dispositivo. Conserva este navegador para consultarla después.',
      localPhotoNote: 'La foto requiere conexión; vuelve a adjuntarla para enviarla.',
      pendingLabel: 'Observaciones guardadas en este dispositivo',
      syncPending: 'Enviar ahora',
      syncing: 'Enviando…',
      synced: 'Observaciones pendientes enviadas.',
      syncFailed: 'Algunas observaciones siguen pendientes. Conservamos una copia en este dispositivo.',
      error: 'No se pudo guardar el reporte. Intenta nuevamente.',
      close: 'Cerrar'
    },
    en: {
      title: 'Field Observation Report (Ground Truthing)',
      subtitle: 'Your georeferenced observations calibrate and validate satellite models (NASA POWER, MODIS NDVI, and ISRIC SoilGrids).',
      farmerLabel: 'Farmer / Observer Name (Optional):',
      cropLabel: 'Observed crop:',
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
      successLocal: 'Observation saved on this device. Keep this browser to access it later.',
      localPhotoNote: 'The photo needs a connection; attach it again when submitting.',
      pendingLabel: 'Observations saved on this device',
      syncPending: 'Send now',
      syncing: 'Sending…',
      synced: 'Pending observations sent.',
      syncFailed: 'Some observations are still pending. A copy remains on this device.',
      error: 'The report could not be saved. Please try again.',
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
      reporterName: reporterName || (lang === 'es' ? 'Anónimo' : 'Anonymous'),
      cropId: observedCropId,
      cropStage,
      soilMoistureStatus: moistureObs,
      pestSigns: pestObs,
      fieldNotes: notes,
      hasPhoto: !!fileName,
      photoDataUrl
    };

    try {
      const response = await apiFetch('/api/farmer-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Report API unavailable');
      setSavedLocally(false);
    } catch {
      try {
        const existing = JSON.parse(localStorage.getItem('agro-dss-pending-reports') || '[]') as PendingReport[];
        const { photoDataUrl: _photo, ...offlinePayload } = payload;
        const updated = [...existing.slice(-19), offlinePayload as PendingReport];
        localStorage.setItem('agro-dss-pending-reports', JSON.stringify(updated));
        setPendingReports(updated);
        setSavedLocally(true);
      } catch {
        setSubmitError(t.error);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setSubmitError('');
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 2000);
  };

  const syncPendingReports = async () => {
    setIsSyncingReports(true);
    setPendingStatus('');
    const remaining: PendingReport[] = [];
    for (let index = 0; index < pendingReports.length; index += 1) {
      const report = pendingReports[index];
      try {
        const response = await apiFetch('/api/farmer-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        if (!response.ok) remaining.push(report);
      } catch {
        remaining.push(...pendingReports.slice(index));
        break;
      }
    }
    try {
      localStorage.setItem('agro-dss-pending-reports', JSON.stringify(remaining));
      setPendingReports(remaining);
      setPendingStatus(remaining.length ? t.syncFailed : t.synced);
    } catch {
      setPendingStatus(t.syncFailed);
    }
    setIsSyncingReports(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="field-report-title" className="bg-zinc-950 rounded-xl max-w-lg w-full shadow-xl border border-white/[0.1] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-900/80 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              {lang === 'es' ? 'OBSERVACIÓN DE CAMPO' : 'FIELD OBSERVATION'}
            </span>
            <h3 id="field-report-title" className="text-sm font-bold text-white mt-0.5">{t.title}</h3>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-zinc-400 -mt-1 leading-relaxed text-[11px]">{t.subtitle}</p>
          {pendingReports.length > 0 && <details className="pending-report-list"><summary>{t.pendingLabel} · {pendingReports.length}</summary><div>{pendingReports.slice().reverse().map((report, index) => <p key={`${report.reportedAt || 'saved'}-${index}`}><b>{cropOptions.find((crop) => crop.id === report.cropId)?.label || String(report.cropId || '')}</b> · {report.coordinates?.lat?.toFixed(4)}, {report.coordinates?.lon?.toFixed(4)} {report.hasPhoto && `· ${t.localPhotoNote}`}</p>)}</div><button type="button" disabled={isSyncingReports || !navigator.onLine} onClick={() => void syncPendingReports()}>{isSyncingReports ? t.syncing : t.syncPending}</button>{pendingStatus && <small role="status">{pendingStatus}</small>}</details>}

          {/* Coordinates & Parcel */}
          <div className="bg-zinc-900/70 p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-zinc-500 text-[10px] block">{t.coordsLabel}</span>
              <span className="font-bold text-white font-mono">
                {lat.toFixed(4)}°, {lon.toFixed(4)}°
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-500/30">
              {parcelId}
            </span>
          </div>

          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.cropLabel}</label>
            <select value={observedCropId} onChange={(event) => setObservedCropId(event.target.value)} className="w-full px-3 py-2 bg-zinc-900 text-zinc-100 border border-white/[0.08] rounded-lg">
              {cropOptions.map((crop) => <option key={crop.id} value={crop.id}>{crop.label}</option>)}
            </select>
          </div>

          {/* Reporter Name */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.farmerLabel}</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Juan Pérez / Rancho San Isidro"
              className="w-full px-3 py-2 bg-zinc-900 text-zinc-100 border border-white/[0.08] rounded-xl focus:border-emerald-500/60 focus:outline-hidden"
            />
          </div>

          {/* Observed Stage */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.stageLabel}</label>
            <select
              value={cropStage}
              onChange={(e) => setCropStage(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 text-zinc-100 border border-white/[0.08] rounded-xl focus:border-emerald-500/60 focus:outline-hidden"
            >
              <option value="emergencia">{t.stageOpts.emergencia}</option>
              <option value="vegetativo">{t.stageOpts.vegetativo}</option>
              <option value="floracion">{t.stageOpts.floracion}</option>
              <option value="madurez">{t.stageOpts.madurez}</option>
            </select>
          </div>

          {/* Soil Moisture Feeling */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.moistureLabel}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['seco', 'adecuado', 'encharcado'] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setMoistureObs(opt)}
                  className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer text-[11px] ${
                    moistureObs === opt
                      ? 'bg-emerald-500 text-zinc-950 font-bold border-emerald-500 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  {t.moistureOpts[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Pest Observation */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.pestLabel}</label>
            <input
              type="text"
              value={pestObs}
              onChange={(e) => setPestObs(e.target.value)}
              placeholder={t.pestPlaceholder}
              className="w-full px-3 py-2 bg-zinc-900 text-zinc-100 border border-white/[0.08] rounded-xl focus:border-emerald-500/60 focus:outline-hidden"
            />
          </div>

          {/* Field Notes */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.notesLabel}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className="w-full px-3 py-2 bg-zinc-900 text-zinc-100 border border-white/[0.08] rounded-xl focus:border-emerald-500/60 focus:outline-hidden resize-none"
            />
          </div>

          {/* Photo Attachment */}
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">{t.photoLabel}</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium transition-all inline-flex items-center gap-2 border border-white/[0.08]">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{t.photoButton}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setFileName(null);
                    setPhotoDataUrl(null);
                    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
                      setSubmitError(lang === 'es' ? 'Elige una imagen de hasta 10 MB.' : 'Choose an image up to 10 MB.');
                      e.target.value = '';
                      return;
                    }
                    setIsPreparingPhoto(true);
                    void compressPhoto(file).then((compressed) => {
                      setFileName(file.name);
                      setPhotoDataUrl(compressed);
                      setSubmitError('');
                    }).catch(() => setSubmitError(lang === 'es' ? 'No pudimos preparar esa imagen. Prueba con una foto más pequeña.' : 'We could not prepare that image. Try a smaller photo.')).finally(() => setIsPreparingPhoto(false));
                  }}
                />
              </label>
              {fileName && (
                <span className="text-[11px] text-emerald-400 font-medium truncate max-w-[200px]">
                  ✓ {fileName}
                </span>
              )}
            </div>
            {isPreparingPhoto && <small className="block mt-2 text-zinc-400" role="status">{lang === 'es' ? 'Preparando fotografía…' : 'Preparing photo…'}</small>}
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium text-center">
              {savedLocally ? t.successLocal : t.success}{savedLocally && fileName && <small className="block mt-1">{t.localPhotoNote}</small>}
            </div>
          )}
          {submitError && <p className="inline-message inline-error" role="alert">{submitError}</p>}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 font-medium transition-all cursor-pointer"
            >
              {t.close}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPreparingPhoto}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? t.submitting : t.submitButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
