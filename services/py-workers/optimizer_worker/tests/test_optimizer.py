"""Unit tests for Optimizer Worker (Modules 5 to 7)."""

import pytest
import os
import json

from optimizer_worker.mod5_presolver import AgronomicPreSolver
from optimizer_worker.mod6_milp import CropRotationMILPOptimizer
from optimizer_worker.mod7_pareto import compute_pareto_frontier


@pytest.fixture
def sample_crops():
    return [
        {
            "id": "maize",
            "name": "Maíz de Grano",
            "es_leguminosa": False,
            "gdd_requerido": 1400.0,
            "ph_min": 5.8,
            "ph_max": 7.5,
            "demanda_hidrica_mm": 550.0,
            "rendimiento_ton_ha": 9.5,
            "precio_venta_usd_ton": 240.0,
            "costo_semilla_usd_ha": 180.0,
            "costo_fertilizante_usd_ha": 350.0,
            "costo_riego_usd_ha": 200.0,
            "sensibilidad_viento": "alta",
            "sensibilidad_inundacion": "alta"
        },
        {
            "id": "bean",
            "name": "Frijol Negro",
            "es_leguminosa": True,
            "gdd_requerido": 950.0,
            "ph_min": 6.0,
            "ph_max": 7.8,
            "demanda_hidrica_mm": 350.0,
            "rendimiento_ton_ha": 2.2,
            "precio_venta_usd_ton": 950.0,
            "costo_semilla_usd_ha": 90.0,
            "costo_fertilizante_usd_ha": 100.0,
            "costo_riego_usd_ha": 120.0,
            "fijacion_nitrogeno_kg_ha": 75.0,
            "sensibilidad_viento": "baja",
            "sensibilidad_inundacion": "media"
        },
        {
            "id": "wheat",
            "name": "Trigo Harinero",
            "es_leguminosa": False,
            "gdd_requerido": 1300.0,
            "ph_min": 6.0,
            "ph_max": 8.0,
            "demanda_hidrica_mm": 450.0,
            "rendimiento_ton_ha": 6.0,
            "precio_venta_usd_ton": 280.0,
            "costo_semilla_usd_ha": 120.0,
            "costo_fertilizante_usd_ha": 280.0,
            "costo_riego_usd_ha": 160.0,
            "sensibilidad_viento": "baja",
            "sensibilidad_inundacion": "alta"
        }
    ]


def test_mod5_presolver_filters_ph_and_gdd(sample_crops):
    """Pruning rules: discard when GDD or pH incompatible."""
    presolver = AgronomicPreSolver(sample_crops)

    # 1. Low GDD: only bean (950 GDD) passes when GDD=1000
    viable, discarded = presolver.filter_viable_crops(
        gdd_available=1000.0,
        soil_ph=6.5
    )
    assert len(viable) == 1
    assert viable[0]["id"] == "bean"
    assert len(discarded) == 2

    # 2. Extreme acidic pH: none pass
    viable_acid, discarded_acid = presolver.filter_viable_crops(
        gdd_available=2000.0,
        soil_ph=4.5
    )
    assert len(viable_acid) == 0
    assert len(discarded_acid) == 3


def test_mod5_presolver_eonet_disaster_lockout(sample_crops):
    """EONET alert blocks crops with high wind/flood sensitivity."""
    presolver = AgronomicPreSolver(sample_crops)
    viable, discarded = presolver.filter_viable_crops(
        gdd_available=2000.0,
        soil_ph=6.8,
        has_active_severe_storm=True
    )

    # Maize has high wind & flood sensitivity -> locked out
    viable_ids = [c["id"] for c in viable]
    assert "maize" not in viable_ids
    assert "bean" in viable_ids


