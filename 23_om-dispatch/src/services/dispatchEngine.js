import {
  getTeamTotalManpower,
  countQualifiedMembers,
  calculateRequiredManpower,
  getMemberManpower,
} from '../utils/skillUtils';
import { generateBusinessDays, formatDayLabel, toISODate, timeStringToMinutes } from '../utils/dateUtils';
import { findAvailableSlots } from './calendarService';

/**
 * Generate all combinations of members with size between min and max.
 * @param {Array} members - Available team members
 * @param {number} minPersonnel - Minimum team size
 * @param {number} maxPersonnel - Maximum team size
 * @returns {Array<Array>} Array of member combination arrays
 */
export function generateTeamCombinations(members, minPersonnel, maxPersonnel) {
  const results = [];

  function combine(start, current) {
    if (current.length >= minPersonnel && current.length <= maxPersonnel) {
      results.push([...current]);
    }
    if (current.length >= maxPersonnel) return;

    for (let i = start; i < members.length; i++) {
      current.push(members[i]);
      combine(i + 1, current);
      current.pop();
    }
  }

  combine(0, []);
  return results;
}

/**
 * Check vehicle constraints for a team.
 * @param {Array} team - Array of member objects
 * @param {object} settings - App settings containing hiaceCapacity
 * @returns {{ valid: boolean, vehicleArrangement: string, details: string }}
 */
export function checkVehicleConstraints(team, settings) {
  const hiaceCapacity = settings.hiaceCapacity || 4;
  const yodogawa = team.find(m => m.id === 'yodogawa_t');
  const otherMembers = team.filter(m => m.id !== 'yodogawa_t');

  if (yodogawa) {
    if (otherMembers.length === 0) {
      return { valid: true, vehicleArrangement: 'yodogawa_vehicle', details: '淀川車両（単独）' };
    }
    if (otherMembers.length <= hiaceCapacity) {
      return { valid: true, vehicleArrangement: 'both', details: `ハイエース（${otherMembers.length}名） + 淀川車両（単独）` };
    }
    return { valid: false, vehicleArrangement: 'invalid', details: `ハイエース定員超過: ${otherMembers.length}名（最大${hiaceCapacity}名）` };
  }

  if (team.length <= hiaceCapacity) {
    return { valid: true, vehicleArrangement: 'hiace', details: `ハイエース（${team.length}名）` };
  }
  if (team.length <= hiaceCapacity * 2) {
    return { valid: true, vehicleArrangement: 'multiple_hiace', details: `ハイエース2台（${team.length}名）` };
  }
  return { valid: false, vehicleArrangement: 'invalid', details: `車両配置不可: ${team.length}名` };
}

/**
 * Identify mentoring pairs within a team.
 * @param {Array} team - Array of member objects
 * @param {string} jobTypeId - Job type ID for manpower comparison
 * @returns {Array<{ junior: object, mentor: object }>}
 */
export function identifyMentoringPairs(team, jobTypeId) {
  const juniors = team.filter(m => m.needsGuidance);
  if (juniors.length === 0) return [];

  const seniors = team
    .filter(m => !m.needsGuidance && getMemberManpower(m, jobTypeId) >= 1.0)
    .sort((a, b) => getMemberManpower(b, jobTypeId) - getMemberManpower(a, jobTypeId));

  return juniors.map(junior => ({
    junior,
    mentor: seniors[0] || null,
  }));
}

/**
 * Score a team for a given job using manpower-based system.
 * Weights: manpower 30%, teamSize 15%, qualified 15%, calendarFit 15%, vehicle 15%, stretch 10%.
 * @param {Array} team - Array of member objects
 * @param {object} job - Job object
 * @param {object} jobType - Job type with baseManpower
 * @param {Array} conditions - Selected conditions
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events for availability checking
 * @param {string|null} jobDate - Job date (YYYY-MM-DD) for calendar fit scoring
 * @returns {object} Scoring result
 */
