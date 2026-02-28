import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { APP_DEFAULTS } from '../../data/defaults';

/**
 * Working hours configuration panel.
 * Manages regular hours, extended hours, and departure/arrival limits.
 */
export default function WorkingHoursSettings() {
  const { state, dispatch } = useApp();
  const { settings } = state;

  const [form, setForm] = useState({
    start: settings.workingHours.start,
    end: settings.workingHours.end,
    extendedStart: settings.workingHours.extendedStart,
    extendedEnd: settings.workingHours.extendedEnd,
    earliestDeparture: settings.earliestDeparture,
    latestWorkStart: settings.latestWorkStart,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        workingHours: {
          start: form.start,
          end: form.end,
          extendedStart: form.extendedStart,
          extendedEnd: form.extendedEnd,
        },
        earliestDeparture: form.earliestDeparture,
        latestWorkStart: form.latestWorkStart,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    const defaults = APP_DEFAULTS;
    setForm({
      start: defaults.workingHours.start,
      end: defaults.workingHours.end,
      extendedStart: defaults.workingHours.extendedStart,
      extendedEnd: defaults.workingHours.extendedEnd,
      earliestDeparture: defaults.earliestDeparture,
      latestWorkStart: defaults.latestWorkStart,
    });
  }

  function TimeInput({ label, value, onChange, description }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Regular working hours */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">通常勤務時間</h3>
        <p className="text-sm text-gray-500 mb-4">
          標準的な業務開始・終了時刻を設定します
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeInput
            label="開始時刻"
            value={form.start}
            onChange={(v) => setForm({ ...form, start: v })}
            description="通常の業務開始時刻"
          />
          <TimeInput
            label="終了時刻"
            value={form.end}
            onChange={(v) => setForm({ ...form, end: v })}
            description="通常の業務終了時刻"
          />
        </div>
      </div>

      {/* Extended working hours */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          延長勤務時間
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          ストレッチモード時に許容される業務時間の範囲を設定します
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeInput
            label="延長開始時刻"
            value={form.extendedStart}
            onChange={(v) => setForm({ ...form, extendedStart: v })}
            description="延長時の最早業務開始時刻"
          />
          <TimeInput
            label="延長終了時刻"
            value={form.extendedEnd}
            onChange={(v) => setForm({ ...form, extendedEnd: v })}
            description="延長時の最遅業務終了時刻"
          />
        </div>
      </div>

      {/* Departure / work start limits */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          出発・作業開始制限
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          メンバーの出発可能時刻と現場作業開始の制限を設定します
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeInput
            label="最早出発時刻"
            value={form.earliestDeparture}
            onChange={(v) => setForm({ ...form, earliestDeparture: v })}
            description="事業所からの最も早い出発時刻"
          />
          <TimeInput
            label="最遅作業開始時刻"
            value={form.latestWorkStart}
            onChange={(v) => setForm({ ...form, latestWorkStart: v })}
            description="現場での作業開始は最遅でもこの時刻まで"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-end">
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            保存しました
          </span>
        )}
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
        >
          デフォルトに戻す
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          保存
        </button>
      </div>
    </div>
  );
}
