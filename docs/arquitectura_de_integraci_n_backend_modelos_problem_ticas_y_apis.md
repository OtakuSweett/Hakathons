# Guía de Arquitectura e Integración Backend: Modelos, Problemáticas y APIs

Este documento está estructurado como una especificación técnica directa para el equipo de desarrollo backend. Para cada módulo del sistema, se detalla secuencialmente:
1. **Problemática Agronómica y Factores Asociados:** Qué dolor específico del agricultor resuelve y qué variables de las tablas de negocio/agronomía intervienen.
2. **Modelo Matemático y Lógica del Algoritmo:** La formulación exacta y el papel que juega cada variable dentro de la ecuación.
3. **Conexión Técnica API $\rightarrow$ Fórmula (Pipeline Backend):** Qué endpoint consultar, qué llaves JSON extraer, cómo transformar los datos y qué librería de Python ejecutar.

---

## Módulo 1: Reconstrucción de Series Temporales (Splines Cúbicos)

### 1.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** Los datos satelitales y estaciones meteorológicas presentan vacíos de información (valores `NaN` o `-999`) debido a nubosidad densa o fallas temporales de transmisión. Si se alimentan series incompletas a los modelos de simulación, los cálculos de energía térmica y balance hídrico colapsan o arrojan falsas alertas de sequía.
* **Factores de las tablas vinculados:**
  * *Ambiente y Clima:* Temperatura máxima/mínima, precipitación, radiación solar.
  * *Historial Agrícola:* Historial climático (detección de tendencias sin sesgos por datos faltantes).
  * *Funciones a Integrar:* Monitoreo de cultivos (continuidad en series de vegetación).

### 1.2 Modelo Matemático
Para reconstruir una serie temporal continua en cada subintervalo de tiempo $[x_i, x_{i+1}]$, se ajusta un polinomio cúbico a trozos:
$$
S_i(x) = a_i + b_i(x - x_i) + c_i(x - x_i)^2 + d_i(x - x_i)^3
$$
Para garantizar que la curva interpolada sea suave y físicamente coherente (continuidad en la primera y segunda derivada), se resuelve el siguiente sistema lineal tridiagonal para encontrar los coeficientes $c_i$:
$$
h_{i-1}c_{i-1} + 2(h_{i-1} + h_i)c_i + h_ic_{i+1} = 3 \left( \frac{a_{i+1} - a_i}{h_i} - \frac{a_i - a_{i-1}}{h_{i-1}} \right)
$$
Donde $h_i = x_{i+1} - x_i$ representa el paso de tiempo (horas o días), bajo condiciones de frontera natural ($c_0 = 0, c_n = 0$).

### 1.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
* **API Origen:** **NASA POWER** (`https://power.larc.nasa.gov/api/temporal/hourly/point`)
* **Mapeo de Parámetros JSON $\rightarrow$ Variables Matemáticas:**
  * El eje independiente $x_i$ se construye a partir de las marcas de tiempo (`LST` - Local Solar Time) de la respuesta JSON donde los datos son válidos.
  * Los valores conocidos $a_i = f(x_i)$ corresponden a los arreglos de `T2M` (Temperatura a 2m), `RH2M` (Humedad relativa) y `PRECTOTCORR` (Precipitación).
* **Flujo de Implementación en Python:**
  1. Filtrar los índices del JSON donde el valor sea igual al código de error de la NASA (`-999`).
  2. Pasar los vectores limpios `(x_validos, y_validos)` a `scipy.interpolate.CubicSpline(x_validos, y_validos, bc_type='natural')`.
  3. Evaluar el objeto spline resultante sobre el vector de tiempo completo `x_faltantes` para rellenar los huecos antes de pasar los datos al Módulo 2 y Módulo 3.

---

## Módulo 2: Cuantificación de Energía Térmica (Regla de Simpson 1/3)

### 2.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** Las plantas no crecen según el calendario humano (días), sino por la acumulación de energía térmica. Sembrar sin conocer el ritmo de acumulación de calor provoca que el cultivo no alcance a madurar antes de las heladas o que sus etapas críticas coincidan con olas de calor.
* **Factores de las tablas vinculados:**
  * *Ambiente y Clima:* Temperatura máxima, temperatura mínima.
  * *Cultivos:* Temperatura óptima, temperatura máxima/mínima tolerable, duración del ciclo, etapas de crecimiento.
  * *Historial Agrícola:* Fechas de siembra y cosecha.