export function scoreTeam(team, job, jobType, conditions, settings, calendarEvents = [], jobDate = null) {
  // Vehicle constraints check
  const vehicleCheck = checkVehicleConstraints(team, settings);
  if (!vehicleCheck.valid) {
    return {
      score: -1,
      breakdown: { manpower: 0, teamSize: 0, qualified: 0, calendarFit: 0, vehicle: 0, stretch: 0 },
      isStretch: false,
      vehicleArrangement: vehicleCheck.vehicleArrangement,
      vehicleDetails: vehicleCheck.details,
      disqualified: true,
      disqualifyReason: vehicleCheck.details,
    };
  }

  const jobTypeId = jobType.id;
  const baseRequiredManpower = calculateRequiredManpower(jobType.baseManpower, conditions);
  // Stretch mode: reduce required manpower by dividing by stretchMultiplier
  const stretchMode = settings.stretchMode || {};
  const stretchEnabled = stretchMode.enabled ?? false;
  const stretchMultiplier = stretchMode.defaultMultiplier || 1.2;
  const requiredManpower = stretchEnabled
    ? baseRequiredManpower / stretchMultiplier
    : baseRequiredManpower;
  const teamManpower = getTeamTotalManpower(team, jobTypeId);
  const qualifiedCount = countQualifiedMembers(team, jobTypeId);

  // Constraint: must have at least one qualified member (manpower >= 1.0)
  if (qualifiedCount === 0) {
    return {
      score: -1,
      breakdown: { manpower: 0, teamSize: 0, qualified: 0, calendarFit: 0, vehicle: 0, stretch: 0 },
      isStretch: false,
      vehicleArrangement: vehicleCheck.vehicleArrangement,
      vehicleDetails: vehicleCheck.details,
      disqualified: true,
      disqualifyReason: '1.0以上の人工値を持つメンバーが不在',
    };
  }

  // Manpower sufficiency score (0-10)
  // Optimal range: 1.0-1.15 ratio (full score). Over-staffing penalized beyond 1.15.
  const manpowerRatio = teamManpower / requiredManpower;
  let manpowerScore;
  if (manpowerRatio < 1.0) {
    manpowerScore = manpowerRatio * 10; // Under-staffed: linear ramp
  } else if (manpowerRatio <= 1.15) {
    manpowerScore = 10; // Sweet spot: full score
  } else {
    // Over-staffing penalty: lose 3 points per 0.1 ratio above 1.15
    manpowerScore = Math.max(4, 10 - (manpowerRatio - 1.15) * 30);
  }

  // Qualified count score (0-10)
  const qualifiedScore = Math.min(qualifiedCount * 5, 10);

  // Team size efficiency score (0-10)
  // Prefer smaller teams: minPersonnel gets 10, each extra member loses points.
  const { minPersonnel } = jobType;
  const teamSizeScore = Math.max(4, 10 - (team.length - minPersonnel) * 3);

  // Vehicle efficiency score (0-10)
  // "both" (hiace + Yodogawa vehicle) is equally efficient as single hiace.
  let vehicleScore = 8;
  if (vehicleCheck.vehicleArrangement === 'hiace') vehicleScore = 10;
  else if (vehicleCheck.vehicleArrangement === 'both') vehicleScore = 10;
  else if (vehicleCheck.vehicleArrangement === 'yodogawa_vehicle') vehicleScore = 10;
  else if (vehicleCheck.vehicleArrangement === 'multiple_hiace') vehicleScore = 5;

  // Calendar fit score (0-10): based on availability type of team members.
  // 'full' availability = 10 points per member, 'partial' = 6 points per member.
  let calendarFitScore = 10; // Default: assume fully available
  if (team.length > 0) {
    const totalPoints = team.reduce((sum, member) => {
      if (member.availabilityType === 'partial') return sum + 6;
      return sum + 10; // 'full' or unset (backward compatibility)
    }, 0);
    calendarFitScore = totalPoints / team.length;
  }

  // Stretch determination
  const isStretch = teamManpower < requiredManpower;
  const stretchPenalty = isStretch ? Math.max(0, (1 - manpowerRatio) * 10) : 0;
  const stretchScore = 10 - stretchPenalty;

  // Weighted total: manpower 30%, teamSize 15%, qualified 15%, calendarFit 15%, vehicle 15%, stretch 10%
  const totalScore =
    manpowerScore * 0.30 +
    teamSizeScore * 0.15 +
    qualifiedScore * 0.15 +
    calendarFitScore * 0.15 +
    vehicleScore * 0.15 +
    stretchScore * 0.10;

  // Lead candidate: highest manpower for this job type
  const leadCandidate = [...team].sort(
    (a, b) => getMemberManpower(b, jobTypeId) - getMemberManpower(a, jobTypeId)
  )[0];

  const mentoringPairs = identifyMentoringPairs(team, jobTypeId);

  return {
    score: Math.round(totalScore * 100) / 100,
    breakdown: {
      manpower: Math.round(manpowerScore * 100) / 100,
      teamSize: Math.round(teamSizeScore * 100) / 100,
      qualified: Math.round(qualifiedScore * 100) / 100,
      calendarFit: Math.round(calendarFitScore * 100) / 100,
      vehicle: vehicleScore,
      stretch: Math.round(stretchScore * 100) / 100,
    },
    isStretch,
    stretchRatio: manpowerRatio,
    teamManpower,
    requiredManpower: baseRequiredManpower,
    effectiveRequiredManpower: requiredManpower,
    vehicleArrangement: vehicleCheck.vehicleArrangement,
    vehicleDetails: vehicleCheck.details,
    leadCandidate,
    mentoringPairs,
  };
}

