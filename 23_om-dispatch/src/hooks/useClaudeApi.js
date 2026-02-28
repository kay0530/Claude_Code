import { useState, useCallback } from 'react';
import * as claudeService from '../services/claudeService';

export function useClaudeApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUsage, setLastUsage] = useState(null);

  // Check if API key is configured
  const hasApiKey = Boolean(
    localStorage.getItem(claudeService.STORAGE_KEY)
  );

  // Save API key to localStorage
  const setApiKey = useCallback((key) => {
    if (key) {
      localStorage.setItem(claudeService.STORAGE_KEY, key);
    } else {
      localStorage.removeItem(claudeService.STORAGE_KEY);
    }
  }, []);

  // Wrapper to handle loading/error state
  const executeApiCall = useCallback(async (apiFn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn();
      if (result.error) {
        setError(result.content);
      }
      setLastUsage(result.usage);
      return result;
    } catch (err) {
      const msg = err.message || 'API呼び出し中にエラーが発生しました';
      setError(msg);
      return { content: msg, model: null, usage: null, error: true };
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate recommendation reason
  const generateReason = useCallback(
    (team, job, jobType, score, breakdown, isStretch) =>
      executeApiCall(() =>
        claudeService.generateRecommendationReason(
          team,
          job,
          jobType,
          score,
          breakdown,
          isStretch
        )
      ),
    [executeApiCall]
  );

  // Evaluate stretch risk
  const evaluateStretch = useCallback(
    (team, job, jobType, stretchMultiplier) =>
      executeApiCall(() =>
        claudeService.evaluateStretchRisk(
          team,
          job,
          jobType,
          stretchMultiplier
        )
      ),
    [executeApiCall]
  );

  // Optimize multi-job schedule
  const optimizeSchedule = useCallback(
    (jobs, members, constraints) =>
      executeApiCall(() =>
        claudeService.optimizeMultiJobSchedule(jobs, members, constraints)
      ),
    [executeApiCall]
  );

  return {
    loading,
    error,
    lastUsage,
    generateReason,
    evaluateStretch,
    optimizeSchedule,
    setApiKey,
    hasApiKey,
  };
}
