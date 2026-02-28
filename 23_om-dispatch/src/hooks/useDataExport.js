import { useCallback } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Hook for JSON data export, import, and reset operations.
 * Provides methods to backup/restore full application state.
 */
export function useDataExport() {
  const { state, dispatch } = useApp();

  // Export entire state as a downloadable JSON file
  const exportData = useCallback(() => {
    const exportPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        members: state.members,
        jobTypes: state.jobTypes,
        conditions: state.conditions,
        jobs: state.jobs,
        assignments: state.assignments,
        feedbacks: state.feedbacks,
        settings: state.settings,
      },
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `om-dispatch-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  // Read a JSON file and import its data into state
  const importData = useCallback(
    (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            const data = parsed.data || parsed;

            // Validate required structure
            const requiredKeys = [
              'members',
              'jobTypes',
              'conditions',
              'jobs',
              'assignments',
              'feedbacks',
              'settings',
            ];
            const hasRequired = requiredKeys.every(
              (key) => data[key] !== undefined
            );

            if (!hasRequired) {
              reject(
                new Error(
                  'インポートファイルに必要なデータが含まれていません。'
                )
              );
              return;
            }

            dispatch({ type: 'IMPORT_DATA', payload: data });
            resolve();
          } catch (err) {
            reject(
              new Error('JSONファイルの解析に失敗しました: ' + err.message)
            );
          }
        };
        reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
        reader.readAsText(file);
      });
    },
    [dispatch]
  );

  // Reset all data to defaults
  const resetData = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  return { exportData, importData, resetData };
}
