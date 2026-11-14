"""Module 6: Multi-Year Mixed-Integer Linear Programming (MILP) Crop Rotation Optimizer.

Formulates and solves the multi-year rotation model:
    max Z = sum_{t,i} Profit_{i,t} * x_{i,t} - sum_t [ alpha * WaterUsed_t + beta * s_t^+ ]
Subject to:
1. Cycle unicity: sum_i x_{i,t} <= 1 for all t
2. Water quota: sum_i WaterReq_i * x_{i,t} - WaterAvail_t <= s_t^+ for all t (s_t^+ >= 0)
3. Anti-monoculture: x_{i,t} + x_{i,t+1} <= 1 for all i, t
4. Nitrogen fixation: sum_{k in Year_y, i in Legumes} x_{i,k} >= 1 for all years y
5. Domain: x_{i,t} in {0, 1}, s_t^+ >= 0.
"""

from typing import List, Dict, Any, Tuple, Optional
import pulp


class CropRotationMILPOptimizer:
    """Multi-year crop rotation solver using PuLP and HiGHS / CBC solvers."""

    def __init__(
        self,
        viable_crops: List[Dict[str, Any]],
        horizon_years: int = 3,
        water_quota_mm_per_year: float = 450.0,
        soil_nitrogen_g_kg: float = 1.5,
        soil_soc_g_kg: float = 15.0,
        alpha_water_cost_usd_mm: float = 0.5,
        beta_water_penalty_usd_mm: float = 5.0,
        hemisphere: str = "north"
    ):
        if not viable_crops:
            raise ValueError("No viable crops provided to MILP optimizer.")

        self.crops = {c["id"]: c for c in viable_crops}
        self.crop_ids = list(self.crops.keys())
        self.horizon_years = max(1, min(horizon_years, 10))
        self.n_cycles = self.horizon_years * 2  # 2 cycles per year: PV and OI (or summer/winter)
        self.water_quota_cycle = water_quota_mm_per_year / 2.0
        self.n_soil = soil_nitrogen_g_kg
        self.soc_soil = soil_soc_g_kg
        self.alpha = alpha_water_cost_usd_mm
        self.beta = beta_water_penalty_usd_mm
        self.hemisphere = hemisphere

    def _calculate_profit(self, crop: Dict[str, Any]) -> float:
        """Computes net margin in USD/ha with SoilGrids nutrient calibration."""
        yield_ton = crop.get("rendimiento_ton_ha", 4.0)
        price_ton = crop.get("precio_venta_usd_ton", 300.0)
        seed_cost = crop.get("costo_semilla_usd_ha", 100.0)
        irr_cost = crop.get("costo_riego_usd_ha", 150.0)
        base_fert = crop.get("costo_fertilizante_usd_ha", 200.0)

        # SoilGrids calibration: Low soil N increases synthetic fertilizer cost for non-legumes
        is_legume = crop.get("es_leguminosa", False)
        if not is_legume:
            # If soil nitrogen is below 1.5 g/kg, fertilizer expense rises by up to 30%
            n_factor = max(0.8, min(1.4, 1.5 / max(0.5, self.n_soil)))
            fert_cost = base_fert * n_factor
        else:
            # Legumes biologically fix nitrogen, reducing fertilizer cost
            n_fixed = crop.get("fijacion_nitrogeno_kg_ha", 80.0)
            fert_cost = max(50.0, base_fert - (n_fixed * 0.8))

        revenue = yield_ton * price_ton
        cost = seed_cost + irr_cost + fert_cost
        return float(revenue - cost)

    def solve(self, relax_continuous: bool = False) -> Dict[str, Any]:
        """Formulates and solves the MILP.

        If relax_continuous is True, solves LP relaxation for dual shadow prices.
        """
        prob = pulp.LpProblem("CropRotationOptimization", pulp.LpMaximize)

        # Variables
        var_type = pulp.LpContinuous if relax_continuous else pulp.LpBinary
        x = {}
        for i in self.crop_ids:
            for t in range(self.n_cycles):
                x[i, t] = pulp.LpVariable(f"x_{i}_{t}", lowBound=0, upBound=1, cat=var_type)

        # Deficit slack variable for water s_t^+ >= 0
        s = {}
        for t in range(self.n_cycles):
            s[t] = pulp.LpVariable(f"slack_water_{t}", lowBound=0, cat=pulp.LpContinuous)

        # Objective Function
        profit_terms = []
        for i in self.crop_ids:
            net_margin = self._calculate_profit(self.crops[i])
            for t in range(self.n_cycles):
                profit_terms.append(net_margin * x[i, t])

        cost_terms = []
        for t in range(self.n_cycles):
            water_used = pulp.lpSum([self.crops[i].get("demanda_hidrica_mm", 400.0) * x[i, t] for i in self.crop_ids])
            cost_terms.append(self.alpha * water_used + self.beta * s[t])

        prob += pulp.lpSum(profit_terms) - pulp.lpSum(cost_terms)

        # 1. Unicity constraint: at most one crop per cycle
        for t in range(self.n_cycles):
            prob += pulp.lpSum([x[i, t] for i in self.crop_ids]) <= 1.0, f"Unicity_Cycle_{t}"

        # 2. Water quota constraint
        water_constraints = {}
        for t in range(self.n_cycles):
            c_name = f"Water_Limit_Cycle_{t}"
            water_req = pulp.lpSum([self.crops[i].get("demanda_hidrica_mm", 400.0) * x[i, t] for i in self.crop_ids])
            con = (water_req - s[t] <= self.water_quota_cycle)
            prob += con, c_name
            water_constraints[t] = c_name

        # 3. Anti-monoculture constraint: cannot plant same crop in consecutive cycles
        for i in self.crop_ids:
            for t in range(self.n_cycles - 1):
                prob += x[i, t] + x[i, t + 1] <= 1.0, f"Anti_Monoculture_{i}_{t}"

        # 4. Mandatory Legume constraint: at least one legume per agricultural year (every 2 cycles)
        legume_ids = [i for i in self.crop_ids if self.crops[i].get("es_leguminosa", False)]
        if legume_ids:
            for y in range(self.horizon_years):
                c1 = 2 * y
                c2 = 2 * y + 1
                prob += pulp.lpSum([x[i, c1] + x[i, c2] for i in legume_ids]) >= 1.0, f"Legume_Rotation_Year_{y}"

        # Solver execution with deterministic fallback
        solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=20)
        try:
            prob.solve(solver)
        except Exception:
            prob.solve()

        status_str = pulp.LpStatus[prob.status]

        # Extract solution
        schedule = []
        total_profit = 0.0
        total_water = 0.0

        for t in range(self.n_cycles):
            chosen_crop = None
            for i in self.crop_ids:
                val = pulp.value(x[i, t])
                if val is not None and val >= 0.5:
                    chosen_crop = self.crops[i]
                    break

            year_num = (t // 2) + 1
            # Season naming
            if self.hemisphere == "south":
                season = "Summer (Austral)" if (t % 2 == 0) else "Winter (Austral)"
            else:
                season = "Primavera-Verano (PV)" if (t % 2 == 0) else "Otoño-Invierno (OI)"

            if chosen_crop:
                c_profit = self._calculate_profit(chosen_crop)
                c_water = chosen_crop.get("demanda_hidrica_mm", 400.0)
                total_profit += c_profit
                total_water += c_water
                schedule.append({
                    "cycle_index": t,
                    "year": year_num,
                    "season": season,
                    "crop_id": chosen_crop["id"],
                    "crop_name": chosen_crop["name"],
                    "es_leguminosa": chosen_crop.get("es_leguminosa", False),
                    "profit_usd_ha": round(c_profit, 2),
                    "water_demand_mm": round(c_water, 2),
                    "fallow": False
                })
            else:
                # Fallow / Descanso
                schedule.append({
                    "cycle_index": t,
                    "year": year_num,
                    "season": season,
                    "crop_id": "fallow",
                    "crop_name": "Descanso / Barbecho",
                    "es_leguminosa": False,
                    "profit_usd_ha": 0.0,
                    "water_demand_mm": 0.0,
                    "fallow": True
                })

        # Dual shadow prices (if LP relaxation)
        shadow_prices = {}
        if relax_continuous and prob.status == pulp.constants.LpStatusOptimal:
            for t in range(self.n_cycles):
                con = prob.constraints.get(water_constraints[t])
                if con is not None and hasattr(con, "pi"):
                    shadow_prices[f"water_cycle_{t}"] = float(con.pi)

        return {
            "status": status_str,
            "objective_value": round(float(pulp.value(prob.objective) or 0.0), 2),
            "total_profit_usd_ha": round(total_profit, 2),
            "total_water_demand_mm": round(total_water, 2),
            "schedule": schedule,
            "shadow_prices": shadow_prices
        }
