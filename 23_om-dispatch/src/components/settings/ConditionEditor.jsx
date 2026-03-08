import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../utils/idGenerator';

/**
 * CRUD editor for conditions.
 * Manages condition definitions including manpower adjustments and applicable job types.
 */
const EMPTY_FORM = {
  nameJa: '',
  description: '',
  jobTypeId: '',
  adjustmentType: 'additive',
  adjustmentValue: '0.5',
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
      jobTypeId: cond.jobTypeId || '',
      adjustmentType: cond.adjustmentType || 'additive',
      adjustmentValue: String(cond.adjustmentValue ?? 0.5),
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

  function validate() {
    const newErrors = {};
    if (!form.nameJa.trim()) newErrors.nameJa = '名称を入力してください';
    const val = parseFloat(form.adjustmentValue);
    if (isNaN(val))
      newErrors.adjustmentValue = '有効な値を入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nameJa: form.nameJa.trim(),
      description: form.description.trim(),
      jobTypeId: form.jobTypeId || null,
      adjustmentType: form.adjustmentType,
      adjustmentValue: parseFloat(form.adjustmentValue),
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

  // Format adjustment for display
  function formatAdjustment(cond) {
    if (cond.adjustmentType === 'additive') {
      return `${cond.adjustmentValue > 0 ? '+' : ''}${cond.adjustmentValue}人工`;
    }
    return `×${cond.adjustmentValue}`;
  }

  function getAdjustmentColor(cond) {
    if (cond.adjustmentType === 'additive') {
      if (cond.adjustmentValue > 0) return 'text-red-600 bg-red-50';
      if (cond.adjustmentValue < 0) return 'text-green-600 bg-green-50';
      return 'text-gray-600 bg-gray-50';
    }
    if (cond.adjustmentValue > 1) return 'text-red-600 bg-red-50';
    if (cond.adjustmentValue < 1) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">条件管理</h3>
          <p className="text-sm text-gray-500">
            現場条件と必要人工への影響を管理します
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

            {/* Job type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象案件種別
              </label>
              <select
                value={form.jobTypeId}
                onChange={(e) =>
                  setForm({ ...form, jobTypeId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全案件種別</option>
                {jobTypes.map((jt) => (
                  <option key={jt.id} value={jt.id}>
                    {jt.nameJa}
                  </option>
                ))}
              </select>
            </div>

            {/* Adjustment type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                調整タイプ
              </label>
              <select
                value={form.adjustmentType}
                onChange={(e) =>
                  setForm({ ...form, adjustmentType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="additive">加算（+人工）</option>
                <option value="multiplicative">乗算（×倍率）</option>
              </select>
            </div>

            {/* Adjustment value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.adjustmentType === 'additive' ? '人工増減値' : '倍率'}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={form.adjustmentValue}
                onChange={(e) =>
                  setForm({ ...form, adjustmentValue: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.adjustmentValue ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={form.adjustmentType === 'additive' ? '例: 0.5' : '例: 1.2'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.adjustmentType === 'additive'
                  ? '正の値 = 人工増加 / 負の値 = 人工減少'
                  : '1.0超 = 人工増加 / 1.0未満 = 人工減少'}
              </p>
              {errors.adjustmentValue && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.adjustmentValue}
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
        {conditions.map((cond) => {
          const jobType = jobTypes.find((jt) => jt.id === cond.jobTypeId);
          return (
            <div
              key={cond.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{cond.nameJa}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAdjustmentColor(cond)}`}
                  >
                    {formatAdjustment(cond)}
                  </span>
                </div>
                {cond.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cond.description}
                  </p>
                )}
                {jobType && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {jobType.nameJa}
                    </span>
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
          );
        })}
      </div>

      {conditions.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">条件が登録されていません</p>
        </div>
      )}
    </div>
  );
}
