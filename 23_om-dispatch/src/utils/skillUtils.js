/**
 * Get a member's manpower value for a specific job type.
 * @param {object} member - Member with manpowerByJobType
 * @param {string} jobTypeId - Job type ID
 * @returns {number} Manpower value (defaults to 0.5)
 */
export function getMemberManpower(member, jobTypeId) {
  return member.manpowerByJobType?.[jobTypeId] ?? 0.5;
}

/**
 * Get total manpower for a team on a specific job type.
 * @param {Array} team - Array of member objects
 * @param {string} jobTypeId - Job type ID
 * @returns {number} Sum of manpower values
 */
export function getTeamTotalManpower(team, jobTypeId) {
  return team.reduce((sum, m) => sum + getMemberManpower(m, jobTypeId), 0);
}

/**
 * Count members with manpower >= 1.0 for a job type (qualified members).
 * @param {Array} team - Array of member objects
 * @param {string} jobTypeId - Job type ID
 * @returns {number} Count of qualified members
 */
export function countQualifiedMembers(team, jobTypeId) {
  return team.filter(m => getMemberManpower(m, jobTypeId) >= 1.0).length;
}

/**
 * Calculate required manpower for a job given base manpower and conditions.
 * Conditions can add (additive) or multiply (multiplicative) the manpower.
 * @param {number} baseManpower - Base manpower from job type
 * @param {Array} conditions - Selected condition objects with adjustmentType/adjustmentValue
 * @returns {number} Adjusted required manpower
 */
export function calculateRequiredManpower(baseManpower, conditions = []) {
  let required = baseManpower;

  for (const cond of conditions) {
    if (cond.adjustmentType === 'additive') {
      required += cond.adjustmentValue || 0;
    } else if (cond.adjustmentType === 'multiplicative') {
      required *= cond.adjustmentValue || 1;
    }
  }

  return Math.round(required * 10) / 10;
}

/**
 * Get manpower level label and color for display.
 * @param {number} manpower - Manpower value
 * @returns {{ label: string, color: string }}
 */
export function getManpowerLevel(manpower) {
  if (manpower >= 1.2) return { label: 'エキスパート', color: '#7C3AED' };
  if (manpower >= 1.0) return { label: '一人前', color: '#2563EB' };
  if (manpower >= 0.7) return { label: '準一人前', color: '#059669' };
  if (manpower >= 0.5) return { label: '見習い', color: '#D97706' };
  return { label: '初心者', color: '#DC2626' };
}
