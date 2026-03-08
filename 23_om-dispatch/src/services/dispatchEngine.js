import {
  getTeamTotalManpower,
  countQualifiedMembers,
  calculateRequiredManpower,
  getMemberManpower,
} from '../utils/skillUtils';
import { generateBusinessDays, formatDayLabel, toISODate } from '../utils/dateUtils';

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
 * Weights: manpower 40%, qualified 20%, vehicle 15%, teamSize 15%, stretch 10%.
 * @param {Array} team - Array of member objects
 * @param {object} job - Job object
 * @param {object} jobType - Job type with baseManpower
 * @param {Array} conditions - Selected conditions
 * @param {object} settings - App settings
 * @returns {object} Scoring result
 */
export function scoreTeam(team, job, jobType, conditions, settings) {
  // Vehicle constraints check
  const vehicleCheck = checkVehicleConstraints(team, settings);
  if (!vehicleCheck.valid) {
    return {
      score: -1,
      breakdown: { manpower: 0, qualified: 0, vehicle: 0, teamSize: 0, stretch: 0 },
      isStretch: false,
      vehicleArrangement: vehicleCheck.vehicleArrangement,
      vehicleDetails: vehicleCheck.details,
      disqualified: true,
      disqualifyReason: vehicleCheck.details,
    };
  }

  const jobTypeId = jobType.id;
  const requiredManpower = calculateRequiredManpower(jobType.baseManpower, conditions);
  const teamManpower = getTeamTotalManpower(team, jobTypeId);
  const qualifiedCount = countQualifiedMembers(team, jobTypeId);

  // Constraint: must have at least one qualified member (manpower >= 1.0)
  if (qualifiedCount === 0) {
    return {
      score: -1,
      breakdown: { manpower: 0, qualified: 0, vehicle: 0, teamSize: 0, stretch: 0 },
      isStretch: false,
      vehicleArrangement: vehicleCheck.vehicleArrangement,
      vehicleDetails: vehicleCheck.details,
      disqualified: true,
      disqualifyReason: '1.0以上の人工値を持つメンバーが不在',
    };
  }

  // Manpower sufficiency score (0-10)
  const manpowerRatio = teamManpower / requiredManpower;
  const manpowerScore = Math.min(manpowerRatio * 10, 10);

  // Qualified count score (0-10)
  const qualifiedScore = Math.min(qualifiedCount * 5, 10);

  // Vehicle efficiency score (0-10)
  let vehicleScore = 8;
  if (vehicleCheck.vehicleArrangement === 'hiace') vehicleScore = 10;
  else if (vehicleCheck.vehicleArrangement === 'both') vehicleScore = 8;
  else if (vehicleCheck.vehicleArrangement === 'multiple_hiace') vehicleScore = 5;

  // Team size efficiency (smaller team meeting requirements = better)
  const minPersonnel = jobType.minPersonnel;
  const teamSizeScore = Math.max(0, 10 - (team.length - minPersonnel) * 2);

  // Stretch determination
  const isStretch = teamManpower < requiredManpower;
  const stretchPenalty = isStretch ? Math.max(0, (1 - manpowerRatio) * 10) : 0;
  const stretchScore = 10 - stretchPenalty;

  // Weighted total
  const totalScore =
    manpowerScore * 0.40 +
    qualifiedScore * 0.20 +
    vehicleScore * 0.15 +
    teamSizeScore * 0.15 +
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
      qualified: Math.round(qualifiedScore * 100) / 100,
      vehicle: vehicleScore,
      teamSize: teamSizeScore,
      stretch: Math.round(stretchScore * 100) / 100,
    },
    isStretch,
    stretchRatio: manpowerRatio,
    teamManpower,
    requiredManpower,
    vehicleArrangement: vehicleCheck.vehicleArrangement,
    vehicleDetails: vehicleCheck.details,
    leadCandidate,
    mentoringPairs,
  };
}

/**
 * Filter members by availability based on calendar events.
 * @param {Array} members - All members
 * @param {object} job - Job with preferredDate
 * @param {Array} calendarEvents - Calendar events
 * @returns {Array} Available members
 */
function filterAvailableMembers(members, job, calendarEvents) {
  if (!calendarEvents || calendarEvents.length === 0) {
    return members;
  }

  const jobDate = job.preferredDate;
  if (!jobDate) return members;

  return members.filter(member => {
    const memberEvents = calendarEvents.filter(event => {
      if (event.memberEmail?.toLowerCase() !== member.outlookEmail?.toLowerCase()) return false;
      if (!event.isBusy) return false;
      const eventDate = event.start?.substring(0, 10);
      return eventDate === jobDate;
    });
    return memberEvents.length === 0;
  });
}

/**
 * Main entry: generate all combos, score each, sort desc, return top 5.
 * @param {Array} members - All available members
 * @param {object} job - Job to dispatch for
 * @param {object} jobType - Job type configuration
 * @param {Array} conditions - Selected conditions for this job
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events for availability checking
 * @returns {Array} Top 5 ranked team recommendations
 */
export function rankTeams(members, job, jobType, conditions, settings, calendarEvents = []) {
  const { minPersonnel, maxPersonnel } = jobType;

  const availableMembers = filterAvailableMembers(members, job, calendarEvents);
  const combinations = generateTeamCombinations(availableMembers, minPersonnel, maxPersonnel);

  const scoredTeams = combinations
    .map(team => {
      const result = scoreTeam(team, job, jobType, conditions, settings);
      return { team, ...result };
    })
    .filter(t => !t.disqualified && t.score > 0);

  scoredTeams.sort((a, b) => b.score - a.score);
  return scoredTeams.slice(0, 5).map((t, i) => ({ ...t, rank: i + 1 }));
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
    const ranked = rankTeams(members, job, jobType, conditions, settings, calendarEvents);
    return ranked.map(r => ({
      planType: 'single-job',
      totalScore: r.score,
      assignments: [{ ...r, job, jobType }],
    }));
  }

  const plans = [];
  const usedMemberIds = new Set();

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
    const filtered = filterAvailableMembers(availableMembers, job, calendarEvents);
    const combinations = generateTeamCombinations(filtered, jobType.minPersonnel, jobType.maxPersonnel);

    for (const team of combinations) {
      const result = scoreTeam(team, job, jobType, conditions, settings);
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
  return plans.slice(0, 5);
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
    return singleDayPlans.map(plan => ({
      ...plan,
      planType: 'single-day',
      totalDays: 1,
      daySchedules: [{
        date: getEarliestPreferredDate(jobsWithTypes),
        dateLabel: formatDayLabel(getEarliestPreferredDate(jobsWithTypes)),
        jobAssignments: plan.assignments,
      }],
    }));
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
  return evaluatedPlans.slice(0, 5);
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
