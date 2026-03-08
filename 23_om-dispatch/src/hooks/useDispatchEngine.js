import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCalendar } from '../context/CalendarContext';
import { rankTeams, rankMultiDayPlans } from '../services/dispatchEngine';
import { useClaudeApi } from './useClaudeApi';

/**
 * React hook wrapping the dispatch engine.
 * Uses AI (Opus) when API key is available, falls back to rule-based engine.
 * Supports single-job and multi-job dispatch.
 * @returns {{ recommendations, multiJobPlans, loading, error, runDispatch, runMultiJobDispatch, clearRecommendations, isAiMode }}
 */
export function useDispatchEngine() {
  const { state } = useApp();
  const { events: calendarEvents } = useCalendar();
  const { aiDispatch, hasApiKey, loading: aiLoading } = useClaudeApi();
  const [recommendations, setRecommendations] = useState([]);
  const [multiJobPlans, setMultiJobPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dispatchMode, setDispatchMode] = useState(null); // 'ai' | 'rule' | null
  const [aiUsage, setAiUsage] = useState(null);
  const [aiModel, setAiModel] = useState(null);

  const runDispatch = useCallback(async (jobId) => {
    setLoading(true);
    setError(null);
    setRecommendations([]);
    setMultiJobPlans([]);
    setDispatchMode(null);
    setAiUsage(null);
    setAiModel(null);

    try {
      // Find the job from state
      const job = state.jobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error(`案件が見つかりません: ${jobId}`);
      }

      // Find the job type
      const jobType = state.jobTypes.find(jt => jt.id === job.jobTypeId);
      if (!jobType) {
        throw new Error(`案件種別が見つかりません: ${job.jobTypeId}`);
      }

      // Get applicable conditions
      const jobConditions = (job.conditionIds || [])
        .map(cid => state.conditions?.find(c => c.id === cid))
        .filter(Boolean);

      // Try AI dispatch if API key is available
      if (hasApiKey) {
        setDispatchMode('ai');
        const aiResult = await aiDispatch(
          state.members,
          job,
          jobType,
          jobConditions,
          state.settings
        );

        const aiRecs = (aiResult.recommendations || []);
        if (!aiResult.error && aiRecs.length > 0) {
          const formattedAiRecs = aiRecs.map((rec) => {
            const team = (rec.memberIds || [])
              .map(id => state.members.find(m => m.id === id))
              .filter(Boolean);
            const leadCandidate = team.find(m => m.id === rec.leadMemberId) || team[0] || null;
            const mentoringPairs = (rec.mentoringPairs || []).map(pair => ({
              junior: state.members.find(m => m.id === pair.juniorId) || null,
              mentor: state.members.find(m => m.id === pair.mentorId) || null,
            })).filter(p => p.junior);

            return {
              rank: rec.rank,
              team,
              score: rec.score,
              breakdown: rec.breakdown || {},
              isStretch: rec.isStretch || false,
              stretchRatio: rec.stretchRatio || 1.0,
              teamManpower: rec.teamManpower || 0,
              requiredManpower: rec.requiredManpower || jobType.baseManpower,
              vehicleArrangement: rec.vehicleArrangement || 'hiace',
              vehicleDetails: rec.vehicleDetails || '',
              leadCandidate,
              mentoringPairs,
              aiReasoning: rec.aiReasoning || '',
            };
          });

          setRecommendations(formattedAiRecs);
          setAiUsage(aiResult.usage);
          setAiModel(aiResult.model);
          return;
        }

        // AI failed, fall back to rule-based
        console.warn('AI dispatch failed, falling back to rule-based engine');
        setDispatchMode('rule');
      } else {
        setDispatchMode('rule');
      }

      // Rule-based fallback
      const ranked = rankTeams(
        state.members,
        job,
        jobType,
        jobConditions,
        state.settings,
        calendarEvents
      );

      const formattedRecommendations = ranked.map((result) => ({
        rank: result.rank,
        team: result.team,
        score: result.score,
        breakdown: result.breakdown,
        isStretch: result.isStretch,
        stretchRatio: result.stretchRatio,
        teamManpower: result.teamManpower,
        requiredManpower: result.requiredManpower,
        vehicleArrangement: result.vehicleArrangement,
        vehicleDetails: result.vehicleDetails,
        leadCandidate: result.leadCandidate,
        mentoringPairs: result.mentoringPairs || [],
        aiReasoning: '',
      }));

      setRecommendations(formattedRecommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [state, hasApiKey, aiDispatch, calendarEvents]);

  /**
   * Run multi-job dispatch for multiple selected jobs.
   * @param {string[]} jobIds - Array of job IDs to dispatch together
   */
  const runMultiJobDispatch = useCallback(async (jobIds) => {
    setLoading(true);
    setError(null);
    setRecommendations([]);
    setMultiJobPlans([]);
    setDispatchMode('rule');
    setAiUsage(null);
    setAiModel(null);

    try {
      const jobsWithTypes = jobIds.map(jobId => {
        const job = state.jobs.find(j => j.id === jobId);
        if (!job) throw new Error(`案件が見つかりません: ${jobId}`);
        const jobType = state.jobTypes.find(jt => jt.id === job.jobTypeId);
        if (!jobType) throw new Error(`案件種別が見つかりません: ${job.jobTypeId}`);
        const conditions = (job.conditionIds || [])
          .map(cid => state.conditions?.find(c => c.id === cid))
          .filter(Boolean);
        return { job, jobType, conditions };
      });

      const plans = rankMultiDayPlans(
        state.members,
        jobsWithTypes,
        state.settings,
        calendarEvents
      );

      // Augment plans with resolved member objects
      const augmentedPlans = plans.map((plan, planIndex) => ({
        ...plan,
        rank: planIndex + 1,
        daySchedules: plan.daySchedules.map(daySchedule => ({
          ...daySchedule,
          assignments: (daySchedule.jobAssignments || []).map(assignment => {
            const team = assignment.team || [];
            return {
              teamMemberIds: team.map(m => m.id),
              teamMembers: team,
              leadMemberId: assignment.leadCandidate?.id || null,
              leadCandidate: assignment.leadCandidate || null,
              score: assignment.score,
              breakdown: assignment.breakdown,
              isStretch: assignment.isStretch,
              teamManpower: assignment.teamManpower,
              requiredManpower: assignment.requiredManpower,
              vehicleArrangement: assignment.vehicleArrangement,
              vehicleDetails: assignment.vehicleDetails,
              mentoringPairs: assignment.mentoringPairs || [],
              jobTitle: assignment.job?.title || '',
              jobTypeName: assignment.jobType?.nameJa || '',
              jobId: assignment.job?.id || '',
            };
          }),
        })),
      }));

      setMultiJobPlans(augmentedPlans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [state, calendarEvents]);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setMultiJobPlans([]);
    setError(null);
    setDispatchMode(null);
    setAiUsage(null);
    setAiModel(null);
  }, []);

  return {
    recommendations,
    multiJobPlans,
    loading: loading || aiLoading,
    error,
    runDispatch,
    runMultiJobDispatch,
    clearRecommendations,
    dispatchMode,
    aiUsage,
    aiModel,
  };
}
