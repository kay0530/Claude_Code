import { useApp } from '../../context/AppContext';
import { STATUS_LABELS } from '../../utils/constants';
import { formatDateTimeJa, toISODate } from '../../utils/dateUtils';

// Helper to get today's date string in YYYY-MM-DD format
function getTodayStr() {
  return toISODate(new Date());
}

// Extract date portion from an ISO datetime string
function extractDate(isoStr) {
  if (!isoStr) return '';
  return isoStr.split('T')[0];
}

// Build recent activity feed from jobs, assignments, and feedbacks
function buildActivityFeed(jobs, assignments, feedbacks, members) {
  const activities = [];

  jobs.forEach(job => {
    activities.push({
      id: `job-${job.id}`,
      type: 'job_created',
      label: `案件「${job.title}」が作成されました`,
      timestamp: job.createdAt,
    });
  });

  assignments.forEach(assignment => {
    const job = jobs.find(j => j.id === assignment.jobId);
    const memberNames = (assignment.memberIds || [])
      .map(mid => {
        const m = members.find(mem => mem.id === mid);
        return m ? m.nameJa : mid;
      })
      .join(', ');
    activities.push({
      id: `assign-${assignment.id}`,
      type: 'dispatch_confirmed',
      label: `${job ? job.title : '案件'}に${memberNames}が配置されました`,
      timestamp: assignment.createdAt,
    });
  });

  feedbacks.forEach(fb => {
    const job = jobs.find(j => j.id === fb.jobId);
    activities.push({
      id: `fb-${fb.id}`,
      type: 'feedback_submitted',
      label: `${job ? job.title : '案件'}のフィードバックが送信されました`,
      timestamp: fb.createdAt,
    });
  });

  // Sort by timestamp descending, take latest 5
  activities.sort((a, b) => {
    const ta = a.timestamp || '';
    const tb = b.timestamp || '';
    return tb.localeCompare(ta);
  });

  return activities.slice(0, 5);
}

// Activity type icon mapping
function ActivityIcon({ type }) {
  if (type === 'job_created') {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
    );
  }
  if (type === 'dispatch_confirmed') {
    return (
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    );
  }
  // feedback_submitted
  return (
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    </div>
  );
}

