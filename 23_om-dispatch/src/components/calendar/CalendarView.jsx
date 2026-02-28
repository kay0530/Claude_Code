import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_MEMBERS } from '../../data/members';
import {
  getWeekDatesSundayStart,
  getDayNameJa,
  formatDateJa,
  formatDateShort,
  toISODate,
} from '../../utils/dateUtils';
import { useCalendar } from '../../context/CalendarContext';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import EventBlock from './EventBlock';
import EventDetailModal from './EventDetailModal';

// Calendar grid constants
const HOUR_HEIGHT = 48; // px per hour row
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Member display order (matches Outlook)
const MEMBER_ORDER = [
  'hiroki_n',
  'yodogawa_t',
  'tano_h',
  'bold_j',
  'sasanuma_k',
  'yamazaki_k',
  'ota_t',
  'wano_t',
];

export default function CalendarView({ onNavigate }) {
  const { events, loading, lastSynced } = useCalendar();
  const { syncing, syncStatus, syncWeek, loadRealCalendarData } = useCalendarSync();

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Week navigation state
  const [baseDate, setBaseDate] = useState(new Date());
  const [showWeekend, setShowWeekend] = useState(false);

  // Scrollable grid ref
  const scrollRef = useRef(null);
  const hasAutoScrolled = useRef(false);

  // Member filter state
  const [visibleMembers, setVisibleMembers] = useState(
    () => new Set(DEFAULT_MEMBERS.map((m) => m.id))
  );

  // Ordered members based on Outlook order
  const orderedMembers = useMemo(() => {
    return MEMBER_ORDER
      .map((id) => DEFAULT_MEMBERS.find((m) => m.id === id))
      .filter(Boolean);
  }, []);

  // Visible ordered members
  const visibleOrderedMembers = useMemo(() => {
    return orderedMembers.filter((m) => visibleMembers.has(m.id));
  }, [orderedMembers, visibleMembers]);

  // Week dates (Sunday start)
  const weekDates = useMemo(() => getWeekDatesSundayStart(baseDate), [baseDate]);

  // Display dates (weekday only or full week)
  const displayDates = useMemo(() => {
    if (showWeekend) return weekDates;
    return weekDates.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
  }, [weekDates, showWeekend]);

  // Build a lookup: email -> member
  const memberByEmail = useMemo(() => {
    const map = {};
    DEFAULT_MEMBERS.forEach((m) => {
      map[m.outlookEmail.toLowerCase()] = m;
    });
    return map;
  }, []);

  // Auto-scroll to 8:00 on mount
  useEffect(() => {
    if (scrollRef.current && !hasAutoScrolled.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
      hasAutoScrolled.current = true;
    }
  }, []);

  // Auto-sync calendar data for displayed week if no events exist
  const autoGenerateRef = useRef(new Set());
  useEffect(() => {
    const weekKey = toISODate(weekDates[0]);
    if (autoGenerateRef.current.has(weekKey)) return;

    const weekStart = toISODate(weekDates[0]);
    const weekEnd = toISODate(weekDates[6]);
    const hasEvents = events.some((e) => {
      const d = e.start.substring(0, 10);
      return d >= weekStart && d <= weekEnd;
    });

    if (!hasEvents && !syncing && !loading) {
      autoGenerateRef.current.add(weekKey);
      syncWeek(DEFAULT_MEMBERS, weekDates);
    }
  }, [weekDates, events, syncing, loading, syncWeek]);

  // Navigate to previous week
  function goToPrevWeek() {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
  }

  // Navigate to next week
  function goToNextWeek() {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
  }

  // Navigate to today
  function goToToday() {
    setBaseDate(new Date());
  }

  // Toggle member visibility
  function toggleMember(memberId) {
    setVisibleMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  // Hide member (from column header X button)
  function hideMember(memberId) {
    setVisibleMembers((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  }

  // Select/deselect all members
  function toggleAllMembers() {
    if (visibleMembers.size === DEFAULT_MEMBERS.length) {
      setVisibleMembers(new Set());
    } else {
      setVisibleMembers(new Set(DEFAULT_MEMBERS.map((m) => m.id)));
    }
  }

  // Sync button handler
  function handleSync() {
    syncWeek(DEFAULT_MEMBERS, weekDates);
  }

  // Get timed (non-all-day) events for a specific member + date
  const getEventsForMemberDate = useCallback(
    (memberEmail, date) => {
      const dateStr = toISODate(date);
      return events.filter((e) => {
        if (e.isAllDay) return false;
        const eventDate = e.start.substring(0, 10);
        return eventDate === dateStr && e.memberEmail === memberEmail.toLowerCase();
      });
    },
    [events]
  );

  // Get all-day events for a specific member + date
  const getAllDayEventsForMemberDate = useCallback(
    (memberEmail, date) => {
      const dateStr = toISODate(date);
      return events.filter((e) => {
        if (!e.isAllDay) return false;
        const eventStart = e.start.substring(0, 10);
        const eventEnd = e.end ? e.end.substring(0, 10) : eventStart;
        return dateStr >= eventStart && dateStr < eventEnd && e.memberEmail === memberEmail.toLowerCase();
      });
    },
    [events]
  );

  // Whether any all-day events exist (to conditionally show the banner)
  const hasAnyAllDayEvents = useMemo(() => {
    return events.some((e) => e.isAllDay);
  }, [events]);

  // Check if a date is today
  function isToday(date) {
    const today = new Date();
    return toISODate(date) === toISODate(today);
  }

  // Format the week range label
  const weekLabel = useMemo(() => {
    if (showWeekend) {
      const start = formatDateShort(weekDates[0]);
      const end = formatDateShort(weekDates[6]);
      return `${start}～${end}`;
    }
    const start = formatDateShort(displayDates[0]);
    const end = formatDateShort(displayDates[displayDates.length - 1]);
    return `${start}～${end}`;
  }, [weekDates, displayDates, showWeekend]);

  const dayColCount = displayDates.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              今日
            </button>
            <button
              onClick={goToPrevWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="前の週"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="次の週"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h2 className="text-lg font-bold text-gray-800">{weekLabel}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync status indicator */}
          {syncStatus && syncStatus.syncing && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              同期中 ({syncStatus.syncedMembers}/{syncStatus.totalMembers})
            </span>
          )}
          {lastSynced && !syncing && (
            <span className="text-xs text-gray-400">
              最終同期: {new Date(lastSynced).toLocaleTimeString('ja-JP')}
            </span>
          )}

          {/* Weekday / full week toggle */}
          <div className="relative">
            <button
              onClick={() => setShowWeekend((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {showWeekend ? '7日間' : '稼働日'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              syncing || loading
                ? 'bg-blue-500 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncing ? '同期中...' : 'Outlook同期'}
          </button>
        </div>
      </div>

      {/* Member filter chips */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <button
          onClick={toggleAllMembers}
          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
        >
          {visibleMembers.size === DEFAULT_MEMBERS.length ? '全解除' : '全選択'}
        </button>
        {orderedMembers.map((member) => (
          <label
            key={member.id}
            className="inline-flex items-center gap-1 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={visibleMembers.has(member.id)}
              onChange={() => toggleMember(member.id)}
              className="sr-only"
            />
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
                visibleMembers.has(member.id)
                  ? 'border-transparent text-white'
                  : 'border-gray-300 text-gray-400 bg-white'
              }`}
              style={
                visibleMembers.has(member.id)
                  ? { backgroundColor: member.color }
                  : {}
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: visibleMembers.has(member.id)
                    ? 'white'
                    : member.color,
                }}
              />
              {member.nameJa}
            </span>
          </label>
        ))}
      </div>

      {/* Calendar grid — Outlook schedule view style */}
      {/* Frame shows ~11 hours (8:00-19:00) at a time; scrolls 0-24h inside */}
      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 flex flex-col" style={{ maxHeight: `${11 * HOUR_HEIGHT + 80}px` }}>
        {/* Fixed header area */}
        <div className="flex shrink-0 border-b border-gray-700">
          {/* Time column header spacer */}
          <div className="w-14 shrink-0 border-r border-gray-700" />

          {/* Member column headers */}
          {visibleOrderedMembers.map((member, mIdx) => (
            <div
              key={member.id}
              className={`flex-1 min-w-0 ${mIdx < visibleOrderedMembers.length - 1 ? 'border-r border-gray-600' : ''}`}
            >
              {/* Member name header */}
              <div
                className="flex items-center justify-between px-2 py-1.5 text-white text-xs font-bold truncate"
                style={{ backgroundColor: member.color }}
              >
                <span className="truncate">{member.nameJa}</span>
                <button
                  onClick={() => hideMember(member.id)}
                  className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  title={`${member.nameJa}を非表示`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Day name + date sub-headers */}
              <div className="flex">
                {displayDates.map((date, dIdx) => {
                  const today = isToday(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={toISODate(date)}
                      className={`flex-1 text-center py-1 ${
                        dIdx < displayDates.length - 1 ? 'border-r border-gray-700/50' : ''
                      } ${today ? 'bg-blue-900/40' : ''}`}
                    >
                      <div className={`text-[10px] leading-tight ${isWeekend ? 'text-gray-500' : 'text-gray-400'}`}>
                        {getDayNameJa(date)}
                      </div>
                      <div
                        className={`text-xs font-semibold leading-tight ${
                          today
                            ? 'text-blue-400'
                            : isWeekend
                              ? 'text-gray-500'
                              : 'text-gray-300'
                        }`}
                      >
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events banner */}
        {hasAnyAllDayEvents && (
          <div className="flex shrink-0 border-b border-gray-700" style={{ minHeight: '28px' }}>
            {/* Time label column */}
            <div className="w-14 shrink-0 border-r border-gray-700 flex items-center justify-end pr-2 text-[10px] text-gray-500">
              終日
            </div>
            {/* Member columns */}
            {visibleOrderedMembers.map((member, mIdx) => (
              <div
                key={`allday-${member.id}`}
                className={`flex-1 min-w-0 flex ${
                  mIdx < visibleOrderedMembers.length - 1 ? 'border-r border-gray-600' : ''
                }`}
              >
                {displayDates.map((date, dIdx) => {
                  const allDayEvents = getAllDayEventsForMemberDate(member.outlookEmail, date);
                  return (
                    <div
                      key={`allday-${member.id}-${toISODate(date)}`}
                      className={`flex-1 min-w-0 px-0.5 py-0.5 ${
                        dIdx < displayDates.length - 1 ? 'border-r border-gray-700/50' : ''
                      }`}
                    >
                      {allDayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="text-[9px] truncate rounded-sm px-1 py-0.5 cursor-pointer mb-0.5"
                          style={{
                            backgroundColor: member.color + '55',
                            borderLeft: `3px solid ${member.color}`,
                            color: '#e5e7eb',
                            lineHeight: '1.2',
                          }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
            {/* Time column */}
            <div className="w-14 shrink-0 border-r border-gray-700">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-gray-800 text-right pr-2 text-[11px] text-gray-500 flex items-start justify-end"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="-mt-2">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Member day columns */}
            {visibleOrderedMembers.map((member, mIdx) => (
              <div
                key={member.id}
                className={`flex-1 min-w-0 flex ${
                  mIdx < visibleOrderedMembers.length - 1 ? 'border-r border-gray-600' : ''
                }`}
              >
                {displayDates.map((date, dIdx) => {
                  const dateStr = toISODate(date);
                  const dayEvents = getEventsForMemberDate(member.outlookEmail, date);
                  const today = isToday(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <div
                      key={dateStr}
                      className={`flex-1 min-w-0 relative ${
                        dIdx < displayDates.length - 1 ? 'border-r border-gray-700/50' : ''
                      } ${today ? 'bg-blue-900/10' : ''} ${isWeekend ? 'bg-gray-800/30' : ''}`}
                    >
                      {/* Hour grid lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-b border-gray-800"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        />
                      ))}

                      {/* Event blocks */}
                      {dayEvents.map((event) => (
                        <EventBlock
                          key={event.id}
                          event={event}
                          memberColor={member.color}
                          hourHeight={HOUR_HEIGHT}
                          hourStart={0}
                          onClick={setSelectedEvent}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event detail modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
