"""
pp0.py - PPA表紙スライド

Layout (A4 landscape):
  - Orange full-width header with logo + "オンサイトPPAサービスのご提案"
  - Customer name (large)
  - Office name, proposal date
  - Plan name options (補助金タイプ別)
  - Company info footer
"""

from __future__ import annotations

import re
from pathlib import Path


def _fmt_date(val) -> str:
    """Format date string: '2026-03-28' or datetime → '2026年3月28日'."""
    s = str(val).split(" ")[0]  # strip time part
    m = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        return f"{m.group(1)}年{int(m.group(2))}月{int(m.group(3))}日"
    return s

from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

from proposal_generator.utils import (
    CONTENT_TOP, C_DARK, C_LIGHT_GRAY, C_ORANGE, C_SUB, C_WHITE,
    FONT_BLACK, FONT_BODY, HEADER_H, MARGIN, SLIDE_H, SLIDE_W,
    add_footer, add_rect, add_rounded_rect, add_textbox,
)


def generate(slide, data: dict, logo_path: Path = None) -> None:
    """
    Render PP0 (cover slide) onto an already-added blank slide.

    data keys used:
        company_name, office_name, proposal_date, address,
        system_capacity_kw, contract_years, ppa_unit_price,
        subsidy_name (optional)
    """
    company   = data.get("company_name", "") or ""
    office    = data.get("office_name", "") or ""
    prop_date = _fmt_date(data.get("proposal_date", "") or "")
    capacity  = data.get("system_capacity_kw")
    years     = int(data.get("contract_years", 20) or 20)
    unit_price = data.get("ppa_unit_price")
    subsidy   = data.get("subsidy_name", "") or ""

    # ---- Orange header bar ----
    add_rect(slide, 0, 0, SLIDE_W, HEADER_H, C_ORANGE)

    # Logo
    if logo_path and logo_path.exists():
        from proposal_generator.utils import add_image_contain
        logo_h = Inches(0.55)
        logo_w = Inches(1.8)
        add_image_contain(slide,
                          Inches(0.3), (HEADER_H - logo_h) / 2,
                          logo_w, logo_h, logo_path)

    # Header title
    add_textbox(slide,
                Inches(2.3), Inches(0.18),
                SLIDE_W - Inches(2.6), Inches(0.78),
                "オンサイトPPAサービスのご提案",
                font_name=FONT_BLACK,
                font_size_pt=26,
                font_color=C_WHITE,
                bold=True,
                align=PP_ALIGN.LEFT)

    # ---- Customer name (large) ----
    y_cust = HEADER_H + Inches(0.25)
    add_textbox(slide,
                MARGIN, y_cust,
                SLIDE_W - MARGIN * 2, Inches(0.85),
                f"{company}　御中",
                font_name=FONT_BLACK,
                font_size_pt=38,
                font_color=C_DARK,
                bold=True,
                align=PP_ALIGN.LEFT)

    # ---- Divider line ----
    y_div = y_cust + Inches(0.9)
    add_rect(slide, MARGIN, y_div, SLIDE_W - MARGIN * 2, Inches(0.03), C_ORANGE)

    # ---- Office / date row ----
    y_meta = y_div + Inches(0.1)
    add_textbox(slide,
                MARGIN, y_meta,
                Inches(5.0), Inches(0.3),
                office,
                font_name=FONT_BODY,
                font_size_pt=12,
                font_color=C_SUB)
    add_textbox(slide,
                SLIDE_W - MARGIN - Inches(3.0), y_meta,
                Inches(3.0), Inches(0.3),
                str(prop_date),
                font_name=FONT_BODY,
                font_size_pt=12,
                font_color=C_SUB,
                align=PP_ALIGN.RIGHT)

    # ---- Main proposal title ----
    y_title = y_meta + Inches(0.4)
    add_textbox(slide,
                MARGIN, y_title,
                SLIDE_W - MARGIN * 2, Inches(0.5),
                "自家消費型太陽光発電システム",
                font_name=FONT_BODY,
                font_size_pt=18,
                font_color=C_DARK,
                bold=True)

    add_textbox(slide,
                MARGIN, y_title + Inches(0.5),
                SLIDE_W - MARGIN * 2, Inches(0.5),
                "導入費用ゼロの  電気代 / CO₂削減プラン",
                font_name=FONT_BLACK,
                font_size_pt=22,
                font_color=C_ORANGE,
                bold=True)

    # ---- Two-column layout: Plan cards (left) + System spec (right) ----
    y_cards = y_title + Inches(1.2)
    plans = _build_plan_labels(subsidy, years)

    # Left column: plan cards
    left_w = (SLIDE_W - MARGIN * 2) * 0.62
    card_h = Inches(0.45)

    for i, plan_label in enumerate(plans):
        y_c = y_cards + i * (card_h + Inches(0.08))
        add_rounded_rect(slide, MARGIN, y_c, left_w, card_h, C_LIGHT_GRAY)
        # Orange left accent
        add_rect(slide, MARGIN, y_c, Inches(0.08), card_h, C_ORANGE)
        add_textbox(slide,
                    MARGIN + Inches(0.18), y_c + Inches(0.08),
                    left_w - Inches(0.25), card_h - Inches(0.16),
                    plan_label,
                    font_name=FONT_BODY,
                    font_size_pt=12,
                    font_color=C_DARK,
                    bold=(i == 0))

    # Right column: system spec summary
    right_x = MARGIN + left_w + Inches(0.25)
    right_w = SLIDE_W - MARGIN - right_x
    specs = []
    if capacity:
        specs.append(f"システム容量：{capacity:.1f} kW")
    if unit_price:
        specs.append(f"PPA単価：{unit_price:.1f} 円/kWh")
    if years:
        specs.append(f"契約期間：{years} 年")
    if specs:
        add_rounded_rect(slide, right_x, y_cards, right_w,
                         len(plans) * (card_h + Inches(0.08)) - Inches(0.08),
                         C_LIGHT_GRAY)
        add_rect(slide, right_x, y_cards, Inches(0.06),
                 len(plans) * (card_h + Inches(0.08)) - Inches(0.08),
                 C_ORANGE)
        for j, spec in enumerate(specs):
            add_textbox(slide,
                        right_x + Inches(0.15), y_cards + Inches(0.12) + j * Inches(0.35),
                        right_w - Inches(0.2), Inches(0.3),
                        spec,
                        font_name=FONT_BODY,
                        font_size_pt=11,
                        font_color=C_DARK)

    # ---- Footer ----
    add_footer(slide)


def _build_plan_labels(subsidy: str, years: int) -> list[str]:
    """Build plan label strings based on subsidy and contract years."""
    base = subsidy if subsidy else ""
    labels = []
    if base:
        labels.append(f"{base}活用　{years}年償却プラン")
        labels.append(f"{base}活用　{years - 3}年償却＋3年プラン")
    else:
        labels.append(f"{years}年償却プラン")
        labels.append(f"{years - 3}年償却＋{3}年プラン")
        labels.append(f"{years - 10}年償却＋10年プラン")
    return labels
