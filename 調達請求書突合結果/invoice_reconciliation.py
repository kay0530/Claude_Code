#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
請求書照合スクリプト
2025年12月の仕入明細データと請求書PDFの照合を行う
"""

import pandas as pd
import os
import re
from pathlib import Path
from collections import defaultdict
import json

# パス設定
BASE_DIR = r"C:\Users\田中　圭亮\Desktop\Claude_Code_Demo\調達グループ（請求書データ）"
CSV_FILE = os.path.join(BASE_DIR, "2512月仕入明細一覧表.csv")
PDF_DIR = os.path.join(BASE_DIR, "2025.12")
PREV_PDF_DIR = os.path.join(BASE_DIR, "2025.11")

def read_purchase_data():
    """仕入明細データを読み込む"""
    # 複数のエンコーディングを試す
    encodings = ['cp932', 'shift_jis', 'utf-8', 'utf-16']

    for encoding in encodings:
        try:
            df = pd.read_csv(CSV_FILE, encoding=encoding, on_bad_lines='skip')
            print(f"OK CSVファイル読み込み成功（エンコーディング: {encoding}）")
            print(f"  行数: {len(df):,}行, 列数: {len(df.columns)}列")
            return df
        except Exception as e:
            print(f"  {encoding}で失敗: {str(e)[:50]}")
            continue

    raise Exception("CSVファイルの読み込みに失敗しました")

def extract_amount_from_filename(filename):
    """ファイル名から金額を抽出"""
    # ファイル名のパターン: YYYYMMDD_請求書_業者名_金額.pdf
    match = re.search(r'_(-?\d+)\.pdf$', filename)
    if match:
        return int(match.group(1))
    return None

def extract_vendor_from_filename(filename):
    """ファイル名から業者名を抽出"""
    # ファイル名のパターン: YYYYMMDD_請求書_業者名_金額.pdf
    parts = filename.replace('.pdf', '').split('_')
    if len(parts) >= 3:
        # 日付と'請求書'を除いた部分から業者名を抽出
        vendor_parts = parts[2:-1]  # 最後は金額なので除外
        return '_'.join(vendor_parts)
    return None

def extract_invoice_amount(filename):
    """ファイル名から請求金額を抽出"""
    # ファイル名から金額を取得
    filename_amount = extract_amount_from_filename(filename)
    return filename_amount

def analyze_invoices():
    """請求書PDFを分析"""
    invoices = []

    # 2025.12フォルダ内のPDFを探す（工事フォルダ以外）
    pdf_files = []
    for root, dirs, files in os.walk(PDF_DIR):
        # 工事フォルダは除外
        if '工事' in root or '支払査定' in root:
            continue
        for file in files:
            if file.endswith('.pdf') or file.endswith('.PDF'):
                pdf_files.append(os.path.join(root, file))

    print(f"\n請求書PDF分析中...")
    print(f"対象ファイル数: {len(pdf_files)}件")

    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        vendor = extract_vendor_from_filename(filename)

        # ファイル名から金額を抽出
        amount = extract_invoice_amount(filename)

        if vendor and amount is not None:
            invoices.append({
                'vendor': vendor,
                'amount': amount,
                'filename': filename,
                'filepath': pdf_path
            })
            print(f"  OK {vendor}: Y{amount:,}")

    return invoices

def aggregate_purchase_data(df):
    """仕入明細データを業者別に集計"""
    # 列名を確認（文字化け対策）
    print(f"\nCSVの列名（最初の10列）:")
    for i, col in enumerate(df.columns[:10]):
        print(f"  {i}: {repr(col)}")

    # 業者名と金額の列を特定（列のインデックスで指定）
    # 通常、業者名は3列目、金額は仕入金額や販売金額の列
    try:
        # 列インデックスで指定（0始まり）
        vendor_col_idx = 3  # 仕入業者名
        amount_col_idx = 22  # 仕入金額（通常22列目あたり）

        vendor_col = df.columns[vendor_col_idx]
        amount_col = df.columns[amount_col_idx]

        print(f"\n使用する列:")
        print(f"  業者名: {repr(vendor_col)} (列{vendor_col_idx})")
        print(f"  金額: {repr(amount_col)} (列{amount_col_idx})")

        # 業者別に集計
        df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce')
        vendor_totals = df.groupby(vendor_col)[amount_col].sum().sort_values(ascending=False)

        print(f"\n業者別集計（上位20社）:")
        for vendor, amount in vendor_totals.head(20).items():
            print(f"  {vendor}: Y{amount:,.0f}")

        return vendor_totals.to_dict()

    except Exception as e:
        print(f"エラー: {e}")
        return {}

def match_vendors(invoice_vendor, purchase_vendors):
    """業者名のマッチング（部分一致も考慮）"""
    # 完全一致
    if invoice_vendor in purchase_vendors:
        return invoice_vendor

    # 部分一致を探す
    for pv in purchase_vendors:
        if invoice_vendor in pv or pv in invoice_vendor:
            return pv

    return None

def reconcile_invoices_and_purchases(invoices, purchase_totals):
    """請求書と仕入明細の照合"""
    results = {
        'matched': [],
        'mismatched': [],
        'invoice_only': [],
        'purchase_only': []
    }

    invoice_vendors = set()

    # 請求書を集計（同じ業者の複数請求書を合算）
    invoice_totals = defaultdict(list)
    for inv in invoices:
        invoice_totals[inv['vendor']].append(inv)
        invoice_vendors.add(inv['vendor'])

    print(f"\n照合処理中...")

    # 請求書と仕入明細を照合
    for inv_vendor, inv_list in invoice_totals.items():
        invoice_total = sum(inv['amount'] for inv in inv_list)

        # 業者名をマッチング
        matched_vendor = match_vendors(inv_vendor, purchase_totals.keys())

        if matched_vendor:
            purchase_amount = purchase_totals[matched_vendor]
            diff = invoice_total - purchase_amount

            if abs(diff) < 10:  # 10円以下の差異は許容
                results['matched'].append({
                    'vendor': inv_vendor,
                    'invoice_amount': invoice_total,
                    'purchase_amount': purchase_amount,
                    'diff': diff,
                    'invoices': inv_list
                })
            else:
                results['mismatched'].append({
                    'vendor': inv_vendor,
                    'invoice_amount': invoice_total,
                    'purchase_amount': purchase_amount,
                    'diff': diff,
                    'invoices': inv_list
                })
        else:
            results['invoice_only'].append({
                'vendor': inv_vendor,
                'invoice_amount': invoice_total,
                'invoices': inv_list
            })

    # 仕入明細のみの業者を特定
    for pv, amount in purchase_totals.items():
        if not any(match_vendors(iv, [pv]) for iv in invoice_vendors):
            # 金額が0より大きい場合のみリストアップ
            if amount > 0:
                results['purchase_only'].append({
                    'vendor': pv,
                    'purchase_amount': amount
                })

    return results

def generate_report(results, purchase_totals, invoices):
    """レポートを生成"""
    report = []

    report.append("=" * 80)
    report.append("【照合結果サマリー】")
    report.append("=" * 80)

    total_invoices = len(invoices)
    matched_vendors = len(results['matched'])
    mismatched_vendors = len(results['mismatched'])
    invoice_only_vendors = len(results['invoice_only'])
    purchase_only_vendors = len(results['purchase_only'])

    report.append(f"請求書総数: {total_invoices}件")
    report.append(f"金額一致: {matched_vendors}業者")
    report.append(f"金額不一致: {mismatched_vendors}業者")
    report.append(f"請求書のみ: {invoice_only_vendors}業者")
    report.append(f"仕入明細のみ: {purchase_only_vendors}業者")
    report.append("")

    # 一致した業者
    if results['matched']:
        report.append("-" * 80)
        report.append(f"【金額一致】 {len(results['matched'])}業者")
        report.append("-" * 80)
        for item in sorted(results['matched'], key=lambda x: x['invoice_amount'], reverse=True)[:10]:
            report.append(f"業者名: {item['vendor']}")
            report.append(f"  請求書金額: Y{item['invoice_amount']:,}")
            report.append(f"  仕入明細金額: Y{item['purchase_amount']:,.0f}")
            report.append(f"  差額: Y{item['diff']:,.0f}")
            report.append("")

    # 不一致の業者
    if results['mismatched']:
        report.append("-" * 80)
        report.append(f"【金額不一致】 {len(results['mismatched'])}業者 [要確認] 要確認")
        report.append("-" * 80)
        for item in sorted(results['mismatched'], key=lambda x: abs(x['diff']), reverse=True):
            report.append(f"業者名: {item['vendor']}")
            report.append(f"  請求書金額: Y{item['invoice_amount']:,}")
            report.append(f"  仕入明細金額: Y{item['purchase_amount']:,.0f}")
            report.append(f"  差額: Y{item['diff']:,.0f}")

            # 請求書ファイル一覧
            report.append(f"  請求書ファイル:")
            for inv in item['invoices']:
                report.append(f"    - {inv['filename']} (Y{inv['amount']:,})")

            # 差異の原因を推測
            causes = []
            diff_abs = abs(item['diff'])
            if diff_abs > item['purchase_amount'] * 0.5:
                causes.append("大幅な差異（50%以上）- 二重計上または大口請求漏れの可能性")
            elif diff_abs > 100000:
                causes.append("10万円以上の差異 - 詳細確認が必要")
            elif len(item['invoices']) > 1:
                causes.append("複数請求書あり - 請求書の集計確認が必要")

            if causes:
                report.append(f"  推定原因: {', '.join(causes)}")
            report.append("")

    # 請求書のみの業者
    if results['invoice_only']:
        report.append("-" * 80)
        report.append(f"【請求書のみ（仕入明細なし）】 {len(results['invoice_only'])}業者 [要確認]")
        report.append("-" * 80)
        for item in sorted(results['invoice_only'], key=lambda x: x['invoice_amount'], reverse=True):
            report.append(f"業者名: {item['vendor']}")
            report.append(f"  請求書金額: Y{item['invoice_amount']:,}")
            report.append(f"  推定原因: 仕入明細未入力、業者名不一致、または工事関連")
            report.append("")

    # 仕入明細のみの業者（請求書なし）
    if results['purchase_only']:
        report.append("-" * 80)
        report.append(f"【仕入明細のみ（請求書なし）】 {len(results['purchase_only'])}業者 [要確認]")
        report.append("-" * 80)
        for item in sorted(results['purchase_only'], key=lambda x: x['purchase_amount'], reverse=True)[:20]:
            report.append(f"業者名: {item['vendor']}")
            report.append(f"  仕入明細金額: Y{item['purchase_amount']:,.0f}")
            report.append(f"  推定原因: 請求書未着、または業者名不一致")
            report.append("")

    # 推奨アクション
    report.append("=" * 80)
    report.append("【推奨アクション】")
    report.append("=" * 80)

    actions = []

    if results['mismatched']:
        actions.append(f"1. 金額不一致の{len(results['mismatched'])}業者について、詳細照合を実施")
        actions.append("   - 請求書の明細と仕入明細を1行ずつ照合")
        actions.append("   - 注文番号をキーとして紐付け確認")

    if results['invoice_only']:
        actions.append(f"2. 請求書のみの{len(results['invoice_only'])}業者について業者名の確認")
        actions.append("   - 仕入明細の業者名と請求書の業者名の表記揺れをチェック")

    if results['purchase_only']:
        actions.append(f"3. 仕入明細のみの{len(results['purchase_only'])}業者について請求書の確認")
        actions.append("   - 請求書が未着か確認")
        actions.append("   - 前月請求や翌月請求の可能性を確認")

    for action in actions:
        report.append(action)

    report.append("")
    report.append("=" * 80)

    return "\n".join(report)

def main():
    print("=" * 80)
    print("請求書照合プログラム - 2025年12月分")
    print("=" * 80)
    print()

    # ステップ1: 仕入明細データを読み込み
    print("ステップ1: 仕入明細データ読み込み")
    df = read_purchase_data()
    purchase_totals = aggregate_purchase_data(df)

    # ステップ2: 請求書PDFを分析
    print("\nステップ2: 請求書PDF分析")
    invoices = analyze_invoices()

    # ステップ3: 照合
    print("\nステップ3: 照合処理")
    results = reconcile_invoices_and_purchases(invoices, purchase_totals)

    # ステップ4: レポート生成
    print("\nステップ4: レポート生成")
    report = generate_report(results, purchase_totals, invoices)

    # レポートを表示
    print("\n" + report)

    # レポートをファイルに保存
    report_file = os.path.join(BASE_DIR, "照合結果レポート_202512.txt")
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\nレポートを保存しました: {report_file}")

    # JSON形式でも保存
    json_file = os.path.join(BASE_DIR, "照合結果データ_202512.json")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_invoices': len(invoices),
                'matched_vendors': len(results['matched']),
                'mismatched_vendors': len(results['mismatched']),
                'invoice_only_vendors': len(results['invoice_only']),
                'purchase_only_vendors': len(results['purchase_only'])
            },
            'matched': results['matched'],
            'mismatched': results['mismatched'],
            'invoice_only': results['invoice_only'],
            'purchase_only': results['purchase_only'][:50]  # 上位50件のみ
        }, f, ensure_ascii=False, indent=2)

    print(f"詳細データを保存しました: {json_file}")

if __name__ == "__main__":
    main()