def test_mod6_milp_solver_anti_monoculture_and_legumes(sample_crops):
    """MILP adheres to anti-monoculture and enforces legumes."""
    milp = CropRotationMILPOptimizer(
        viable_crops=sample_crops,
        horizon_years=2,
        water_quota_mm_per_year=600.0
    )
    sol = milp.solve(relax_continuous=False)

    assert sol["status"] == "Optimal"
    assert len(sol["schedule"]) == 4  # 2 years * 2 cycles

    # Check anti-monoculture: x_{i, t} != x_{i, t+1} for non-fallow
    sched = sol["schedule"]
    for t in range(len(sched) - 1):
        if not sched[t]["fallow"] and not sched[t + 1]["fallow"]:
            assert sched[t]["crop_id"] != sched[t + 1]["crop_id"]

    # Check legume requirement: at least one legume per year
    year1_legumes = any(s["es_leguminosa"] for s in sched[:2])
    year2_legumes = any(s["es_leguminosa"] for s in sched[2:])
    assert year1_legumes is True
    assert year2_legumes is True


def test_mod7_pareto_frontier_points(sample_crops):
    """Generates Pareto frontier with multiple non-dominated weights."""
    pareto = compute_pareto_frontier(
        viable_crops=sample_crops,
        horizon_years=2,
        water_quota_mm_per_year=500.0,
        lambda_points=[0.0, 0.5, 1.0]
    )

    assert "pareto_points" in pareto
    assert len(pareto["pareto_points"]) >= 1
    assert "dual_shadow_prices" in pareto
    assert "recommended_investment" in pareto


def test_mod6_milp_seasonal_cycles_and_cross_year_diversity():
    """Verify seasonal cycle matching (PV to PV, OI to OI) and cross-year diversity."""
    seasonal_crops = [
        {
            "id": "maize",
            "name": "Maíz",
            "cycle": "PV",
            "es_leguminosa": False,
            "demanda_hidrica_mm": 500.0,
            "rendimiento_ton_ha": 9.0,
            "precio_venta_usd_ton": 240.0,
            "costo_semilla_usd_ha": 150.0,
            "costo_fertilizante_usd_ha": 300.0,
            "costo_riego_usd_ha": 180.0
        },
        {
            "id": "bean",
            "name": "Frijol",
            "cycle": "PV",
            "es_leguminosa": True,
            "demanda_hidrica_mm": 320.0,
            "rendimiento_ton_ha": 2.2,
            "precio_venta_usd_ton": 900.0,
            "costo_semilla_usd_ha": 100.0,
            "costo_fertilizante_usd_ha": 100.0,
            "costo_riego_usd_ha": 100.0,
            "fijacion_nitrogeno_kg_ha": 70.0
        },
        {
            "id": "wheat",
            "name": "Trigo",
            "cycle": "OI",
            "es_leguminosa": False,
            "demanda_hidrica_mm": 420.0,
            "rendimiento_ton_ha": 6.0,
            "precio_venta_usd_ton": 280.0,
            "costo_semilla_usd_ha": 120.0,
            "costo_fertilizante_usd_ha": 250.0,
            "costo_riego_usd_ha": 150.0
        },
        {
            "id": "chickpea",
            "name": "Garbanzo",
            "cycle": "OI",
            "es_leguminosa": True,
            "demanda_hidrica_mm": 290.0,
            "rendimiento_ton_ha": 2.5,
            "precio_venta_usd_ton": 850.0,
            "costo_semilla_usd_ha": 110.0,
            "costo_fertilizante_usd_ha": 100.0,
            "costo_riego_usd_ha": 110.0,
            "fijacion_nitrogeno_kg_ha": 65.0
        }
    ]

    milp = CropRotationMILPOptimizer(
        viable_crops=seasonal_crops,
        horizon_years=3,
        water_quota_mm_per_year=650.0
    )
    sol = milp.solve(relax_continuous=False)

    assert sol["status"] == "Optimal"
    assert len(sol["schedule"]) == 6

    sched = sol["schedule"]
    # Check that PV cycles (indices 0, 2, 4) contain only PV crops
    for t in (0, 2, 4):
        if not sched[t]["fallow"]:
            assert sched[t]["crop_id"] in ("maize", "bean")

    # Check that OI cycles (indices 1, 3, 5) contain only OI crops
    for t in (1, 3, 5):
        if not sched[t]["fallow"]:
            assert sched[t]["crop_id"] in ("wheat", "chickpea")

    # Check cross-year same-season diversity: Year 1 PV != Year 2 PV
    assert sched[0]["crop_id"] != sched[2]["crop_id"]
    # Year 1 OI != Year 2 OI
    assert sched[1]["crop_id"] != sched[3]["crop_id"]
