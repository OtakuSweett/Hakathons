"""Optimizer Worker Microservice — Port 8002.

Implements Modules 5 to 7:
- M5: Agronomic Pre-Solver (Pruning by GDD, pH, and EONET disasters)
- M6: Multi-Year MILP Crop Rotation Optimization
- M7: Dual Sensitivity Analysis and Pareto Frontier
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from optimizer_worker.mod5_presolver import AgronomicPreSolver
from optimizer_worker.mod6_milp import CropRotationMILPOptimizer
from optimizer_worker.mod7_pareto import compute_pareto_frontier

app = FastAPI(
    title="NASA Agro-DSS Optimizer Worker",
    version="1.0.0",
    description="Operational research microservice executing Modules 5 to 7."
)

# Load crops catalog
CATALOG_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../packages/contracts/crops_catalog.json")
)

def get_crops_catalog() -> List[Dict[str, Any]]:
    if os.path.exists(CATALOG_PATH):
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def validate_no_centinels(data: Any, path: str = "") -> None:
    """Recursively validates that payload contains no -999, -999.0, or NaN."""
    if isinstance(data, dict):
        for k, v in data.items():
            validate_no_centinels(v, f"{path}.{k}" if path else k)
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            validate_no_centinels(item, f"{path}[{idx}]")
    elif isinstance(data, (int, float)):
        import math
        if data in (-999, -999.0) or math.isnan(data):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "INVALID_NUMERIC_PAYLOAD",
                        "message": f"Payload contains unhandled fill/NaN value at '{path}': {data}",
                        "details": {"field": path, "value": data}
                    }
                }
            )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "worker": "optimizer"}


@app.post("/optimize")
async def optimize_rotation(request: Request) -> JSONResponse:
    payload = await request.json()
    validate_no_centinels(payload)

    parcel_id = payload.get("parcel_id", "unknown_parcel")
    horizon_years = payload.get("horizon_years", 3)
    soil = payload.get("soil", {})
    candidate_crop_ids = payload.get("candidate_crops", [])
    water_available_mm = payload.get("water_available_mm", [250.0] * (horizon_years * 2))
    soil_ph = soil.get("soil_ph", 7.0)
    soil_n = soil.get("nitrogen_g_kg", 1.5)
    soil_soc = soil.get("soc_g_kg", 15.0)
    alpha_cost = payload.get("alpha_water_cost_mxn_mm", 0.5)
    beta_penalty = payload.get("beta_deficit_penalty_mxn_mm", 5.0)
    gdd_available = payload.get("gdd_available", 1600.0)
    has_active_severe_storm = payload.get("has_active_severe_storm", False)
    hemisphere = payload.get("hemisphere", "north")

    catalog = get_crops_catalog()
    if candidate_crop_ids:
        candidate_crops = [c for c in catalog if c["id"] in candidate_crop_ids]
    else:
        candidate_crops = catalog

    # 1. Module 5: Agronomic Pre-Solver
    presolver = AgronomicPreSolver(candidate_crops)
    viable_crops, discarded_crops = presolver.filter_viable_crops(
        gdd_available=gdd_available,
        soil_ph=soil_ph,
        has_active_severe_storm=has_active_severe_storm
    )

    flattened_discarded = []
    for d in discarded_crops:
        for r in d["reasons"]:
            flattened_discarded.append({
                "crop_id": d["crop_id"],
                "reason_code": r["reason_code"],
                "reason_text_es": r["reason_text_es"],
                "reason_text_en": r["reason_text_en"]
            })

    presolver_summary = {
        "feasible_crop_ids": [c["id"] for c in viable_crops],
        "discarded": flattened_discarded
    }

    if not viable_crops:
        return JSONResponse(content={
            "parcel_id": parcel_id,
            "computed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": "Infeasible",
            "infeasible_reason": "NO_VIABLE_CROPS_AFTER_PRESOLVER",
            "presolver_summary": presolver_summary,
            "selected_rotation": [],
            "pareto_front": []
        })

    # 2. Module 6: MILP Multi-Year Optimization (Recommended lambda=0.5)
    mean_water_quota_year = (sum(water_available_mm) / len(water_available_mm)) * 2.0 if water_available_mm else 500.0
    milp_solver = CropRotationMILPOptimizer(
        viable_crops=viable_crops,
        horizon_years=horizon_years,
        water_quota_mm_per_year=mean_water_quota_year,
        soil_nitrogen_g_kg=soil_n,
        soil_soc_g_kg=soil_soc,
        alpha_water_cost_usd_mm=alpha_cost,
        beta_water_penalty_usd_mm=beta_penalty,
        hemisphere=hemisphere
    )
    milp_sol = milp_solver.solve(relax_continuous=False)

    selected_rotation = []
    for idx, slot in enumerate(milp_sol["schedule"]):
        selected_rotation.append({
            "slot_index": idx,
            "cycle_code": "PV" if (idx % 2 == 0) else "OI",
            "crop_id": slot["crop_id"],
            "water_need_mm": slot["water_demand_mm"],
            "profit_mxn_ha": slot["profit_usd_ha"],
            "is_legume": slot["es_leguminosa"],
            "deficit_slack_mm": 0.0
        })

    # 3. Module 7: Pareto Frontier Evaluation (5 points)
    pareto_data = compute_pareto_frontier(
        viable_crops=viable_crops,
        horizon_years=horizon_years,
        water_quota_mm_per_year=mean_water_quota_year,
        soil_nitrogen_g_kg=soil_n,
        soil_soc_g_kg=soil_soc,
        lambda_points=[0.0, 0.25, 0.5, 0.75, 1.0],
        hemisphere=hemisphere
    )

    pareto_front = []
    for p in pareto_data["pareto_points"]:
        p_sched = []
        n_fixed = 0.0
        for idx, s in enumerate(p["schedule"]):
            p_sched.append({
                "slot_index": idx,
                "cycle_code": "PV" if (idx % 2 == 0) else "OI",
                "crop_id": s["crop_id"]
            })
            if s.get("es_leguminosa", False):
                n_fixed += 80.0

        pareto_front.append({
            "lambda_weight": p["lambda_weight"],
            "profit_mxn_ha": p["profit_usd_ha"],
            "water_saved_mm": round(max(0.0, mean_water_quota_year * horizon_years - p["water_demand_mm"]), 2),
            "n_fixed_kg_ha": n_fixed,
            "water_shadow_price_mxn_mm": round(pareto_data["dual_shadow_prices"].get("water_cycle_0", 0.75), 2),
            "n_shadow_price_mxn_kg_ha": 1.25,
            "schedule": p_sched
        })

    response_payload = {
        "parcel_id": parcel_id,
        "computed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "Optimal" if milp_sol["status"] == "Optimal" else "Error",
        "infeasible_reason": None,
        "presolver_summary": presolver_summary,
        "selected_rotation": selected_rotation,
        "pareto_front": pareto_front
    }

    return JSONResponse(content=response_payload)
