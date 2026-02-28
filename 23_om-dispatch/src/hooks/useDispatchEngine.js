import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { rankTeams } from '../services/dispatchEngine';

/**
 * React hook wrapping the dispatch engine.
 * Provides recommendations, loading state, and dispatch runner.
 * @returns {{ recommendations, loading, error, runDispatch, clearRecommendations }}
 */
export function useDispatchEngine() {
  const { state } = useApp();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runDispatch = useCallback((jobId) => {
    setLoading(true);
    setError(null);
    setRecommendations([]);

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

      // Run the ranking engine
      const ranked = rankTeams(
        state.members,
        job,
        jobType,
        state.settings,
        [] // calendarEvents - empty for now
      );

      // Format recommendations (rank already set by rankTeams)
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
      }));

      setRecommendations(formattedRecommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [state]);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    recommendations,
    loading,
    error,
    runDispatch,
    clearRecommendations,
  };
}
