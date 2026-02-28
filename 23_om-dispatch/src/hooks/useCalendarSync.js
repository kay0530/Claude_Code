import { useState, useCallback, useRef } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { parseCalendarEvents } from '../services/calendarService';
import { toISODate } from '../utils/dateUtils';
import { REAL_CALENDAR_EVENTS } from '../data/realCalendarData';

/**
 * Hook for syncing calendar data with Outlook via static data or MCP imports.
 *
 * Provides:
 * - syncCalendar: Filter and load REAL_CALENDAR_EVENTS by member emails and date range
 * - syncWeek: Convenience wrapper for syncing a full week for given members
 * - loadRealCalendarData: Quick-load ALL static data (no delay)
 * - importCalendarData: Accept externally provided MS365 data
 * - syncStatus: Object tracking sync progress
 */
export function useCalendarSync() {
  const { setEvents, addEvents, setLoading, setSyncError, events } =
    useCalendar();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    lastSync: null,
    error: null,
    syncedMembers: 0,
    totalMembers: 0,
  });

  // Ref to prevent concurrent syncs
  const syncInProgressRef = useRef(false);

  /**
   * Main sync function. Loads data from REAL_CALENDAR_EVENTS filtered by
   * member emails and date range. Simulates realistic network delay.
   *
   * @param {string[]} memberEmails - Array of Outlook email addresses to sync
   * @param {string|Date} startDate - Start of date range (inclusive)
   * @param {string|Date} endDate - End of date range (inclusive)
   */
  const syncCalendar = useCallback(
    async (memberEmails, startDate, endDate) => {
      // Prevent concurrent syncs
      if (syncInProgressRef.current) {
        console.warn('[CalendarSync] Sync already in progress, skipping.');
        return;
      }

      syncInProgressRef.current = true;
      setSyncing(true);
      setLoading(true);
      setError(null);
      setSyncError(null);

      const totalMembers = memberEmails ? memberEmails.length : 0;

      setSyncStatus({
        syncing: true,
        lastSync: null,
        error: null,
        syncedMembers: 0,
        totalMembers,
      });

      try {
        // Normalize date range to YYYY-MM-DD strings for comparison
        const rangeStart = toISODate(new Date(startDate));
        const rangeEnd = toISODate(new Date(endDate));
        const emailSet = new Set(
          (memberEmails || []).map((e) => e.toLowerCase())
        );

        console.log(
          '[CalendarSync] Syncing for',
          emailSet.size,
          'members from',
          rangeStart,
          'to',
          rangeEnd
        );

        // Simulate realistic network delay (800-1200ms)
        const delay = 800 + Math.random() * 400;
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Filter REAL_CALENDAR_EVENTS by email and date range
        const filtered = REAL_CALENDAR_EVENTS.filter((event) => {
          // Check member email
          if (!emailSet.has(event.memberEmail.toLowerCase())) {
            return false;
          }

          // Extract the event date (YYYY-MM-DD portion of start)
          const eventDate = event.start.substring(0, 10);

          // Include events whose date falls within [rangeStart, rangeEnd]
          return eventDate >= rangeStart && eventDate <= rangeEnd;
        });

        console.log(
          '[CalendarSync] Found',
          filtered.length,
          'events matching criteria'
        );

        // Replace all events to prevent data mixing across syncs
        if (filtered.length > 0) {
          setEvents(filtered);
        }

        // Count how many of the requested members actually had events
        const syncedEmailSet = new Set(
          filtered.map((e) => e.memberEmail.toLowerCase())
        );
        const syncedCount = [...emailSet].filter((e) =>
          syncedEmailSet.has(e)
        ).length;

        const now = new Date().toISOString();
        setLastSync(now);
        setError(null);

        setSyncStatus({
          syncing: false,
          lastSync: now,
          error: null,
          syncedMembers: syncedCount,
          totalMembers,
        });

        console.log(
          '[CalendarSync] Sync complete.',
          syncedCount,
          '/',
          totalMembers,
          'members had events in range.'
        );
      } catch (err) {
        const message = err.message || 'Sync failed';
        setError(message);
        setSyncError(message);

        setSyncStatus((prev) => ({
          ...prev,
          syncing: false,
          error: message,
        }));

        console.error('[CalendarSync] Sync error:', message);
      } finally {
        setSyncing(false);
        setLoading(false);
        syncInProgressRef.current = false;
      }
    },
    [setEvents, setLoading, setSyncError]
  );

  /**
   * Convenience wrapper: sync calendar for a given week.
   * Extracts emails from member objects, computes start/end from weekDates.
   *
   * @param {Array<{outlookEmail: string}>} members - Member objects with outlookEmail
   * @param {Date[]} weekDates - Array of Date objects representing the week
   */
  const syncWeek = useCallback(
    async (members, weekDates) => {
      if (!members || members.length === 0 || !weekDates || weekDates.length === 0) {
        console.warn('[CalendarSync] syncWeek called with empty members or dates.');
        return;
      }

      const emails = members
        .map((m) => m.outlookEmail)
        .filter(Boolean);

      // Determine the earliest and latest dates in the array
      const sorted = [...weekDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = sorted[0];
      const endDate = sorted[sorted.length - 1];

      await syncCalendar(emails, startDate, endDate);
    },
    [syncCalendar]
  );

  /**
   * Accept pasted or imported calendar data and parse it.
   * Useful when Claude MCP fetches MS365 data and passes it back.
   *
   * @param {Array} data - Raw MS365 event data (with 'subject' field) or pre-parsed events
   */
  const importCalendarData = useCallback(
    (data) => {
      try {
        // If data looks like MS365 format (has 'subject' field), parse it
        const hasSubject = data.length > 0 && data[0].subject !== undefined;
        const parsed = hasSubject ? parseCalendarEvents(data) : data;
        addEvents(parsed);
        const now = new Date().toISOString();
        setLastSync(now);
        setError(null);

        setSyncStatus((prev) => ({
          ...prev,
          lastSync: now,
          error: null,
        }));
      } catch (err) {
        const message = err.message || 'Import failed';
        setError(message);
        setSyncError(message);

        setSyncStatus((prev) => ({
          ...prev,
          error: message,
        }));
      }
    },
    [addEvents, setSyncError]
  );

  /**
   * Load ALL real Outlook calendar events from the static data file.
   * No delay -- instant load for quick access.
   */
  const loadRealCalendarData = useCallback(() => {
    setSyncing(true);
    setLoading(true);

    // Replace all events (clear old cache) instead of appending
    setEvents(REAL_CALENDAR_EVENTS);
    const now = new Date().toISOString();
    setLastSync(now);
    setSyncing(false);
    setLoading(false);
    setError(null);

    // Count unique member emails in the loaded data
    const uniqueEmails = new Set(
      REAL_CALENDAR_EVENTS.map((e) => e.memberEmail.toLowerCase())
    );

    setSyncStatus({
      syncing: false,
      lastSync: now,
      error: null,
      syncedMembers: uniqueEmails.size,
      totalMembers: uniqueEmails.size,
    });
  }, [setEvents, setLoading]);

  return {
    syncing,
    lastSync,
    error,
    syncStatus,
    syncCalendar,
    syncWeek,
    importCalendarData,
    loadRealCalendarData,
  };
}
