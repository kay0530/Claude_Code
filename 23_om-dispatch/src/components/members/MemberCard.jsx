import SkillRadarChart from './SkillRadarChart';
import { getSkillLevel } from '../../utils/skillUtils';
import { EMPLOYMENT_TYPE_LABELS } from '../../utils/constants';

export default function MemberCard({ member, onClick }) {
  const level = getSkillLevel(member.avgSkill);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: member.color }}
        >
          {member.nameJa.charAt(0)}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-800 truncate">{member.nameJa}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              member.employmentType === 'freelancer'
                ? 'bg-cyan-50 text-cyan-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {EMPLOYMENT_TYPE_LABELS[member.employmentType]}
            </span>
            {member.hasVehicle && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                自家用車
              </span>
            )}
            {member.needsGuidance && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                要指導
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold" style={{ color: level.color }}>
              {member.avgSkill.toFixed(1)}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: level.color }}
            >
              {level.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">{member.outlookEmail}</p>
        </div>
        <SkillRadarChart skills={member.skills} size={120} color={member.color} />
      </div>
    </div>
  );
}
