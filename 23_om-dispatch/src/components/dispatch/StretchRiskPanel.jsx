import { useState } from 'react';
import { useClaudeApi } from '../../hooks/useClaudeApi';

// Parse risk level from AI response text
function parseRiskLevel(text) {
  if (!text) return 'unknown';
  if (text.includes('リスクレベル') || text.includes('リスク')) {
    if (text.includes('「高」') || text.includes('高')) {
      // Check for exact high-risk marker first
      const highPattern = /リスクレベル[：:]?\s*[「「]?高[」」]?/;
      if (highPattern.test(text)) return 'high';
    }
    if (text.includes('「中」')) {
      const medPattern = /リスクレベル[：:]?\s*[「「]?中[」」]?/;
      if (medPattern.test(text)) return 'medium';
    }
    if (text.includes('「低」')) {
      const lowPattern = /リスクレベル[：:]?\s*[「「]?低[」」]?/;
      if (lowPattern.test(text)) return 'low';
    }
  }
  // Fallback: scan for keywords
  if (text.includes('高リスク') || text.includes('リスクが高')) return 'high';
  if (text.includes('中リスク') || text.includes('リスクは中')) return 'medium';
  if (text.includes('低リスク') || text.includes('リスクが低') || text.includes('リスクは低'))
    return 'low';
  return 'medium';
}

// Risk level styling configuration
const RISK_STYLES = {
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-500',
    label: '低リスク',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: 'text-yellow-500',
    label: '中リスク',
  },
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-500',
    label: '高リスク',
  },
  unknown: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    badge: 'bg-gray-100 text-gray-700',
    icon: 'text-gray-500',
    label: '評価中',
  },
};

export default function StretchRiskPanel({
  team,
  job,
  jobType,
  stretchMultiplier,
}) {
  const { loading, error, lastUsage, evaluateStretch, hasApiKey } =
    useClaudeApi();
  const [result, setResult] = useState(null);
  const [riskLevel, setRiskLevel] = useState('unknown');

  async function handleEvaluate() {
    if (!team || !job || !jobType) return;

    const res = await evaluateStretch(team, job, jobType, stretchMultiplier);

    if (!res.error) {
      setResult(res);
      setRiskLevel(parseRiskLevel(res.content));
    }
  }

  function handleRetry() {
    setResult(null);
    setRiskLevel('unknown');
    handleEvaluate();
  }

  if (!hasApiKey) {
    return (
      <div className="text-xs text-gray-400 italic">
        リスク評価を利用するには設定画面でAPIキーを登録してください
      </div>
    );
  }

  const style = RISK_STYLES[riskLevel] || RISK_STYLES.unknown;

  return (
    <div className="space-y-3">
      {/* Header with stretch info */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          ストレッチ配置リスク評価
        </h4>
        {stretchMultiplier && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
            倍率: {stretchMultiplier}x
          </span>
        )}
      </div>

      {/* Evaluate button */}
      {!result && !loading && !error && (
        <button
          onClick={handleEvaluate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          リスク評価を実行
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="w-4 h-4 animate-spin text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Sonnetモデルでリスク評価中...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-2 text-xs font-medium text-red-600 hover:text-red-800 underline"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result panel */}
      {result && !loading && !error && (
        <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
          {/* Risk level badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 ${style.icon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${style.badge}`}
              >
                {style.label}
              </span>
            </div>
          </div>

          {/* Assessment content */}
          <div className={`text-sm ${style.text} whitespace-pre-wrap leading-relaxed`}>
            {result.content}
          </div>

          {/* Model and usage footer */}
          <div className="mt-3 pt-2 border-t border-opacity-30 flex items-center gap-3 text-xs opacity-60">
            <span className="inline-flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Sonnet（高精度モデル）
            </span>
            {lastUsage && (
              <span>
                {lastUsage.input_tokens + lastUsage.output_tokens} tokens
              </span>
            )}
            <button
              onClick={handleRetry}
              className={`ml-auto ${style.text} hover:opacity-80 underline`}
            >
              再評価
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
