import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../utils/idGenerator';
import { SKILL_CATEGORIES } from '../../data/skillCategories';

/**
 * CRUD editor for job types.
 * Supports creating, editing, and deleting job type configurations.
 */
const EMPTY_FORM = {
  nameJa: '',
  baseTimeHours: '',
  requiredSkillTotal: '',
  primarySkills: [],
  minPersonnel: '',
  maxPersonnel: '',
  aiComplexity: 'haiku',
};

export default function JobTypeEditor() {
  const { state, dispatch } = useApp();
  const { jobTypes } = state;

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [errors, setErrors] = useState({});

  // Start editing an existing job type
  function startEdit(jt) {
    setForm({
      nameJa: jt.nameJa,
      baseTimeHours: jt.baseTimeHours,
      requiredSkillTotal: jt.requiredSkillTotal,
      primarySkills: [...jt.primarySkills],
      minPersonnel: jt.minPersonnel,
      maxPersonnel: jt.maxPersonnel,
      aiComplexity: jt.aiComplexity || 'haiku',
    });
    setEditingId(jt.id);
    setShowForm(true);
    setErrors({});
  }

  // Start adding a new job type
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

  // Toggle a skill in primarySkills
  function toggleSkill(key) {
    setForm((prev) => ({
      ...prev,
      primarySkills: prev.primarySkills.includes(key)
        ? prev.primarySkills.filter((s) => s !== key)
        : [...prev.primarySkills, key],
    }));
  }

  function validate() {
    const newErrors = {};
    if (!form.nameJa.trim()) newErrors.nameJa = '名称を入力してください';
    if (!form.baseTimeHours || parseFloat(form.baseTimeHours) <= 0)
      newErrors.baseTimeHours = '基本時間を入力してください';
    if (!form.requiredSkillTotal || parseInt(form.requiredSkillTotal) < 0)
      newErrors.requiredSkillTotal = '必要スキル値を入力してください';
    if (!form.minPersonnel || parseInt(form.minPersonnel) < 1)
      newErrors.minPersonnel = '最小人数を入力してください';
    if (!form.maxPersonnel || parseInt(form.maxPersonnel) < 1)
      newErrors.maxPersonnel = '最大人数を入力してください';
    if (
      form.minPersonnel &&
      form.maxPersonnel &&
      parseInt(form.minPersonnel) > parseInt(form.maxPersonnel)
    )
      newErrors.maxPersonnel = '最大人数は最小人数以上にしてください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nameJa: form.nameJa.trim(),
      baseTimeHours: parseFloat(form.baseTimeHours),
      requiredSkillTotal: parseInt(form.requiredSkillTotal),
      primarySkills: form.primarySkills,
      defaultConditionIds: [],
      minPersonnel: parseInt(form.minPersonnel),
      maxPersonnel: parseInt(form.maxPersonnel),
      aiComplexity: form.aiComplexity,
    };

    if (editingId) {
      dispatch({
        type: 'UPDATE_JOB_TYPE',
        payload: { id: editingId, ...payload },
      });
    } else {
      dispatch({
        type: 'ADD_JOB_TYPE',
        payload: { id: generateId('jt'), ...payload },
      });
    }

    cancelForm();
  }

  function handleDelete(id) {
    dispatch({ type: 'DELETE_JOB_TYPE', payload: id });
    setDeleteConfirmId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">案件種別管理</h3>
          <p className="text-sm text-gray-500">
            案件の種類と基本パラメータを管理します
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
            {editingId ? '案件種別を編集' : '新規案件種別を追加'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名称<span className="text-red-500">*</span>
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
                placeholder="例: 年次点検"
              />
              {errors.nameJa && (
                <p className="text-red-500 text-xs mt-1">{errors.nameJa}</p>
              )}
            </div>

            {/* Base time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                基本時間（h）<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={form.baseTimeHours}
                onChange={(e) =>
                  setForm({ ...form, baseTimeHours: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.baseTimeHours ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 6"
              />
              {errors.baseTimeHours && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.baseTimeHours}
                </p>
              )}
            </div>

            {/* Required skill total */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                必要スキル合計値<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.requiredSkillTotal}
                onChange={(e) =>
                  setForm({ ...form, requiredSkillTotal: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.requiredSkillTotal
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                placeholder="例: 12"
              />
              {errors.requiredSkillTotal && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.requiredSkillTotal}
                </p>
              )}
            </div>

            {/* AI Complexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI複雑度
              </label>
              <select
                value={form.aiComplexity}
                onChange={(e) =>
                  setForm({ ...form, aiComplexity: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="haiku">Haiku（簡易判断）</option>
                <option value="sonnet">Sonnet（複雑判断）</option>
              </select>
            </div>

            {/* Min personnel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最小人数<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.minPersonnel}
                onChange={(e) =>
                  setForm({ ...form, minPersonnel: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.minPersonnel ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 2"
              />
              {errors.minPersonnel && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.minPersonnel}
                </p>
              )}
            </div>

            {/* Max personnel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大人数<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.maxPersonnel}
                onChange={(e) =>
                  setForm({ ...form, maxPersonnel: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.maxPersonnel ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例: 3"
              />
              {errors.maxPersonnel && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.maxPersonnel}
                </p>
              )}
            </div>
          </div>

          {/* Primary skills multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              主要スキル（複数選択）
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_CATEGORIES.map((skill) => (
                <button
                  key={skill.key}
                  type="button"
                  onClick={() => toggleSkill(skill.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.primarySkills.includes(skill.key)
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {skill.nameJa}
                </button>
              ))}
            </div>
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

      {/* Job type list */}
      <div className="space-y-2">
        {jobTypes.map((jt) => (
          <div
            key={jt.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">{jt.nameJa}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                <span>基本 {jt.baseTimeHours}h</span>
                <span>スキル {jt.requiredSkillTotal}</span>
                <span>
                  {jt.minPersonnel}〜{jt.maxPersonnel}名
                </span>
                <span className="uppercase">
                  AI: {jt.aiComplexity}
                </span>
              </div>
              {jt.primarySkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {jt.primarySkills.map((sk) => {
                    const cat = SKILL_CATEGORIES.find((c) => c.key === sk);
                    return (
                      <span
                        key={sk}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                      >
                        {cat ? cat.nameJa : sk}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(jt)}
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

              {deleteConfirmId === jt.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(jt.id)}
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
                  onClick={() => setDeleteConfirmId(jt.id)}
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

      {jobTypes.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">案件種別が登録されていません</p>
        </div>
      )}
    </div>
  );
}
