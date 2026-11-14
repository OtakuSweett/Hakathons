# API Reference — NASA Agro-DSS
> ES: Referencia de APIs verificadas y especificaciones de integración técnica para NASA Agro-DSS.

**Updated:** 2026-11-14 | **Environment:** NASA Space Apps 2026 — El Bajío / Querétaro, MX

---

## 1. Conexión Exacta de APIs por Módulo

### A. NASA POWER Hourly & Daily API (Meteorología y Clima)
- **Hourly Endpoint:** `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=T2M,RH2M,PRECTOTCORR,WS10M&community=RE&longitude=-100.3899&latitude=20.5888&start=YYYYMMDD&end=YYYYMMDD&format=JSON`
- **Daily Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS,PRECTOTCORR&community=AG&longitude=-100.3899&latitude=20.5888&start=YYYYMMDD&end=YYYYMMDD&format=JSON`
- **Auth:** Ninguna requerida (acceso público).
- **Time Standard:** `LST` (*Local Solar Time*), hora solar local calculada por la longitud de la parcela.
- **Claves JSON y Unidades Canónicas:**
  - `T2M`: Temperatura a 2 metros (°C).
  - `T2M_MAX`, `T2M_MIN`: Temperatura máxima y mínima diaria (°C).
  - `RH2M`: Humedad relativa a 2 metros del suelo (%).
  - `PRECTOTCORR`: Precipitación corregida por hora (`mm/h`) o acumulada diaria (`mm/día`).
  - `WS10M`: Velocidad del viento a 10 metros de altura (`m/s`).
  - `WS2M`: Velocidad del viento a 2 metros de altura (`m/s`). Si solo se cuenta con `WS10M`, convertir mediante:
    $$u_2 = u_{10} \cdot \frac{4.87}{\ln(67.8 \cdot 10 - 5.42)} \approx 0.748 \cdot u_{10}$$
  - `ALLSKY_SFC_SW_DWN`: Radiación solar incidente en superficie (`kWh/m²/día` en comunidad RE/AG). Conversión a energía térmica FAO-56:
    $$1\text{ kWh/m}^2/\text{día} = 3.6\text{ MJ/m}^2/\text{día} \quad (0.408 \times R_s \text{ mm/día})$$
  - `PS`: Presión en superficie (`kPa`).
- **Centinela de datos faltantes:** `-999` / `-999.0` (filtrar rigurosamente y convertir a `null` al ingerir).
- **Consumo:** Módulo 1 (Splines en series horarias), Módulo 2 (GDD por bloques LST 24h), Módulo 3 (Precipitación $P(t)$ y $ET_0$), Módulo 7 fitosanitario (Detector de plagas).

---

### B. ISRIC SoilGrids v2.0 (Calidad y Propiedades del Suelo)
- **Endpoint:** `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=-100.3899&lat=20.5888&property=phh2o&property=soc&property=nitrogen&property=clay&property=sand&depth=0-5cm&value=mean`
- **Auth:** Ninguna (tasa regulada a $\le 5\text{ req/min}$, espaciado mínimo de $\ge 12\text{ s}$).
- **Tabla de Conversión de Factores de Escala (`d_factor`):**

| Propiedad | Clave JSON | Valor Crudo (`mean`) | Divisor (`d_factor`) | Unidad Real Obtenida | Campo Canónico |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **pH en agua** | `phh2o` | Ej. `68` | `10` | $6.8$ (adimensional) | `soil_ph` |
| **Carbono Orgánico** | `soc` | Ej. `187` | `10` | $18.7\text{ g/kg}$ ($1.87\%$) | `soc_g_kg` |
| **Nitrógeno Total** | `nitrogen` | Ej. `130` | `100` | $1.3\text{ g/kg}$ | `nitrogen_g_kg` |
| **Arcilla** | `clay` | Ej. `378` | `10` | $37.8\%$ | `clay_pct` |
| **Arena** | `sand` | Ej. `387` | `10` | $38.7\%$ | `sand_pct` |

- **Fórmulas Pedológicas y Texturales:**
  1. **Limo:** $\text{silt\_pct} = \max(0, 100 - \text{clay\_pct} - \text{sand\_pct})$. Ej: $100 - 37.8 - 38.7 = 23.5\%$.
  2. **Triángulo Textural USDA:** Clasificación automática (ej. $37.8\%$ arcilla, $38.7\%$ arena, $23.5\%$ limo $\rightarrow$ *Franco Arcilloso / Clay Loam*).
  3. **Materia Orgánica (Factor de Van Bemmelen):**
     $$\text{MO}\% = \left(\frac{\text{soc\_g\_kg}}{10}\right) \times 1.724 \quad \text{Ej: } 1.87\% \times 1.724 = 3.22\% \text{ MO}$$
  4. **Límites Físicos por Pedotransferencia (Saxton-Rawls sobre $Z_r = 600\text{ mm}$):**
     - Capacidad de Campo ($W_{\text{CC}}$ o `field_capacity_mm`).
     - Punto de Marchitez Permanente ($W_{\text{PMP}}$ o `wilting_point_mm`).
     - Humedad Crítica ($W_{\text{crítico}} = W_{\text{PMP}} + p \cdot (W_{\text{CC}} - W_{\text{PMP}})$ con $p=0.5$).
     - Invariante estricto: $W_{\text{PMP}} < W_{\text{crítico}} < W_{\text{CC}}$.
- **Consumo:** Módulo 3 (Límites y condición inicial $W_0$), Módulo 4 (Umbral $W_{\text{crítico}}$), Módulo 5 (Filtro por pH), Módulo 6 (Calibración de fertilizante N y obligatoriedad de leguminosas).

---

### C. NASA EONET v3 (Eventos Meteorológicos Extremos y Ciclones)
- **Endpoint:** `https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=severeStorms&status=open`
- **Categorías soportadas:** `severeStorms`, `drought`, `floods`, `wildfires`.
- **Estructura GeoJSON:**
  - `features[].id`: Identificador único de evento NASA EONET.
  - `features[].properties.title`: Nombre del fenómeno (ej. ciclón tropical, tormenta convectiva).
  - `features[].properties.closed`: Estado del evento (activo o cerrado).
  - `features[].properties.categories`: Metadatos taxonómicos del desastre.
  - `features[].geometry.coordinates`: Coordenadas $[lon, lat]$ de la trayectoria actual o polígono de afectación.
  - `features[].properties.date`: Fecha y hora estándar en formato UTC (`ISO-8601`).
  - `features[].properties.magnitudeValue` & `magnitudeUnit`: Magnitud del evento (ej. velocidad máxima del viento en nudos `kts`).
- **Reglas Físicas y Agronómicas del Backend:**
  1. **Impacto en Módulo 3 (Balance Hídrico):** Si la trayectoria del evento intersecta el radio de influencia de la parcela ($R \le 150\text{ km}$), se inyecta un **pulso extraordinario de precipitación** en $P(t)$ equivalente a la severidad del evento para simular saturación, escorrentía y riesgo de encharcamiento en la EDO RK4.
  2. **Impacto en Módulo 5 (Pre-solver):** Si hay alertas activas de tormentas severas o inundaciones abiertas en la región, se bloquea la siembra inmediata ($x_{i,1} = 0$) para cultivos clasificados con alta `sensibilidad_viento` o alta `sensibilidad_inundacion`.
  3. **Visualización en Frontend:** Renderizado en el *Mapa de Riesgos* y *Banner de Alertas Anticipadas*.

---

### D. Open-Meteo & NASA SMAP (Pronósticos a 16 Días y Humedad Superficial)
- **Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude=20.59&longitude=-100.39&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&forecast_days=16&timezone=auto`
- **Unidades:** `soil_moisture` ($\text{m}^3/\text{m}^3$), `precipitation_sum` ($\text{mm}$), `et0_fao_evapotranspiration` ($\text{mm}$).
- **Calibración de Condición Inicial:**
  $$W_0 = \theta_{\text{vol}} \times Z_r \quad (\text{donde } \theta_{\text{vol}} = \text{soil\_moisture\_0\_to\_1cm}, Z_r = 600\text{ mm})$$