/**
 * Default working hours for availability calculation.
 */
const DEFAULT_WORKING_HOURS = { start: '08:00', end: '18:00' };

/**
 * Filter members by time-slot availability based on calendar events.
 * Instead of binary exclusion, checks if the member has enough contiguous
 * free time to handle the job (based on jobType.baseTimeHours).
 *
 * Returns three categories:
 * - available: members with enough free time (full day or partial day)
 * - excluded: members with no sufficient free time (all-day busy or insufficient gaps)
 *
 * Each available member gets an `availableSlots` array and `availabilityType`
 * ('full' or 'partial') attached for downstream scoring and display.
 *
 * @param {Array} members - All members
 * @param {object} job - Job with preferredDate
 * @param {Array} calendarEvents - Calendar events
 * @param {number} requiredHours - Required hours for the job (jobType.baseTimeHours)
 * @param {object} workingHours - Working hours config { start, end }
 * @returns {{ available: Array, excluded: Array<{ member: object, conflictEvents: Array, reason: string }> }}
 */
function filterAvailableMembers(members, job, calendarEvents, requiredHours = 4, workingHours = DEFAULT_WORKING_HOURS) {
  if (!calendarEvents || calendarEvents.length === 0) {
    return {
      available: members.map(m => ({ ...m, availabilityType: 'full', availableSlots: [] })),
      excluded: [],
    };
  }

  const jobDate = job.preferredDate;
  if (!jobDate) {
    return {
      available: members.map(m => ({ ...m, availabilityType: 'full', availableSlots: [] })),
      excluded: [],
    };
  }

  const available = [];
  const excluded = [];
  const requiredMinutes = requiredHours * 60;

  for (const member of members) {
    // Find all busy events for this member on this date
    const conflicts = calendarEvents.filter(event => {
      if (event.memberEmail?.toLowerCase() !== member.outlookEmail?.toLowerCase()) return false;
      if (!event.isBusy) return false;
      const eventDate = event.start?.substring(0, 10);
      return eventDate === jobDate;
    });

    // No conflicts → fully available
    if (conflicts.length === 0) {
      available.push({ ...member, availabilityType: 'full', availableSlots: [] });
      continue;
    }

    // Check for all-day events → fully excluded
    const hasAllDayEvent = conflicts.some(e => e.isAllDay);
    if (hasAllDayEvent) {
      excluded.push({ member, conflictEvents: conflicts, reason: '終日予定あり' });
      continue;
    }

    // Compute free time slots using calendarService
    const freeSlots = findAvailableSlots(
      member.outlookEmail,
      calendarEvents,
      jobDate,
      workingHours
    );

    // Check if any free slot is long enough for the job
    const bestSlot = freeSlots.reduce(
      (best, slot) => (slot.durationMinutes > best.durationMinutes ? slot : best),
      { durationMinutes: 0 }
    );

    if (bestSlot.durationMinutes >= requiredMinutes) {
      // Partially available — has enough free time in at least one slot
      available.push({
        ...member,
        availabilityType: 'partial',
        availableSlots: freeSlots.filter(s => s.durationMinutes >= requiredMinutes),
      });
    } else {
      // Not enough contiguous free time
      const totalFreeMinutes = freeSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
      excluded.push({
        member,
        conflictEvents: conflicts,
        reason: totalFreeMinutes > 0
          ? `空き時間不足（最大${bestSlot.durationMinutes}分、必要${requiredMinutes}分）`
          : '空き時間なし',
      });
    }
  }

  return { available, excluded };
}

