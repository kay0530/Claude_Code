import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../utils/idGenerator';
import { SKILL_CATEGORIES } from '../../data/skillCategories';

/**
 * Feedback submission form for completed assignments.
 * Collects actual time, difficulty rating, notes, and optional skill adjustments.
 */
export default function FeedbackForm({ assignmentId, jobId, onSubmit, onCancel }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    actualTimeHours: '',
    difficultyRating: 0,
    notes: '',
    skillAdjustments: {},
  });
  const [errors, setErrors] = useState({});

  // Find the related job and assignment for display context
  const job = state.jobs.find((j) => j.id === jobId);
  const assignment = state.assignments.find((a) => a.id === assignmentId);
  const assignedMembers = assignment
    ? state.members.filter((m) => assignment.memberIds?.includes(m.id))
    : [];

  function validate() {
    const newErrors = {};
    if (!form.actualTimeHours || parseFloat(form.actualTimeHours) <= 0) {
      newErrors.actualTimeHours = '実績時間を入力してください';
    }
    if (form.difficultyRating === 0) {
      newErrors.difficultyRating = '難易度を選択してください';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const feedback = {
      id: generateId('fb'),
      assignmentId,
      jobId,
      actualTimeHours: parseFloat(form.actualTimeHours),
      difficultyRating: form.difficultyRating,
      notes: form.notes,
      skillAdjustments: form.skillAdjustments,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_FEEDBACK', payload: feedback });
    if (onSubmit) onSubmit(feedback);
  }

  // Adjust a skill value for a specific member
  function handleSkillAdjust(memberId, skillKey, delta) {
    setForm((prev) => {
      const memberAdj = prev.skillAdjustments[memberId] || {};
      const current = memberAdj[skillKey] || 0;
      const next = Math.max(-1, Math.min(1, current + delta));
      return {
        ...prev,
        skillAdjustments: {
          ...prev.skillAdjustments,
          [memberId]: {
            ...memberAdj,
            [skillKey]: next,
          },
        },
      };
    });
  }

  // Render star rating
  function renderStars() {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setForm({ ...form, difficultyRating: star })}
            className="p-1 focus:outline-none"
          >
            <svg
              className={`w-8 h-8 transition-colors ${
                star <= form.difficultyRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          フィードバック入力
        </h3>

        {/* Job context info */}
        {job && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">案件:</span> {job.title}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">推定時間:</span>{' '}
              {job.estimatedTimeHours}h
            </p>
          </div>
        )}

        {/* Actual time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            実績時間（時間）<span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={form.actualTimeHours}
            onChange={(e) =>
              setForm({ ...form, actualTimeHours: e.target.value })
            }
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.actualTimeHours ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例: 5.5"
          />
          {errors.actualTimeHours && (
            <p className="text-red-500 text-xs mt-1">
              {errors.actualTimeHours}
            </p>
          )}
        </div>

        {/* Difficulty rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            難易度<span className="text-red-500">*</span>
          </label>
          {renderStars()}
          <p className="text-xs text-gray-500 mt-1">
            1: 簡単 / 3: 標準 / 5: 非常に困難
          </p>
          {errors.difficultyRating && (
            <p className="text-red-500 text-xs mt-1">
              {errors.difficultyRating}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            コメント・備考
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="作業の所感やメモを入力"
          />
        </div>

        {/* Skill adjustments (optional, per-member) */}
        {assignedMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スキル評価調整（任意）
            </label>
            <div className="space-y-4">
              {assignedMembers.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <p className="font-medium text-gray-800 text-sm mb-2">
                    {member.nameJa}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SKILL_CATEGORIES.map((skill) => {
                      const adj =
                        form.skillAdjustments[member.id]?.[skill.key] || 0;
                      return (
                        <div
                          key={skill.key}
                          className="flex items-center gap-1 text-xs"
                        >
                          <span className="text-gray-600 truncate flex-1">
                            {skill.nameJa}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleSkillAdjust(member.id, skill.key, -1)
                            }
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold transition-colors ${
                              adj < 0
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            -
                          </button>
                          <span
                            className={`w-6 text-center font-medium ${
                              adj > 0
                                ? 'text-green-600'
                                : adj < 0
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            }`}
                          >
                            {adj > 0 ? `+${adj}` : adj}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleSkillAdjust(member.id, skill.key, 1)
                            }
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold transition-colors ${
                              adj > 0
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          フィードバックを送信
        </button>
      </div>
    </form>
  );
}
