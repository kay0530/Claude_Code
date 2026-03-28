"""
ppa_calc.py - PPA unit price auto-calculation engine

Calculates the minimum PPA unit price such that DSCR >= 1.30
for all years in the lease period.

Key assumptions:
  - Generation & self-consumption degrade 0.5%/year
  - Surplus revenue: only if enabled (normally 0 due to RPR)
  - DSCR = Annual PPA Revenue / Annual Lease Payment
  - Worst DSCR is always in the final year (generation is lowest)

Lease rate logic:
  - シーエナジー (CE): IRR = 3.10% exactly (their minimum, so we aim for exactly that)
  - みずほリース:      5.50% fixed
  - Others:          user-specified rate
"""

from __future__ import annotations

import math


# ---------------------------------------------------------------------------
# Lease rate map
# ---------------------------------------------------------------------------

LEASE_RATE_MAP: dict[str, float] = {
    "シーエナジー": 0.0310,   # CE target IRR = 3.10%
    "みずほリース": 0.0550,   # Fixed 5.5%
}

DEGRADATION_RATE = 0.005  # 0.5% per year

# Default O&M costs (from PPAリース sheet)
DEFAULT_MAINTENANCE_YEN_PER_KW = 1_200   # 保守メンテナンス費 (円/kW/年)
DEFAULT_INSURANCE_YEN_FIXED = 120_000    # 保安管理業務委託費 (円/年・自社負担時)


# ---------------------------------------------------------------------------
# Financial helpers
# ---------------------------------------------------------------------------

def pmt(rate: float, nper: int, pv: float) -> float:
    """Annual lease payment (annuity formula).

    Args:
        rate: Annual interest rate (e.g. 0.031 for 3.1%)
        nper: Number of periods (years)
        pv:   Present value = principal (positive number)

    Returns:
        Annual payment (positive = outflow from lessee perspective)
    """
    if rate == 0:
        return pv / nper
    return pv * rate / (1 - (1 + rate) ** (-nper))


def npv(rate: float, cashflows: list[float]) -> float:
    """Net Present Value of a cash flow series.

    cashflows[0] is at t=1, cashflows[1] at t=2, etc.
    """
    return sum(cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cashflows))


def irr(cashflows: list[float], guess: float = 0.05, tol: float = 1e-7, max_iter: int = 200) -> float:
    """Internal Rate of Return via Newton-Raphson.

    cashflows[0] = initial investment (negative), cashflows[1..] = annual inflows.
    """
    r = guess
    for _ in range(max_iter):
        f = sum(cf / (1 + r) ** i for i, cf in enumerate(cashflows))
        df = sum(-i * cf / (1 + r) ** (i + 1) for i, cf in enumerate(cashflows))
        if df == 0:
            break
        r_new = r - f / df
        if abs(r_new - r) < tol:
            return r_new
        r = r_new
    return r


# ---------------------------------------------------------------------------
# Main calculation
# ---------------------------------------------------------------------------

def calc_lease_payment(
    principal: float,
    lease_company: str,
    lease_rate_pct: float,
    lease_years: int,
) -> tuple[float, float]:
    """Calculate annual lease payment and effective rate.

    Args:
        principal:      System cost net of subsidy (yen)
        lease_company:  Lease company name
        lease_rate_pct: User-specified rate (%) — used only for unknown companies
        lease_years:    Lease term (years)

    Returns:
        (annual_payment, effective_rate)
    """
    # Determine rate
    rate = LEASE_RATE_MAP.get(lease_company)
    if rate is None:
        rate = lease_rate_pct / 100.0

    annual_payment = pmt(rate, lease_years, principal)
    return annual_payment, rate


def calc_annual_om_cost(
    system_kw: float,
    maintenance_yen_per_kw: float = DEFAULT_MAINTENANCE_YEN_PER_KW,
    insurance_yen_fixed: float = DEFAULT_INSURANCE_YEN_FIXED,
) -> float:
    """Calculate annual O&M cost (保守費 + 保険料).

    Args:
        system_kw:              System capacity (kW) = min(panel_kw, pcs_kw)
        maintenance_yen_per_kw: Maintenance fee per kW per year
        insurance_yen_fixed:    Fixed annual insurance/management fee

    Returns:
        Annual O&M cost (yen)
    """
    return system_kw * maintenance_yen_per_kw + insurance_yen_fixed


