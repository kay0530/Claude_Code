import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useDispatchEngine } from '../../hooks/useDispatchEngine';
import { calculateTravelInfo } from '../../services/travelService';
import { createDispatchCalendarEvents } from '../../services/graphCalendarService';
import { generateId } from '../../utils/idGenerator';
import { STATUS_LABELS } from '../../utils/constants';
import RecommendationPanel from './RecommendationPanel';
import MultiJobPlanPanel from './MultiJobPlanPanel';
import StretchRiskPanel from './StretchRiskPanel';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';

/**
 * Main dispatch screen.
 * Supports single-job dispatch (AI or rule-based) and multi-job dispatch.
 * - 1 job selected: uses existing single-job flow with RecommendationPanel
 * - 2+ jobs selected: uses multi-job flow with MultiJobPlanPanel
 * @param {{ onNavigate: (view: string, params?: object) => void }}
 */
export default function DispatchView({ onNavigate }) {
  const { state, dispatch } = useApp();
  const { isAuthenticated, getToken } = useAuth();
  const {
    recommendations,
    multiJobPlans,
    loading,
    error,
    runDispatch,
    runMultiJobDispatch,
    clearRecommendations,
    dispatchMode,
    aiUsage,
    excludedMembers,
  } = useDispatchEngine();
  const hasApiKey = Boolean(localStorage.getItem('om-dispatch-claude-api-key'));

  // Job selection state: array of selected job IDs
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(null);
  const [selectedMultiPlanIndex, setSelectedMultiPlanIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Outlook calendar write-back state
  const [outlookWriting, setOutlookWriting] = useState(false);
  const [outlookWritten, setOutlookWritten] = useState(false);
  const [outlookWriteResult, setOutlookWriteResult] = useState(null);

  // Reset Outlook write state when selection changes
  useEffect(() => {
    setOutlookWritten(false);
    setOutlookWriteResult(null);
  }, [selectedJobIds, selectedRecommendationIndex, selectedMultiPlanIndex]);

  // Filter jobs with status 'estimated' (ready for dispatch)
  const estimatedJobs = state.jobs.filter(j => j.status === 'estimated');

  // Determine mode: single vs multi
  const isMultiJobMode = selectedJobIds.length >= 2;
  const isSingleJobMode = selectedJobIds.length === 1;

  // Single-job helpers
  const selectedJob = isSingleJobMode
    ? state.jobs.find(j => j.id === selectedJobIds[0])
    : null;
  const selectedJobType = selectedJob
    ? state.jobTypes.find(jt => jt.id === selectedJob.jobTypeId)
    : null;

  // Stretch mode state
  const stretchEnabled = state.settings.stretchMode?.enabled ?? false;
  const stretchMultiplier = state.settings.stretchMode?.defaultMultiplier || 1.2;

  // Travel info for selected single job
  const travelInfo = selectedJob
    ? calculateTravelInfo(selectedJob, state.settings)
    : null;

  // Single-job selected recommendation
  const selectedRecommendation = selectedRecommendationIndex !== null
    ? recommendations[selectedRecommendationIndex]
    : null;

  // Multi-job selected plan
  const selectedMultiPlan = selectedMultiPlanIndex !== null
    ? multiJobPlans[selectedMultiPlanIndex]
    : null;

  // Toggle a job's selection
  function toggleJobSelection(jobId) {
    setSelectedJobIds(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      }
      return [...prev, jobId];
    });
    // Clear previous results when selection changes
    clearRecommendations();
    setSelectedRecommendationIndex(null);
    setSelectedMultiPlanIndex(null);
    setConfirmSuccess(false);
  }

  // Select all / deselect all
  function toggleSelectAll() {
    if (selectedJobIds.length === estimatedJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(estimatedJobs.map(j => j.id));
    }
    clearRecommendations();
    setSelectedRecommendationIndex(null);
    setSelectedMultiPlanIndex(null);
    setConfirmSuccess(false);
  }

  function handleRunDispatch() {
    if (selectedJobIds.length === 0) return;
    setSelectedRecommendationIndex(null);
    setSelectedMultiPlanIndex(null);
    setConfirmSuccess(false);

    if (isMultiJobMode) {
      runMultiJobDispatch(selectedJobIds);
    } else {
      runDispatch(selectedJobIds[0]);
    }
  }

  // Single-job confirmation
  function handleConfirmAssignment() {
    if (!selectedRecommendation || !selectedJob) return;
    setShowConfirmModal(true);
  }

  // Multi-job confirmation
  function handleConfirmMultiAssignment() {
    if (!selectedMultiPlan) return;
    setShowConfirmModal(true);
  }

  function executeAssignment() {
    // Single-job assignment
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

    dispatch({ type: 'ADD_ASSIGNMENT', payload: assignment });
    dispatch({
      type: 'UPDATE_JOB',
      payload: { id: selectedJob.id, status: 'dispatched' },
    });

    setShowConfirmModal(false);
    setConfirmSuccess(true);
  }

  function executeMultiAssignment() {
    if (!selectedMultiPlan) return;

    // Loop through each day schedule and create assignments
    for (const daySchedule of selectedMultiPlan.daySchedules || []) {
      for (const assignment of daySchedule.assignments || []) {
        const asgn = {
          id: generateId('asgn'),
          jobId: assignment.jobId,
          teamMemberIds: assignment.teamMemberIds || [],
          leadMemberId: assignment.leadMemberId || null,
          score: assignment.score,
          breakdown: assignment.breakdown,
          isStretch: assignment.isStretch,
          vehicleArrangement: assignment.vehicleArrangement,
          vehicleDetails: assignment.vehicleDetails,
          scheduledDate: daySchedule.date,
          createdAt: new Date().toISOString(),
          status: 'confirmed',
        };

        dispatch({ type: 'ADD_ASSIGNMENT', payload: asgn });
        dispatch({
          type: 'UPDATE_JOB',
          payload: { id: assignment.jobId, status: 'dispatched', scheduledDate: daySchedule.date },
        });
      }
    }

    setShowConfirmModal(false);
    setConfirmSuccess(true);
  }

  // Write dispatch assignment to Outlook calendars (single-job only for now)
  async function handleOutlookWrite() {
    if (outlookWriting || outlookWritten) return;
    if (!confirmSuccess || !selectedRecommendation || !selectedJob) return;

    setOutlookWriting(true);
    setOutlookWriteResult(null);

    try {
      const token = await getToken();

      const assignmentData = {
        memberIds: selectedRecommendation.team.map((m) => m.id),
        leadMemberId: selectedRecommendation.leadCandidate?.id || null,
        vehicleArrangement: selectedRecommendation.vehicleArrangement || '',
        scheduledArrival: selectedJob.scheduledStart,
        scheduledEnd: selectedJob.scheduledEnd,
      };

      const jobData = {
        ...selectedJob,
        jobTypeName: selectedJobType?.nameJa || '',
      };

      const result = await createDispatchCalendarEvents(
        token,
        assignmentData,
        jobData,
        state.members
      );

      if (result.success) {
        setOutlookWritten(true);
        setOutlookWriteResult({
          type: 'success',
          message: `${result.data.length}名のカレンダーに登録しました`,
        });
      } else if (result.data.length > 0) {
        setOutlookWritten(true);
        setOutlookWriteResult({
          type: 'success',
          message: `${result.data.length}名に登録（${result.errors.length}名はエラー）`,
        });
      } else {
        setOutlookWriteResult({
          type: 'error',
          message: result.errors?.[0]?.error || 'Outlook登録に失敗しました',
        });
      }
    } catch (err) {
      setOutlookWriteResult({
        type: 'error',
        message: err.message || 'Outlook登録に失敗しました',
      });
    } finally {
      setOutlookWriting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">差配</h2>
        <p className="text-sm text-gray-500 mt-1">
          案件に最適なチームを自動提案します（複数案件の同時差配にも対応）
        </p>
      </div>

      {/* Job selector section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
            対象案件の選択
          </h3>
          {estimatedJobs.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedJobIds.length > 0 && (
                <span className="text-xs text-blue-600 font-medium">
                  {selectedJobIds.length}件選択中
                </span>
              )}
              <button
                onClick={toggleSelectAll}
                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                {selectedJobIds.length === estimatedJobs.length ? '全解除' : '全選択'}
              </button>
            </div>
          )}
        </div>

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
            {/* Job list with checkboxes */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {estimatedJobs.map(job => {
                const jt = state.jobTypes.find(t => t.id === job.jobTypeId);
                const isChecked = selectedJobIds.includes(job.id);
                return (
                  <label
                    key={job.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleJobSelection(job.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {job.title}
                        </span>
                        {jt && (
                          <Badge color="blue" size="sm">{jt.nameJa}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {job.preferredDate ? (
                          <span>
                            希望日: {job.preferredDate}
                          </span>
                        ) : (
                          <span className="text-orange-500">
                            希望日未設定
                          </span>
                        )}
                        <span>{job.estimatedTimeHours}h</span>
                        {job.locationName && (
                          <span className="truncate">{job.locationName}</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Selected single-job details */}
            {isSingleJobMode && selectedJob && (
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
                {selectedJob.preferredDate && (
                  <div className="text-sm">
                    <span className="text-gray-500">希望日: </span>
                    <span className="font-medium text-gray-800">{selectedJob.preferredDate}</span>
                  </div>
                )}
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

            {/* Multi-job summary when 2+ selected */}
            {isMultiJobMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-sm font-bold text-blue-700">
                    複数案件同時差配モード ({selectedJobIds.length}件)
                  </span>
                </div>
                <p className="text-xs text-blue-600">
                  メンバー重複なしの最適チーム編成を計算します。同一日で差配できない場合は複数日に分散します。
                </p>
                <div className="mt-2 space-y-1">
                  {selectedJobIds.map(jobId => {
                    const job = state.jobs.find(j => j.id === jobId);
                    const jt = job ? state.jobTypes.find(t => t.id === job.jobTypeId) : null;
                    return (
                      <div key={jobId} className="flex items-center gap-2 text-xs text-blue-700">
                        <span className="font-medium">{job?.title || jobId}</span>
                        {jt && <Badge color="blue" size="sm">{jt.nameJa}</Badge>}
                        {job?.preferredDate ? (
                          <span className="text-blue-500">{job.preferredDate}</span>
                        ) : (
                          <span className="text-orange-500">希望日未設定</span>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                    人工不足チームも許容（{stretchMultiplier}x）
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

            {/* Stretch effect display (single-job only) */}
            {stretchEnabled && isSingleJobMode && selectedJob && (
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
                    （人工要件を{Math.round((1 - 1/stretchMultiplier) * 100)}%緩和）
                  </span>
                </div>
              </div>
            )}

            {/* Run dispatch button */}
            <button
              onClick={handleRunDispatch}
              disabled={selectedJobIds.length === 0 || loading}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                selectedJobIds.length === 0 || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isMultiJobMode
                    ? 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 shadow-sm'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
              }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>
                    {isMultiJobMode ? '複数案件差配計算中...' : hasApiKey ? 'AI差配計算中...' : '差配計算中...'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>
                    {isMultiJobMode
                      ? `${selectedJobIds.length}件の差配を実行`
                      : hasApiKey
                        ? 'AI差配を実行'
                        : '差配を実行'
                    }
                  </span>
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

      {/* Excluded members by calendar */}
      {excludedMembers && excludedMembers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2 text-amber-700 mb-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium">
                Outlookカレンダーの予定により差配対象外 ({excludedMembers.length}名)
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                希望日に既存の予定が入っているメンバーは差配候補から除外されます
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {excludedMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.nameJa.charAt(0)}
                </div>
                <span>{member.nameJa}</span>
              </div>
            ))}
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

          {/* Outlook calendar write-back button (single-job only) */}
          {isAuthenticated && isSingleJobMode && (
            <div className="mt-3 pt-3 border-t border-green-200">
              {outlookWritten ? (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Outlook登録済み
                </div>
              ) : (
                <button
                  onClick={handleOutlookWrite}
                  disabled={outlookWriting}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    outlookWriting
                      ? 'bg-green-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {outlookWriting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      登録中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Outlookに登録
                    </>
                  )}
                </button>
              )}

              {outlookWriteResult && (
                <div className={`mt-2 text-xs font-medium ${
                  outlookWriteResult.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {outlookWriteResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Single-job Recommendations */}
      {isSingleJobMode && recommendations.length > 0 && (
        <div className="space-y-4">
          {/* Dispatch mode indicator */}
          {dispatchMode && (
            <div className={`flex items-center justify-between px-4 py-2 rounded-lg text-xs ${
              dispatchMode === 'ai'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                : 'bg-gray-50 border border-gray-200 text-gray-600'
            }`}>
              <div className="flex items-center gap-2">
                {dispatchMode === 'ai' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="font-bold">AI差配（Opus）</span>
                    <span>で最適化しました</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="font-bold">ルールベース差配</span>
                    <span>（APIキー未設定）</span>
                  </>
                )}
              </div>
              {dispatchMode === 'ai' && aiUsage && (
                <span className="text-indigo-500">
                  {aiUsage.input_tokens + aiUsage.output_tokens} tokens
                </span>
              )}
            </div>
          )}
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

          {/* Confirm single-job assignment button */}
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

      {/* Multi-job Plans */}
      {isMultiJobMode && multiJobPlans.length > 0 && (
        <div className="space-y-4">
          {/* Mode indicator for multi-job */}
          <div className="flex items-center justify-between px-4 py-2 rounded-lg text-xs bg-purple-50 border border-purple-200 text-purple-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-bold">複数案件差配</span>
              <span>（ルールベース）</span>
            </div>
            <span className="text-purple-500">
              {selectedJobIds.length}件同時
            </span>
          </div>

          <MultiJobPlanPanel
            plans={multiJobPlans}
            onSelectPlan={setSelectedMultiPlanIndex}
            selectedPlanIndex={selectedMultiPlanIndex}
            members={state.members}
          />

          {/* Confirm multi-job assignment button */}
          {selectedMultiPlan && (
            <div className="sticky bottom-4">
              <button
                onClick={handleConfirmMultiAssignment}
                className="w-full py-3 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2 bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  {selectedMultiPlan.planType === 'multi-day'
                    ? `${selectedMultiPlan.totalDays}日間のスケジュールを確定する`
                    : `${selectedJobIds.length}件の差配を確定する`
                  }
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* No results message for single-job (e.g., all members excluded by calendar) */}
      {isSingleJobMode && !loading && recommendations.length === 0 && dispatchMode && error === null && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 mb-1">有効なチーム編成が見つかりませんでした</p>
          <p className="text-xs text-gray-400">
            {excludedMembers.length > 0
              ? `${excludedMembers.length}名がカレンダー予定により除外されたため、必要人数を満たすチームを編成できません。別の日程をお試しください。`
              : '条件を変更するか、ストレッチモードを有効にしてお試しください。'}
          </p>
        </div>
      )}

      {/* No results message for multi-job */}
      {isMultiJobMode && !loading && multiJobPlans.length === 0 && selectedJobIds.length > 0 && error === null && recommendations.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          差配を実行すると候補プランが表示されます
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="差配の確定"
        size="md"
      >
        {/* Single-job confirmation */}
        {isSingleJobMode && selectedRecommendation && selectedJob && (
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

        {/* Multi-job confirmation */}
        {isMultiJobMode && selectedMultiPlan && (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-purple-800">
                  {selectedMultiPlan.planType === 'multi-day'
                    ? `${selectedMultiPlan.totalDays}日間のスケジュール`
                    : `${selectedJobIds.length}件同日実施`
                  }
                </span>
                <span className="text-sm text-purple-500">
                  スコア: {selectedMultiPlan.totalScore.toFixed(1)}/10
                </span>
              </div>
              {(selectedMultiPlan.daySchedules || []).map((ds, i) => (
                <div key={i} className="mt-2">
                  {selectedMultiPlan.planType === 'multi-day' && (
                    <div className="text-xs font-bold text-purple-600 mb-1">{ds.dateLabel || ds.date}</div>
                  )}
                  {(ds.assignments || []).map((a, j) => (
                    <div key={j} className="text-sm text-gray-700 ml-2">
                      {a.jobTitle} - {(a.teamMemberIds || []).length}名
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executeMultiAssignment}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors"
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
