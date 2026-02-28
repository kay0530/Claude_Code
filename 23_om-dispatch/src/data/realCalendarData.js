/**
 * Real Calendar Data - Imported from Outlook via MS365 API
 * Data period: 2026-01-26 to 2026-03-31
 * Last updated: 2026-02-28
 *
 * To update: Re-fetch JSON files from Outlook and bump DATA_VERSION in CalendarContext.jsx
 */

import rawHirokiYodogawa from './temp_hiroki_yodogawa.json';
import rawTanoOta from './temp_tano_ota.json';
import rawBoldSasanuma from './temp_bold_sasanuma.json';
import rawYamazakiWano from './temp_yamazaki_wano.json';

const ALL_RAW_EVENTS = [
  ...rawHirokiYodogawa,
  ...rawTanoOta,
  ...rawBoldSasanuma,
  ...rawYamazakiWano,
];

/**
 * Generate a deterministic event ID from raw JSON data.
 * Format: real_{memberKey}_{MMDD}_{titleSlug}_{index}
 */
function generateEventId(raw, index) {
  // Extract MMDD from start date
  const dateStr = raw.start.replace(/-/g, '');
  const mmdd = dateStr.substring(4, 8);
  // Create short title slug (first 8 chars, alphanumeric + Japanese only)
  const slug = raw.title.replace(/[^a-zA-Z0-9\u3000-\u9fff]/g, '').substring(0, 8) || 'evt';
  return `real_${raw.memberKey}_${mmdd}_${slug}_${index}`;
}

/**
 * Transform raw JSON events to the app's expected format.
 * Maps flat JSON structure to the nested organizer/attendees format
 * used by the calendar components.
 */
export const REAL_CALENDAR_EVENTS = ALL_RAW_EVENTS.map((raw, index) => ({
  id: generateEventId(raw, index),
  title: raw.title,
  start: raw.start,
  end: raw.end,
  memberEmail: raw.memberEmail,
  isAllDay: raw.isAllDay || false,
  isBusy: raw.isBusy || false,
  location: raw.location || undefined,
  organizer: raw.organizerName
    ? { emailAddress: { name: raw.organizerName, address: raw.organizerEmail } }
    : undefined,
  attendees: raw.attendees
    ? raw.attendees.map((a) => ({
        emailAddress: { name: a.name, address: a.email },
        type: a.type || 'required',
        status: { response: a.response || 'none', time: '0001-01-01T00:00:00Z' },
      }))
    : undefined,
}));
