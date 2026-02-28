import { useState } from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Stretch mode configuration panel.
 * Controls multiplier-based schedule extension for tight workdays.
 */
export default function StretchSettings() {
  const { state, dispatch } = useApp();
  const { settings } = state;

  const [form, setForm] = useState({
    enabled: settings.stretchMode.enabled,
    defaultMultiplier: settings.stretchMode.defaultMultiplier,
    maxMultiplier: settings.stretchMode.maxMultiplier,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        stretchMode: {
          enabled: form.enabled,
          defaultMultiplier: form.defaultMultiplier,
          maxMultiplier: form.maxMultiplier,
        },
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Enable/disable toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              ストレッチモード
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              繁忙期に勤務時間を延長して、より多くの案件を配置可能にします
            </p>
          </div>
          <button
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              form.enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                form.enabled ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Multiplier settings (visible when enabled) */}
      {form.enabled && (
        <>
          {/* Default multiplier */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="font-bold text-gray-800 mb-1">
              デフォルト倍率
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              ストレッチモード有効時に自動適用される倍率です
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={form.defaultMultiplier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultMultiplier: parseFloat(e.target.value),
                  })
                }
                className="flex-1 accent-blue-600"
              />
              <span className="text-lg font-bold text-blue-600 w-16 text-right">
                {form.defaultMultiplier.toFixed(1)}x
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1.0x</span>
              <span>1.5x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Max multiplier */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="font-bold text-gray-800 mb-1">
              最大倍率
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              手動調整時に設定できる倍率の上限です
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={form.maxMultiplier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxMultiplier: parseFloat(e.target.value),
                  })
                }
                className="flex-1 accent-blue-600"
              />
              <span className="text-lg font-bold text-blue-600 w-16 text-right">
                {form.maxMultiplier.toFixed(1)}x
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1.0x</span>
              <span>1.5x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Explanation panel */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <h4 className="font-bold text-blue-800 mb-2">
              ストレッチモードとは
            </h4>
            <div className="text-sm text-blue-700 space-y-2">
              <p>
                通常の勤務時間（{settings.workingHours.start}〜
                {settings.workingHours.end}
                ）では対応しきれない案件がある場合に、延長勤務時間（
                {settings.workingHours.extendedStart}〜
                {settings.workingHours.extendedEnd}
                ）を活用して配置を行うモードです。
              </p>
              <div className="bg-white/50 rounded-lg p-3 space-y-1">
                <p className="font-medium">適用例:</p>
                <p>
                  - 倍率 {form.defaultMultiplier.toFixed(1)}x の場合、通常8時間の勤務が{' '}
                  {(8 * form.defaultMultiplier).toFixed(1)}時間まで延長可能
                </p>
                <p>
                  - 最大 {form.maxMultiplier.toFixed(1)}x の場合、最長{' '}
                  {(8 * form.maxMultiplier).toFixed(1)}時間まで許容
                </p>
              </div>
              <p className="text-xs text-blue-600">
                ※ 労務管理上の制約がある場合は、適切な上限を設定してください
              </p>
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-end">
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            保存しました
          </span>
        )}
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
