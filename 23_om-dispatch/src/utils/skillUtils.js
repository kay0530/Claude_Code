import { SKILL_CATEGORIES } from '../data/skillCategories';

export function calculateAvgSkill(skills) {
  const values = SKILL_CATEGORIES.map(cat => skills[cat.key] || 0);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateWeightedSkillTotal(members, primarySkillKeys) {
  let total = 0;
  for (const member of members) {
    for (const key of primarySkillKeys) {
      total += member.skills[key] || 0;
    }
  }
  return total;
}

export function getSkillLevel(avgSkill) {
  if (avgSkill >= 9) return { label: 'エキスパート', color: '#7C3AED' };
  if (avgSkill >= 7) return { label: '上級', color: '#2563EB' };
  if (avgSkill >= 5) return { label: '中級', color: '#059669' };
  if (avgSkill >= 3) return { label: '基本', color: '#D97706' };
  return { label: '初心者', color: '#DC2626' };
}