/**
 * Try to rank teams for a specific date.
 * @returns {{ teams: Array, excluded: Array }} or empty teams if no valid combos
 */
function rankTeamsForDate(members, job, jobType, conditions, settings, calendarEvents, targetDate) {
  const { minPersonnel, maxPersonnel } = jobType;
  const jobWithDate = { ...job, preferredDate: targetDate };

  const workingHours = settings.workingHours
    ? { start: settings.workingHours.extendedStart || settings.workingHours.start || '08:00', end: settings.workingHours.end || '18:00' }
    : DEFAULT_WORKING_HOURS;

  const { available, excluded } = filterAvailableMembers(
    members, jobWithDate, calendarEvents, jobType.baseTimeHours || 4, workingHours
  );
  const combinations = generateTeamCombinations(available, minPersonnel, maxPersonnel);

  const scoredTeams = combinations
    .map(team => {
      const result = scoreTeam(team, job, jobType, conditions, settings, calendarEvents, targetDate);
      return { team, ...result };
    })
    .filter(t => !t.disqualified && t.score > 0);

  scoredTeams.sort((a, b) => b.score - a.score);
  return { teams: scoredTeams, excluded };
}

/**
 * Main entry: generate all combos, score each, sort desc, return top 5.
 * If no valid teams found on the preferred date, searches nearby business days
 * (both before and after) within a 10 business-day window.
 * @param {Array} members - All available members
 * @param {object} job - Job to dispatch for
 * @param {object} jobType - Job type configuration
 * @param {Array} conditions - Selected conditions for this job
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events for availability checking
 * @returns {Array} Top 5 ranked team recommendations
 */
