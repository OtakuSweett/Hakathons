import React from 'react';
import { Language } from '../types/index.js';

interface PrivacyPageProps {
  lang: Language;
  onBack: () => void;
}

const copy = {
  es: {
    eyebrow: 'NASA AGRO-DSS · TRANSPARENCIA',
    title: 'Datos y privacidad',
    intro: 'Aquí explicamos qué información usa NASA Agro-DSS, cuándo sale de tu dispositivo y qué límites tiene este prototipo.',
    back: 'Volver a NASA Agro-DSS',
    dataTitle: 'Qué datos se usan',
    dataBody: 'Para un análisis en vivo, se envían al servidor las coordenadas, los cultivos elegidos, el tamaño del terreno y, si capturas un análisis manual, esos datos de suelo. El régimen de agua elegido se usa en la estimación que ves en pantalla. Si compartes una observación, también recibimos cultivo, etapa, condición del suelo, notas y, si la adjuntas, una fotografía. El nombre es opcional.',
    locationTitle: 'Ubicación y búsqueda',
    locationBody: 'La ubicación del dispositivo solo se obtiene si pulsas el botón de ubicación y autorizas al navegador. Las coordenadas marcadas en el mapa permanecen en la página hasta que solicitas un análisis o envías una observación. Si buscas por nombre de lugar, la consulta se envía al geocodificador configurado (OpenStreetMap Nominatim por defecto).',
    sourcesTitle: 'Servicios externos',
    sourcesBody: 'Al calcular un análisis, el servidor consulta servicios geográficos y ambientales, como NASA POWER, ISRIC SoilGrids, NASA EONET y, cuando hace falta, Open-Meteo. Las teselas del mapa se solicitan al proveedor de la capa que eliges (Esri, OpenStreetMap o NASA GIBS si activas esa capa). Cada proveedor recibe las solicitudes necesarias para responder y aplica sus propias condiciones y políticas.',
    storageTitle: 'Almacenamiento en este dispositivo y en el servidor',
    storageBody: 'Este navegador guarda el idioma y si cerraste el aviso de privacidad mediante almacenamiento local; no usa cookies para esas preferencias. Si un reporte no se puede enviar, se guarda localmente para que puedas sincronizarlo después; la copia pendiente no incluye la fotografía. En esta versión, los reportes recibidos por el servidor se conservan en memoria del proceso y se pierden al reiniciarlo. Otra instalación puede usar una política de almacenamiento distinta.',
    choicesTitle: 'Tus opciones',
    choicesBody: 'Puedes usar coordenadas escritas en lugar del GPS, no enviar reportes, omitir tu nombre y borrar preferencias o reportes pendientes desde el almacenamiento del navegador. Desactivar la capa del mapa evita nuevas solicitudes a ese proveedor de teselas.',
    termsTitle: 'Condiciones de uso',
    termsBody: 'NASA Agro-DSS es una herramienta de apoyo y demostración. Los resultados dependen de datos disponibles y pueden ser incompletos o estimados; no garantizan rendimiento, disponibilidad de agua ni ausencia de riesgos. Contrasta las decisiones agronómicas con mediciones de tu parcela y asesoría local. No uses esta herramienta como servicio de emergencia.',
    updated: 'Información correspondiente a la versión actual del prototipo.'
  },
  en: {
    eyebrow: 'NASA AGRO-DSS · TRANSPARENCY',
    title: 'Data and privacy',
    intro: 'This page explains what information NASA Agro-DSS uses, when it leaves your device, and the limits of this prototype.',
    back: 'Back to NASA Agro-DSS',
    dataTitle: 'Data used',
    dataBody: 'For a live analysis, the server receives your coordinates, selected crops, field size, and any soil values you enter manually. The selected water regime is used for the estimate displayed in the page. If you submit an observation, we also receive its form data: crop, growth stage, soil condition, notes, and an attached photo if you choose one. Your name is optional.',
    locationTitle: 'Location and search',
    locationBody: 'Device location is accessed only if you press the location button and grant browser permission. Coordinates marked on the map stay in the page until you request an analysis or submit an observation. Place-name searches are sent to the configured geocoder (OpenStreetMap Nominatim by default).',
    sourcesTitle: 'External services',
    sourcesBody: 'When you calculate an analysis, the server queries geographic and environmental services such as NASA POWER, ISRIC SoilGrids, NASA EONET, and Open-Meteo when needed. Map tiles are requested from the provider for the layer you select (Esri, OpenStreetMap, or NASA GIBS when enabled). Each provider receives the requests needed to respond and applies its own terms and privacy policy.',
    storageTitle: 'Storage on this device and the server',
    storageBody: 'This browser stores your language and whether you dismissed the privacy notice in local storage; these preferences do not use cookies. If a report cannot be sent, it is saved locally so you can sync it later; the pending copy does not include its photo. In this version, reports received by the server are held in process memory and are lost when it restarts. Other deployments may use a different storage policy.',
    choicesTitle: 'Your choices',
    choicesBody: 'You can enter coordinates instead of using GPS, choose not to submit reports, omit your name, and clear preferences or pending reports from browser storage. Turning off a map layer prevents new tile requests to that provider.',
    termsTitle: 'Terms of use',
    termsBody: 'NASA Agro-DSS is a decision-support and demonstration tool. Results depend on available data and may be incomplete or estimated; they do not guarantee yield, water availability, or absence of hazards. Check agronomic decisions against field measurements and local advice. Do not use this tool as an emergency service.',
    updated: 'Information for the current prototype version.'
  }
} satisfies Record<Language, Record<string, string>>;

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ lang, onBack }) => {
  const t = copy[lang];
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
