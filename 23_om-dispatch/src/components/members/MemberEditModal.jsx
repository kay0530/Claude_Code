import { useState } from 'react';
import Modal from '../shared/Modal';
import { DEFAULT_JOB_TYPES } from '../../data/jobTypes';
import { getManpowerLevel } from '../../utils/skillUtils';
import { EMPLOYMENT_TYPE_LABELS } from '../../utils/constants';

const MANPOWER_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];

export default function MemberEditModal({ member, isOpen, onClose, onSave }) {
  const [manpower, setManpower] = useState(() => ({ ...member?.manpowerByJobType }));

  if (!member) return null;

  function handleChange(jobTypeId, value) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 2) {
      setManpower(prev => ({ ...prev, [jobTypeId]: Math.round(num * 10) / 10 }));
    }
  }

  function handleSave() {
    onSave(member.id, manpower);
    onClose();
  }

  function handleReset() {
    setManpower({ ...member.manpowerByJobType });
  }

  const avgManpower = DEFAULT_JOB_TYPES.length > 0
    ? DEFAULT_JOB_TYPES.reduce((sum, jt) => sum + (manpower[jt.id] ?? 0.5), 0) / DEFAULT_JOB_TYPES.length
    : 0.5;

  const level = getManpowerLevel(avgManpower);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="メンバー人工編集" size="lg">
      {/* Member header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ backgroundColor: member.color }}
        >
          {member.nameJa.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{member.nameJa}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              {EMPLOYMENT_TYPE_LABELS[member.employmentType]}
            </span>
            <span className="text-xs text-gray-400">{member.outlookEmail}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: level.color }}>
              {avgManpower.toFixed(2)}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: level.color }}
            >
              {level.label}
            </span>
          </div>
          <span className="text-xs text-gray-400">平均人工</span>
        </div>
      </div>

      {/* Manpower edit table */}
      <div className="space-y-3">
        {DEFAULT_JOB_TYPES.map(jt => {
          const value = manpower[jt.id] ?? 0.5;
          const entryLevel = getManpowerLevel(value);
          const originalValue = member.manpowerByJobType?.[jt.id] ?? 0.5;
          const isChanged = value !== originalValue;

          return (
            <div key={jt.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <span className="text-sm font-medium text-gray-700">{jt.nameJa}</span>
              </div>

              {/* Slider + input */}
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="1.2"
                  step="0.1"
                  value={value}
                  onChange={e => handleChange(jt.id, e.target.value)}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${entryLevel.color} ${((value - 0.5) / 0.7) * 100}%, #E5E7EB ${((value - 0.5) / 0.7) * 100}%)`,
                  }}
                />
                <input
                  type="number"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={value}
                  onChange={e => handleChange(jt.id, e.target.value)}
                  className={`w-16 px-2 py-1 text-center text-sm font-bold border rounded-lg ${
                    isChanged
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700'
                  }`}
                />
              </div>

              {/* Level badge */}
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white w-20 text-center shrink-0"
                style={{ backgroundColor: entryLevel.color }}
              >
                {entryLevel.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick preset buttons */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-2">一括設定</p>
        <div className="flex gap-2 flex-wrap">
          {MANPOWER_STEPS.map(v => (
            <button
              key={v}
              onClick={() => {
                const newManpower = {};
                DEFAULT_JOB_TYPES.forEach(jt => { newManpower[jt.id] = v; });
                setManpower(newManpower);
              }}
              className="px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              全て {v}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          リセット
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          保存
        </button>
      </div>
    </Modal>
  );
}