export function rankTeams(members, job, jobType, conditions, settings, calendarEvents = []) {
  const preferredDate = job.preferredDate || null;

  // Try preferred date first
  const primary = rankTeamsForDate(members, job, jobType, conditions, settings, calendarEvents, preferredDate);
  if (primary.teams.length > 0) {
    const result = primary.teams.slice(0, 5).map((t, i) => ({ ...t, rank: i + 1 }));
    result._meta = {
      excludedMembers: primary.excluded.map(e => ({ ...e.member, excludeReason: e.reason })),
      alternativeDate: null,
    };
    return result;
  }

  // No valid teams on preferred date — search nearby business days (before and after)
  if (!preferredDate) {
    const result = [];
    result._meta = {
      excludedMembers: primary.excluded.map(e => ({ ...e.member, excludeReason: e.reason })),
      alternativeDate: null,
    };
    return result;
  }

  // Generate candidate dates with job-type-specific search ranges.
  // パワまる工事: ±3 business days (procurement lead time constraint)
  // All other types: before 3 / after 20 business days (flexible scheduling)
  const isConstructionType = jobType.id === 'jt_pawamaru_construction';
  const searchBefore = 3;
  const searchAfter = isConstructionType ? 3 : 20;

  const candidateDates = [];
  const baseDate = new Date(preferredDate);

  // Search backward (up to searchBefore business days)
  const beforeDate = new Date(baseDate);
  beforeDate.setDate(beforeDate.getDate() - 1);
  const beforeDates = [];
  while (beforeDates.length < searchBefore) {
    const day = beforeDate.getDay();
    if (day !== 0 && day !== 6) {
      beforeDates.push(toISODate(beforeDate));
    }
    beforeDate.setDate(beforeDate.getDate() - 1);
  }

  // Search forward (up to searchAfter business days)
  const afterDates = generateBusinessDays(
    new Date(baseDate.getTime() + 86400000), // day after preferred
    searchAfter
  );

  // Interleave: nearest dates first (1 day after, 1 day before, 2 days after, 2 days before, ...)
  let ai = 0, bi = 0;
  while (ai < afterDates.length || bi < beforeDates.length) {
    if (ai < afterDates.length) candidateDates.push(afterDates[ai++]);
    if (bi < beforeDates.length) candidateDates.push(beforeDates[bi++]);
  }

  for (const altDate of candidateDates) {
    const alt = rankTeamsForDate(members, job, jobType, conditions, settings, calendarEvents, altDate);
    if (alt.teams.length > 0) {
      const result = alt.teams.slice(0, 5).map((t, i) => ({
        ...t,
        rank: i + 1,
        alternativeDate: altDate,
      }));
      result._meta = {
        excludedMembers: primary.excluded.map(e => ({ ...e.member, excludeReason: e.reason })),
        alternativeDate: altDate,
      };
      return result;
    }
  }

  // No teams found on any date
  const result = [];
  result._meta = {
    excludedMembers: primary.excluded.map(e => ({ ...e.member, excludeReason: e.reason })),
    alternativeDate: null,
  };
  return result;
}

/**
 * Rank multi-job plans: assign multiple jobs simultaneously (no member overlap).
 * Uses backtracking to generate all valid assignment patterns.
 * @param {Array} members - All members
 * @param {Array} jobsWithTypes - Array of { job, jobType, conditions }
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events
 * @returns {Array} Top 5 multi-job plans
 */
export function rankMultiJobPlans(members, jobsWithTypes, settings, calendarEvents = []) {
  if (jobsWithTypes.length === 0) return [];
  if (jobsWithTypes.length === 1) {
    const { job, jobType, conditions } = jobsWithTypes[0];
    // Use rankTeamsForDate (no alternative date search) so multi-day flow
    // correctly treats "no teams on this date" as infeasible for this date.
    // rankTeams (with alternative search) is only used for single-job dispatch.
    const targetDate = job.preferredDate || null;
    const { teams, excluded } = rankTeamsForDate(members, job, jobType, conditions, settings, calendarEvents, targetDate);
    if (teams.length === 0) {
      const result = [];
      result._meta = { excludedMembers: excluded.map(e => ({ ...e.member, excludeReason: e.reason })) };
      return result;
    }
    const result = teams.slice(0, 5).map((r, i) => ({
      planType: 'single-job',
      totalScore: r.score,
      assignments: [{ ...r, rank: i + 1, job, jobType }],
    }));
    result._meta = { excludedMembers: excluded.map(e => ({ ...e.member, excludeReason: e.reason })) };
    return result;
  }

  const plans = [];
  const usedMemberIds = new Set();
  const allExcludedIds = new Set();

  function backtrack(jobIndex, currentAssignments) {
    if (jobIndex >= jobsWithTypes.length) {
      const totalScore = currentAssignments.reduce((sum, a) => sum + a.score, 0) / currentAssignments.length;
      plans.push({
        planType: 'multi-job',
        totalScore: Math.round(totalScore * 100) / 100,
        assignments: [...currentAssignments],
      });
      return;
    }

    if (plans.length >= 200) return; // Limit patterns

    const { job, jobType, conditions } = jobsWithTypes[jobIndex];
    const availableMembers = members.filter(m => !usedMemberIds.has(m.id));
    const workingHours = settings.workingHours
      ? { start: settings.workingHours.extendedStart || settings.workingHours.start || '08:00', end: settings.workingHours.end || '18:00' }
      : DEFAULT_WORKING_HOURS;
    const { available: filtered, excluded: jobExcluded } = filterAvailableMembers(
      availableMembers, job, calendarEvents, jobType.baseTimeHours || 4, workingHours
    );
    jobExcluded.forEach(e => allExcludedIds.add(e.member.id));
    const combinations = generateTeamCombinations(filtered, jobType.minPersonnel, jobType.maxPersonnel);

    const jobDate = job.preferredDate || null;
    for (const team of combinations) {
      const result = scoreTeam(team, job, jobType, conditions, settings, calendarEvents, jobDate);
      if (result.disqualified || result.score <= 0) continue;

      team.forEach(m => usedMemberIds.add(m.id));
      currentAssignments.push({ ...result, team, job, jobType });
      backtrack(jobIndex + 1, currentAssignments);
      currentAssignments.pop();
      team.forEach(m => usedMemberIds.delete(m.id));
    }
  }

  backtrack(0, []);
  plans.sort((a, b) => b.totalScore - a.totalScore);

  const allExcludedMembers = [...allExcludedIds].map(id => members.find(m => m.id === id)).filter(Boolean);
  const result = plans.slice(0, 5);
  result._meta = { excludedMembers: allExcludedMembers };
  return result;
}

