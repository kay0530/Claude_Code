import { useApp } from '../../context/AppContext';
import { STATUS_LABELS } from '../../utils/constants';
import { formatDateJa } from '../../utils/dateUtils';
import { useState } from 'react';

export default function JobListView({ onNavigate }) {
  const { state } = useApp();
  const { jobs, jobTypes } = state;
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = statusFilter === 'all'
    ? jobs
    : jobs.filter(j => j.status === statusFilter);

  const getJobTypeName = (typeId) => {
    const jt = jobTypes.find(t => t.id === typeId);
    return jt ? jt.nameJa : '不明';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">案件管理</h2>
          <p className="text-sm text-gray-500 mt-1">{jobs.length}件の案件</p>
        </div>
        <button
          onClick={() => onNavigate('job-create')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規案件
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          すべて ({jobs.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
          const count = jobs.filter(j => j.status === key).length;
          if (count === 0 && key !== 'draft') return null;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-gray-800 text-white'
                  : `${color} hover:opacity-80`
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-700">案件がありません</h3>
          <p className="text-gray-500 mt-1">「新規案件」ボタンから案件を作成してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(job => {
            const statusInfo = STATUS_LABELS[job.status] || STATUS_LABELS.draft;
            return (
              <div
                key={job.id}
                onClick={() => onNavigate('job-detail', { jobId: job.id })}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 truncate">{job.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{getJobTypeName(job.jobTypeId)}</span>
                      <span>|</span>
                      <span>{job.locationName || job.locationAddress || '場所未設定'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium text-gray-700">
                      {job.estimatedTimeHours}h
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.createdAt ? formatDateJa(job.createdAt) : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
