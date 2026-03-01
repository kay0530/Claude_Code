import { useMemo } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { findAvailableSlots } from '../../services/calendarService';
import {
  timeStringToMinutes,
  minutesToTimeString,
  toISODate,
  formatDateJa,
  getDayNameJa,
} from '../../utils/dateUtils';

// Working hours grid range
const GRID_START = 8 * 60; // 08:00
const GRID_END = 18 * 60;  // 18:00
const GRID_TOTAL = GRID_END - GRID_START;
const DEFAULT_WORKING_HOURS = { start: '09:00', end: '18:00' };

/**
 * Available slot search panel.
 * Shows a timeline with free/busy indicators per member and highlights common free slots.
 */
export default function SlotFinder({ members, date, onSlotSelect }) {
  const { events } = useCalendar();

  const dateStr = date
    ? typeof date === 'string'
      ? date
      : toISODate(date)
    : toISODate(new Date());

  // Compute free slots per member
  const memberSlots = useMemo(() => {
    if (!members || members.length === 0) return [];

    return members.map((member) => {
      const freeSlots = findAvailableSlots(
        member.outlookEmail,
        events,
        dateStr,
        DEFAULT_WORKING_HOURS
      );
      return {
        member,
        freeSlots,
      };
    });
  }, [members, events, dateStr]);

  // Find common free slots (times when ALL members are available)
  const commonSlots = useMemo(() => {
    if (memberSlots.length === 0) return [];

    // Start with working hours as potential free range
    const workStart = timeStringToMinutes(DEFAULT_WORKING_HOURS.start);
    const workEnd = timeStringToMinutes(DEFAULT_WORKING_HOURS.end);

    // For each minute, check if all members are free
    // Build a bitmap of common free minutes
    const freeMinutes = new Array(workEnd - workStart).fill(true);

    for (const { freeSlots } of memberSlots) {
      // Build member's free bitmap
      const memberFree = new Array(workEnd - workStart).fill(false);
      for (const slot of freeSlots) {
        const slotStart = timeStringToMinutes(slot.start) - workStart;
        const slotEnd = timeStringToMinutes(slot.end) - workStart;
        for (let i = Math.max(0, slotStart); i < Math.min(memberFree.length, slotEnd); i++) {
          memberFree[i] = true;
        }
      }

      // AND with common free
      for (let i = 0; i < freeMinutes.length; i++) {
        freeMinutes[i] = freeMinutes[i] && memberFree[i];
      }
    }

    // Convert bitmap to slot ranges
    const slots = [];
    let start = null;
    for (let i = 0; i <= freeMinutes.length; i++) {
      if (i < freeMinutes.length && freeMinutes[i]) {
        if (start === null) start = i;
      } else {
        if (start !== null) {
          const slotStart = start + workStart;
          const slotEnd = i + workStart;
          const duration = slotEnd - slotStart;
          // Only include slots >= 30 minutes
          if (duration >= 30) {
            slots.push({
              start: minutesToTimeString(slotStart),
              end: minutesToTimeString(slotEnd),
              durationMinutes: duration,
            });
          }
          start = null;
        }
      }
    }

    return slots;
  }, [memberSlots]);

  // Convert a time to clamped percentage
  function timeToPercentClamped(timeStr) {
    const min = timeStringToMinutes(timeStr);
    const clamped = Math.max(GRID_START, Math.min(GRID_END, min));
    return ((clamped - GRID_START) / GRID_TOTAL) * 100;
  }

  // Handle slot click
  function handleSlotClick(slot) {
    if (onSlotSelect) {
      onSlotSelect({
        date: dateStr,
        start: slot.start,
        end: slot.end,
        durationMinutes: slot.durationMinutes,
      });
    }
  }

  // Generate hour labels for the grid
  const hourLabels = [];
  for (let h = 8; h <= 18; h++) {
    hourLabels.push(h);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700">空き時間検索</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDateJa(dateStr)}（{getDayNameJa(dateStr)}）
          </p>
        </div>
        {commonSlots.length > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            共通空き {commonSlots.length}件
          </span>
        )}
      </div>

      {/* Hour scale */}
      <div className="relative mb-1 h-5">
        {hourLabels.map((h) => (
          <span
            key={h}
            className="absolute text-xs text-gray-400 -translate-x-1/2"
            style={{ left: `${((h * 60 - GRID_START) / GRID_TOTAL) * 100}%` }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Member timelines */}
      <div className="space-y-2">
        {memberSlots.map(({ member, freeSlots }) => (
          <div key={member.id} className="flex items-center gap-2">
            {/* Member name */}
            <div className="w-20 flex-shrink-0">
              <span className="text-xs font-medium text-gray-600 truncate block">
                {member.nameJa}
              </span>
            </div>

            {/* Timeline bar */}
            <div className="flex-1 relative h-6 bg-red-100 rounded overflow-hidden">
              {/* Free slots shown as green blocks */}
              {freeSlots.map((slot, i) => {
                const left = timeToPercentClamped(slot.start);
                const right = timeToPercentClamped(slot.end);
                const width = right - left;
                if (width <= 0) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full bg-green-200"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                  />
                );
              })}

              {/* Grid lines */}
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute top-0 h-full border-l border-gray-300/30"
                  style={{
                    left: `${((h * 60 - GRID_START) / GRID_TOTAL) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Common free slots highlight */}
      {memberSlots.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-20 flex-shrink-0">
              <span className="text-xs font-bold text-green-700">共通空き</span>
            </div>
            <div className="flex-1 relative h-6 bg-gray-100 rounded overflow-hidden">
              {commonSlots.map((slot, i) => {
                const left = timeToPercentClamped(slot.start);
                const right = timeToPercentClamped(slot.end);
                const width = right - left;
                if (width <= 0) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full bg-green-400 cursor-pointer hover:bg-green-500 transition-colors"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    onClick={() => handleSlotClick(slot)}
                    title={`${slot.start} - ${slot.end}（${slot.durationMinutes}分）クリックで選択`}
                  />
                );
              })}

              {/* Grid lines */}
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute top-0 h-full border-l border-gray-300/30"
                  style={{
                    left: `${((h * 60 - GRID_START) / GRID_TOTAL) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clickable common slot list */}
      {commonSlots.length > 0 && (
        <div className="mt-3 space-y-1">
          {commonSlots.map((slot, i) => (
            <button
              key={i}
              onClick={() => handleSlotClick(slot)}
              className="w-full flex items-center justify-between px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-sm transition-colors group"
            >
              <span className="font-medium text-green-800">
                {slot.start} - {slot.end}
              </span>
              <span className="text-xs text-green-600">
                {slot.durationMinutes >= 60
                  ? `${Math.floor(slot.durationMinutes / 60)}時間${slot.durationMinutes % 60 > 0 ? `${slot.durationMinutes % 60}分` : ''}`
                  : `${slot.durationMinutes}分`}
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  → 選択
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No common slots message */}
      {memberSlots.length > 0 && commonSlots.length === 0 && (
        <p className="mt-3 text-xs text-gray-400 text-center py-2">
          全員が空いている30分以上のスロットはありません
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-200 rounded" />
          <span className="text-xs text-gray-500">空き</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 rounded" />
          <span className="text-xs text-gray-500">予定あり</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-400 rounded" />
          <span className="text-xs text-gray-500">共通空き（クリックで選択）</span>
        </div>
      </div>
    </div>
  );
}
