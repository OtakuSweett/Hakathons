# Experiencia del Agricultor y Resolución de la Problemática Real (NASA Space Apps 2026)
> ES: Marco conceptual, diseño de experiencia de usuario (UX), variables agronómicas regionales y justificación del Sistema de Apoyo a Decisiones (DSS).

---

## 1. El Desafío Real de la NASA: Desde la Tierra del Agricultor

> *"Los agricultores de todo el mundo se enfrentan a cambios de temperatura, patrones de lluvia cambiantes, escasez de agua, fenómenos meteorológicos extremos y deterioro de la salud del suelo. Estas presiones dificultan la elección de rotaciones de cultivos que protejan los campos, conserven el agua y apoyen la resiliencia a largo plazo. Tu reto es crear una herramienta de apoyo a la toma de decisiones que utilice las observaciones terrestres de la NASA junto con información local del suelo, características de los cultivos y prioridades de los agricultores..."*

### La Realidad del Bajío / Querétaro / Guanajuato
En el centro de México (El Bajío), la agricultura intensiva enfrenta una crisis estructural:
1. **Agotamiento Extremo de Acuíferos:**
   - Acuíferos subterráneos (Acuífero del Valle de Querétaro, San Juan del Río, Valle de Celaya) operan con déficits críticos y vedas rígidas. Los pozos agrícolas extraen agua a profundidades superiores a los $180 - 300\text{ metros}$, elevando exponencialmente la factura eléctrica de bombeo e incrementando la salinidad del agua.
2. **La Trampa del Monocultivo y Degradación del Suelo:**
   - La repetición continua de monocultivos de cereales (maíz $\rightarrow$ maíz o maíz $\rightarrow$ sorgo) ha provocado que la materia orgánica nativa de los suelos vertisoles caiga por debajo del $1.5\%$, destruyendo la microbiota edáfica y obligando al agricultor a comprar dosis crecientes y costosas de fertilizantes nitrogenados sintéticos (urea y DAP).
3. **Clima Erático e Impredecible:**
   - Retraso en el inicio del temporal de lluvias (desplazándose de junio a finales de julio), olas de calor en etapas sensibles de polinización/espigamiento y heladas tempranas en noviembre que sorprenden a los cultivos antes de completar su madurez fisiológica.

---

## 2. La Experiencia de Usuario (UX): El Agricultor en el Centro

El sistema no impone una decisión ciega ("caja negra"), sino que actúa como un **simulador y consejero agronómico interactivo** que respeta la autonomía y los recursos del agricultor:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FLUJO DE EXPERIENCIA DEL AGRICULTOR               │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Delimitar y Caracterizar la Parcela                                 │
│    - Mapa Leaflet interactivo: polígono, hectáreas reales (area_ha).   │
│    - Tipo de manejo: temporal/secano vs. riego (goteo, aspersión,      │
│      gravedad) y cuota concesionada de agua (water_allocation_quota).  │
│                                                                        │
│ 2. Radiografía Inmediata: ¿Cómo está mi tierra y mi clima?             │
│    - Diagnóstico de suelo instantáneo (ISRIC SoilGrids v2.0):          │
│      textura USDA, pH, materia orgánica (%MO) y nitrógeno total.       │
│    - Diagnóstico meteorológico histórico (NASA POWER):                 │
│      acumulado de lluvia, heladas históricas y radiación solar.        │
│    - Monitoreo histórico de vigor vegetal (MODIS NDVI con Splines).    │
│                                                                        │
│ 3. Declaración de Prioridades del Agricultor (Farmer Priorities)       │
│    - ¿Busco maximizar ganancia inmediata para pagar deudas?            │
│    - ¿Busco ahorrar agua para no agotar la concesión del pozo?         │
│    - ¿Busco regenerar mi suelo con leguminosas para gastar menos       │
│      en fertilizantes químicos la próxima temporada?                   │
│                                                                        │
│ 4. Recomendación de Rotaciones Multianuales (3 a 4 años)               │
│    - Calendario interactivo con rotaciones viables PV y OI.            │
│    - Visualización de la compensación de nutrientes: cómo el frijol o  │
│      garbanzo reponen nitrógeno antes de sembrar maíz o trigo.         │
│                                                                        │
│ 5. Simulador de Estrés "¿Qué pasaría si...?" (What-If Engine)          │
│    - "¿Qué pasa si este año llueve 25% menos?"                         │
│    - "¿Qué pasa si se presenta una ola de calor en floración?"         │
│    - "¿Qué pasa si una tormenta severa azota la región?"               │
│                                                                        │
│ 6. Alertas Anticipadas y Programación de Riego Preventivo              │
│    - Notificación con 10 días de anticipación de la fecha crítica      │
│      de estrés hídrico (t*) y el volumen exacto de riego necesario.   │
│                                                                        │
│ 7. Reporte de Campo Participativo (Ground Truthing)                    │
│    - Subida de fotografías y notas de plagas observadas en el campo    │
│      para contrastar y enriquecer el análisis satelital.               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Catálogo Ampliado de Cultivos Regionales (16 Especies)

