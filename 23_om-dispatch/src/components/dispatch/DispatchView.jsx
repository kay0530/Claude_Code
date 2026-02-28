import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useDispatchEngine } from '../../hooks/useDispatchEngine';
import { calculateTravelInfo } from '../../services/travelService';
import { generateId } from '../../utils/idGenerator';
import { STATUS_LABELS } from '../../utils/constants';
import RecommendationPanel from './RecommendationPanel';
import StretchRiskPanel from './StretchRiskPanel';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';

/**
 * Main dispatch screen.
 * Shows job selector, run dispatch button, recommendations, and confirm assignment.
 * @param {{ onNavigate: (view: string, params?: object) => void }}
 */
export default function DispatchView({ onNavigate }) {
  const { state, dispatch } = useApp();
  const { recommendations, loading, error, runDispatch, clearRecommendations } = useDispatchEngine();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Filter jobs with status 'estimated' (ready for dispatch)
  const estimatedJobs = state.jobs.filter(j => j.status === 'estimated');

  const selectedJob = state.jobs.find(j => j.id === selectedJobId);
  const selectedJobType = selectedJob
    ? state.jobTypes.find(jt => jt.id === selectedJob.jobTypeId)
    : null;

  // Stretch mode state (from settings, but toggleable per dispatch)
  const stretchEnabled = state.settings.stretchMode?.enabled ?? false;
  const stretchMultiplier = state.settings.stretchMode?.defaultMultiplier || 1.2;

  // Travel info for selected job
  const travelInfo = selectedJob
    ? calculateTravelInfo(selectedJob, state.settings)
    : null;

  const selectedRecommendation = selectedRecommendationIndex !== null
    ? recommendations[selectedRecommendationIndex]
    : null;

  function handleRunDispatch() {
    if (!selectedJobId) return;
    setSelectedRecommendationIndex(null);
    setConfirmSuccess(false);
    runDispatch(selectedJobId);
  }

  function handleJobChange(e) {
    setSelectedJobId(e.target.value);
    clearRecommendations();
    setSelectedRecommendationIndex(null);
    setConfirmSuccess(false);
  }

  function handleConfirmAssignment() {
    if (!selectedRecommendation || !selectedJob) return;
    setShowConfirmModal(true);
  }

  function executeAssignment() {
    const assignment = {
      id: generateId('asgn'),
      jobId: selectedJob.id,
      teamMemberIds: selectedRecommendation.team.map(m => m.id),
      leadMemberId: selectedRecommendation.leadCandidate?.id || null,
      score: selectedRecommendation.score,
      breakdown: selectedRecommendation.breakdown,
      isStretch: selectedRecommendation.isStretch,
      vehicleArrangement: selectedRecommendation.vehicleArrangement,
      vehicleDetails: selectedRecommendation.vehicleDetails,
      travelInfo,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    // Add assignment
    dispatch({ type: 'ADD_ASSIGNMENT', payload: assignment });

    // Update job status to dispatched
    dispatch({
      type: 'UPDATE_JOB',
      payload: { id: selectedJob.id, status: 'dispatched' },
    });

    setShowConfirmModal(false);
    setConfirmSuccess(true);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">差配</h2>
        <p className="text-sm text-gray-500 mt-1">
          案件に最適なチームを自動提案します
        </p>
      </div>

      {/* Job selector section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
          対象案件の選択
        </h3>

        {estimatedJobs.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">見積済の案件がありません</p>
            <button
              onClick={() => onNavigate('jobs')}
              className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              案件管理へ移動
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedJobId}
              onChange={handleJobChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">案件を選択してください</option>
              {estimatedJobs.map(job => {
                const jt = state.jobTypes.find(t => t.id === job.jobTypeId);
                return (
                  <option key={job.id} value={job.id}>
                    {job.title} - {jt?.nameJa || '不明'} ({job.estimatedTimeHours}h)
                  </option>
                );
              })}
            </select>

            {/* Selected job details */}
            {selectedJob && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800">{selectedJob.title}</h4>
                  <Badge color="blue">{selectedJobType?.nameJa}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">作業時間: </span>
                    <span className="font-medium text-gray-800">{selectedJob.estimatedTimeHours}h</span>
                  </div>
                  <div>
                    <span className="text-gray-500">人数: </span>
                    <span className="font-medium text-gray-800">
                      {selectedJobType?.minPersonnel}-{selectedJobType?.maxPersonnel}名
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">場所: </span>
                    <span className="font-medium text-gray-800">
                      {selectedJob.locationName || selectedJob.locationAddress || '未設定'}
                    </span>
                  </div>
                  {travelInfo && travelInfo.travelMinutes && (
                    <div>
                      <span className="text-gray-500">移動: </span>
                      <span className="font-medium text-gray-800">
                        約{travelInfo.travelMinutes}分（{travelInfo.distance}km）
                      </span>
                    </div>
                  )}
                </div>
                {travelInfo?.accommodationNeeded && (
                  <div className="flex items-center gap-2 mt-2 text-orange-700 bg-orange-50 px-3 py-2 rounded-lg text-xs">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>{travelInfo.accommodationReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Stretch mode inline toggle */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-gray-700">ストレッチモード</span>
                  <span className="text-xs text-gray-400 ml-2">
                    スキル不足チームも許容（{stretchMultiplier}x）
                  </span>
                </div>
              </div>
              <button
                onClick={() => dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { stretchMode: { ...state.settings.stretchMode, enabled: !stretchEnabled } },
                })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  stretchEnabled ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    stretchEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Stretch effect display when enabled */}
            {stretchEnabled && selectedJob && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 text-xs text-orange-700">
                <div className="flex items-center gap-4">
                  <span>
                    通常: {selectedJob.estimatedTimeHours}h
                  </span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="font-bold">
                    延長可能: {(selectedJob.estimatedTimeHours * stretchMultiplier).toFixed(1)}h
                  </span>
                  <span className="text-orange-500">
                    （スキル要件を{Math.round((1 - 1/stretchMultiplier) * 100)}%緩和）
                  </span>
                </div>
              </div>
            )}

            {/* Run dispatch button */}
            <button
              onClick={handleRunDispatch}
              disabled={!selectedJobId || loading}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                !selectedJobId || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
              }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>差配計算中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>差配を実行</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {confirmSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium">差配が確定されました</p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <RecommendationPanel
            recommendations={recommendations}
            selectedIndex={selectedRecommendationIndex}
            onSelect={setSelectedRecommendationIndex}
            stretchMultiplier={stretchMultiplier}
          />

          {/* Stretch risk panel when a stretch recommendation is selected */}
          {selectedRecommendation && selectedRecommendation.isStretch && (
            <div className="bg-white rounded-xl border border-orange-200 p-5">
              <StretchRiskPanel
                team={selectedRecommendation.team}
                job={selectedJob}
                jobType={selectedJobType}
                stretchMultiplier={stretchMultiplier}
              />
            </div>
          )}

          {/* Confirm assignment button */}
          {selectedRecommendation && (
            <div className="sticky bottom-4">
              <button
                onClick={handleConfirmAssignment}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2 ${
                  selectedRecommendation.isStretch
                    ? 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800'
                    : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  {selectedRecommendation.isStretch ? 'ストレッチ差配を確定する' : 'この差配を確定する'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="差配の確定"
        size="md"
      >
        {selectedRecommendation && selectedJob && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-2">{selectedJob.title}</h4>
              <p className="text-sm text-gray-500">{selectedJobType?.nameJa}</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-600 mb-2">配置メンバー</h4>
              <div className="space-y-2">
                {selectedRecommendation.team.map(member => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.nameJa.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-800">{member.nameJa}</span>
                    {selectedRecommendation.leadCandidate?.id === member.id && (
                      <Badge color="blue" size="sm">リーダー</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>スコア: </span>
              <span className="font-bold text-gray-800">{selectedRecommendation.score.toFixed(1)}</span>
              <span>/ 10</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executeAssignment}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
              >
                確定する
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
