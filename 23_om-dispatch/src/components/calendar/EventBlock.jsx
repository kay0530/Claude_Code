import { useState } from 'react';
import { timeStringToMinutes } from '../../utils/dateUtils';

/**
 * Single event block rendered on the calendar grid.
 * Positioned absolutely based on start/end time within the hour grid.
 * Supports hover tooltip and click-to-open detail modal.
 * @param {{ event: object, memberColor: string, hourHeight: number, hourStart?: number, onClick?: (event: object) => void }}
 */
export default function EventBlock({ event, memberColor, hourHeight, hourStart = 0, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // All-day events are rendered in the all-day banner, not in the time grid
  if (event.isAllDay) return null;

  // Parse start and end times
  const startTime = event.start.substring(11, 16);
  const endTime = event.end.substring(11, 16);
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);

  // Calculate position relative to grid start hour
  const gridStartMinutes = hourStart * 60;
  const topOffset = ((startMinutes - gridStartMinutes) / 60) * hourHeight;
  const height = ((endMinutes - startMinutes) / 60) * hourHeight;

  // Determine if this is a dispatch event (title starts with [O&M])
  const isDispatch = event.title.startsWith('[O&M]');

  if (height <= 0) return null;

  return (
    <div
      className="absolute left-0 right-0 rounded-sm overflow-hidden cursor-pointer transition-opacity"
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(height, 10)}px`,
        backgroundColor: memberColor,
        opacity: 0.85,
        borderLeft: isDispatch ? `2px dashed white` : undefined,
        zIndex: showTooltip ? 20 : 10,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(event);
      }}
    >
      {/* Event title (only show if block is tall enough and wide enough) */}
      {height >= 16 && (
        <p
          className="text-[9px] font-medium truncate leading-tight px-0.5 text-white"
        >
          {event.title}
        </p>
      )}
      {height >= 30 && (
        <p className="text-[8px] text-white/70 truncate leading-tight px-0.5">
          {startTime}-{endTime}
        </p>
      )}

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute left-full top-0 ml-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 min-w-40 pointer-events-none">
          <p className="text-xs font-semibold text-gray-800 mb-0.5">
            {event.title}
          </p>
          <p className="text-[11px] text-gray-600">
            {startTime} - {endTime}
          </p>
          {isDispatch && (
            <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              ディスパッチ
            </span>
          )}
        </div>
      )}
    </div>
  );
}
