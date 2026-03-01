import { useState } from 'react';
import { useClaudeApi } from '../../hooks/useClaudeApi';

export default function AiRecommendationButton({
  recommendation,
  job,
  jobType,
  onReasonGenerated,
}) {
  const { loading, error, generateReason, hasApiKey } =
    useClaudeApi();
  const [result, setResult] = useState(null);

  async function handleGenerate() {
    if (!recommendation || !job || !jobType) return;

    const res = await generateReason(
      recommendation.team,
      job,
      jobType,
      recommendation.score,
      recommendation.breakdown,
      recommendation.isStretch || false
    );

    if (!res.error) {
      setResult(res);
      onReasonGenerated?.(res.content);
    }
  }

  function handleRetry() {
    setResult(null);
    handleGenerate();
  }

  if (!hasApiKey) {
    return (
      <div className="text-xs text-gray-400 italic">
        AI推薦理由を利用するには設定画面でAPIキーを登録してください
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Generate button */}
      {!result && !loading && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          AI推薦理由を生成
        </button>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="w-4 h-4 animate-spin text-indigo-500"
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
          AI推薦理由を生成中...
        </div>
      )}

      {/* Error state with retry */}
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

      {/* Result card */}
      {result && !loading && !error && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h4 className="text-sm font-bold text-indigo-800">
              AI推薦理由
            </h4>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {result.content}
          </p>
          {/* Model and usage info */}
          <div className="mt-3 pt-2 border-t border-indigo-200 flex items-center gap-3 text-xs text-indigo-500">
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
              {result.model?.includes('haiku') ? 'Haiku' : 'Sonnet'}
            </span>
            {result.usage && (
              <span>
                {result.usage.input_tokens + result.usage.output_tokens} tokens
              </span>
            )}
            <button
              onClick={handleRetry}
              className="ml-auto text-indigo-600 hover:text-indigo-800 underline"
            >
              再生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
