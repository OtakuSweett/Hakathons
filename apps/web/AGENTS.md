# AGENTS.md — apps/web/ (Track D)
> ES: Reglas del Track D: interfaz de usuario web React 19, Tailwind CSS v4, visualización geoespacial con Leaflet, gráficos interactivos con Recharts y cobertura de las 9 funciones clave del producto.

See root [AGENTS.md](file:///home/Sweett/hakathon/AGENTS.md) §1–§6 for all shared rules (canonical units, JSON rules, git workflow, and end-of-task protocol).
See [docs/ARCHITECTURE.md](file:///home/Sweett/hakathon/docs/ARCHITECTURE.md) for data flows and the 9 product functions.

---

## §1 Scope & Permissions
> ES: Alcance de edición para el Track D.

- **Files you MAY edit:** `apps/web/src/**`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/index.html`
- **Files you MUST NOT edit:** `apps/orchestrator/`, `services/py-workers/`, `packages/contracts/` (must use `feat/contracts-*`).

---

## §2 Branch & Port
> ES: Rama y puerto asignados.

- **Branch:** `feat/track-d-<task>`
- **Port:** `:5173` (`pnpm --filter web dev`)

---

## §3 Architectural & Styling Rules
> ES: Reglas de arquitectura y presentación.

1. **Sin Llamadas Directas a APIs Externas:** Todas las consultas se canalizan a través del orquestador en `:3000`. Nunca realizar peticiones directas desde el navegador hacia NASA POWER o SoilGrids.
2. **Uso Exclusivo de NASA GIBS:** Las capas WMTS de GIBS (ej. `MODIS_Terra_NDVI_8Day`) son puramente visuales sobre Leaflet. Nunca se deben muestrear para cálculos agronómicos.
3. **Tailwind CSS v4:** Configuración pura en CSS mediante `@import "tailwindcss";` y bloque `@theme {}`. Prohibido crear `tailwind.config.js` o archivos de configuración de PostCSS.
4. **Bilingüismo Completo (EN/ES):** Todos los componentes y etiquetas deben soportar cambio de idioma dinámico mediante un interruptor visible.
5. **Modo Autónomo Offline:** Si el orquestador o la red están desconectados, la UI debe permitir seleccionar y cargar paquetes de demostración globales desde `data/presets/` (México, EE.UU., Argentina) sin fallar.

---

## §4 Componentes y las 9 Funciones del Producto
> ES: Especificación de las 9 funciones de la suite DSS en el frontend.

### 1. Mapa de Riesgos (`components/RiskMap.tsx`)
- Mapa interactivo global con **Leaflet** que permite al productor hacer clic en cualquier coordenada arable del planeta o seleccionar presets globales demostrativos.
- Capa base vectorial + capa raster WMTS de NASA GIBS.
- Marcadores interactivos para eventos activos de **NASA EONET v3** (`severeStorms`, `drought`, `floods`, `wildfires`) con círculos de radio de afectación y distancia a la parcela.

### 2. Alertas Anticipadas (`components/EarlyWarningBanner.tsx`)
- Banner de notificación destacando el **día crítico exacto $t^*$ de estrés hídrico** generado por el Módulo 4 (Newton-Raphson).
- Tarjetas de advertencia meteorológica ante riesgo de heladas ($T_{\min} \le 0^\circ\text{C}$), olas de calor ($T_{\max} \ge 35^\circ\text{C}$) y tormentas severas.

### 3. Recomendaciones Agrícolas (`components/CropAdvisor.tsx`)
- Panel de cultivos **viables vs. descartados** proveniente del Pre-Solver (Módulo 5).
- Desglose con badges de color para tolerancia a sequía, sensibilidad al viento, sensibilidad a inundaciones y compatibilidad de pH del suelo.

### 4. Simulador Climático ("What-If") (`components/ClimateSimulator.tsx`)
- Controles deslizantes para simular perturbaciones climáticas:
  - Variación de lluvia: $\Delta P \in [-50\%, +50\%]$.
  - Aumento de temperatura: $\Delta T \in [-2^\circ\text{C}, +5^\circ\text{C}]$.
  - Inyección de pulso de tormenta severa (EONET).
- Botón "Simular Escenario" que re-ejecuta el pipeline numérico y refresca gráficos en tiempo real.

### 5. Monitoreo de Cultivos (`components/CropMonitoring.tsx`)
- Gráfica temporal en **Recharts** con dos series superpuestas:
  1. Puntos discretos de NDVI crudo MODIS con huecos vacíos (`null`).
  2. Curva continua suavizada reconstruida por el Módulo 1 (Splines Cúbicos).

### 6. Calendario Inteligente (`components/SmartCalendar.tsx`)
- Línea de tiempo multianual (3 a 4 años, 6 a 8 ciclos) representando la rotación óptima del Módulo 6 (MILP).
- Despliegue de progreso térmico acumulado $GDD$ del Módulo 2 y marca de fecha programada de riego preventivo ($t^*$ del Módulo 4).

### 7. Detector Preventivo de Plagas (`components/PestDetector.tsx`)
- Semáforo fitosanitario (Verde/Amarillo/Rojo) calculado por el orquestador a partir de ventanas móviles de temperatura, humedad relativa ($\ge 80\%$) y lluvia.
- Indicadores de riesgo para tizón, roya, hongos foliares y gusano cogollero con recomendaciones preventivas.

### 8. Evaluación Económica (`components/EconomicAnalysis.tsx`)
- Desglose de costos (semillas, fertilizantes, agua de riego) y utilidad neta proyectada en MXN/ha.
- Indicador del **precio sombra del agua** ($y_{\text{agua}} = \text{constraint.pi}$) con recomendación de si es rentable invertir en riego extra.
- Curva de la **Frontera de Pareto** con control deslizante $\lambda \in [0, 1]$ (Módulo 7) para alternar entre máxima ganancia y máxima conservación de recursos.

### 9. Reportes de Agricultores (`components/FarmerReportModal.tsx`)
- Formulario georreferenciado para que el productor reporte observaciones de campo: cultivo actual, tipo de daño (plagas, hongos, helada, sequía), notas y fotografía (base64 o URL) para contrastar datos satelitales.

---

## §5 Done Criteria & Vitest
> ES: Criterios de aceptación con Vitest.

```bash
pnpm --filter web test
pnpm --filter web lint
```
- Cobertura de pruebas unitarias para cada uno de los 9 componentes.
- El control de $\lambda$ emite valores discretos o continuos en $[0, 1]$.
- El mapa de Leaflet se inicializa con coordenadas correctas sin desbordamiento de memoria.
- Modo offline probado con desconexión simulada de red.

---

## §6 End-of-Task Protocol & Commit Logging
> ES: Protocolo de finalización y documentación de commits.

See root [AGENTS.md §6](file:///home/Sweett/hakathon/AGENTS.md#6-agent-protocol--commit-documentation).
Para cada tarea o componente completado:
1. Asegurar que las pruebas pasen: `pnpm --filter web test`.
2. Realizar commit con formato Conventional Commits (`git commit -m "feat(track-d): ..."`).
3. Obtener el hash corto (`git rev-parse --short HEAD`).
4. Añadir fila en [docs/AGENT_LOG.md](file:///home/Sweett/hakathon/docs/AGENT_LOG.md) con Timestamp, `track-d`, Módulo, Archivos, Pruebas y Hash del commit.
5. Marcar casilla en [WORKLIST.md](file:///home/Sweett/hakathon/WORKLIST.md).