### 2.2 Modelo Matemático
La energía térmica útil acumulada, conocida como Grados-Día de Desarrollo ($GDD$), se expresa mediante la integral definida desde la fecha de siembra hasta la cosecha:
$$
GDD = \int_{t_{\text{siembra}}}^{t_{\text{cosecha}}} \max\left(0, \frac{T_{\text{máx}}(t) + T_{\text{mín}}(t)}{2} - T_{\text{base}}\right) dt
$$
Dado que los datos satelitales son discretos, esta integral se aproxima numéricamente dividiendo el ciclo en $n$ subintervalos pares de ancho $h = \frac{b-a}{n}$ mediante la Regla de Simpson 1/3 Compuesta:
$$
I \approx \frac{h}{3} \left[ f(t_0) + 4 \sum_{j=1}^{n/2} f(t_{2j-1}) + 2 \sum_{j=1}^{(n/2)-1} f(t_{2j}) + f(t_n) \right]
$$

### 2.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
* **API Origen:** **NASA POWER** (`T2M`) + **Tabla Local de Cultivos** ($T_{\text{base}}$).
* **Mapeo de Parámetros JSON $\rightarrow$ Variables Matemáticas:**
  * De la serie horaria `T2M` (ya interpolada por el Módulo 1), agrupar por bloques de 24 horas (usando `LST`) para extraer el valor máximo diario $T_{\text{máx}}(t)$ y el mínimo diario $T_{\text{mín}}(t)$.
  * Consultar en la base de datos local el umbral $T_{\text{base}}$ (temperatura mínima tolerable para el desarrollo del cultivo seleccionado).
  * Evaluar el integrando diario $f(t_k) = \max\left(0, \frac{T_{\text{máx}}(t_k) + T_{\text{mín}}(t_k)}{2} - T_{\text{base}}\right)$.
* **Flujo de Implementación en Python:**
  1. Construir el vector `y_gdd` con los valores diarios de $f(t_k)$ y el vector `x_dias` con paso constante $h = 1$ día.
  2. Ejecutar `scipy.integrate.simpson(y=y_gdd, x=x_dias)` para obtener el acumulado exacto de $GDD$ en cualquier ventana de tiempo proyectada.

---

## Módulo 3: Simulación Dinámica del Balance Hídrico (Runge-Kutta 4º Orden - RK4)

### 3.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** En zonas semiáridas, regar por intuición desperdicia agua o deja al cultivo sin humedad en momentos críticos. Se requiere simular continuamente cuánta agua retiene realmente el suelo día con día, considerando lo que entra por lluvia/riego y lo que se pierde por evaporación, transpiración y filtración profunda.
* **Factores de las tablas vinculados:**
  * *Ambiente y Clima:* Precipitación, evapotranspiración, temperatura, humedad relativa, velocidad del viento, sequías, inundaciones.
  * *Suelo:* Humedad del suelo, tipo de suelo (arenoso, arcilloso, limoso), drenaje.
  * *Cultivos:* Necesidad de agua (demanda hídrica por etapa).

### 3.2 Modelo Matemático
La variación del contenido de agua en la zona radicular del suelo $W(t)$ se rige por la Ecuación Diferencial Ordinaria (EDO):
$$
\frac{dW}{dt} = P(t) + I(t) - ET_c(W, t) - D(W)
$$
Donde $P(t)$ es precipitación, $I(t)$ es riego aplicado, $ET_c$ es la evapotranspiración real del cultivo y $D(W)$ es la pérdida por drenaje. El avance numérico día a día ($W_{k+1}$) se calcula mediante RK4:
$$
W_{k+1} = W_k + \frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)
$$
Con las cuatro pendientes intermedias:
$$
k_1 = f(t_k, W_k)
$$
$$
k_2 = f\left(t_k + \frac{1}{2}h, W_k + \frac{1}{2}hk_1\right)
$$
$$
k_3 = f\left(t_k + \frac{1}{2}h, W_k + \frac{1}{2}hk_2\right)
$$
$$
k_4 = f(t_k + h, W_k + hk_3)
$$