export default function DashboardView({ onNavigate }) {
  const { state } = useApp();
  const { jobs, assignments, feedbacks, members } = state;
  const todayStr = getTodayStr();

  // --- Section 1: Summary calculations ---

  // Today's jobs: jobs with scheduledStart today, fallback to all active jobs
  const todaysJobs = jobs.filter(j => extractDate(j.scheduledStart) === todayStr);
  const todayJobCount = todaysJobs.length > 0
    ? todaysJobs.length
    : jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;

  // Dispatched teams: assignments with status dispatched or in_progress
  const dispatchedCount = assignments.filter(
    a => a.status === 'dispatched' || a.status === 'in_progress'
  ).length;

  // Member utilization: members assigned today vs total members
  const todayAssignments = assignments.filter(a => {
    const job = jobs.find(j => j.id === a.jobId);
    return job && extractDate(job.scheduledStart) === todayStr;
  });
  const assignedMemberIds = new Set();
  todayAssignments.forEach(a => {
    (a.memberIds || []).forEach(mid => assignedMemberIds.add(mid));
  });
  const utilizationPct = members.length > 0
    ? Math.round((assignedMemberIds.size / members.length) * 100)
    : 0;

  // Completion rate: completed jobs vs total jobs
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const completionPct = jobs.length > 0
    ? Math.round((completedCount / jobs.length) * 100)
    : 0;

  // --- Section 2: Active dispatches ---
  const activeDispatches = assignments
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
    .map(a => {
      const job = jobs.find(j => j.id === a.jobId);
      return { ...a, job };
    })
    .filter(a => a.job)
    .sort((a, b) => {
      const ta = a.job.scheduledStart || '';
      const tb = b.job.scheduledStart || '';
      return ta.localeCompare(tb);
    });

  // --- Section 3: Member availability ---
  // Count active assignments per member
  const memberAssignmentCount = {};
  members.forEach(m => { memberAssignmentCount[m.id] = 0; });
  assignments.forEach(a => {
    if (a.status !== 'completed' && a.status !== 'cancelled') {
      (a.memberIds || []).forEach(mid => {
        memberAssignmentCount[mid] = (memberAssignmentCount[mid] || 0) + 1;
      });
    }
  });

  // --- Section 4: Activity feed ---
  const activityFeed = buildActivityFeed(jobs, assignments, feedbacks, members);

  // Get member initials for avatar
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[1].charAt(0);
    }
    return name.charAt(0);
  }

  // Availability indicator color
  function getAvailabilityColor(count) {
    if (count === 0) return 'bg-green-400'; // available
    if (count >= 2) return 'bg-red-400'; // fully booked
    return 'bg-yellow-400'; // partially booked
  }

  function getAvailabilityLabel(count) {
    if (count === 0) return '空き';
    if (count >= 2) return '満';
    return '一部';
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今日の案件数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{todayJobCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {todaysJobs.length > 0 ? '本日スケジュール分' : 'アクティブ案件'}
          </p>
        </div>

        {/* Dispatched Teams */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">配置済チーム</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{dispatchedCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">差配済 / 実施中</p>
        </div>

        {/* Member Utilization */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">メンバー稼働率</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{utilizationPct}%</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {assignedMemberIds.size}/{members.length} 名稼働中
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">完了率</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{completionPct}%</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {completedCount}/{jobs.length} 件完了
          </p>
        </div>
      </div>

      {/* Section 2 & 3: Active Dispatches + Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Active Dispatches (main area) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">アクティブなディスパッチ</h2>
            <button
              onClick={() => onNavigate('job-create')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規ディスパッチ
            </button>
          </div>

          {activeDispatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">アクティブなディスパッチはありません</p>
              <p className="text-gray-400 text-xs mt-1">新しい案件を作成してチームを配置しましょう</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeDispatches.map(dispatch => {
                const statusInfo = STATUS_LABELS[dispatch.job.status] || STATUS_LABELS.draft;
                const dispatchMembers = (dispatch.memberIds || []).map(mid =>
                  members.find(m => m.id === mid)
                ).filter(Boolean);

                return (
                  <div
                    key={dispatch.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onNavigate('dispatch')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {dispatch.job.title}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        {dispatch.job.scheduledStart && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTimeJa(dispatch.job.scheduledStart)}
                          </p>
                        )}
                      </div>

                      {/* Member avatars */}
                      <div className="flex -space-x-2 ml-3">
                        {dispatchMembers.slice(0, 4).map(member => (
                          <div
                            key={member.id}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white"
                            style={{ backgroundColor: member.color }}
                            title={member.nameJa}
                          >
                            {getInitials(member.nameJa)}
                          </div>
                        ))}
                        {dispatchMembers.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
                            +{dispatchMembers.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Team Overview (sidebar) */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">チーム概要</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {members.map(member => {
              const count = memberAssignmentCount[member.id] || 0;
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 px-5">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: member.color }}
                  >
                    {getInitials(member.nameJa)}
                  </div>

                  {/* Name and count */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.nameJa}</p>
                    <p className="text-xs text-gray-400">
                      {count > 0 ? `${count} 件担当中` : '担当なし'}
                    </p>
                  </div>

                  {/* Availability indicator */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${getAvailabilityColor(count)}`} />
                    <span className="text-xs text-gray-500">{getAvailabilityLabel(count)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 4: Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">最近のアクティビティ</h2>
        </div>

        {activityFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-gray-500 text-sm">アクティビティはまだありません</p>
            <p className="text-gray-400 text-xs mt-1">案件の作成やディスパッチを行うとここに表示されます</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activityFeed.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-4 px-5">
                <ActivityIcon type={activity.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{activity.label}</p>
                  {activity.timestamp && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTimeJa(activity.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
