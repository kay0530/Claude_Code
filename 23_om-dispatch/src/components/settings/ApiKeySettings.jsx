import { useState } from 'react';
import { STORAGE_KEY, callClaudeAPI, selectModel } from '../../services/claudeService';

function loadStoredApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export default function ApiKeySettings() {
  const [apiKey, setApiKey] = useState(loadStoredApiKey);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isConfigured, setIsConfigured] = useState(() => Boolean(loadStoredApiKey()));
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Save API key
  function handleSave() {
    if (apiKey.trim()) {
      localStorage.setItem(STORAGE_KEY, apiKey.trim());
      setIsConfigured(true);
      setSaveMessage('APIキーを保存しました');
      setTestStatus(null);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsConfigured(false);
      setSaveMessage('APIキーを削除しました');
      setTestStatus(null);
    }
    setTimeout(() => setSaveMessage(''), 3000);
  }

  // Test connection with minimal API call
  async function handleTestConnection() {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('APIキーを入力してください');
      return;
    }

    // Temporarily save key for test
    const previousKey = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, apiKey.trim());

    setTestStatus('testing');
    setTestMessage('');

    const result = await callClaudeAPI(
      selectModel('haiku'),
      'Reply with only: OK',
      'Connection test. Reply with only: OK',
      16
    );

    // Restore previous key if it was different
    if (previousKey !== apiKey.trim()) {
      if (previousKey) {
        localStorage.setItem(STORAGE_KEY, previousKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (result.error) {
      setTestStatus('error');
      setTestMessage(result.content);
    } else {
      setTestStatus('success');
      setTestMessage(
        `接続成功 (${result.model?.includes('haiku') ? 'Haiku' : 'Sonnet'}, ${result.usage ? result.usage.input_tokens + result.usage.output_tokens : '?'} tokens)`
      );
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <svg
            className="w-5 h-5 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Claude API設定</h3>
          <p className="text-sm text-gray-500">
            AI推薦理由・リスク評価に使用するAPIキー
          </p>
        </div>
        {/* Status indicator */}
        <div className="ml-auto">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              設定済み
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              未設定
            </span>
          )}
        </div>
      </div>

      {/* API key input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          APIキー
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={isRevealed ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestStatus(null);
                setSaveMessage('');
              }}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            />
            {/* Reveal toggle button */}
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title={isRevealed ? '非表示' : '表示'}
            >
              {isRevealed ? (
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
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            保存
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing' || !apiKey.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {testStatus === 'testing' ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
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
                テスト中...
              </>
            ) : (
              '接続テスト'
            )}
          </button>

          {/* Save feedback */}
          {saveMessage && (
            <span className="text-sm text-green-600 font-medium">
              {saveMessage}
            </span>
          )}
        </div>

        {/* Test result */}
        {testStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {testMessage}
          </div>
        )}
        {testStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {testMessage}
          </div>
        )}
      </div>

      {/* Cost information note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-xs font-bold text-gray-600 mb-1">
          モデル使い分けについて
        </h4>
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-start gap-2">
            <span className="inline-block w-16 shrink-0 font-medium text-blue-600">
              Haiku
            </span>
            <span>
              低コスト・高速。簡易な推薦理由の生成に使用（現地調査、年次点検、草刈りなど）
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="inline-block w-16 shrink-0 font-medium text-purple-600">
              Sonnet
            </span>
            <span>
              高精度。複雑な工事のリスク評価・最適化に使用（リパワリング、パネル撤去、ストレッチ評価など）
            </span>
          </div>
          <p className="mt-1 text-gray-400">
            ※ モデルは案件種別のaiComplexity設定に基づき自動選択されます。ストレッチリスク評価と複数案件最適化は常にSonnetを使用します。
          </p>
        </div>
      </div>
    </div>
  );
}
