import { SKILL_CATEGORIES } from '../data/skillCategories';

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
 * Calculate weighted skill total for a team on given primary skills.
 * Primary skills get weight 1.0, secondary skills get weight 0.3.
 * @param {Array} team - Array of member objects
 * @param {Array<string>} primarySkills - Array of skill keys that are primary for this job
 * @returns {number} Weighted skill total
 */
export function calculateTeamSkillScore(team, primarySkills) {
  let total = 0;
  const primaryWeight = 1.0;
  const secondaryWeight = 0.3;

  for (const member of team) {
    for (const cat of SKILL_CATEGORIES) {
      const skillValue = member.skills[cat.key] || 0;
      if (primarySkills.includes(cat.key)) {
        total += skillValue * primaryWeight;
      } else {
        total += skillValue * secondaryWeight;
      }
    }
  }

  return total;
}

/**
 * Check vehicle constraints for a team.
 * HiAce capacity is max 4 in one vehicle.
 * Yodogawa (id: 'yodogawa_t') always drives alone (hasVehicle: true, freelancer).
 * @param {Array} team - Array of member objects
 * @param {object} settings - App settings containing hiaceCapacity
 * @returns {{ valid: boolean, vehicleArrangement: string, details: string }}
 */
export function checkVehicleConstraints(team, settings) {
  const hiaceCapacity = settings.hiaceCapacity || 4;
  const yodogawa = team.find(m => m.id === 'yodogawa_t');
  const otherMembers = team.filter(m => m.id !== 'yodogawa_t');

  // If Yodogawa is in the team, he drives alone
  if (yodogawa) {
    if (otherMembers.length === 0) {
      return {
        valid: true,
        vehicleArrangement: 'yodogawa_vehicle',
        details: '淀川車両（単独）',
      };
    }
    if (otherMembers.length <= hiaceCapacity) {
      return {
        valid: true,
        vehicleArrangement: 'both',
        details: `ハイエース（${otherMembers.length}名） + 淀川車両（単独）`,
      };
    }
    // Others exceed HiAce capacity
    return {
      valid: false,
      vehicleArrangement: 'invalid',
      details: `ハイエース定員超過: ${otherMembers.length}名（最大${hiaceCapacity}名）`,
    };
  }

  // No Yodogawa - all in HiAce(s)
  if (team.length <= hiaceCapacity) {
    return {
      valid: true,
      vehicleArrangement: 'hiace',
      details: `ハイエース（${team.length}名）`,
    };
  }

  if (team.length <= hiaceCapacity * 2) {
    return {
      valid: true,
      vehicleArrangement: 'multiple_hiace',
      details: `ハイエース2台（${team.length}名）`,
    };
  }

  return {
    valid: false,
    vehicleArrangement: 'invalid',
    details: `車両配置不可: ${team.length}名`,
  };
}

/**
 * Evaluate leadership suitability of a team.
 * Score based on max leadership skill in the team, normalized 0-10.
 * @param {Array} team - Array of member objects
 * @returns {number} Leadership score 0-10
 */
export function evaluateLeaderSuitability(team) {
  if (team.length === 0) return 0;
  const maxLeadership = Math.max(...team.map(m => m.skills.leadership || 0));
  // Normalize: leadership skill is already 0-10 scale
  return Math.min(maxLeadership, 10);
}

/**
 * Evaluate guidance capability of a team.
 * If team has needsGuidance member (Wano), ensure at least one member with avgSkill >= 4.5.
 * @param {Array} team - Array of member objects
 * @returns {number} Guidance score: 0 if guidance needed but no guide, bonus score otherwise
 */
export function evaluateGuidanceCapability(team) {
  const needsGuidanceMembers = team.filter(m => m.needsGuidance);

  // No one needs guidance - neutral score
  if (needsGuidanceMembers.length === 0) return 5;

  const guides = team.filter(m => !m.needsGuidance && m.avgSkill >= 4.5);

  if (guides.length === 0) {
    // Needs guidance but no one qualified to guide
    return 0;
  }

  // Has a guide - bonus for mentoring opportunity
  const bestGuideSkill = Math.max(...guides.map(m => m.avgSkill));
  return Math.min(5 + bestGuideSkill, 10);
}

