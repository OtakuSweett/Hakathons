# NASA Agro-DSS: Documento Operativo y Realista del Proyecto

> **NASA International Space Apps Challenge 2026**  
> **Desafío:** *Shifting Lands: Adapting Farms with NASA Data*  
> **Sede:** Querétaro, México  
> **Naturaleza del Documento:** Resumen directo, crítico y sin rodeos: qué es la aplicación, qué hace exactamente, por qué existe y cuál es su utilidad práctica real.

---

## 1. ¿Qué es exactamente esta aplicación?

**NASA Agro-DSS** es un **Sistema de Apoyo a la Toma de Decisiones (DSS)** para productores agrícolas, cooperativas y asesores de campo.

No es una aplicación de dibujo de mapas ni un bot de inteligencia artificial generativa con respuestas vagas. Es una plataforma web respaldada por un motor de cálculo matemático y físico que cruza datos satelitales abiertos de la NASA con las características del suelo de una parcela en cualquier parte del mundo. Su meta es una sola: **planificar rotaciones de cultivos y calendarios de riego con fundamentos numéricos y científicos.**

---

## 2. ¿Por qué se hizo? (La problemática real y el contexto del reto)

El reto de la NASA se llama *Shifting Lands* (Tierras en Desplazamiento), y responde a una realidad crítica en el campo:

1. **El clima local cambió y desfasó el calendario tradicional:**
   - En zonas de alta producción agrícola como El Bajío mexicano (Querétaro y Guanajuato), el temporal de lluvias se ha retrasado más de 20 días y las temperaturas promedio han subido cerca de $1.8^\circ\text{C}$.
   - Sembrar "cuando siempre se sembraba" hoy significa que la floración del cultivo coincida con olas de calor extremo o con falta absoluta de agua.

2. **Agotamiento de acuíferos subterráneos:**
   - Para compensar la falta de lluvia, los agricultores extraen agua de pozos agrícolas.
   - En muchas regiones los pozos ya superan los 200 a 250 metros de profundidad. Bombear a esa profundidad cuesta una fortuna en recibos de luz y extrae agua dura y salina que va taponando e intoxicando la tierra.

3. **La trampa del monocultivo repetitivo:**
   - Por inercia o miedo al mercado, muchos agricultores siembran maíz tras maíz o cereal tras cereal.
   - Esto agota los nutrientes naturales y reduce la materia orgánica del suelo por debajo del $1.5\%$. Para compensarlo, compran cada año más fertilizantes químicos (como Urea y DAP), cayendo en un ciclo de costo creciente y rendimiento decreciente.

---

## 3. ¿Qué hace la aplicación paso a paso?

Cuando el usuario selecciona una parcela en el mapa (o introduce sus coordenadas), el sistema ejecuta cuatro tareas concretas:

### A. Diagnóstico de la Parcela (Condiciones Actuales y Suelo)
- **Consulta satelital en vivo:**
  - **NASA POWER:** Descarga radiación solar diaria, temperaturas mínimas y máximas, humedad relativa, lluvia acumulada y velocidad del viento.
  - **ISRIC SoilGrids v2.0:** Consulta las proporciones reales de arcilla, arena, limo, nivel de pH y carbono orgánico del suelo hasta 60 cm de profundidad.
  - **NASA EONET v3:** Revisa si hay ciclones o tormentas tropicales activas a menos de 150 km a la redonda.
- **Cálculo de retención de agua:** Con las ecuaciones estándar del USDA y la FAO, calcula cuánta agua puede retener físicamente ese suelo entre su *Capacidad de Campo* (suelo húmedo ideal) y su *Punto de Marchitez Permanente* (suelo seco donde la planta muere).

### B. Detección de Estrés Hídrico (¿Cuándo y cuánto regar?)
- Resuelve día a día el balance de agua en el suelo: toma en cuenta la lluvia que entra, la evaporación natural, lo que transpiran las hojas y el agua que se escurre al fondo.
- Alerta al agricultor antes de que la humedad caiga a la zona de peligro, indicándole el **día estimado de riego crítico ($t^*$)** y el volumen exacto de agua en milímetros que necesita aplicar para no desperdiciar ni inundar.

