import { useApp } from '../../context/AppContext';
import { STATUS_LABELS } from '../../utils/constants';
import { formatDateJa } from '../../utils/dateUtils';
import { useState } from 'react';

export default function JobListView({ onNavigate }) {
  const { state, dispatch } = useApp();
  const { jobs, jobTypes } = state;
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredJobs = statusFilter === 'all'
    ? jobs
    : jobs.filter(j => j.status === statusFilter);

  const sortedJobs = [...filteredJobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getJobTypeName = (typeId) => {
    const jt = jobTypes.find(t => t.id === typeId);
    return jt ? jt.nameJa : '不明';
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedJobs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedJobs.map(j => j.id));
    }
  };

  const handleEdit = () => {
    if (selectedIds.length === 1) {
      onNavigate('job-edit', { jobId: selectedIds[0] });
    } else {
      alert('1件ずつ編集してください');
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`${selectedIds.length}件の案件を削除しますか？`)) return;
    selectedIds.forEach(id => {
      dispatch({ type: 'DELETE_JOB', payload: id });
    });
    setSelectedIds([]);
  };

  const hasSelection = selectedIds.length > 0;

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

      {/* Action bar (appears when jobs are selected) */}
      {hasSelection && (
        <div className="sticky top-0 z-10 bg-white shadow rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === sortedJobs.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">全選択</span>
            </label>
            <span className="text-sm text-gray-500">{selectedIds.length}件選択中</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              削除
            </button>
          </div>
        </div>
      )}

      {/* Job list */}
      {sortedJobs.length === 0 ? (
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
          {sortedJobs.map(job => {
            const statusInfo = STATUS_LABELS[job.status] || STATUS_LABELS.draft;
            const isSelected = selectedIds.includes(job.id);
            return (
              <div
                key={job.id}
                onClick={() => onNavigate('job-detail', { jobId: job.id })}
                className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer flex items-start gap-3 ${
                  isSelected ? 'border-blue-500' : 'border-gray-200'
                }`}
              >
                {/* Checkbox */}
                <div className="pt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(job.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Card content */}
                <div className="flex items-start justify-between flex-1 min-w-0">
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
