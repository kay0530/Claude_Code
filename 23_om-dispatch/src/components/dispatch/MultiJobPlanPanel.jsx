import Badge from '../shared/Badge';
import { VEHICLE_LABELS } from '../../utils/constants';

/**
 * Displays multi-job/multi-day dispatch plan results.
 * Shows top 5 plans with day schedules, team assignments, and manpower info.
 * @param {{
 *   plans: Array,
 *   onSelectPlan: (index: number) => void,
 *   selectedPlanIndex: number|null,
 *   members: Array
 * }}
 */
export default function MultiJobPlanPanel({ plans, onSelectPlan, selectedPlanIndex, members }) {
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">
          複数案件の差配結果がありません。条件を変更して再度お試しください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
        複数案件プラン ({plans.length}件)
      </h3>
      {plans.map((plan, index) => (
        <PlanCard
          key={index}
          plan={plan}
          rank={index + 1}
          isSelected={selectedPlanIndex === index}
          onClick={() => onSelectPlan(index)}
          members={members}
        />
      ))}
    </div>
  );
}

/**
 * Individual plan card showing day schedules and assignments.
 */
function PlanCard({ plan, rank, isSelected, onClick, members }) {
  const { planType, totalDays, daySchedules, totalScore } = plan;
  const isMultiDay = planType === 'multi-day';
  const scorePercentage = Math.round((totalScore / 10) * 100);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header: Rank, Score, Day badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              rank === 1
                ? 'bg-yellow-100 text-yellow-700'
                : rank === 2
                  ? 'bg-gray-100 text-gray-600'
                  : rank === 3
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-50 text-gray-500'
            }`}
          >
            {rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-800">
                {totalScore.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">/ 10</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMultiDay ? (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {totalDays}日間のスケジュール
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-green-100 text-green-700 border border-green-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              同日実施
            </span>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            scorePercentage >= 70
              ? 'bg-green-500'
              : scorePercentage >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(scorePercentage, 100)}%` }}
        />
      </div>

      {/* Day schedules */}
      <div className="space-y-3">
        {(daySchedules || []).map((daySchedule, dayIndex) => (
          <DayScheduleBlock
            key={dayIndex}
            daySchedule={daySchedule}
            isMultiDay={isMultiDay}
            members={members}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A single day's schedule block with date header and job assignments.
 */
function DayScheduleBlock({ daySchedule, isMultiDay, members }) {
  const { date, dateLabel, assignments } = daySchedule;

  // Count unique member IDs assigned on this day
  const assignedMemberIds = new Set();
  (assignments || []).forEach(a => {
    (a.teamMemberIds || []).forEach(id => assignedMemberIds.add(id));
  });

  return (
    <div className={`rounded-lg ${isMultiDay ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50'} p-3`}>
      {/* Date header for multi-day plans */}
      {isMultiDay && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-bold text-purple-700">{dateLabel || date}</span>
          </div>
          <span className="text-xs text-purple-500">
            {assignedMemberIds.size}名稼働
          </span>
        </div>
      )}

      {/* Job assignments */}
      <div className="space-y-2">
        {(assignments || []).map((assignment, aIndex) => (
          <AssignmentBlock
            key={aIndex}
            assignment={assignment}
            members={members}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual job assignment within a day schedule.
 * Shows job title, team members, manpower, and vehicle info.
 */
function AssignmentBlock({ assignment, members }) {
  const {
    teamMemberIds,
    teamMembers,
    leadMemberId,
    leadCandidate,
    jobTitle,
    jobTypeName,
    score,
    teamManpower,
    requiredManpower,
    isStretch,
    vehicleArrangement,
    vehicleDetails,
    mentoringPairs,
  } = assignment;

  // Resolve team members from IDs if teamMembers is not provided
  const resolvedTeam = teamMembers || (teamMemberIds || [])
    .map(id => members.find(m => m.id === id))
    .filter(Boolean);

  const resolvedLeadId = leadMemberId || leadCandidate?.id;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      {/* Job title and type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{jobTitle}</span>
          {jobTypeName && (
            <Badge color="blue" size="sm">{jobTypeName}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Manpower badge */}
          {teamManpower != null && requiredManpower != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              teamManpower >= requiredManpower
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-orange-50 text-orange-700 border border-orange-200'
            }`}>
              人工 {teamManpower.toFixed(1)}/{requiredManpower.toFixed(1)}
            </span>
          )}
          {/* Stretch indicator */}
          {isStretch && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700 border border-orange-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              ストレッチ
            </span>
          )}
          {/* Vehicle badge */}
          {vehicleArrangement && vehicleArrangement !== 'invalid' && (
            <Badge color={vehicleArrangement === 'both' ? 'purple' : 'green'} size="sm">
              {VEHICLE_LABELS[vehicleArrangement] || vehicleDetails}
            </Badge>
          )}
        </div>
      </div>

      {/* Team members */}
      <div className="flex flex-wrap gap-1.5">
        {resolvedTeam.map(member => (
          <div
            key={member.id}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              resolvedLeadId === member.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
              style={{ backgroundColor: member.color }}
            >
              {member.nameJa.charAt(0)}
            </div>
            <span>{member.nameJa}</span>
            {resolvedLeadId === member.id && (
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Mentoring pairs */}
      {mentoringPairs && mentoringPairs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
            {mentoringPairs.map((pair, i) => {
              const mentor = members.find(m => m.id === pair.mentorId) || pair.mentor;
              const junior = members.find(m => m.id === pair.juniorId) || pair.junior;
              return (
                <span key={i} className="text-[10px] text-gray-500">
                  {mentor?.nameJa || '?'} → {junior?.nameJa || '?'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Score for this assignment */}
      {score != null && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <span>スコア: {score.toFixed(1)}/10</span>
        </div>
      )}
    </div>
  );
}