/**
 * Calculate stretch score when team skill is below required but within stretch range.
 * @param {number} teamSkillTotal - Team's actual weighted skill total
 * @param {number} requiredSkillTotal - Required skill total for the job type
 * @param {number} stretchMultiplier - How much to stretch (e.g. 1.2 = 20% below is OK)
 * @returns {{ isStretch: boolean, stretchRatio: number, penalty: number }}
 */
export function calculateStretchScore(teamSkillTotal, requiredSkillTotal, stretchMultiplier) {
  if (teamSkillTotal >= requiredSkillTotal) {
    return { isStretch: false, stretchRatio: 1.0, penalty: 0 };
  }

  const minAcceptable = requiredSkillTotal / stretchMultiplier;

  if (teamSkillTotal >= minAcceptable) {
    const stretchRatio = teamSkillTotal / requiredSkillTotal;
    // Penalty scales from 0 (at required) to 1 (at minimum acceptable)
    const penalty = (1 - stretchRatio) * 10;
    return { isStretch: true, stretchRatio, penalty };
  }

  // Below stretch threshold - not viable
  return { isStretch: true, stretchRatio: teamSkillTotal / requiredSkillTotal, penalty: 10 };
}

/**
 * Score a team for a given job.
 * Weights: skill 35%, availability 25%, travel 15%, leadership 10%, guidance 15%.
 * @param {Array} team - Array of member objects
 * @param {object} job - Job object with location, time info
 * @param {object} jobType - Job type with required skills, personnel
 * @param {object} settings - App settings
 * @returns {{ score: number, breakdown: object, isStretch: boolean, vehicleArrangement: string }}
 */
