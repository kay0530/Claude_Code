import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useDataExport } from '../../hooks/useDataExport';

/**
 * Data management panel for export, import, and reset operations.
 * Shows data statistics and provides backup/restore functionality.
 */
export default function DataManagement() {
  const { state } = useApp();
  const { exportData, importData, resetData } = useDataExport();
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Data statistics
  const stats = [
    { label: 'メンバー', count: state.members.length, icon: 'users' },
    { label: '案件種別', count: state.jobTypes.length, icon: 'briefcase' },
    { label: '条件', count: state.conditions.length, icon: 'adjustments' },
    { label: '案件', count: state.jobs.length, icon: 'clipboard' },
    { label: '配置', count: state.assignments.length, icon: 'calendar' },
    {
      label: 'フィードバック',
      count: state.feedbacks.length,
      icon: 'message',
    },
  ];

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'loading', message: 'インポート中...' });
    try {
      await importData(file);
      setImportStatus({
        type: 'success',
        message: 'データを正常にインポートしました',
      });
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus({ type: 'error', message: err.message });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleReset() {
    resetData();
    setShowResetConfirm(false);
  }

  function StatIcon({ icon, className }) {
    const paths = {
      users:
        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      briefcase:
        'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      adjustments:
        'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      clipboard:
        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      calendar:
        'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      message:
        'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    };

    return (
      <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={paths[icon] || paths.clipboard}
        />
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data statistics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          データ統計
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
            >
              <StatIcon
                icon={stat.icon}
                className="w-5 h-5 text-gray-400"
              />
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {stat.count}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          データエクスポート
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          全データをJSON形式でダウンロードします。バックアップとしてご利用ください。
        </p>
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          全データをエクスポート
        </button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          データインポート
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          エクスポートしたJSONファイルからデータを復元します。現在のデータは上書きされます。
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm cursor-pointer">
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            JSONファイルを選択
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
        {importStatus && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm font-medium ${
              importStatus.type === 'success'
                ? 'bg-green-50 text-green-700'
                : importStatus.type === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {importStatus.message}
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h3 className="text-lg font-bold text-red-800 mb-1">
          データリセット
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          全データを初期状態に戻します。この操作は元に戻せません。
        </p>

        {showResetConfirm ? (
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 mb-3">
              本当に全データをリセットしますか？この操作は元に戻せません。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
              >
                リセットする
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            全データをリセット
          </button>
        )}
      </div>
    </div>
  );
}
