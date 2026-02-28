import { useState } from 'react';

/**
 * Visual indicator for stretch mode.
 * Shows a badge with the stretch multiplier (e.g. 120%) meaning "perform at 120% effort".
 * @param {{ isStretch: boolean, stretchMultiplier?: number, teamSkillTotal?: number, requiredSkillTotal?: number }}
 */
export default function StretchIndicator({ isStretch, stretchMultiplier, teamSkillTotal, requiredSkillTotal }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isStretch) return null;

  // Display the multiplier as a percentage (e.g. 1.2 -> 120%)
  const effortPercent = stretchMultiplier ? Math.round(stretchMultiplier * 100) : 120;

  return (
    <div className="relative inline-flex">
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-help transition-colors bg-orange-100 text-orange-700 border border-orange-200"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>ストレッチ {effortPercent}%</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            <p className="font-bold mb-1">ストレッチモード（{effortPercent}%）</p>
            <p>通常より頑張ってもらうモードです。</p>
            <p>チームに通常の{effortPercent}%の力を発揮してもらいます。</p>
            {teamSkillTotal != null && requiredSkillTotal != null && (
              <p className="mt-1 text-gray-300">
                チームスキル: {Math.round(teamSkillTotal * 10) / 10} / 必要: {requiredSkillTotal}
              </p>
            )}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}
