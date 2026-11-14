"""Module 7: Dual Sensitivity Analysis and Pareto Frontier Generator.

Computes:
1. Dual Shadow Prices (y_water = dZ*/dWater_t) via LP relaxation.
2. Multi-objective Pareto frontier trading off Economic Profit (f1) vs. Water Conservation (f2)
   using scalarization max [ lambda * f1 + (1 - lambda) * f2 ] across lambda in [0, 1].
"""

from typing import List, Dict, Any, Tuple
import numpy as np
from optimizer_worker.mod6_milp import CropRotationMILPOptimizer


def compute_pareto_frontier(
    viable_crops: List[Dict[str, Any]],
    horizon_years: int = 3,
    water_quota_mm_per_year: float = 450.0,
    soil_nitrogen_g_kg: float = 1.5,
    soil_soc_g_kg: float = 15.0,
    lambda_points: List[float] = None,
    hemisphere: str = "north"
) -> Dict[str, Any]:
    """Generates the non-dominated Pareto frontier and dual shadow prices.

    Returns:
        {
            "pareto_points": List of non-dominated solutions with {lambda, profit_usd_ha, water_demand_mm, schedule},
            "dual_shadow_prices": Dict of marginal water values y_water per cycle,
            "recommended_investment": str or None
        }
    """
    if lambda_points is None:
        lambda_points = [0.0, 0.25, 0.5, 0.75, 1.0]

    # 1. Dual shadow prices via LP continuous relaxation
    lp_optimizer = CropRotationMILPOptimizer(
        viable_crops=viable_crops,
        horizon_years=horizon_years,
        water_quota_mm_per_year=water_quota_mm_per_year,
        soil_nitrogen_g_kg=soil_nitrogen_g_kg,
        soil_soc_g_kg=soil_soc_g_kg,
        alpha_water_cost_usd_mm=0.5,
        beta_water_penalty_usd_mm=5.0,
        hemisphere=hemisphere
    )
    lp_result = lp_optimizer.solve(relax_continuous=True)
    shadow_prices = lp_result.get("shadow_prices", {})

    # Evaluate investment recommendation: if max shadow price > 2.0 USD/mm (~0.20 USD/m3), recommend water tech
    max_shadow = max(shadow_prices.values()) if shadow_prices else 0.0
    if max_shadow > 1.5:
        recommendation = "High water marginal value detected: Investing in drip irrigation technology or supplementary water concessions yields strong positive ROI."
    else:
        recommendation = "Water quota adequate for current rotation plan: No immediate supplementary irrigation capital investment required."

    # 2. Multi-objective Pareto scalarization
    raw_points = []
    for lam in lambda_points:
        # High lambda puts weight on profit; low lambda heavily penalizes water consumption
        alpha_lam = float(0.1 + (1.0 - lam) * 2.5)  # water penalty scales as lambda decreases
        milp = CropRotationMILPOptimizer(
            viable_crops=viable_crops,
            horizon_years=horizon_years,
            water_quota_mm_per_year=water_quota_mm_per_year,
            soil_nitrogen_g_kg=soil_nitrogen_g_kg,
            soil_soc_g_kg=soil_soc_g_kg,
            alpha_water_cost_usd_mm=alpha_lam,
            beta_water_penalty_usd_mm=10.0,
            hemisphere=hemisphere
        )
        sol = milp.solve(relax_continuous=False)
        raw_points.append({
            "lambda_weight": round(float(lam), 2),
            "profit_usd_ha": sol["total_profit_usd_ha"],
            "water_demand_mm": sol["total_water_demand_mm"],
            "schedule": sol["schedule"]
        })

    # Filter dominated solutions: a solution is dominated if another has higher profit and lower/equal water
    non_dominated = []
    for p in raw_points:
        is_dominated = False
        for other in raw_points:
            if other["profit_usd_ha"] >= p["profit_usd_ha"] and other["water_demand_mm"] <= p["water_demand_mm"]:
                if other["profit_usd_ha"] > p["profit_usd_ha"] or other["water_demand_mm"] < p["water_demand_mm"]:
                    is_dominated = True
                    break
        if not is_dominated or len(raw_points) <= 2:
            non_dominated.append(p)

    if not non_dominated:
        non_dominated = raw_points

    return {
        "pareto_points": non_dominated,
        "dual_shadow_prices": shadow_prices,
        "recommended_investment": recommendation
    }
