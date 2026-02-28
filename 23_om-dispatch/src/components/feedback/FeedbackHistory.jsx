import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateJa } from '../../utils/dateUtils';
import { SKILL_CATEGORIES } from '../../data/skillCategories';

/**
 * Displays a filterable, expandable list of past feedback entries.
 */
export default function FeedbackHistory({ onNavigate }) {
  const { state } = useApp();
  const { feedbacks, jobs, assignments, members } = state;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Filter feedbacks by date range
  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((fb) => new Date(fb.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((fb) => new Date(fb.createdAt) <= to);
    }
    return list;
  }, [feedbacks, dateFrom, dateTo]);

  // Helper to find related data
  function getJobTitle(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    return job ? job.title : '不明な案件';
  }

  function getEstimatedTime(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    return job ? job.estimatedTimeHours : null;
  }

  function getMemberName(memberId) {
    const member = members.find((m) => m.id === memberId);
    return member ? member.nameJa : '不明';
  }

  // Render star rating display (read-only)
  function renderStarsReadOnly(rating) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating
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
        ))}
      </div>
    );
  }

  // Time difference indicator
  function renderTimeDiff(actual, estimated) {
    if (estimated === null) return null;
    const diff = actual - estimated;
    const pct = ((diff / estimated) * 100).toFixed(0);
    const isOver = diff > 0;
    return (
      <span
        className={`text-xs font-medium ${
          isOver ? 'text-red-600' : 'text-green-600'
        }`}
      >
        {isOver ? '+' : ''}
        {diff.toFixed(1)}h ({isOver ? '+' : ''}
        {pct}%)
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          フィードバック履歴
        </h2>
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            期間で絞り込み
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* Feedback list */}
      {filteredFeedbacks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">
            フィードバックがありません
          </p>
          <p className="text-sm text-gray-400 mt-1">
            完了した案件のフィードバックがここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map((fb) => {
            const estimated = getEstimatedTime(fb.jobId);
            const isExpanded = expandedId === fb.id;
            const hasSkillAdj =
              fb.skillAdjustments &&
              Object.keys(fb.skillAdjustments).length > 0;

            return (
              <div
                key={fb.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Summary row */}
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : fb.id)
                  }
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {getJobTitle(fb.jobId)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateJa(fb.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Time comparison */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">
                        実績 {fb.actualTimeHours}h
                        {estimated !== null && (
                          <span className="text-gray-400 font-normal">
                            {' '}
                            / 見積 {estimated}h
                          </span>
                        )}
                      </p>
                      {renderTimeDiff(fb.actualTimeHours, estimated)}
                    </div>

                    {/* Difficulty */}
                    <div>{renderStarsReadOnly(fb.difficultyRating)}</div>

                    {/* Expand arrow */}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    {fb.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          コメント
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {fb.notes}
                        </p>
                      </div>
                    )}

                    {hasSkillAdj && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          スキル調整
                        </p>
                        {Object.entries(fb.skillAdjustments).map(
                          ([memberId, skills]) => {
                            const activeSkills = Object.entries(skills).filter(
                              ([, v]) => v !== 0
                            );
                            if (activeSkills.length === 0) return null;
                            return (
                              <div key={memberId} className="mb-2">
                                <p className="text-sm font-medium text-gray-700">
                                  {getMemberName(memberId)}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {activeSkills.map(([skillKey, val]) => {
                                    const skill = SKILL_CATEGORIES.find(
                                      (s) => s.key === skillKey
                                    );
                                    return (
                                      <span
                                        key={skillKey}
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          val > 0
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {skill ? skill.nameJa : skillKey}{' '}
                                        {val > 0 ? `+${val}` : val}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {!fb.notes && !hasSkillAdj && (
                      <p className="text-sm text-gray-400">
                        追加情報なし
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
