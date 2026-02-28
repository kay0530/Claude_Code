import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../utils/idGenerator';
import ConditionSelector from './ConditionSelector';
import TimeEstimator from './TimeEstimator';

const STEPS = ['種別選択', '条件設定', '場所・詳細', '確認'];

export default function JobCreateForm({ onNavigate }) {
  const { state, dispatch } = useApp();
  const { jobTypes, conditions } = state;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    jobTypeId: '',
    activeConditionIds: [],
    title: '',
    locationName: '',
    locationAddress: '',
    preferredDate: '',
    notes: '',
  });

  const selectedType = jobTypes.find(jt => jt.id === form.jobTypeId);
  const activeConditions = conditions.filter(c => form.activeConditionIds.includes(c.id));
  const totalMultiplier = activeConditions.reduce((acc, c) => acc * c.timeMultiplier, 1.0);
  const estimatedTime = selectedType ? selectedType.baseTimeHours * totalMultiplier : 0;

  function handleSubmit() {
    const job = {
      id: generateId('job'),
      jobTypeId: form.jobTypeId,
      title: form.title || (selectedType ? selectedType.nameJa : '新規案件'),
      status: 'estimated',
      locationName: form.locationName,
      locationAddress: form.locationAddress,
      latitude: null,
      longitude: null,
      estimatedTravelMinutes: 0,
      activeConditionIds: form.activeConditionIds,
      estimatedTimeHours: parseFloat(estimatedTime.toFixed(1)),
      requiredSkillTotal: selectedType ? selectedType.requiredSkillTotal : 0,
      preferredDate: form.preferredDate || null,
      scheduledStart: null,
      scheduledEnd: null,
      multiDay: false,
      notes: form.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_JOB', payload: job });
    onNavigate('jobs');
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : onNavigate('jobs')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">新規案件作成</h2>
          <p className="text-sm text-gray-500">ステップ {step + 1} / {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <p className={`text-xs mt-1 ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Step 0: Select type */}
        {step === 0 && (
          <div>
            <h3 className="font-bold text-gray-700 mb-4">案件種別を選択</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {jobTypes.map(jt => (
                <button
                  key={jt.id}
                  onClick={() => {
                    setForm({ ...form, jobTypeId: jt.id, title: jt.nameJa });
                    setStep(1);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    form.jobTypeId === jt.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-bold text-gray-800">{jt.nameJa}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    基本 {jt.baseTimeHours}h / {jt.minPersonnel}〜{jt.maxPersonnel}名
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Set conditions */}
        {step === 1 && (
          <div>
            <h3 className="font-bold text-gray-700 mb-4">現場条件を設定</h3>
            <ConditionSelector
              conditions={conditions}
              activeIds={form.activeConditionIds}
              onChange={(ids) => setForm({ ...form, activeConditionIds: ids })}
              jobTypeId={form.jobTypeId}
            />
            {selectedType && (
              <div className="mt-6">
                <TimeEstimator
                  baseTime={selectedType.baseTimeHours}
                  conditions={conditions}
                  activeConditionIds={form.activeConditionIds}
                  requiredSkill={selectedType.requiredSkillTotal}
                  minPersonnel={selectedType.minPersonnel}
                  maxPersonnel={selectedType.maxPersonnel}
                />
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Location & details */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 mb-4">場所・詳細情報</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">案件名</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="案件名を入力（空欄の場合は種別名を使用）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現場名</label>
              <input
                type="text"
                value={form.locationName}
                onChange={e => setForm({ ...form, locationName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例：〇〇太陽光発電所"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現場住所</label>
              <input
                type="text"
                value={form.locationAddress}
                onChange={e => setForm({ ...form, locationAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="住所を入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">希望日</label>
              <input
                type="date"
                value={form.preferredDate}
                onChange={e => setForm({ ...form, preferredDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="特記事項があれば入力"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <h3 className="font-bold text-gray-700 mb-4">確認</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">案件種別</span>
                <span className="font-medium">{selectedType?.nameJa}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">案件名</span>
                <span className="font-medium">{form.title || selectedType?.nameJa}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">現場</span>
                <span className="font-medium">{form.locationName || '未設定'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">条件</span>
                <span className="font-medium">
                  {form.activeConditionIds.length === 0
                    ? 'なし'
                    : activeConditions.map(c => c.nameJa).join('、')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">推定時間</span>
                <span className="font-bold text-blue-600">{estimatedTime.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">必要スキル</span>
                <span className="font-bold text-purple-600">{selectedType?.requiredSkillTotal}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">推奨人数</span>
                <span className="font-medium">{selectedType?.minPersonnel}〜{selectedType?.maxPersonnel}名</span>
              </div>
              {form.preferredDate && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">希望日</span>
                  <span className="font-medium">{form.preferredDate}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                最初から
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                案件を作成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