export function scoreTeam(team, job, jobType, settings) {
  // Vehicle constraints check
  const vehicleCheck = checkVehicleConstraints(team, settings);
  if (!vehicleCheck.valid) {
    return {
      score: -1,
      breakdown: { skill: 0, availability: 0, travel: 0, leadership: 0, guidance: 0 },
      isStretch: false,
      vehicleArrangement: vehicleCheck.vehicleArrangement,
      vehicleDetails: vehicleCheck.details,
      disqualified: true,
      disqualifyReason: vehicleCheck.details,
    };
  }

  // Skill score (max 10)
  const teamSkillTotal = calculateTeamSkillScore(team, jobType.primarySkills);
  const stretchMultiplier = settings.stretchMode?.enabled
    ? (settings.stretchMode.defaultMultiplier || 1.2)
    : 1.0;

  const stretchInfo = calculateStretchScore(
    teamSkillTotal,
    jobType.requiredSkillTotal * team.length,
    stretchMultiplier
  );

  // Normalize skill score to 0-10
  const maxPossibleSkill = team.length * SKILL_CATEGORIES.length * 10;
  const rawSkillScore = (teamSkillTotal / maxPossibleSkill) * 10;
  const skillScore = Math.max(0, rawSkillScore - stretchInfo.penalty);

  // Availability score (simplified: assume all available unless calendar says otherwise)
  const availabilityScore = 8; // Placeholder - full implementation needs calendar integration

  // Travel score (closer is better, max 10)
  let travelScore = 8; // Default if no location data
  if (job.latitude && job.longitude && settings.baseLocation) {
    const distance = haversineDistance(
      settings.baseLocation.latitude,
      settings.baseLocation.longitude,
      job.latitude,
      job.longitude
    );
    // Score inversely proportional to distance (0-500km range)
    travelScore = Math.max(0, 10 - (distance / 50));
  }

  // Leadership score
  const leadershipScore = evaluateLeaderSuitability(team);

  // Guidance score
  const guidanceScore = evaluateGuidanceCapability(team);

  // Weighted total
  const weights = { skill: 0.35, availability: 0.25, travel: 0.15, leadership: 0.10, guidance: 0.15 };
  const totalScore =
    skillScore * weights.skill +
    availabilityScore * weights.availability +
    travelScore * weights.travel +
    leadershipScore * weights.leadership +
    guidanceScore * weights.guidance;

  // Identify lead candidate (highest leadership score)
  const leadCandidate = [...team].sort((a, b) =>
    (b.skills.leadership || 0) - (a.skills.leadership || 0)
  )[0];

  // Identify mentoring pairs (junior members + their best mentor)
  const mentoringPairs = identifyMentoringPairs(team);

  return {
    score: Math.round(totalScore * 100) / 100,
    breakdown: {
      skill: Math.round(skillScore * 100) / 100,
      availability: availabilityScore,
      travel: Math.round(travelScore * 100) / 100,
      leadership: leadershipScore,
      guidance: guidanceScore,
    },
    isStretch: stretchInfo.isStretch,
    stretchRatio: stretchInfo.stretchRatio,
    teamSkillTotal,
    requiredSkillTotal: jobType.requiredSkillTotal * team.length,
    vehicleArrangement: vehicleCheck.vehicleArrangement,
    vehicleDetails: vehicleCheck.details,
    leadCandidate,
    mentoringPairs,
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

/**
 * Identify mentoring pairs within a team.
 * Pairs junior (needsGuidance) members with their best mentor (highest avgSkill).
 * @param {Array} team - Array of member objects
 * @returns {Array<{ junior: object, mentor: object }>} Mentoring pairs
 */
export function identifyMentoringPairs(team) {
  const juniors = team.filter(m => m.needsGuidance);
  if (juniors.length === 0) return [];

  const seniors = team
    .filter(m => !m.needsGuidance && m.avgSkill >= 4.0)
    .sort((a, b) => b.avgSkill - a.avgSkill);

  return juniors.map(junior => ({
    junior,
    mentor: seniors[0] || null,
  }));
}

/**
 * Main entry: generate all combos, score each, sort desc, return top 5.
 * @param {Array} members - All available members
 * @param {object} job - Job to dispatch for
 * @param {object} jobType - Job type configuration
 * @param {object} settings - App settings
 * @param {Array} calendarEvents - Calendar events for availability checking
 * @returns {Array} Top 5 ranked team recommendations
 */
export function rankTeams(members, job, jobType, settings, calendarEvents = []) {
  const { minPersonnel, maxPersonnel } = jobType;

  // Filter out unavailable members based on calendar events (simplified)
  const availableMembers = filterAvailableMembers(members, job, calendarEvents);

  // Generate all valid team combinations
  const combinations = generateTeamCombinations(availableMembers, minPersonnel, maxPersonnel);

  // Score each combination
  const scoredTeams = combinations
    .map(team => {
      const result = scoreTeam(team, job, jobType, settings);
      return {
        team,
        ...result,
      };
    })
    .filter(t => !t.disqualified && t.score > 0);

  // Sort by score descending
  scoredTeams.sort((a, b) => b.score - a.score);

  // Return top 5 with rank
  return scoredTeams.slice(0, 5).map((t, i) => ({ ...t, rank: i + 1 }));
}

/**
 * Filter members by availability based on calendar events.
 * @param {Array} members - All members
 * @param {object} job - Job with scheduled date/time
 * @param {Array} calendarEvents - Calendar events
 * @returns {Array} Available members
 */
function filterAvailableMembers(members, job, calendarEvents) {
  if (!calendarEvents || calendarEvents.length === 0) {
    return members;
  }

  const jobDate = job.scheduledDate;
  if (!jobDate) return members;

  return members.filter(member => {
    // Check if member has conflicting events on the job date
    const memberEvents = calendarEvents.filter(
      event => event.memberId === member.id && event.date === jobDate
    );
    return memberEvents.length === 0;
  });
}
