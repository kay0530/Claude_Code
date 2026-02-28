import { useState } from 'react';
import WorkingHoursSettings from './WorkingHoursSettings';
import JobTypeEditor from './JobTypeEditor';
import ConditionEditor from './ConditionEditor';
import StretchSettings from './StretchSettings';
import DataManagement from './DataManagement';

/**
 * Main settings page with tab-based navigation.
 * Organizes all configuration options into logical sections.
 */
const TABS = [
  { key: 'workingHours', label: '勤務時間設定', icon: 'clock' },
  { key: 'jobTypes', label: '案件種別管理', icon: 'briefcase' },
  { key: 'conditions', label: '条件管理', icon: 'adjustments' },
  { key: 'stretch', label: 'ストレッチモード', icon: 'zap' },
  { key: 'data', label: 'データ管理', icon: 'database' },
  { key: 'api', label: 'API設定', icon: 'cloud' },
];

function TabIcon({ icon, className }) {
  const iconPaths = {
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    briefcase:
      'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    adjustments:
      'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
    zap: 'M13 10V3L4 14h7v7l9-11h-7z',
    database:
      'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    cloud:
      'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
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
        d={iconPaths[icon] || iconPaths.cloud}
      />
    </svg>
  );
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('workingHours');

  function renderTabContent() {
    switch (activeTab) {
      case 'workingHours':
        return <WorkingHoursSettings />;
      case 'jobTypes':
        return <JobTypeEditor />;
      case 'conditions':
        return <ConditionEditor />;
      case 'stretch':
        return <StretchSettings />;
      case 'data':
        return <DataManagement />;
      case 'api':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TabIcon icon="cloud" className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">API設定</h3>
            <p className="text-gray-500 mt-1 text-sm">
              この機能は今後のフェーズで実装予定です
            </p>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">設定</h2>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <TabIcon
              icon={tab.icon}
              className={`w-4 h-4 ${
                activeTab === tab.key ? 'text-white' : 'text-gray-400'
              }`}
            />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {renderTabContent()}
    </div>
  );
}
