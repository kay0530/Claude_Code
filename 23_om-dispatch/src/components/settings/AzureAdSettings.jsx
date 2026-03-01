import { useState, useEffect } from 'react';
import { loadAzureConfig, saveAzureConfig } from '../../services/msalService';
import { useAuth } from '../../context/AuthContext';

/**
 * Azure AD configuration settings component.
 * Allows users to set their Azure AD Client ID and Tenant ID
 * for Microsoft 365 calendar integration.
 */
export default function AzureAdSettings() {
  const { isAuthenticated, account, login, loading: authLoading } = useAuth();

  const [clientId, setClientId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [connectingTest, setConnectingTest] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    const config = loadAzureConfig();
    if (config.clientId) {
      setClientId(config.clientId);
    }
    if (config.tenantId) {
      setTenantId(config.tenantId);
    }
    if (config.clientId && config.tenantId) {
      setIsConfigured(true);
    }
  }, []);

  // Save Azure AD config
  function handleSave() {
    const trimmedClientId = clientId.trim();
    const trimmedTenantId = tenantId.trim();

    if (trimmedClientId && trimmedTenantId) {
      saveAzureConfig(trimmedClientId, trimmedTenantId);
      setIsConfigured(true);
      setSaveMessage('設定を保存しました。変更を反映するにはページをリロードしてください。');
    } else {
      setSaveMessage('Client ID と Tenant ID の両方を入力してください。');
    }
    setTimeout(() => setSaveMessage(''), 5000);
  }

  // Test connection by triggering login
  async function handleTestConnection() {
    setConnectingTest(true);
    try {
      await login();
    } finally {
      setConnectingTest(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Microsoft 365 連携設定</h3>
          <p className="text-sm text-gray-500">
            カレンダー同期に使用する Azure AD 設定
          </p>
        </div>
        {/* Status indicator */}
        <div className="ml-auto">
          {isAuthenticated ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              接続済み
            </span>
          ) : isConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              未接続
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              未設定
            </span>
          )}
        </div>
      </div>

      {/* Connected account info */}
      {isAuthenticated && account && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {account.name || account.username} としてサインイン中
          </span>
        </div>
      )}

      {/* Config input fields */}
      <div className="space-y-4">
        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID (アプリケーション ID)
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setSaveMessage('');
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
        </div>

        {/* Tenant ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tenant ID (テナント ID)
          </label>
          <input
            type="text"
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setSaveMessage('');
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={!clientId.trim() || !tenantId.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>

          {/* Test connection button — shown when config exists but not authenticated */}
          {isConfigured && !isAuthenticated && (
            <button
              onClick={handleTestConnection}
              disabled={connectingTest || authLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {connectingTest || authLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  接続中...
                </>
              ) : (
                '接続テスト'
              )}
            </button>
          )}

          {/* Save feedback */}
          {saveMessage && (
            <span className="text-sm text-amber-600 font-medium">
              {saveMessage}
            </span>
          )}
        </div>
      </div>

      {/* Information note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-xs font-bold text-gray-600 mb-1">
          Azure AD アプリ登録について
        </h4>
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            Azure AD でアプリ登録が必要です。必要な権限: <span className="font-mono text-blue-600">Calendars.ReadWrite</span>, <span className="font-mono text-blue-600">User.Read</span>
          </p>
          <p className="text-gray-400">
            ※ アプリの種類は「SPA (シングルページアプリケーション)」を選択し、リダイレクト URI にこのアプリの URL を設定してください。
          </p>
        </div>
      </div>
    </div>
  );
}
