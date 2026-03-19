import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateRequiredManpower } from '../../utils/skillUtils';
import ConditionSelector from './ConditionSelector';
import TimeEstimator from './TimeEstimator';
import opportunitiesData from '../../data/opportunities.json';

const STEPS = ['種別選択', '条件設定', '場所・詳細', '確認'];
const opportunities = Array.isArray(opportunitiesData) ? opportunitiesData : [];

/**
 * Job edit form - 4-step wizard pre-populated with existing job data.
 * @param {{ jobId: string, onNavigate: (view: string, params?: object) => void }} props
 */
export default function JobEditForm({ jobId, onNavigate }) {
  const { state, dispatch } = useApp();
  const { jobs, jobTypes, conditions } = state;
  const job = jobs.find(j => j.id === jobId) || null;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    jobTypeId: '',
    activeConditionIds: [],
    title: '',
    locationAddress: '',
    preferredDate: '',
    notes: '',
    sfOpportunityId: '',
  });

  const [oppQuery, setOppQuery] = useState('');
  const [showOppDropdown, setShowOppDropdown] = useState(false);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    if (job) {
      setForm({
        jobTypeId: job.jobTypeId || '',
        activeConditionIds: job.activeConditionIds || job.conditionIds || [],
        title: job.title || '',
        locationAddress: job.locationAddress || '',
        preferredDate: job.preferredDate || '',
        notes: job.notes || '',
        sfOpportunityId: job.sfOpportunityId || '',
      });
      setOppQuery(job.title || '');
    }
  }, [job]);

  const selectedType = jobTypes.find(jt => jt.id === form.jobTypeId);
  const activeConditions = conditions.filter(c => form.activeConditionIds.includes(c.id));
  const requiredManpower = selectedType
    ? calculateRequiredManpower(selectedType.baseManpower, activeConditions)
    : 0;

  const filteredOpportunities = oppQuery.length >= 1
    ? opportunities.filter(o =>
        o.name.toLowerCase().includes(oppQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  function handleSelectOpportunity(opp) {
    setForm({
      ...form,
      title: opp.name,
      locationAddress: opp.address || '',
      sfOpportunityId: opp.id,
    });
    setOppQuery(opp.name);
    setShowOppDropdown(false);
  }

  function handleOppInputChange(e) {
    const val = e.target.value;
    setOppQuery(val);
    setForm({ ...form, title: val, sfOpportunityId: '' });
    setShowOppDropdown(true);
  }

  function handleOppFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (oppQuery.length >= 1) setShowOppDropdown(true);
  }

  function handleOppBlur() {
    blurTimeoutRef.current = setTimeout(() => setShowOppDropdown(false), 200);
  }

  function handleSubmit() {
    const updatedJob = {
      id: job.id,
      jobTypeId: form.jobTypeId,
      title: form.title || (selectedType ? selectedType.nameJa : job.title),
      locationName: '',
      locationAddress: form.locationAddress,
      activeConditionIds: form.activeConditionIds,
      conditionIds: form.activeConditionIds,
      estimatedTimeHours: selectedType ? selectedType.baseTimeHours : 0,
      requiredManpower,
      preferredDate: form.preferredDate || null,
      notes: form.notes,
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_JOB', payload: updatedJob });
    onNavigate('jobs');
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">案件が見つかりません</p>
        <button
          onClick={() => onNavigate('jobs')}
          className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-700"
        >
          案件一覧に戻る
        </button>
      </div>
    );
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
          <h2 className="text-2xl font-bold text-gray-800">案件編集</h2>
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
                    setForm({ ...form, jobTypeId: jt.id });
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
                    基本 {jt.baseTimeHours}h / {jt.minPersonnel}〜{jt.maxPersonnel}名 / 人工 {jt.baseManpower}
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
                  baseManpower={selectedType.baseManpower}
                  conditions={conditions}
                  activeConditionIds={form.activeConditionIds}
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
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                案件名
                {form.sfOpportunityId && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    SF連携
                  </span>
                )}
              </label>
              <input
                type="text"
                value={oppQuery}
                onChange={handleOppInputChange}
                onFocus={handleOppFocus}
                onBlur={handleOppBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Salesforce商談名で検索、または直接入力"
              />
              {showOppDropdown && filteredOpportunities.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredOpportunities.map(opp => (
                    <button
                      key={opp.id}
                      onMouseDown={() => handleSelectOpportunity(opp)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{opp.name}</p>
                      {opp.address && (
                        <p className="text-xs text-gray-500 truncate">{opp.address}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
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
                <span className="font-medium">
                  {form.title || selectedType?.nameJa}
                  {form.sfOpportunityId && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Salesforce連携済み
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">住所</span>
                <span className="font-medium">{form.locationAddress || '未設定'}</span>
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
                <span className="text-gray-500">基本作業時間</span>
                <span className="font-bold text-blue-600">{selectedType?.baseTimeHours}h</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">必要人工</span>
                <span className="font-bold text-purple-600">{requiredManpower.toFixed(1)}</span>
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
                onClick={() => onNavigate('jobs')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                キャンセル
              </button>
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
                変更を保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