def calc_min_ppa_price(
    self_consumption_y1_kwh: float,
    surplus_y1_kwh: float,
    annual_lease_payment: float,
    lease_years: int,
    fit_price: float = 0.0,
    include_surplus: bool = False,
    target_dscr: float = 1.30,
    degradation: float = DEGRADATION_RATE,
    annual_om_cost: float = 0.0,
) -> float:
    """Calculate minimum PPA unit price to achieve target_dscr in all years.

    DSCR = Revenue / (Lease Payment + O&M) >= target_dscr

    Since generation degrades while lease payment and O&M are fixed, the
    worst year is always the final year (year = lease_years).

    Args:
        self_consumption_y1_kwh: Year-1 self-consumption (kWh)
        surplus_y1_kwh:          Year-1 surplus electricity (kWh)
        annual_lease_payment:    Fixed annual lease payment (yen)
        lease_years:             Lease term
        fit_price:               FIT price for surplus (yen/kWh)
        include_surplus:         Whether to include surplus revenue
        target_dscr:             Minimum acceptable DSCR
        degradation:             Annual degradation rate (0.005 = 0.5%)
        annual_om_cost:          Annual O&M cost (yen) — added to denominator

    Returns:
        Minimum PPA unit price (yen/kWh), rounded up to nearest 0.5 yen
    """
    if self_consumption_y1_kwh <= 0 or annual_lease_payment <= 0:
        return 0.0

    # Worst year: final year (n = lease_years, index starts at 0)
    decay = (1 - degradation) ** (lease_years - 1)
    min_self_consume = self_consumption_y1_kwh * decay
    min_surplus = surplus_y1_kwh * decay if include_surplus else 0.0

    # DSCR = Revenue / (Lease + O&M) >= target_dscr
    # => Revenue >= (Lease + O&M) * target_dscr
    # => self_consume * ppa_price + surplus * fit_price >= (Lease + O&M) * target_dscr
    total_cost = annual_lease_payment + annual_om_cost
    required_revenue = total_cost * target_dscr
    surplus_revenue = min_surplus * fit_price
    required_ppa_revenue = required_revenue - surplus_revenue

    if required_ppa_revenue <= 0:
        # Surplus alone covers DSCR
        return 0.0

    raw_price = required_ppa_revenue / min_self_consume

    # Round up to nearest 0.5 yen
    return math.ceil(raw_price * 2) / 2


def calc_cashflow_table(
    self_consumption_y1_kwh: float,
    surplus_y1_kwh: float,
    ppa_unit_price: float,
    fit_price: float,
    annual_lease_payment: float,
    contract_years: int,
    lease_years: int,
    include_surplus: bool = False,
    degradation: float = DEGRADATION_RATE,
    annual_om_cost: float = 0.0,
) -> list[dict]:
    """Generate year-by-year cashflow table for the PPA period.

    DSCR = Revenue / (Lease + O&M)

    Returns list of dicts with keys:
        year, self_consumption_kwh, surplus_kwh, ppa_revenue, surplus_revenue,
        total_revenue, lease_payment, om_cost, total_cost, net_cashflow, dscr
    """
    rows = []
    for year in range(1, contract_years + 1):
        decay = (1 - degradation) ** (year - 1)
        sc = self_consumption_y1_kwh * decay
        sur = surplus_y1_kwh * decay if include_surplus else 0.0

        ppa_rev = sc * ppa_unit_price
        sur_rev = sur * fit_price
        total_rev = ppa_rev + sur_rev

        # Lease payment only applies during lease term
        lp = annual_lease_payment if year <= lease_years else 0.0
        om = annual_om_cost if year <= lease_years else 0.0
        total_cost = lp + om
        net_cf = total_rev - total_cost
        dscr = total_rev / total_cost if total_cost > 0 else float("inf")

        rows.append({
            "year": year,
            "self_consumption_kwh": round(sc),
            "surplus_kwh": round(sur),
            "ppa_revenue": round(ppa_rev),
            "surplus_revenue": round(sur_rev),
            "total_revenue": round(total_rev),
            "lease_payment": round(lp),
            "om_cost": round(om),
            "total_cost": round(total_cost),
            "net_cashflow": round(net_cf),
            "dscr": round(dscr, 3) if total_cost > 0 else None,
        })
    return rows


