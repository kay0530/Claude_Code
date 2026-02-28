import { useMemo } from 'react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import { DEFAULT_MEMBERS } from '../../data/members';

/**
 * Modal displaying detailed event information.
 * Shows event title, time, location, member info, and Outlook metadata
 * (bodyPreview, organizer, attendees) when available.
 *
 * @param {{ event: object | null, isOpen: boolean, onClose: () => void }}
 */
export default function EventDetailModal({ event, isOpen, onClose }) {
  // Build email -> member lookup
  const memberByEmail = useMemo(() => {
    const map = {};
    DEFAULT_MEMBERS.forEach((m) => {
      map[m.outlookEmail.toLowerCase()] = m;
    });
    return map;
  }, []);

  if (!event) return null;

  // Parse event fields
  const startTime = event.start.substring(11, 16);
  const endTime = event.end.substring(11, 16);
  const startDate = event.start.substring(0, 10);
  const isDispatch = event.title.startsWith('[O&M]');
  const member = memberByEmail[event.memberEmail?.toLowerCase()];
  const memberName = member?.nameJa || event.memberEmail || '-';
  const memberColor = member?.color || '#6B7280';

  // Format date for display (e.g. "2026-02-23" -> "2026/02/23 (日)")
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dateObj = new Date(startDate + 'T00:00:00');
  const formattedDate = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} (${dayNames[dateObj.getDay()]})`;

  // Outlook-specific fields
  const location = event.location?.displayName;
  const bodyPreview = event.bodyPreview;
  const organizer = event.organizer?.emailAddress;
  const attendees = event.attendees;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event.title} size="md">
      <div className="space-y-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDispatch && (
            <Badge color="blue">O&M dispatch</Badge>
          )}
          {event.isAllDay && (
            <Badge color="purple">All Day</Badge>
          )}
          {event.isBusy && (
            <Badge color="gray">Busy</Badge>
          )}
        </div>

        {/* Member info with color accent */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: memberColor }}
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">{memberName}</p>
            {member && (
              <p className="text-xs text-gray-500">{member.outlookEmail}</p>
            )}
          </div>
        </div>

        {/* Date and time */}
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-800">{formattedDate}</p>
            <p className="text-sm text-gray-600">{startTime} - {endTime}</p>
          </div>
        </div>

        {/* Location (if available) */}
        {location && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-700">{location}</p>
          </div>
        )}

        {/* Organizer (Outlook data) */}
        {organizer && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Organizer</p>
              <p className="text-sm text-gray-700">
                {organizer.name || organizer.address}
              </p>
              {organizer.name && organizer.address && (
                <p className="text-xs text-gray-400">{organizer.address}</p>
              )}
            </div>
          </div>
        )}

        {/* Attendees (Outlook data) */}
        {attendees && attendees.length > 0 && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">
                Attendees ({attendees.length})
              </p>
              <div className="space-y-1">
                {attendees.map((att, idx) => {
                  const email = att.emailAddress || att;
                  const name = email.name || email.address || '-';
                  const status = att.status?.response;
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">{name}</span>
                      {status && status !== 'none' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                          status === 'accepted'
                            ? 'bg-green-100 text-green-700'
                            : status === 'declined'
                              ? 'bg-red-100 text-red-700'
                              : status === 'tentativelyAccepted'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                          {status === 'accepted' ? 'Accepted'
                            : status === 'declined' ? 'Declined'
                              : status === 'tentativelyAccepted' ? 'Tentative'
                                : status === 'organizer' ? 'Organizer'
                                  : status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Body preview (Outlook data) */}
        {bodyPreview && (
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-500 mb-1">Details</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {bodyPreview}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