### 3.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
Este módulo fusiona **tres fuentes de datos** simultáneamente:
* **API 1: ISRIC SoilGrids v2.0** (`https://rest.isric.org/soilgrids/v2.0/properties/query`)
  * *Parámetros JSON:* `clay` (arcilla), `sand` (arena) y `soc` (carbono orgánico) en `depth=0-5cm`.
  * *Transformación Backend:* Dividir entre `d_factor` para obtener porcentajes reales. Calcular limo ($100 - \%\text{clay} - \%\text{sand}$) y Materia Orgánica ($\text{MO} = \text{soc} \times 1.724$). Con la textura resultante (ej. Franco Arcilloso), asignar mediante funciones de pedotransferencia la **Capacidad de Campo ($W_{\text{CC}}$)** y el **Punto de Marchitez ($W_{\text{PMP}}$)**, que definen el límite superior de retención antes de activar el término de drenaje $D(W)$ y la condición inicial $W_0$.
* **API 2: NASA POWER**
  * *Parámetros JSON:* `PRECTOTCORR` alimenta directamente el término de entrada $P(t)$ (sumando las 24 horas para obtener $\text{mm/día}$). Los parámetros `T2M`, `RH2M` y `WS10M` alimentan la ecuación de Penman-Monteith para calcular la evapotranspiración de referencia $ET_0$, que multiplicada por el coeficiente del cultivo ($K_c$ de la tabla *Cultivos*) define $ET_c(W, t)$.
* **API 3: NASA EONET v3** (`https://eonet.gsfc.nasa.gov/api/v3/events/geojson?category=severeStorms&status=open`)
  * *Parámetros JSON:* `geometry.coordinates` y `magnitudeValue` (`kts`).
  * *Transformación Backend:* Si la trayectoria de un ciclón intersecta el radio de la parcela, se inyecta un pulso extraordinario en $P(t)$ para simular saturación hídrica y riesgo de inundación.
* **Flujo de Implementación en Python:** Implementar un ciclo iterativo en `NumPy` con paso $h = 1$ día que evalúe `f(t, W)` integrando los arreglos diarios de NASA POWER y los límites físicos de SoilGrids.

---

## Módulo 4: Detección Predictiva de Estrés Hídrico (Método de Newton-Raphson)

### 4.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** Cuando el agricultor nota visualmente que la planta se marchita, el rendimiento de la cosecha ya sufrió una merma irreversible. Se necesita predecir con precisión decimal el día exacto en que la humedad caerá por debajo del umbral crítico para programar el riego preventivo.
* **Factores de las tablas vinculados:**
  * *Suelo:* Humedad del suelo (disponibilidad crítica).
  * *Cultivos:* Sensibilidad hídrica por etapas de crecimiento.
  * *Funciones a Integrar:* Alertas anticipadas, calendario inteligente.

### 4.2 Modelo Matemático
Se define una función objetivo $g(t)$ que mide la distancia entre el agua disponible simulada $W(t)$ y el umbral crítico de estrés del cultivo $W_{\text{crítico}}$:
$$
g(t) = W(t) - W_{\text{crítico}} = 0
$$
Para encontrar la raíz $t^*$ (el instante exacto del cruce), se aplica el método iterativo de Newton-Raphson utilizando la derivada temporal $W'(t_n) = \left.\frac{dW}{dt}\right\vert{}_{t_n}$ obtenida directamente de la EDO del Módulo 3:
$$
t_{n+1} = t_n - \frac{g(t_n)}{g'(t_n)} = t_n - \frac{W(t_n) - W_{\text{crítico}}}{W'(t_n)}
$$

