import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { rankTeams } from '../services/dispatchEngine';
import { useClaudeApi } from './useClaudeApi';

/**
 * React hook wrapping the dispatch engine.
 * Uses AI (Opus) when API key is available, falls back to rule-based engine.
 * @returns {{ recommendations, loading, error, runDispatch, clearRecommendations, isAiMode }}
 */
export function useDispatchEngine() {
  const { state } = useApp();
  const { aiDispatch, hasApiKey, loading: aiLoading } = useClaudeApi();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dispatchMode, setDispatchMode] = useState(null); // 'ai' | 'rule' | null
  const [aiUsage, setAiUsage] = useState(null);
  const [aiModel, setAiModel] = useState(null);

  const runDispatch = useCallback(async (jobId) => {
    setLoading(true);
    setError(null);
    setRecommendations([]);
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

        // aiDispatchTeams already parses JSON and returns { recommendations, error, usage, model }
        // executeApiCall passes it through, so aiResult has the same shape
        const aiRecs = (aiResult.recommendations || []);
        if (!aiResult.error && aiRecs.length > 0) {
          const formattedAiRecs = aiRecs.map((rec) => {
            // Resolve member IDs to member objects
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
              teamSkillTotal: 0,
              requiredSkillTotal: jobType.requiredSkillTotal * team.length,
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
        state.settings,
        []
      );

      const formattedRecommendations = ranked.map((result) => ({
        rank: result.rank,
        team: result.team,
        score: result.score,
        breakdown: result.breakdown,
        isStretch: result.isStretch,
        stretchRatio: result.stretchRatio,
        teamSkillTotal: result.teamSkillTotal,
        requiredSkillTotal: result.requiredSkillTotal,
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
  }, [state, hasApiKey, aiDispatch]);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
    setDispatchMode(null);
    setAiUsage(null);
    setAiModel(null);
  }, []);

  return {
    recommendations,
    loading: loading || aiLoading,
    error,
    runDispatch,
    clearRecommendations,
    dispatchMode,
    aiUsage,
    aiModel,
  };
}
