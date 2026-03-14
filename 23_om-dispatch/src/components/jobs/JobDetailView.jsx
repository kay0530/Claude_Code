import { useApp } from '../../context/AppContext';
import { STATUS_LABELS } from '../../utils/constants';
import { formatDateJa } from '../../utils/dateUtils';

/**
 * Read-only detail view for a job.
 * @param {{ jobId: string, onNavigate: (view: string, params?: object) => void }} props
 */
export default function JobDetailView({ jobId, onNavigate }) {
  const { state } = useApp();
  const { jobs, jobTypes, conditions } = state;
  const job = jobs.find(j => j.id === jobId) || null;

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

  const jobType = jobTypes.find(jt => jt.id === job.jobTypeId);
  const statusInfo = STATUS_LABELS[job.status] || { label: job.status, color: 'bg-gray-100 text-gray-700' };
  const activeConditions = conditions.filter(c =>
    (job.activeConditionIds || job.conditionIds || []).includes(c.id)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('jobs')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">案件詳細</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Main content card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-8">
        {/* 基本情報 */}
        <section>
          <h3 className="font-bold text-gray-700 mb-3">基本情報</h3>
          <div className="space-y-3">
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">案件名</span>
              <span className="font-medium">{job.title}</span>
            </div>
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">案件種別</span>
              <span className="font-medium">{jobType ? jobType.nameJa : '不明'}</span>
            </div>
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">ステータス</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </section>

        {/* 現場情報 */}
        <section>
          <h3 className="font-bold text-gray-700 mb-3">現場情報</h3>
          <div className="space-y-3">
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">現場名</span>
              <span className="font-medium">{job.locationName || '未設定'}</span>
            </div>
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">現場住所</span>
              <span className="font-medium">{job.locationAddress || '未設定'}</span>
            </div>
          </div>
        </section>

        {/* 作業条件 */}
        <section>
          <h3 className="font-bold text-gray-700 mb-3">作業条件</h3>
          <div className="space-y-3">
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">適用条件</span>
              <span className="font-medium">
                {activeConditions.length === 0
                  ? 'なし'
                  : (
                    <div className="flex flex-wrap gap-2">
                      {activeConditions.map(c => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm"
                        >
                          {c.nameJa}
                        </span>
                      ))}
                    </div>
                  )}
              </span>
            </div>
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">基本作業時間</span>
              <span className="font-medium">
                {job.estimatedTimeHours != null ? `${job.estimatedTimeHours}h` : '未設定'}
              </span>
            </div>
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">必要人工</span>
              <span className="font-bold text-purple-600">
                {job.requiredManpower != null ? job.requiredManpower.toFixed(1) : '未設定'}
              </span>
            </div>
          </div>
        </section>

        {/* スケジュール */}
        <section>
          <h3 className="font-bold text-gray-700 mb-3">スケジュール</h3>
          <div className="space-y-3">
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">希望日</span>
              <span className="font-medium">
                {job.preferredDate ? formatDateJa(job.preferredDate) : '未設定'}
              </span>
            </div>
          </div>
        </section>

        {/* 備考 */}
        <section>
          <h3 className="font-bold text-gray-700 mb-3">備考</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {job.notes || 'なし'}
          </p>
        </section>

        {/* メタ情報 */}
        <section>
          <h3 className="font-bold text-gray-700 mb-3">メタ情報</h3>
          <div className="space-y-3">
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">作成日</span>
              <span className="font-medium">
                {job.createdAt ? formatDateJa(job.createdAt) : '不明'}
              </span>
            </div>
            <div className="flex py-2 border-b border-gray-100">
              <span className="w-40 text-gray-500 shrink-0">更新日</span>
              <span className="font-medium">
                {job.updatedAt ? formatDateJa(job.updatedAt) : '不明'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3 justify-end mt-6">
        <button
          onClick={() => onNavigate('jobs')}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
        >
          一覧に戻る
        </button>
        <button
          onClick={() => onNavigate('job-edit', { jobId })}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          編集
        </button>
      </div>
    </div>
  );
}
