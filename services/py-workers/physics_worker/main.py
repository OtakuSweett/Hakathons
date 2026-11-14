"""Physics Worker Microservice — Port 8001.

Implements Modules 1 to 4:
- M1: Natural Cubic Splines via TDMA (Thomas Algorithm)
- M2: Thermal Time Integration (Simpson 1/3 GDD)
- M3: Dynamic Soil Water Balance via RK4 ODE
- M4: Predictive Stress Detection via Newton-Raphson
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from physics_worker.mod1_splines import interpolate_ndvi_series
from physics_worker.mod2_simpson import integrate_cumulative_gdd
from physics_worker.mod3_rk4 import SoilWaterBalanceRK4
from physics_worker.mod4_newton import find_irrigation_trigger

app = FastAPI(
    title="NASA Agro-DSS Physics Worker",
    version="1.0.0",
    description="Numerical physics microservice executing Modules 1 to 4."
)


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
    return {"status": "ok", "worker": "physics"}


@app.post("/physics")
async def compute_physics(request: Request) -> JSONResponse:
    payload = await request.json()
    validate_no_centinels(payload)

    parcel_id = payload.get("parcel_id", "unknown_parcel")
    source = payload.get("source", "live")
    soil = payload.get("soil", {})
    climate = payload.get("climate", {})
    ndvi_series = payload.get("ndvi_series", {})
    crop_id = payload.get("crop_id", "maize")

    dates = climate.get("dates", [])
    if not dates:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "MISSING_DATES", "message": "Climate series missing dates array", "details": {}}}
        )

    # 1. Module 1: Reconstitution of NDVI series via TDMA Natural Cubic Splines
    ndvi_dates = ndvi_series.get("dates", dates[:len(ndvi_series.get("ndvi", []))])
    ndvi_raw = ndvi_series.get("ndvi", [])
    qa_mask = ndvi_series.get("qa_cloud_mask", None)

    try:
        ndvi_filled, used_tdma = interpolate_ndvi_series(ndvi_dates, ndvi_raw, qa_mask)
        spline_result = {
            "dates": ndvi_dates,
            "ndvi_filled": ndvi_filled,
            "used_tdma": used_tdma
        }
    except Exception as e:
        # Fallback if insufficient NDVI knots
        spline_result = {
            "dates": ndvi_dates,
            "ndvi_filled": [0.5 if v is None else float(v) for v in ndvi_raw],
            "used_tdma": False
        }

    # 2. Module 2: Cumulative GDD Integration (Simpson 1/3)
    t_max = climate.get("t2m_max_c", [25.0] * len(dates))
    t_min = climate.get("t2m_min_c", [12.0] * len(dates))
    t_base = 10.0  # standard base temperature for maize / default

    gdd_accumulated, gdd_dates = integrate_cumulative_gdd(
        dates=dates,
        t_max_daily=t_max,
        t_min_daily=t_min,
        t_base=t_base
    )
    gdd_result = {
        "crop_id": crop_id,
        "t_base_c": t_base,
        "gdd_accumulated": gdd_accumulated,
        "dates": gdd_dates
    }

    # 3. Module 3: Dynamic Soil Water Balance via RK4
    fc = soil.get("field_capacity_mm", 175.0)
    wp = soil.get("wilting_point_mm", 85.0)
    wcrit = soil.get("critical_water_mm", 130.0)

    # Invariant enforcement: WP < Wcrit < FC
    if not (wp < wcrit < fc):
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "WATER_INVARIANT_VIOLATED",
                    "message": f"Invariant WP ({wp}) < Wcrit ({wcrit}) < FC ({fc}) violated.",
                    "details": {"wp": wp, "wcrit": wcrit, "fc": fc}
                }
            }
        )

    precip = climate.get("precip_mm", [0.0] * len(dates))
    et0 = climate.get("et0_mm", [4.0] * len(dates))

    rk4_solver = SoilWaterBalanceRK4(
        field_capacity_mm=fc,
        wilting_point_mm=wp,
        critical_water_mm=wcrit,
        kc=0.85
    )
    water_balance = rk4_solver.simulate(
        dates=dates,
        precip_mm=precip,
        et0_mm=et0
    )

    # 4. Module 4: Newton-Raphson Predictive Water Stress Detection
    trigger = find_irrigation_trigger(
        dates=dates,
        w_mm=water_balance["w_mm"],
        critical_water_mm=wcrit,
        field_capacity_mm=fc,
        precip_mm=precip,
        et0_mm=et0
    )

    response_payload = {
        "parcel_id": parcel_id,
        "computed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source,
        "spline_result": spline_result,
        "gdd_result": gdd_result,
        "water_balance": water_balance,
        "irrigation_trigger": trigger
    }

    return JSONResponse(content=response_payload)