Para responder verdaderamente a la diversidad del Bajío, el catálogo abarca 5 familias botánicas clave, combinando granos comerciales, leguminosas de fijación simbiótica, forrajes lecheros, hortalizas de alto valor y abonos verdes de cobertura:

| Cultivo | Ciclo | Familia | Papel Agronómico en la Rotación | Fijación N ($\text{kg/ha}$) | Demanda Agua ($\text{mm}$) |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **Maíz** | PV | *Poaceae* | Grano básico comercial extractor de nitrógeno | $0.0$ | $550$ |
| **Sorgo** | PV | *Poaceae* | Grano tolerante a sequía y calor extremo | $0.0$ | $450$ |
| **Trigo** | OI | *Poaceae* | Cereal de invierno de alta demanda harinera | $0.0$ | $450$ |
| **Cebada** | OI | *Poaceae* | Cereal maltero de invierno, tolerante a frío | $0.0$ | $400$ |
| **Avena Forrajera** | OI | *Poaceae* | Forraje invernal, cobertura contra erosión | $0.0$ | $380$ |
| **Frijol** | PV | *Fabaceae* | Leguminosa de grano básica, fijadora de N | **$60.0$** | $350$ |
| **Garbanzo** | OI | *Fabaceae* | Leguminosa invernal muy resistente a sequía | **$80.0$** | $300$ |
| **Alfalfa** | PV/OI | *Fabaceae* | Forraje plurianual lechero de altísima fijación | **$200.0$** | $600$ |
| **Veza (Abono verde)**| OI | *Fabaceae* | Cobertura regeneradora de suelo y materia orgánica | **$150.0$** | $260$ |
| **Brócoli** | OI | *Brassicaceae*| Hortaliza de exportación, rompe ciclos de plagas | $0.0$ | $380$ |
| **Jitomate** | PV | *Solanaceae* | Hortaliza intensiva de muy alta rentabilidad | $0.0$ | $600$ |
| **Chile Poblano** | PV | *Solanaceae* | Cultivo comercial tradicional de alto rendimiento | $0.0$ | $580$ |
| **Cebolla** | OI | *Alliaceae* | Bulbo comercial invernal de media demanda | $0.0$ | $450$ |
| **Ajo** | OI | *Alliaceae* | Bulbo rústico de alto valor comercial | $0.0$ | $400$ |
| **Fresa** | OI | *Rosaceae* | Frutilla intensiva de alto valor de exportación | $0.0$ | $500$ |
| **Espárrago** | PV | *Asparagaceae*| Hortaliza perenne con raíz profunda tolerante a sequía | $0.0$ | $480$ |

---

## 4. Métricas de Impacto Cuantificables para el Agricultor

El DSS traduce los modelos físicos y de optimización en **números tangibles para la economía y la tierra del productor**:
1. **Volumen de Agua Ahorrada ($m^3$):**
   $$V_{\text{ahorro}} = (\text{ConsumoBaseline}_{\text{mm}} - \text{ConsumoOptimizado}_{\text{mm}}) \times \text{area\_ha} \times 10$$
   *(Ejemplo: En una parcela de $20\text{ ha}$, reducir $150\text{ mm}$ de demanda equivale a ahorrar $30,000\text{ m}^3$ de agua del acuífero).*
2. **Nitrógeno Biológico Aportado:**
   - La inclusión de leguminosas (frijol, garbanzo, veza) fija entre $60$ y $150\text{ kg N/ha}$, reduciendo directamente la compra de bultos de urea ($46\% \text{ N}$), con un ahorro de más de $\$3,000 - \$7,000\text{ MXN/ha}$.
3. **Materia Orgánica del Suelo e Infiltración:**
   - La rotación con abonos verdes y residuos de cosecha incrementa la materia orgánica estimada (Van Bemmelen), mejorando la Capacidad de Campo ($W_{\text{CC}}$) y reduciendo la vulnerabilidad a sequías recurrentes.
4. **Resiliencia ante Fenómenos Extremos:**
   - El cruce con NASA EONET v3 protege la inversión del agricultor al bloquear siembras vulnerables ante alertas activas de ciclones e inundaciones.