### C. Descarte Agronómico (Pre-Solver)
- Antes de proponer cualquier cultivo, el sistema filtra la lista según la realidad del terreno:
  - Si el pH del suelo es demasiado ácido o alcalino para un cultivo, lo descarta.
  - Si el calor acumulado en la zona no alcanza para que el cultivo madure, lo descarta.
  - Si hay alerta activa de huracán o inundación, bloquea cultivos vulnerables.
- Cada descarte le explica al agricultor el motivo agronómico específico.

### D. Rotación Multianual Óptima (3 a 4 Años)
- Mediante un algoritmo de optimización matemática (MILP resuelto con HiGHS):
  - **Prohíbe el monocultivo:** Ningún cultivo puede repetirse dos ciclos consecutivos en el mismo lote.
  - **Obliga a incluir leguminosas:** Incorpora obligatoriamente cultivos fijadores de nitrógeno (como garbanzo, frijol o haba).
  - **Genera una secuencia balanceada:** Maximiza el beneficio económico esperado respetando el límite estricto de agua disponible en la zona.

### E. Simulador Climático ("What-If")
- El usuario puede modificar escenarios en vivo: ¿Qué pasa si este año llueve 20% menos? ¿Qué pasa si sube la temperatura 1.5 grados? El motor recalcula al instante las fechas de riego y el impacto en la rotación.

---

## 4. ¿Cuál es su utilidad real y tangible?

| Aspecto | Sin la herramienta (Práctica tradicional) | Con NASA Agro-DSS (Decisión informada) |
| :--- | :--- | :--- |
| **Decisión de siembra** | Por costumbre o calendario tradicional desfasado. | Basada en calor acumulado real de la zona (GDD) y fecha del temporal. |
| **Gasto en agua / bombeo** | Riego a ojo o por turnos fijos, sobreexplotando el pozo y gastando electricidad innecesaria. | Riego preventivo en el día exacto de estrés hídrico; ahorro proyectado de más del 30–40% de volumen de agua. |
| **Fertilidad del suelo** | Monocultivo continuo que destruye la materia orgánica y obliga a comprar urea cara. | Rotación programada con leguminosas que reincorporan entre 40 y 80 kg de nitrógeno biológico natural por hectárea. |
| **Riesgo de colapso** | Ante una sequía imprevista, la pérdida de la inversión puede alcanzar hasta un 68%. | Diversificación en 3–4 años y simulación preventiva que reducen el riesgo a menos del 15–20%. |
| **Respaldo numérico** | Decisiones por intuición o recomendaciones comerciales de vendedores de agroquímicos. | Modelos físicos públicos y transparentes basados en estándares de la FAO y datos satelitales de la NASA. |

---

## 5. Postura Crítica y Escéptica (Lo que la herramienta es y lo que NO es)

Para hablar con honestidad y sin alucinaciones técnicas ante cualquier jurado o usuario:

1. **Lo que SÍ es:**
   - Un sistema de planificación estratégica y operativa de primer nivel, sustentado en datos satelitales globales gratuitos y ecuaciones hidrológicas reconocidas internacionalmente.
   - Una herramienta que corre completamente con software libre, con 37 pruebas unitarias automatizadas que garantizan que las matemáticas no tienen errores de código ni fallan al ejecutarse.
   - Una solución con cobertura global (funciona en cualquier coordenada del planeta y adapta las estaciones tanto en el hemisferio norte como en el hemisferio sur).

2. **Lo que NO es (Límites honestos de la tecnología):**
   - **No reemplaza a un sensor físico enterrado en la parcela:** Los satélites y modelos calculan estimaciones de balance de masa; dan una excelente aproximación macro y regional, pero no sustituyen una sonda de capacitancia milimétrica.
   - **No predice el precio exacto del mercado a 4 años:** Los cálculos económicos usan precios de referencia históricos y ponderaciones; no pueden adivinar fluctuaciones geopolíticas o especulaciones de mercado de futuros.
   - **No es una solución mágica sin adopción humana:** Si el agricultor no tiene maquinaria para cosechar leguminosas o no existe canal de comercialización local para el garbanzo o frijol, la rotación sugerida debe ajustarse en la interfaz a cultivos que el productor sí pueda comercializar.