def auto_calc_ppa(
    self_consumption_y1_kwh: float,
    surplus_y1_kwh: float,
    selling_price: float,
    subsidy_amount: float,
    lease_company: str,
    lease_rate_pct: float,
    lease_years: int,
    contract_years: int,
    system_kw: float = 0.0,
    fit_price: float = 0.0,
    include_surplus: bool = False,
    target_dscr: float = 1.30,
    maintenance_yen_per_kw: float = DEFAULT_MAINTENANCE_YEN_PER_KW,
    insurance_yen_fixed: float = DEFAULT_INSURANCE_YEN_FIXED,
) -> dict:
    """Full PPA auto-calculation: lease payment → O&M → minimum PPA price → cashflow table.

    DSCR = Revenue / (Lease Payment + O&M) >= target_dscr

    Args:
        self_consumption_y1_kwh:  Year-1 self-consumption from iPals (kWh)
        surplus_y1_kwh:           Year-1 surplus from iPals (kWh)
        selling_price:            Equipment selling price (yen)
        subsidy_amount:           Subsidy amount (yen)
        lease_company:            Lease company name
        lease_rate_pct:           Manual rate override (%) — used for unknown companies
        lease_years:              Lease term (years)
        contract_years:           PPA contract duration (years)
        system_kw:                System capacity kW (for O&M calculation)
        fit_price:                FIT price for surplus (yen/kWh)
        include_surplus:          Whether surplus revenue is counted
        target_dscr:              Minimum acceptable DSCR (default 1.30)
        maintenance_yen_per_kw:   Maintenance fee per kW (default 1,200 yen/kW/yr)
        insurance_yen_fixed:      Fixed annual insurance fee (default 120,000 yen/yr)

    Returns dict with:
        principal, effective_rate_pct, annual_lease_payment, annual_om_cost,
        total_annual_cost, min_ppa_price, cashflow_table, min_dscr, warnings
    """
    warnings_list: list[str] = []

    principal = max(selling_price - subsidy_amount, 0.0)
    if principal <= 0:
        warnings_list.append("販売価格・補助金額を確認してください（元本が0以下です）")

    if self_consumption_y1_kwh <= 0:
        warnings_list.append("iPalsデータがありません。自家消費量を入力してください")

    annual_payment, rate = calc_lease_payment(principal, lease_company, lease_rate_pct, lease_years)

    # O&M cost
    om_cost = calc_annual_om_cost(system_kw, maintenance_yen_per_kw, insurance_yen_fixed)

    min_price = 0.0
    cashflow_table: list[dict] = []
    min_dscr: float | None = None

    if principal > 0 and self_consumption_y1_kwh > 0:
        min_price = calc_min_ppa_price(
            self_consumption_y1_kwh=self_consumption_y1_kwh,
            surplus_y1_kwh=surplus_y1_kwh,
            annual_lease_payment=annual_payment,
            lease_years=lease_years,
            fit_price=fit_price,
            include_surplus=include_surplus,
            target_dscr=target_dscr,
            annual_om_cost=om_cost,
        )

        cashflow_table = calc_cashflow_table(
            self_consumption_y1_kwh=self_consumption_y1_kwh,
            surplus_y1_kwh=surplus_y1_kwh,
            ppa_unit_price=min_price,
            fit_price=fit_price,
            annual_lease_payment=annual_payment,
            contract_years=contract_years,
            lease_years=lease_years,
            include_surplus=include_surplus,
            annual_om_cost=om_cost,
        )

        dscr_values = [r["dscr"] for r in cashflow_table if r["dscr"] is not None]
        min_dscr = min(dscr_values) if dscr_values else None

    return {
        "principal": round(principal),
        "effective_rate_pct": round(rate * 100, 2),
        "annual_lease_payment": round(annual_payment),
        "annual_om_cost": round(om_cost),
        "total_annual_cost": round(annual_payment + om_cost),
        "min_ppa_price": min_price,
        "cashflow_table": cashflow_table,
        "min_dscr": min_dscr,
        "warnings": warnings_list,
    }