/**
 * Multi-day dispatch: distribute jobs across multiple business days
 * when they can't all fit on the same day.
 * @param {Array} members - All members
 * @param {Array} jobsWithTypes - Array of { job, jobType, conditions }
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events
 * @returns {Array} Top 5 multi-day plans
 */
export function rankMultiDayPlans(members, jobsWithTypes, settings, calendarEvents = []) {
  // Try single-day first
  const singleDayPlans = rankMultiJobPlans(members, jobsWithTypes, settings, calendarEvents);
  if (singleDayPlans.length > 0) {
    const result = singleDayPlans.map(plan => ({
      ...plan,
      planType: 'single-day',
      totalDays: 1,
      daySchedules: [{
        date: getEarliestPreferredDate(jobsWithTypes),
        dateLabel: formatDayLabel(getEarliestPreferredDate(jobsWithTypes)),
        jobAssignments: plan.assignments,
      }],
    }));
    result._meta = singleDayPlans._meta || { excludedMembers: [] };
    return result;
  }

  // Multi-day mode
  const earliestDate = getEarliestPreferredDate(jobsWithTypes);
  const businessDays = generateBusinessDays(earliestDate, 10);
  const totalTeamManpower = members.reduce((sum, m) => {
    const avgManpower = Object.values(m.manpowerByJobType || {}).reduce((s, v) => s + v, 0) /
      Math.max(Object.keys(m.manpowerByJobType || {}).length, 1);
    return sum + avgManpower;
  }, 0);

  const dayAssignmentPatterns = [];
  generateDayAssignments(jobsWithTypes, businessDays, 0, [], totalTeamManpower, dayAssignmentPatterns);

  const evaluatedPlans = [];
  for (const pattern of dayAssignmentPatterns) {
    const result = evaluateDayAssignment(pattern, members, jobsWithTypes, settings, calendarEvents);
    if (result) evaluatedPlans.push(result);
  }

  evaluatedPlans.sort((a, b) => b.totalScore - a.totalScore);

  // Collect excluded members across all evaluated days
  const allExcluded = new Set();
  for (const jwt of jobsWithTypes) {
    const workingHours = settings.workingHours
      ? { start: settings.workingHours.extendedStart || settings.workingHours.start || '08:00', end: settings.workingHours.end || '18:00' }
      : DEFAULT_WORKING_HOURS;
    const { excluded } = filterAvailableMembers(
      members, jwt.job, calendarEvents, jwt.jobType.baseTimeHours || 4, workingHours
    );
    excluded.forEach(e => allExcluded.add(e.member.id));
  }
  const excludedMembers = [...allExcluded].map(id => members.find(m => m.id === id)).filter(Boolean);

  const result = evaluatedPlans.slice(0, 5);
  result._meta = { excludedMembers };
  return result;
}

