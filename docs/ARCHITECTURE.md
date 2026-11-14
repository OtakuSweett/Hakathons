# Architecture — NASA Agro-DSS
> ES: Arquitectura del sistema, flujo de datos, integración de modelos matemáticos y especificación de las 9 funciones del producto.

---

## 1. System Topology / Topología del Sistema
> ES: Diagrama de interacción entre frontend, gateway orquestador y microservicios numéricos.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Browser / PWA                              │
│         apps/web (:5173) — React 19 + Tailwind v4 + Leaflet            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  apps/orchestrator Gateway (:3000)                     │
│                  Node.js + TypeScript + Fastify/Express                │
│                                                                        │
│  - Ingestión externa: NASA POWER (horaria/diaria LST),                 │
│    ISRIC SoilGrids v2.0, NASA EONET v3, Open-Meteo.                    │
│  - Landmask check: rechazo HTTP 422 NON_ARABLE_LAND en agua/urbano     │
│  - Limpieza y filtrado: Centinelas -999 -> null                        │
│  - Preprocesamiento pedológico: Triángulo USDA + Van Bemmelen (%MO)   │
│  - Cálculo micrometeorológico: ET0 dinámico con latitud (FAO-56)       │
│  - Adaptación de hemisferio (desfase 182d para lat < 0)               │
│  - Inyección de pulsos extremos EONET en balance hídrico               │
│  - Caché persistente: data/cache/ (soil_*, climate_*)                  │
│  - Fallback offline: data/presets/*.json (benchmarks globales)         │
│  - Módulos auxiliares: Detector de Plagas + Reportes de Agricultores   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
     POST /physics  │                                │  POST /optimize
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐
│     services/py-workers/             │ │     services/py-workers/             │
│     physics_worker (:8001)           │ │     optimizer_worker (:8002)         │
│     FastAPI + NumPy + SciPy          │ │     FastAPI + PuLP/Pyomo + HiGHS     │
│                                      │ │                                      │
│  - M1: Splines Cúbicos Naturales     │ │  - M5: Pre-Solver Agronómico         │
│       (TDMA Thomas + CubicSpline)    │ │       (GDD, pH, Filtro Ciclón EONET) │
│  - M2: Simpson 1/3 Compuesto         │ │  - M6: Optimizador MILP              │
│       (Integral GDD térmico)         │ │       (Rotación Multianual 3-4 años) │
│  - M3: Balance Hídrico EDO RK4       │ │  - M7: Frontera de Pareto Dual       │
│       (dW/dt dinámico + Saxton-Rawls)│ │       (Precios Sombra .pi de agua/N) │
│  - M4: Newton-Raphson                │ │                                      │
│       (Cruce crítico Wcrit, t*, ΔI)  │ │                                      │
└──────────────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 2. Master Integration Table / Tabla Maestra de los 7 Módulos Matemáticos
> ES: Mapeo exacto entre orden de ejecución, API externa, parámetros JSON y transformaciones matemáticas.

| Orden | Módulo Backend | Endpoint / Fuente Externa | Parámetros JSON Consumidos | Transformación Matemática y Librería | Output hacia Siguiente Fase |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Módulo 1: Reconstrucción de Series Temporales** (`mod1_splines.py`) | `power.larc.nasa.gov/api/temporal/hourly/point` + MODIS NDVI | `T2M`, `RH2M`, `PRECTOTCORR`, `WS10M`, `LST` | Eje $x$ en LST. Filtrar `-999`. Resolver sistema tridiagonal con $c_0 = c_n = 0$. `scipy.interpolate.CubicSpline(bc_type='natural')`. | Series horarias y diarias continuas completas hacia M2 y M3. |
| **2** | **Módulo 2: Cuantificación Térmica GDD** (`mod2_simpson.py`) | Salida M1 (`T2M`) + `crops_catalog.json` | `T2M` (24h LST), $T_{\text{base}}$ | Extraer $T_{\max}, T_{\min}$ diarios. Integrar $f(t) = \max\left(0, \frac{T_{\max}+T_{\min}}{2} - T_{\text{base}}\right)$ con `scipy.integrate.simpson` ($h=1\text{ d}$). | Acumulado $GDD_{\text{disponible}}$ por ciclo hacia M5 y Calendario. |
| **3** | **Módulo 3: Balance Hídrico Dinámico** (`mod3_rk4.py`) | Salida M1 + ISRIC SoilGrids + NASA EONET v3 | `PRECTOTCORR`, `clay`, `sand`, `soc`, pulso EONET | Dividir entre `d_factor`. Triángulo USDA + Van Bemmelen ($\text{MO}\% = \text{SOC}\% \times 1.724$). Saxton-Rawls $\rightarrow W_{\text{CC}}, W_{\text{PMP}}$. EDO $\frac{dW}{dt} = P + I - ET_c - D$ resuelta con RK4 ($h=1\text{ d}$). | Curva continua $W(t)$ y derivada $\frac{dW}{dt}$ hacia M4. |
| **4** | **Módulo 4: Detección Predictiva de Estrés** (`mod4_newton.py`) | Salida M3 + SoilGrids | $W(t)$, $\frac{dW}{dt}$, $W_{\text{CC}}$, $W_{\text{PMP}}$, $p=0.5$ | $W_{\text{crítico}} = W_{\text{PMP}} + p(W_{\text{CC}} - W_{\text{PMP}})$. Resolver $W(t) - W_{\text{crítico}} = 0$ con `scipy.optimize.newton(fprime=dW_dt, tol=0.01)`. | Día crítico exacto $t^*$ y lámina $\Delta I = W_{\text{CC}} - W_{\text{crítico}}$. |
| **5** | **Módulo 5: Pre-Solver Agronómico** (`mod5_presolver.py`) | Salida M2 + SoilGrids + NASA EONET v3 | $GDD_{\text{disp}}$, `soil_ph`, `status=open` en `severeStorms` | Filtrado vectorial Pandas: si $GDD_{\text{disp}} < GDD_{\text{req}}$ o $\text{pH} \notin [\text{pH}_{\min}, \text{pH}_{\max}] \implies x_{i,t}=0$. Si hay ciclón/inundación activa, bloquear siembra inmediata para cultivos sensibles. | Subconjunto de cultivos agronómicamente viables hacia M6. |
| **6** | **Módulo 6: Optimizador MILP Multianual** (`mod6_milp.py`) | Salida M3 y M5 + SoilGrids (`nitrogen`, `soc`) + Costos | $\text{AguaDisponible}_t$, `nitrogen`, precios, costos | MILP: $\max Z = \text{Ganancias} - (\alpha \text{Agua} + \beta s_t^+)$. Sujeto a unicidad de ciclo, agua disponible, anti-monocultivo y rotación con leguminosas según nivel de nitrógeno de SoilGrids. Solver HiGHS (`highspy`). | Secuencia óptima de siembra multianual (3-4 años). |
| **7** | **Módulo 7: Análisis Dual y Frontera de Pareto** (`mod7_pareto.py`) | Salida M6 (HiGHS) + Slider $\lambda \in [0, 1]$ | Valores duales `.pi` de restricciones de agua y nitrógeno | Precios sombra $y_k = \frac{\partial Z^*}{\partial b_k}$. Escalarización $\max \lambda f_1 + (1-\lambda) f_2$. Soporta $\lambda$ continuo y barrido de 5 puntos $\{0, 0.25, 0.5, 0.75, 1.0\}$. | Puntos no dominados de la curva de Pareto y recomendación económica de riego. |

---

## 3. Mapeo de las 9 Funciones del Producto (Frontend & Gateway)
> ES: Especificación de las 9 funciones clave de la aplicación para el agricultor.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NASA AGRO-DSS SUITE                             │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│ 1. Mapa de Riesgos       │ 4. Simulador Climático      │ 7. Plagas     │
│ 2. Alertas Anticipadas   │ 5. Monitoreo de Cultivos    │ 8. Economía   │
│ 3. Recomendaciones       │ 6. Calendario Inteligente   │ 9. Reportes   │
└──────────────────────────┴─────────────────────────────┴───────────────┘
```

1. **Mapa de Riesgos (Geospatial Hazard Map):**
   - Mapa interactivo Leaflet mundial con selección libre de cualquier coordenada arable del planeta o presets globales de demostración (El Bajío MX, Iowa Corn Belt US, Pampa Argentina AR).
   - Capa base vectorial + superposición WMTS de NASA GIBS (`MODIS_Terra_NDVI_8Day`, `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture`).
   - Marcadores GeoJSON de eventos activos NASA EONET v3 (`severeStorms`, `drought`, `floods`, `wildfires`) con filtrado Haversine al radio de la parcela ($R \le 150\text{ km}$).
2. **Alertas Anticipadas (Early Warning Banner):**
   - Notificación de día crítico exacto $t^*$ de estrés hídrico generado por el Módulo 4 (Newton-Raphson).
   - Semáforo de advertencia meteorológica (heladas si $T_{\min} \le 0^\circ\text{C}$, olas de calor si $T_{\max} \ge 35^\circ\text{C}$, ciclones activos por EONET).
3. **Recomendaciones Agrícolas (Crop Feasibility Advisor):**
   - Panel comparativo de cultivos viables vs. descartados generado por el Módulo 5 (Pre-Solver).
   - Justificación agronómica explícita: compatibilidad de pH, balance térmico $GDD$ y tolerancia climática (sequía, viento, heladas, inundación).
4. **Simulador Climático ("What-If" Engine):**
   - Controles interactivos para alterar parámetros: variación de lluvia ($\pm 10\%, \pm 30\%$), aumento de temperatura ($+1^\circ\text{C}, +2^\circ\text{C}$), o inyección manual de pulso de tormenta severa.
   - Re-ejecución instantánea del pipeline (M3 RK4 $\rightarrow$ M4 Newton $\rightarrow$ M6 MILP $\rightarrow$ M7 Pareto).
5. **Monitoreo de Cultivos (NDVI Trajectory Tracker):**
   - Gráfico temporal comparativo (Recharts): serie cruda MODIS con huecos por nubes (`null`) vs. trayectoria continua reconstruida por Splines Cúbicos (Módulo 1).
6. **Calendario Inteligente (Smart Cropping Calendar):**
   - Cronograma multianual interactivo (3 a 4 años) que despliega la rotación óptima calculada por el Módulo 6.
   - Hitos fenológicos: fecha estimada de germinación, acumulación térmica GDD (Módulo 2), ventanas de floración y fecha recomendada de riego preventivo ($t^*$ del Módulo 4).
7. **Detector Preventivo de Plagas (Pest & Disease Risk Evaluator):**
   - Evaluación fitosanitaria automática a partir de ventanas móviles de temperatura (`T2M`), humedad relativa (`RH2M` $\ge 80\%$) y lluvia de NASA POWER.
   - Semáforo de riesgo para tizón, roya, gusano cogollero y enfermedades fúngicas.
8. **Evaluación Económica (Economic & Resilience Trade-Offs):**
   - Desglose detallado de costos (semillas, fertilizantes, agua de riego) e ingresos brutos proyectados por tonelada y por hectárea.
   - Precios sombra del agua ($y_{\text{agua}} = \text{constraint.pi}$) para determinar la viabilidad de adquirir pipas o derechos de pozo.
   - Gráfica interactiva de la Frontera de Pareto con selector deslizante $\lambda \in [0, 1]$ (Módulo 7).
9. **Reportes de Agricultores (Crowdsourced Field Observations):**
   - Modal georreferenciado para que el agricultor registre observaciones de campo, síntomas visibles de plagas y fotografías (base64/URL).
   - Complementa los diagnósticos satelitales con validación *in situ*.

---

## 4. Canonical API Endpoints (Gateway Contract-First)

| Método | Ruta | Servicio Responsable | Esquema Entrada | Esquema Salida | Propósito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/analyze` | Orchestrator (:3000) | `parcel.schema.json` | `AnalysisResponse` | Análisis integral de parcela (M1–M7) |
| `POST` | `/api/simulate` | Orchestrator (:3000) | `SimulationRequest` | `AnalysisResponse` | Motor "What-If" con perturbaciones climáticas |
| `GET` | `/api/events` | Orchestrator (:3000) | Ninguno | EONET GeoJSON | Eventos extremos filtrados por bounding box |
| `GET` | `/api/pest-risk` | Orchestrator (:3000) | `parcel_id` + `crop_id` | `PestRiskOutput` | Evaluación de riesgo fúngico y de plagas |
| `POST` | `/api/farmer-reports` | Orchestrator (:3000) | `FarmerReportInput` | `FarmerReportRecord`| Almacenamiento de reportes de campo |
| `POST` | `/physics` | `physics_worker` (:8001) | `parcel.schema.json` | `physics.schema.json` | Módulos 1–4 de física y balance hídrico |
| `POST` | `/optimize` | `optimizer_worker` (:8002) | `optimizer.schema.json` | `optimizer.schema.json` | Módulos 5–7 de optimización y Pareto |
| `GET` | `/health` | Todos los servicios | Ninguno | `{"status": "ok"}` | Health-check de infraestructura |

---

## 5. Planetary Architecture & Global Validation (SSOT)
> ES: Principios de generalización global y validación estricta en cualquier coordenada terrestre.

1. **Selección Territorial Libre:** El frontend permite seleccionar cualquier punto $(lat, lon)$ en el mapa mundial de Leaflet, enviándolo al orquestador.
2. **Validación de Suelo Arable (`NON_ARABLE_LAND`):** Si la consulta a ISRIC SoilGrids retorna `null` o la coordenada cae en cuerpos de agua, áreas metropolitanas densas o roca estéril, el gateway responde inmediatamente con `HTTP 422 NON_ARABLE_LAND`.
3. **Geometría Solar Dinámica en FAO-56:**
   $$\delta = 0.409 \sin\left(\frac{2\pi}{365} J - 1.39\right)$$
   $$\omega_s = \arccos(-\tan(\phi) \cdot \tan(\delta))$$
   $$d_r = 1 + 0.033 \cos\left(\frac{2\pi}{365} J\right)$$
   $$R_a = \frac{24(60)}{\pi} G_{sc} d_r \left[ \omega_s \sin(\phi) \sin(\delta) + \cos(\phi) \cos(\delta) \sin(\omega_s) \right]$$
   Donde $\phi = \text{radians}(lat)$ y $J$ es el día del año. Ningún parámetro solar debe ser asumido constante.
4. **Desfase Hemisférico Austral:** Cuando $\text{lat} < 0$, las fechas de cálculo para el ciclo de siembra y el acumulador térmico de grados día (GDD) se ajustan en 182 días para sincronizarse con las estaciones del Hemisferio Sur.
5. **Neutralidad de Moneda:** Los modelos numéricos MILP operan en USD normalizado o en la unidad monetaria ingresada por el productor, garantizando su aplicabilidad global.
