#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
詳細照合スクリプト
不一致業者の仕入明細を詳しく分析
"""

import pandas as pd
import os
import json

BASE_DIR = r"C:\Users\田中　圭亮\Desktop\Claude_Code_Demo\調達グループ（請求書データ）"
CSV_FILE = os.path.join(BASE_DIR, "2512月仕入明細一覧表.csv")

def read_purchase_data():
    """仕入明細データを読み込む"""
    df = pd.read_csv(CSV_FILE, encoding='cp932', on_bad_lines='skip')
    print(f"CSV読み込み完了: {len(df):,}行")
    return df

def analyze_vendor_details(df, vendor_name):
    """特定業者の仕入明細を詳細分析"""
    # 列インデックス
    vendor_col = df.columns[3]  # 仕入業者名
    order_col = df.columns[8]   # 注文番号
    item_col = df.columns[35]   # 品名
    qty_col = df.columns[17]    # 数量
    unit_price_col = df.columns[21]  # 単価
    amount_col = df.columns[22]  # 仕入金額
    date_col = df.columns[1]    # 注文日

    # 業者名でフィルタ
    vendor_df = df[df[vendor_col] == vendor_name].copy()

    if len(vendor_df) == 0:
        print(f"業者 '{vendor_name}' のデータが見つかりません")
        return None

    print(f"\n業者名: {vendor_name}")
    print(f"明細行数: {len(vendor_df)}行")

    # 数値に変換
    vendor_df[amount_col] = pd.to_numeric(vendor_df[amount_col], errors='coerce')
    vendor_df[qty_col] = pd.to_numeric(vendor_df[qty_col], errors='coerce')
    vendor_df[unit_price_col] = pd.to_numeric(vendor_df[unit_price_col], errors='coerce')

    total_amount = vendor_df[amount_col].sum()
    print(f"仕入金額合計: Y{total_amount:,.0f}")

    # 注文番号別に集計
    order_summary = vendor_df.groupby(order_col).agg({
        amount_col: 'sum',
        date_col: 'first',
        item_col: 'count'
    }).sort_values(amount_col, ascending=False)

    print(f"\n注文番号別集計（上位10件）:")
    print("-" * 80)
    for idx, (order_no, row) in enumerate(order_summary.head(10).iterrows(), 1):
        print(f"{idx}. 注文番号: {order_no}")
        print(f"   金額: Y{row[amount_col]:,.0f}")
        print(f"   日付: {row[date_col]}")
        print(f"   明細行数: {int(row[item_col])}行")

    # 金額の大きい明細（10万円以上）
    large_items = vendor_df[vendor_df[amount_col] >= 100000].sort_values(amount_col, ascending=False)
    if len(large_items) > 0:
        print(f"\n高額明細（10万円以上）: {len(large_items)}件")
        print("-" * 80)
        for idx, (_, row) in enumerate(large_items.head(20).iterrows(), 1):
            print(f"{idx}. {row[item_col]}")
            print(f"   数量: {row[qty_col]}, 単価: Y{row[unit_price_col]:,.0f}, 金額: Y{row[amount_col]:,.0f}")
            print(f"   注文番号: {row[order_col]}, 注文日: {row[date_col]}")

    # マイナス金額の明細（返品など）
    negative_items = vendor_df[vendor_df[amount_col] < 0]
    if len(negative_items) > 0:
        print(f"\nマイナス金額明細（返品等）: {len(negative_items)}件")
        print("-" * 80)
        for idx, (_, row) in enumerate(negative_items.iterrows(), 1):
            print(f"{idx}. {row[item_col]}")
            print(f"   数量: {row[qty_col]}, 単価: Y{row[unit_price_col]:,.0f}, 金額: Y{row[amount_col]:,.0f}")
            print(f"   注文番号: {row[order_col]}, 注文日: {row[date_col]}")

    # 重複の可能性チェック
    # 同じ品名・数量・単価の組み合わせが複数ある場合
    dup_check = vendor_df.groupby([item_col, qty_col, unit_price_col]).size()
    duplicates = dup_check[dup_check > 1].sort_values(ascending=False)
    if len(duplicates) > 0:
        print(f"\n同一品名・数量・単価の重複: {len(duplicates)}パターン")
        print("-" * 80)
        for (item, qty, price), count in duplicates.head(10).items():
            print(f"品名: {item}, 数量: {qty}, 単価: Y{price:,.0f} => {count}回出現")

    return {
        'vendor': vendor_name,
        'total_rows': len(vendor_df),
        'total_amount': float(total_amount),
        'order_count': len(order_summary),
        'large_items_count': len(large_items),
        'negative_items_count': len(negative_items),
        'duplicate_patterns': len(duplicates)
    }

def main():
    print("=" * 80)
    print("詳細照合分析 - 不一致業者")
    print("=" * 80)

    df = read_purchase_data()

    # 分析対象業者（差額が大きい順）
    target_vendors = [
        '新明電材',
        '丸紅',
        'ｲｸﾞｱｽ',
        'ﾕｱｻ商事',
        '鶴田電機',
        'ﾔﾏﾄ電機',
        'ﾐｭｰﾃｸﾉ',
        '木谷電器',
        '東洋ﾍﾞｰｽ',
        'A-ｽﾀｲﾙ',
        'ｶﾅﾒ',
        'DMEGC'
    ]

    results = []
    for vendor in target_vendors:
        result = analyze_vendor_details(df, vendor)
        if result:
            results.append(result)
        print("\n" + "=" * 80 + "\n")

    # 結果を保存
    output_file = os.path.join(BASE_DIR, "詳細分析結果_202512.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n詳細分析結果を保存しました: {output_file}")

if __name__ == "__main__":
    main()