---

### E. NASA AppEEARS & GIBS WMTS (Vegetación e Imágenes Satelitales)
- **AppEEARS Producto:** `MOD13A2.061` (NDVI 16 días, 1 km). Capa: `_1_km_16_days_NDVI` con máscara de nubes QA. Requiere `EARTHDATA_TOKEN`.
- **GIBS WMTS:** `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml`
- **Capa NDVI GIBS:** `MODIS_Terra_NDVI_8Day`
- **Plantilla de Teselas GIBS (EPSG:4326):**
  `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{Layer}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`
- **Regla Estricta:** Las imágenes GIBS son de uso estrictamente visual en Leaflet (nunca se muestrean para cálculos matemáticos).

---

### F. POWER MCP (Model Context Protocol Connector)
- **Herramienta:** `get_daily_data(community, parameters, longitude, latitude, start, end, format)`
- **Uso:** Exclusivamente para inspección asistida por agentes o pruebas interactivas de diagnóstico.

---

## 2. Matriz de Integración de Endpoints y Módulos

| Módulo Backend | Función Agronómica | Fuente Externa | Parámetros Ingeridos | Transformación Principal | Salida / Consumo Siguiente |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M1: Splines Cúbicos** | Reconstrucción de series sin vacíos | NASA POWER Hourly + MODIS NDVI | `T2M`, `RH2M`, `PRECTOTCORR`, `WS10M`, `LST` | Filtrado `-999`, ajuste `CubicSpline(bc_type='natural')` | Series continuas horarias/diarias hacia M2 y M3 |
| **M2: Simpson 1/3** | Grados-Día de Desarrollo ($GDD$) | Salida M1 + Catálogo Cultivos | `T2M` (máx/mín en 24h LST), $T_{\text{base}}$ | Integración `scipy.integrate.simpson` con $h=1\text{ día}$ | Acumulado térmico $GDD_{\text{disponible}}$ hacia M5 y Calendario |
| **M3: RK4 EDO** | Simulación dinámica de humedad $W(t)$ | Salida M1 + SoilGrids + EONET | `PRECTOTCORR`, `clay`, `sand`, `soc`, pulso EONET | Pedotransferencia Saxton-Rawls + Van Bemmelen + RK4 | Curva diaria $W(t)$ y derivada $\frac{dW}{dt}$ hacia M4 |
| **M4: Newton-Raphson** | Alerta predictiva de estrés hídrico | Salida M3 + SoilGrids | $W(t)$, $\frac{dW}{dt}$, $W_{\text{CC}}$, $W_{\text{PMP}}$ | Resolución $W(t) - W_{\text{crítico}} = 0$ con `scipy.optimize.newton` | Día crítico exacto $t^*$ y volumen $\Delta I$ de riego |
| **M5: Pre-Solver** | Filtrado agronómico de viabilidad | Salida M2 + SoilGrids + EONET | $GDD_{\text{disp}}$, `soil_ph`, alertas ciclón EONET | Filtrado vectorial Pandas: $GDD$, pH y bloqueo siembra extrema | Lista reducida de cultivos viables hacia M6 |
| **M6: Optimizador MILP** | Plan de rotación multianual (3-4 años) | Salida M3 y M5 + SoilGrids + Precios | `nitrogen`, `soc`, $\text{AguaDisponible}_t$, costos y precios | Modelo MILP resuelto con PuLP/Pyomo + motor HiGHS | Plan óptimo de rotación y rotación con leguminosas |
| **M7: Dual / Pareto** | Precios sombra y frontera multiobjetivo | Salida M6 (HiGHS) | Variables duales `.pi` de agua/N, slider $\lambda$ | Extracción de precios sombra y barrido $\lambda \in [0, 1]$ | Curva de Pareto y recomendación económica de riego |

---

## 3. Estado de Pruebas y Entorno de Ejecución (Toolchain)

| Herramienta | Versión Local | Requisito | Estado |
| :--- | :---: | :---: | :---: |
| **Node.js** | `v26.13.0` | $\ge 20$ | ✅ Verificado |
| **pnpm** | `12.19.0` | $\ge 9$ | ✅ Verificado |
| **Python** | `3.14.9` | $\ge 3.12$ | ✅ Verificado |
| **uv** | `0.11.26` | Cualquiera | ✅ Verificado |
| **FastAPI** | `0.115.14` | $\ge 0.110$ | ✅ Fijado |
| **NumPy / SciPy** | `2.2.2` / `1.14.1` | Últimas estables | ✅ Fijado |
| **PuLP / HiGHS** | `3.3.2` / `1.16.0` | Últimas estables | ✅ Fijado |
| **Pydantic** | `2.10.6` | $\ge 2.0$ | ✅ Fijado |
| **Tailwind CSS** | `4.1.18` | v4 (`@import "tailwindcss";`) | ✅ Fijado |
| **React** | `19.3.1` | v19 | ✅ Fijado |
