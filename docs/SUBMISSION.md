# 🚀 Documento Oficial de Entrega — NASA Space Apps Challenge 2026

## 1. Información General del Proyecto
- **Nombre del Proyecto:** Global Crop Rotation & Water Resilience DSS (NASA Agro-DSS)
- **Desafío:** *Desplazamiento de campo: Adaptando granjas con datos de la NASA* (*Shifting Lands: Adapting Farms with NASA Data*)
- **Evento Local:** Querétaro, México
- **Repositorio de Código Abierto:** [https://github.com/OtakuSweett/NASA-Agro-DSS](https://github.com/OtakuSweett/NASA-Agro-DSS)
- **Licencia:** MIT (Open Source)

---

## 2. Resumen Ejecutivo de Alto Nivel (*High-Level Project Summary*)
Los agricultores de todo el mundo enfrentan el desplazamiento de las zonas agroclimáticas debido al calentamiento global ($+1.8^\circ\text{C}$), el retraso en los temporales de lluvia y el severo abatimiento de acuíferos subterráneos. Estas presiones provocan que el monocultivo tradicional de cereales (maíz/trigo) presente hasta un $68\%$ de riesgo de colapso de rendimiento.

**NASA Agro-DSS** es un Sistema de Apoyo a la Toma de Decisiones de escala planetaria que fusiona cuatro fuentes de datos terrestres de la NASA (NASA POWER, ISRIC SoilGrids v2.0, NASA EONET v3 y NASA GIBS) con modelos físicos y de optimización matemática rigurosa. El sistema diagnostica el desplazamiento agroclimático de cualquier parcela terrestre, calcula en tiempo real la dinámica de agua en el suelo y el día crítico de estrés ($t^*$), y genera secuencias óptimas de rotación multianual (3 a 4 años) que integran leguminosas fijadoras de nitrógeno. Esto reduce la demanda de agua en más de un $40\%$, reincorpora hasta $80\text{ kg N/ha}$ de fertilidad orgánica natural y garantiza la viabilidad económica del productor mediante una frontera de Pareto interactiva.

---

## 3. ¿Cómo Resuelve Específicamente el Desafío de la NASA?
El reto exige crear una herramienta que utilice observaciones terrestres de la NASA junto con información local del suelo, características de los cultivos y prioridades de los agricultores. Nuestro sistema lo resuelve en cuatro pilares:
1. **Sin Límites Geográficos (Cobertura Planetaria Real):** Acepta cualquier coordenada $(lat, lon)$ en la Tierra, adaptando dinámicamente la radiación solar y la declinación en la ecuación de FAO-56 Penman-Monteith, e invirtiendo automáticamente las estaciones 6 meses para parcelas en el Hemisferio Sur.
2. **Física sin "Caja Negra" (7 Módulos Transparentes):**
   - *Módulo 1:* Reconstrucción de series NDVI con Splines Cúbicos Naturales (Thomas Algorithm TDMA, exactitud $< 10^{-9}$ contra SciPy).
   - *Módulo 2:* Integral térmica GDD acumulada mediante Simpson 1/3 compuesto sobre días solares locales (LST).
   - *Módulo 3:* Balance hídrico dinámico resuelto como EDO mediante Runge-Kutta de 4to Orden (RK4), inyectando pulsos extraordinarios de precipitación ante ciclones/tormentas detectados por NASA EONET v3.
   - *Módulo 4:* Localización continua de la raíz $W(t) = W_{\text{crítico}}$ con Newton-Raphson para predecir con exactitud la fecha crítica de riego $t^*$ y lámina $\Delta I$.
   - *Módulo 5:* Pre-solver agronómico que descarta cultivos incompatibles por pH de suelo o umbral térmico.
   - *Módulo 6:* Optimizador MILP multianual resuelto con HiGHS que enforce anti-monocultivo y presencia obligatoria de leguminosas.
   - *Módulo 7:* Análisis de sensibilidad dual con precios sombra del agua ($y_{\text{agua}} = \frac{\partial Z^*}{\partial b_k}$) y slider continuo de Pareto $\lambda \in [0, 1]$.
3. **El Agricultor en el Centro (UX Diseñada para el Productor):** Delimitación interactiva de hectáreas reales sobre mapas satelitales Esri HD, configuración del régimen de agua (temporal vs goteo vs gravedad), semáforo preventivo de plagas y reporte participativo en campo (*ground truthing*).
4. **Resiliencia de Demostración (Modo Offline con Cero Fallas):** Si el internet del evento falla, el sistema conmuta suavemente a 10 benchmarks calibrados en México, Estados Unidos, Argentina, Brasil, España e India sin mostrar pantallas de error.

---

## 4. Observaciones Terrestres de la NASA y Datos Espaciales Utilizados
- **NASA POWER (Prediction of Worldwide Energy Resources):** Radiación solar diaria incidente en superficie (`ALLSKY_SFC_SW_DWN`), temperatura a 2m (`T2M`), humedad relativa (`RH2M`), precipitación corregida (`PRECTOTCORR`) y velocidad de viento a 10m (`WS10M` convertida a 2m según FAO-56).
- **NASA EONET v3 (Earth Observatory Natural Event Tracker):** Ingesta en tiempo real de trayectorias de ciclones, huracanes y tormentas severas (`category=severeStorms`) dentro de un radio de influencia de $150\text{ km}$ para prevenir pérdidas catastróficas.
- **NASA GIBS WMTS (Global Imagery Browse Services):** Capa satelital raster de índice de vegetación `MODIS_Terra_NDVI_8Day` visualizada sobre el mapa geográfico.
- **ISRIC SoilGrids v2.0 (Global Gridded Soil Information):** Arcilla, arena, limo, pH en agua (`phh2o`), carbono orgánico del suelo (`soc`) y nitrógeno total a profundidades estandarizadas.
- **NASA AppEEARS / Earthdata:** Soporte autenticado de series históricas MODIS y calibración de humedad SMAP.

---

## 5. Herramientas y Tecnologías de Código Abierto Empleadas
- **Backend / Gateway:** Node.js, TypeScript, Fastify v5, `@fastify/cors`, Ajv (validación estricta de JSON Schemas Draft 2020-12).
- **Motores Científicos y Numéricos:** Python 3.12+, FastAPI, Uvicorn, NumPy, SciPy (interpolación y optimización), PuLP y el motor de optimización matemática HiGHS (`highspy`).
- **Frontend / Dashboard:** React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet, React-Leaflet, Recharts.
- **DevOps y Pruebas:** Vitest (TypeScript), Pytest y Pytest-Asyncio (Python), monorepo gobernado con `pnpm` workspaces y `uv`.

---

## 6. Enlace a la Demostración y Repositorio
- **Código Fuente en GitHub:** [https://github.com/OtakuSweett/NASA-Agro-DSS](https://github.com/OtakuSweett/NASA-Agro-DSS)
- **Instrucción de Arranque Rápido:**
  ```bash
  git clone https://github.com/OtakuSweett/NASA-Agro-DSS.git
  cd NASA-Agro-DSS
  cp .env.example .env
  pnpm install
  pnpm dev
  ```
- **Pruebas Automatizadas:** `pnpm test` (29 pruebas TS: 16 backend Fastify + 13 frontend React) y `pnpm test:py` (10 pruebas Python) pasando al 100% (39 de 39 pruebas verdes, 0 advertencias).