/**
 * Get the earliest preferred date from jobs.
 */
function getEarliestPreferredDate(jobsWithTypes) {
  const dates = jobsWithTypes
    .map(j => j.job.preferredDate)
    .filter(Boolean)
    .sort();
  return dates[0] || toISODate(new Date());
}

/**
 * Generate day assignment patterns via backtracking.
 */
function generateDayAssignments(jobsWithTypes, businessDays, jobIndex, currentPattern, maxDayManpower, results) {
  if (results.length >= 200) return;

  if (jobIndex >= jobsWithTypes.length) {
    results.push([...currentPattern]);
    return;
  }

  const { job } = jobsWithTypes[jobIndex];
  const preferredDate = job.preferredDate || businessDays[0];

  for (const day of businessDays) {
    if (day < preferredDate) continue;

    // Check manpower limit for this day
    const dayJobs = currentPattern.filter(p => p.date === day);
    const dayManpowerEstimate = dayJobs.reduce((sum, p) => {
      const jt = jobsWithTypes.find(j => j.job.id === p.jobId);
      return sum + (jt?.jobType.baseManpower || 2);
    }, 0) + jobsWithTypes[jobIndex].jobType.baseManpower;

    if (dayManpowerEstimate > maxDayManpower * 1.1) continue;

    currentPattern.push({ jobId: job.id, date: day, jobIndex });
    generateDayAssignments(jobsWithTypes, businessDays, jobIndex + 1, currentPattern, maxDayManpower, results);
    currentPattern.pop();
  }
}

/**
 * Evaluate a day assignment pattern by running rankMultiJobPlans per day.
 * @param {Array} pattern - Array of { jobId, date, jobIndex }
 * @param {Array} members - All members
 * @param {Array} jobsWithTypes - Array of { job, jobType, conditions }
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events
 * @returns {object|null} Multi-day plan or null if infeasible
 */
function evaluateDayAssignment(pattern, members, jobsWithTypes, settings, calendarEvents) {
  const dayGroups = {};
  for (const item of pattern) {
    if (!dayGroups[item.date]) dayGroups[item.date] = [];
    dayGroups[item.date].push(item);
  }

  const daySchedules = [];
  let totalScore = 0;
  let totalDays = 0;

  for (const [date, items] of Object.entries(dayGroups).sort(([a], [b]) => a.localeCompare(b))) {
    totalDays++;

    // Map items to proper jobsWithTypes and override preferredDate with assigned date
    const dayJobsWithTypes = items.map(item => ({
      ...jobsWithTypes[item.jobIndex],
      job: { ...jobsWithTypes[item.jobIndex].job, preferredDate: date },
    }));

    // Run team composition for this day's jobs
    const dayPlans = rankMultiJobPlans(members, dayJobsWithTypes, settings, calendarEvents);
    if (dayPlans.length === 0) return null;

    const bestPlan = dayPlans[0];
    totalScore += bestPlan.totalScore;

    daySchedules.push({
      date,
      dateLabel: formatDayLabel(date),
      jobAssignments: bestPlan.assignments,
    });
  }

  const avgScore = totalScore / totalDays;
  const dayCountPenalty = (totalDays - 1) * 0.5;
  const dateProximityBonus = pattern.reduce((sum, item) => {
    const originalDate = jobsWithTypes[item.jobIndex]?.job?.preferredDate;
    return sum + (originalDate === item.date ? 0.3 : 0);
  }, 0) / pattern.length;

  return {
    planType: 'multi-day',
    totalScore: Math.round((avgScore - dayCountPenalty + dateProximityBonus) * 100) / 100,
    totalDays,
    daySchedules,
  };
}

/**
 * Haversine distance calculation (km).
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