### 4.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
* **APIs Origen:** **ISRIC SoilGrids** + **Salida del Módulo 3 (RK4)**.
* **Mapeo de Parámetros $\rightarrow$ Variables Matemáticas:**
  * El umbral $W_{\text{crítico}}$ se calcula a partir de los datos de textura (`clay`, `sand`) de **SoilGrids**: $W_{\text{crítico}} = W_{\text{PMP}} + p \cdot (W_{\text{CC}} - W_{\text{PMP}})$, donde $p$ es la fracción de agotamiento tolerable del cultivo (ej. $0.5$).
  * La función continua $W(t)$ se obtiene interpolando con Splines Cúbicos (Módulo 1) los puntos discretos $W_k$ generados por RK4 (Módulo 3), y su derivada $W'(t_n)$ se evalúa directamente llamando a la función `dW_dt(t_n, W(t_n))`.
* **Flujo de Implementación en Python:**
  1. Invocar `scipy.optimize.newton(func=g, x0=dia_actual, fprime=dW_dt, tol=0.01)`.
  2. Si la raíz $t^*$ converge dentro del horizonte de pronóstico (ej. próximos 15 días), disparar una notificación en el endpoint de *Alertas Anticipadas* indicando la fecha exacta recomendada para regar.

---

## Módulo 5: Pre-Solver de Viabilidad Agronómica (Filtrado Lógico)

### 5.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** Ejecutar algoritmos de optimización combinatoria sobre decenas de cultivos en múltiples periodos resulta computacionalmente costoso y lento para una aplicación web interactiva. Además, es inútil evaluar cultivos que morirán por acidez del suelo o falta de calor en esa región.
* **Factores de las tablas vinculados:**
  * *Suelo:* pH del suelo, salinidad.
  * *Cultivos:* Temperatura máxima/mínima tolerable, duración del ciclo.
  * *Datos Geográficos:* Altitud, ubicación geográfica.
  * *Climáticos y Recomendaciones Agrícolas:* Selección de cultivos resilientes ante sequía o heladas.

### 5.2 Modelo Matemático
Para todo cultivo candidato $i \in \{1, \dots, M\}$ y cada ciclo agrícola $t$, se aplican reglas de corte booleano que fijan en cero las variables de decisión inviables ($x_{i,t} = 0$) antes de construir la matriz de optimización:
$$
\text{Si } GDD_{\text{disponible}}(t) < GDD_{\text{requerido}}(i) \implies x_{i,t} = 0
$$
$$
\text{Si } pH_{\text{suelo}} \notin [pH_{\text{mín}}(i), pH_{\text{máx}}(i)] \implies x_{i,t} = 0
$$

### 5.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
* **APIs Origen:** **ISRIC SoilGrids** (`phh2o`) + **NASA POWER** (vía Módulo 2) + **NASA EONET v3**.
* **Mapeo de Parámetros JSON $\rightarrow$ Variables Matemáticas:**
  * **SoilGrids:** Extraer `phh2o` del JSON y dividirlo entre su `d_factor` (usualmente $10$, ej. valor crudo `68` $\rightarrow pH_{\text{suelo}} = 6.8$). Comparar contra el rango `[ph_min, ph_max]` de la tabla *Cultivos*.
  * **NASA POWER:** Comparar el $GDD_{\text{disponible}}$ proyectado para la ventana de siembra contra el requerimiento fenológico del cultivo.
  * **NASA EONET v3:** Si existen alertas activas (`status=open`) de tormentas severas (`severeStorms`) o eventos extremos en el polígono de la parcela, bloquear siembras inmediatas ($x_{i,1} = 0$) para cultivos marcados con alta *sensibilidad a inundaciones* o *sensibilidad al viento*.
* **Flujo de Implementación en Python:** Ejecutar un filtrado vectorial en `Pandas` sobre el catálogo de cultivos antes de instanciar las variables en el solver de optimización.

---

## Módulo 6: Optimizador de Rotación de Cultivos (Programación Lineal Entera Mixta - MILP)

### 6.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** El monocultivo continuo agota el nitrógeno del suelo, incrementa las plagas y expone al agricultor a la volatilidad de precios y sequías. El agricultor necesita un plan multianual (3 a 4 años) que maximice sus ganancias netas sin agotar su acuífero ni degradar la tierra.
* **Factores de las tablas vinculados:**
  * *Económicos y Comerciales:* Precio de venta, costo de semillas, fertilizantes y riego, rendimiento esperado.
  * *Suelo:* Nutrientes (N, P, K), erosión.
  * *Plagas y Enfermedades:* Prevención de ciclos de plagas mediante rotación.
  * *Historial Agrícola y Calendario:* Superficie sembrada, tiempos de cosecha.

