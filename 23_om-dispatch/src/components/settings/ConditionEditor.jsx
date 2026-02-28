import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../utils/idGenerator';

/**
 * CRUD editor for conditions.
 * Manages condition definitions including time multipliers and applicable job types.
 */
const EMPTY_FORM = {
  nameJa: '',
  description: '',
  timeMultiplier: '1.0',
  applicableJobTypes: [],
};

export default function ConditionEditor() {
  const { state, dispatch } = useApp();
  const { conditions, jobTypes } = state;

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [errors, setErrors] = useState({});

  function startEdit(cond) {
    setForm({
      nameJa: cond.nameJa,
      description: cond.description || '',
      timeMultiplier: String(cond.timeMultiplier),
      applicableJobTypes: [...(cond.applicableJobTypes || [])],
    });
    setEditingId(cond.id);
    setShowForm(true);
    setErrors({});
  }

  function startAdd() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
    setErrors({});
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
  }

  // Toggle a job type in applicableJobTypes
  function toggleJobType(jtId) {
    setForm((prev) => ({
      ...prev,
      applicableJobTypes: prev.applicableJobTypes.includes(jtId)
        ? prev.applicableJobTypes.filter((id) => id !== jtId)
        : [...prev.applicableJobTypes, jtId],
    }));
  }

  function validate() {
    const newErrors = {};
    if (!form.nameJa.trim()) newErrors.nameJa = '名称を入力してください';
    const mult = parseFloat(form.timeMultiplier);
    if (isNaN(mult) || mult <= 0)
      newErrors.timeMultiplier = '有効な倍率を入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nameJa: form.nameJa.trim(),
      description: form.description.trim(),
      timeMultiplier: parseFloat(form.timeMultiplier),
      applicableJobTypes: form.applicableJobTypes,
    };

    if (editingId) {
      dispatch({
        type: 'UPDATE_CONDITION',
        payload: { id: editingId, ...payload },
      });
    } else {
      dispatch({
        type: 'ADD_CONDITION',
        payload: { id: generateId('cond'), ...payload },
      });
    }

    cancelForm();
  }

  function handleDelete(id) {
    dispatch({ type: 'DELETE_CONDITION', payload: id });
    setDeleteConfirmId(null);
  }

  // Format multiplier for display
  function formatMultiplier(val) {
    if (val < 1) return `${val}x (時短)`;
    if (val > 1) return `${val}x (増加)`;
    return `${val}x (変化なし)`;
  }

  function getMultiplierColor(val) {
    if (val < 1) return 'text-green-600 bg-green-50';
    if (val > 1) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">条件管理</h3>
          <p className="text-sm text-gray-500">
            現場条件と作業時間への影響倍率を管理します
          </p>
        </div>
        {!showForm && (
          <button
            onClick={startAdd}
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            新規追加
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border-2 border-blue-200 p-6 space-y-4"
        >
          <h4 className="font-bold text-gray-800">
            {editingId ? '条件を編集' : '新規条件を追加'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                条件名<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nameJa}
                onChange={(e) =>
                  setForm({ ...form, nameJa: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.nameJa ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 屋根上作業あり"
              />
              {errors.nameJa && (
                <p className="text-red-500 text-xs mt-1">{errors.nameJa}</p>
              )}
            </div>

            {/* Time multiplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                時間倍率<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5.0"
                value={form.timeMultiplier}
                onChange={(e) =>
                  setForm({ ...form, timeMultiplier: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.timeMultiplier ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 1.25"
              />
              <p className="text-xs text-gray-500 mt-1">
                1.0 = 変化なし / 1.0未満 = 時短 / 1.0超 = 時間増加
              </p>
              {errors.timeMultiplier && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.timeMultiplier}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="条件の詳細説明"
            />
          </div>

          {/* Applicable job types multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              適用可能な案件種別（複数選択）
            </label>
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((jt) => (
                <button
                  key={jt.id}
                  type="button"
                  onClick={() => toggleJobType(jt.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.applicableJobTypes.includes(jt.id)
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {jt.nameJa}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              未選択の場合、全ての案件種別に適用可能
            </p>
          </div>

          {/* Form actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {editingId ? '更新' : '追加'}
            </button>
          </div>
        </form>
      )}

      {/* Condition list */}
      <div className="space-y-2">
        {conditions.map((cond) => (
          <div
            key={cond.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">{cond.nameJa}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getMultiplierColor(
                    cond.timeMultiplier
                  )}`}
                >
                  {formatMultiplier(cond.timeMultiplier)}
                </span>
              </div>
              {cond.description && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {cond.description}
                </p>
              )}
              {cond.applicableJobTypes && cond.applicableJobTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {cond.applicableJobTypes.map((jtId) => {
                    const jt = jobTypes.find((j) => j.id === jtId);
                    return (
                      <span
                        key={jtId}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                      >
                        {jt ? jt.nameJa : jtId}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(cond)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="編集"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              {deleteConfirmId === cond.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(cond.id)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700"
                  >
                    削除する
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(cond.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {conditions.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">条件が登録されていません</p>
        </div>
      )}
    </div>
  );
}
