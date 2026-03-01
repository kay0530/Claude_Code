/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { REAL_CALENDAR_EVENTS } from '../data/realCalendarData';

const CalendarContext = createContext(null);

const STORAGE_KEY = 'om-dispatch-calendar-events';

// Bump this version whenever REAL_CALENDAR_EVENTS changes to invalidate stale cache
const DATA_VERSION = 7;

// Load events from localStorage, falling back to real data when cache is stale
function loadPersistedEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version === DATA_VERSION) {
        return data.events || [];
      }
      // Version mismatch — stale/mock data, clear it
      console.log('[CalendarContext] Stale cache detected (version mismatch). Loading real data.');
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore parse errors, fall through to real data
    localStorage.removeItem(STORAGE_KEY);
  }
  // No valid cache — start with real calendar data
  return REAL_CALENDAR_EVENTS;
}

// Save events to localStorage with version stamp
function persistEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DATA_VERSION, events }));
  } catch {
    // Ignore quota errors
  }
}

export function CalendarProvider({ children }) {
  const [events, setEventsState] = useState(() => loadPersistedEvents());
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Persist events whenever they change
  useEffect(() => {
    persistEvents(events);
  }, [events]);

  // Replace all events
  const setEvents = useCallback((newEvents) => {
    setEventsState(newEvents);
    setLastSynced(new Date().toISOString());
    setSyncError(null);
  }, []);

  // Append events without duplicates
  const addEvents = useCallback((newEvents) => {
    setEventsState((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const unique = newEvents.filter((e) => !existingIds.has(e.id));
      return [...prev, ...unique];
    });
    setLastSynced(new Date().toISOString());
    setSyncError(null);
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEventsState([]);
    setLastSynced(null);
    setSyncError(null);
  }, []);

  // Get events for a specific member email
  const getEventsForMember = useCallback(
    (email) => {
      return events.filter(
        (e) => e.memberEmail === email.toLowerCase()
      );
    },
    [events]
  );

  // Get events for a specific date (YYYY-MM-DD)
  const getEventsForDate = useCallback(
    (date) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      return events.filter((e) => {
        const eventDate = e.start.substring(0, 10);
        return eventDate === dateStr;
      });
    },
    [events]
  );

  const value = {
    events,
    loading,
    lastSynced,
    syncError,
    setEvents,
    addEvents,
    clearEvents,
    getEventsForMember,
    getEventsForDate,
    setLoading,
    setSyncError,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}
