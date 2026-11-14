"""Module 5: Agronomic Crop Pre-Solver with Environmental Filtering.

Performs deterministic, vectorized pruning of candidate crops based on:
1. Thermal viability: GDD_available >= GDD_required
2. Soil edaphic suitability: pH_soil in [pH_min, pH_max]
3. Disaster lockout: Active NASA EONET storm/flood alert blocks crops with high wind/flood sensitivity.
"""

from typing import List, Dict, Any, Tuple


class AgronomicPreSolver:
    """Filters candidate crops from catalog against parcel climate, soil, and disaster alerts."""

    def __init__(self, crops_catalog: List[Dict[str, Any]]):
        self.catalog = {c["id"]: c for c in crops_catalog}

    def filter_viable_crops(
        self,
        gdd_available: float,
        soil_ph: float,
        has_active_severe_storm: bool = False,
        cycle_name: str = "PV",
        target_crop_ids: List[str] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Filters crops returning viable list and structured discard reasons.

        Returns:
            viable_crops: List of crop dictionaries that pass all filters.
            discarded_crops: List of dictionaries with crop_id and reason codes.
        """
        candidates = target_crop_ids if target_crop_ids else list(self.catalog.keys())
        viable = []
        discarded = []

        for cid in candidates:
            crop = self.catalog.get(cid)
            if not crop:
                continue

            reasons = []

            # 1. Soil pH filter
            ph_min = crop.get("ph_min", 5.5)
            ph_max = crop.get("ph_max", 8.5)
            if not (ph_min <= soil_ph <= ph_max):
                reasons.append({
                    "reason_code": "PH_OUT_OF_RANGE",
                    "reason_text_es": f"pH del suelo ({soil_ph:.1f}) fuera del rango tolerable [{ph_min:.1f}, {ph_max:.1f}]",
                    "reason_text_en": f"Soil pH ({soil_ph:.1f}) outside viable range [{ph_min:.1f}, {ph_max:.1f}]"
                })

            # 2. Thermal GDD requirement filter
            gdd_req = crop.get("gdd_requerido", 1200.0)
            if gdd_available < gdd_req:
                reasons.append({
                    "reason_code": "GDD_INSUFFICIENT",
                    "reason_text_es": f"Energía térmica acumulada ({gdd_available:.0f} GDD) insuficiente frente al requerimiento ({gdd_req:.0f} GDD)",
                    "reason_text_en": f"Available thermal units ({gdd_available:.0f} GDD) below crop requirement ({gdd_req:.0f} GDD)"
                })

            # 3. NASA EONET Extreme Event Lockout (hurricanes, severe storms, flooding)
            if has_active_severe_storm:
                wind_sens = crop.get("sensibilidad_viento", "media")
                flood_sens = crop.get("sensibilidad_inundacion", "media")
                if wind_sens == "alta" or flood_sens == "alta":
                    reasons.append({
                        "reason_code": "EXTREME_EVENT_LOCKOUT",
                        "reason_text_es": "Alerta activa NASA EONET de tormenta/inundación: cultivo de alta susceptibilidad bloqueado para siembra inmediata",
                        "reason_text_en": "Active NASA EONET disaster alert: highly susceptible crop locked out for immediate planting"
                    })

            if reasons:
                discarded.append({
                    "crop_id": cid,
                    "crop_name": crop.get("name", cid),
                    "reasons": reasons
                })
            else:
                viable.append(crop)

        return viable, discarded
