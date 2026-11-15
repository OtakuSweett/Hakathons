import React from 'react';
import { Language } from '../types/index.js';

interface PrivacyPageProps {
  lang: Language;
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ lang, onBack }) => {
  const isEs = lang === 'es';
  const t = {
    eyebrow: isEs ? 'NASA AGRO-DSS · TRANSPARENCIA' : 'NASA AGRO-DSS · TRANSPARENCY',
    title: isEs ? 'Datos y privacidad' : 'Data and privacy',
    intro: isEs ? 'Aquí explicamos qué información usa NASA Agro-DSS, cuándo sale de tu dispositivo y qué límites tiene este prototipo.' : 'This page explains what information NASA Agro-DSS uses, when it leaves your device, and the technical scope of the system.',
    back: isEs ? 'Volver a NASA Agro-DSS' : 'Back to NASA Agro-DSS',
    dataTitle: isEs ? 'Qué datos se usan' : 'Data used',
    dataBody: isEs ? 'Para un análisis en vivo, se envían al servidor las coordenadas, los cultivos elegidos, el tamaño del terreno y, si capturas un análisis manual, esos datos de suelo. El régimen de agua elegido se usa en la estimación que ves en pantalla. Si compartes una observación, también recibimos cultivo, etapa, condición del suelo, notas y, si la adjuntas, una fotografía. El nombre es opcional.' : 'For a live analysis, the server receives your coordinates, selected crops, field size, and any soil values you enter manually. The selected water regime is used for the estimate displayed in the page. If you submit an observation, we also receive its form data: crop, growth stage, soil condition, notes, and an attached photo if you choose one. Your name is optional.',
    locationTitle: isEs ? 'Ubicación y búsqueda' : 'Location and search',
    locationBody: isEs ? 'La ubicación del dispositivo solo se obtiene si pulsas el botón de ubicación y autorizas al navegador. Las coordenadas marcadas en el mapa permanecen en la página hasta que solicitas un análisis o envías una observación. Si buscas por nombre de lugar, la consulta se envía al geocodificador configurado (OpenStreetMap Nominatim por defecto).' : 'Device location is accessed only if you press the location button and grant browser permission. Coordinates marked on the map stay in the page until you request an analysis or submit an observation. Place-name searches are sent to the configured geocoder (OpenStreetMap Nominatim by default).',
    sourcesTitle: isEs ? 'Servicios externos' : 'External services',
    sourcesBody: isEs ? 'Al calcular un análisis, el servidor consulta servicios geográficos y ambientales, como NASA POWER, ISRIC SoilGrids, NASA EONET y, cuando hace falta, Open-Meteo. Las teselas del mapa se solicitan al proveedor de la capa que eliges (Esri, OpenStreetMap o NASA GIBS si activas esa capa). Cada proveedor recibe las solicitudes necesarias para responder y aplica sus propias condiciones y políticas.' : 'When you calculate an analysis, the server queries geographic and environmental services such as NASA POWER, ISRIC SoilGrids, NASA EONET, and Open-Meteo when needed. Map tiles are requested from the provider for the layer you select (Esri, OpenStreetMap, or NASA GIBS when enabled). Each provider receives the requests needed to respond and applies its own terms and privacy policy.',
    storageTitle: isEs ? 'Almacenamiento en este dispositivo y en el servidor' : 'Storage on this device and the server',
    storageBody: isEs ? 'Este navegador guarda el idioma y si cerraste el aviso de privacidad mediante almacenamiento local; no usa cookies para esas preferencias. Si un reporte no se puede enviar, se guarda localmente para que puedas sincronizarlo después; la copia pendiente no incluye la fotografía. En esta versión, los reportes recibidos por el servidor se conservan en memoria del proceso y se pierden al reiniciarlo. Otra instalación puede usar una política de almacenamiento distinta.' : 'This browser stores your language and whether you dismissed the privacy notice in local storage; these preferences do not use cookies. If a report cannot be sent, it is saved locally so you can sync it later; the pending copy does not include its photo. In this version, reports received by the server are held in process memory and are lost when it restarts. Other deployments may use a different storage policy.',
    choicesTitle: isEs ? 'Tus opciones' : 'Your choices',
    choicesBody: isEs ? 'Puedes usar coordenadas escritas en lugar del GPS, no enviar reportes, omitir tu nombre y borrar preferencias o reportes pendientes desde el almacenamiento del navegador. Desactivar la capa del mapa evita nuevas solicitudes a ese proveedor de teselas.' : 'You can enter coordinates instead of using GPS, choose not to submit reports, omit your name, and clear preferences or pending reports from browser storage. Turning off a map layer prevents new tile requests to that provider.',
    termsTitle: isEs ? 'Condiciones de uso y alcance técnico' : 'Terms of use & technical scope',
    termsBody: isEs ? 'NASA Agro-DSS es un Sistema de Soporte de Decisiones (DSS) para planificación agrícola e hídrica impulsado por telemetría satelital NASA (POWER, EONET, GIBS) y modelos biofísicos (FAO-56, Saxton-Rawls, HiGHS MILP). Los resultados proporcionan diagnósticos probabilísticos y recomendaciones optimizadas basadas en la mejor evidencia científica disponible; deben contrastarse con mediciones locales de campo y asesoría técnica agronómica.' : 'NASA Agro-DSS is a Decision Support System (DSS) for agricultural and water resilience planning powered by NASA satellite telemetry (POWER, EONET, GIBS) and biophysical models (FAO-56, Saxton-Rawls, HiGHS MILP). The results deliver probabilistic diagnostics and optimized recommendations based on the best available planetary data; they should be verified against local soil tests and field agronomy.',
    updated: isEs ? 'Información correspondiente a la versión operativa del sistema.' : 'Information corresponding to the operational system version.'
  };
  const sections = [
    [t.dataTitle, t.dataBody],
    [t.locationTitle, t.locationBody],
    [t.sourcesTitle, t.sourcesBody],
    [t.storageTitle, t.storageBody],
    [t.choicesTitle, t.choicesBody],
    [t.termsTitle, t.termsBody]
  ];

  return (
    <article className="privacy-page" aria-labelledby="privacy-title">
      <button className="privacy-back" type="button" onClick={onBack}>← {t.back}</button>
      <header className="privacy-heading">
        <p>{t.eyebrow}</p>
        <h1 id="privacy-title">{t.title}</h1>
        <div>{t.intro}</div>
      </header>
      <div className="privacy-sections">
        {sections.map(([title, body], index) => (
          <section className="privacy-section" key={title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div><h2>{title}</h2><p>{body}</p></div>
          </section>
        ))}
      </div>
      <p className="privacy-updated">{t.updated}</p>
    </article>
  );
};