### 6.2 Modelo Matemático
Se formula un problema de Programación Lineal Entera Mixta (MILP) donde $x_{i,t} \in \{0, 1\}$ indica si se siembra el cultivo $i$ en el periodo $t$:
$$
\max Z = \sum_{t=1}^{T} \sum_{i=1}^{M} \left( \text{Ganancia}_{i,t} \cdot x_{i,t} \right) - \sum_{t=1}^{T} \left( \alpha \cdot \text{AguaRequerida}_t + \beta \cdot s_t^- \right)
$$
Sujeto a:
1. **Unicidad de siembra por ciclo:** $\sum_{i=1}^{M} x_{i,t} \le 1, \quad \forall t$
2. **Balance hídrico disponible:** $\sum_{i=1}^{M} (\text{ConsumoAgua}_i \cdot x_{i,t}) - s_t^+ \le \text{AguaDisponible}_t, \quad \forall t$
3. **Rotación anti-monocultivo:** $x_{i,t} + x_{i,t+1} \le 1, \quad \forall i, \forall t$
4. **Regeneración de nitrógeno:** $\sum_{i \in \text{Leguminosas}} x_{i,t} \ge 1$ (en al menos un ciclo del horizonte)
5. **Dominio:** $x_{i,t} \in \{0, 1\}$, $s_t^+, s_t^- \ge 0$ (variables de holgura/déficit).

### 6.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
* **APIs Origen:** **ISRIC SoilGrids** (`nitrogen`, `soc`) + **NASA POWER** (`PRECTOTCORR`) + **Tablas Económicas Locales**.
* **Mapeo de Parámetros JSON $\rightarrow$ Coeficientes del Modelo:**
  * **Coeficiente $\text{Ganancia}_{i,t}$:** Calculado como $(\text{PrecioVenta}_i \times \text{Rendimiento}_i) - (\text{CostoSemilla}_i + \text{CostoRiego}_i + \text{CostoFertilizante}_i)$.
  * **SoilGrids (`nitrogen` y `soc`):** Calibra el costo de fertilización y la obligatoriedad de la restricción #4. Si el nitrógeno total (`nitrogen` / `d_factor`) es bajo en SoilGrids, el backend aumenta el costo de fertilizante para cultivos extractores (ej. maíz) y fuerza la inclusión de una leguminosa (ej. frijol, garbanzo) en la secuencia para fijar nitrógeno atmosférico de forma natural.
  * **NASA POWER (`PRECTOTCORR`) + Módulo 3:** Define el límite derecho $\text{AguaDisponible}_t$ (lluvia efectiva esperada más humedad inicial del suelo).
* **Flujo de Implementación en Python:** Construir el modelo utilizando `PuLP` o `Pyomo` con los cultivos sobrevivientes del Módulo 5 y resolverlo mediante el motor open-source `HiGHS` (`highspy`), devolviendo el JSON con la secuencia óptima $x_{i,t} = 1$.

---

## Módulo 7: Análisis de Sensibilidad y Frontera de Pareto (Programación Dual)

### 7.1 Problemática y Factores de Tablas Asociados
* **Problemática específica:** No todos los agricultores tienen la misma aversión al riesgo ni las mismas prioridades: unos buscan liquidez inmediata y otros priorizan conservar el agua y la salud del suelo a largo plazo. Además, el agricultor necesita saber si le conviene económicamente invertir en agua extra (pipas/pozo) o fertilizante.
* **Factores de las tablas vinculados:**
  * *Económicos y Comerciales:* Evaluación de rentabilidad vs. inversión en insumos.
  * *Funciones a Integrar:* Simulador climático (escenarios hipotéticos), evaluación económica.

### 7.2 Modelo Matemático
1. **Precio Sombra (Variable Dual $y_k$):** Mide la tasa de cambio de la utilidad óptima $Z^*$ respecto a la disponibilidad de un recurso restringido $b_k$ (como el límite de agua $\text{AguaDisponible}_t$):
$$
y_k = \frac{\partial Z^*}{\partial b_k}
$$
2. **Frontera de Pareto (Escalarización Multiobjetivo):** Combina la función de utilidad económica $f_1(x)$ y la función de sustentabilidad/ahorro hídrico $f_2(x)$ mediante un parámetro de preferencia $\lambda \in [0, 1]$ ajustable por el usuario en el frontend:
$$
\max \left[ \lambda \cdot f_1(x) + (1 - \lambda) \cdot f_2(x) \right]
$$

### 7.3 Conexión Técnica API $\rightarrow$ Fórmula (Backend)
* **APIs Origen:** Heredadas dinámicamente del **Módulo 6** (datos combinados de NASA POWER y SoilGrids).
* **Mapeo de Parámetros $\rightarrow$ Ejecución Backend:**
  * **Precios Sombra ($y_k$):** Tras resolver la relajación lineal del Módulo 6 en `HiGHS`, extraer el atributo `.pi` (valor dual) de la restricción de *Balance Hídrico Disponible*. Si $y_{\text{agua}} = 15$, significa que cada milímetro o metro cúbico adicional de agua disponible generará $\$15$ extra de utilidad neta; si cuesta menos que eso conseguirla, el sistema recomienda invertir en riego adicional.
  * **Frontera de Pareto:** Exponer un endpoint `/api/optimize/pareto` que reciba el parámetro `lambda` desde un *slider* en la interfaz del usuario (donde $\lambda = 1$ es 100% ganancia económica y $\lambda = 0$ es 100% conservación de suelo/agua), o bien ejecute un bucle de 5 iteraciones ($\lambda \in \{0, 0.25, 0.5, 0.75, 1.0\}$) para enviar al frontend los puntos de la curva óptima de decisión.

---

## Mapa Maestro de Integración Backend (Resumen de Endpoints y Flujo)

| Orden de Ejecución | Módulo Backend | Endpoint / Fuente Externa | Llaves JSON Consumidas | Output hacia el Siguiente Módulo |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Mód. 1: Splines Cúbicos** | `power.larc.nasa.gov/.../point` | `T2M`, `RH2M`, `PRECTOTCORR`, `WS10M`, `LST` | Series temporales continuas sin valores `-999`. |
| **2** | **Mód. 2: Simpson 1/3** | Salida Mód. 1 + Catálogo Cultivos | `T2M` (máx/mín diario) + $T_{\text{base}}$ | Acumulado térmico $GDD_{\text{disponible}}$ por ciclo. |
| **3** | **Mód. 3: EDO RK4** | Salida Mód. 1 + `rest.isric.org/.../query` + `eonet.gsfc.nasa.gov/.../geojson` | `PRECTOTCORR`, `clay`, `sand`, `soc`, `coordinates`, `magnitudeValue` | Curva diaria de humedad en suelo $W(t)$ y tasa $\frac{dW}{dt}$. |
| **4** | **Mód. 4: Newton-Raphson** | Salida Mód. 3 + `rest.isric.org/.../query` | $W(t)$, $\frac{dW}{dt}$, $W_{\text{PMP}}$, $W_{\text{CC}}$ | Fecha exacta $t^*$ de alerta por estrés hídrico. |
| **5** | **Mód. 5: Pre-Solver** | Salida Mód. 2 + `rest.isric.org/.../query` + `eonet.gsfc.nasa.gov/.../geojson` | $GDD_{\text{disponible}}$, `phh2o` (`d_factor`), alertas `severeStorms` | Lista filtrada de cultivos viables ($x_{i,t}$ activos). |
| **6** | **Mód. 6: Optimizador MILP** | Salida Mód. 3 y 5 + `rest.isric.org/.../query` + Tablas Económicas | `nitrogen`, `soc`, $\text{AguaDisponible}_t$, precios y costos | Plan óptimo de rotación de cultivos a 3-4 años. |
| **7** | **Mód. 7: Dual / Pareto** | Salida Mód. 6 (Solver HiGHS) | Valores duales (`.pi`) y pesos $\lambda \in [0, 1]$ | Precios sombra de recursos y curva Frontera de Pareto. |