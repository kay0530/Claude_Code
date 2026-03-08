import { getManpowerLevel } from '../../utils/skillUtils';
import { EMPLOYMENT_TYPE_LABELS } from '../../utils/constants';
import { DEFAULT_JOB_TYPES } from '../../data/jobTypes';

const JOB_TYPE_SHORT_NAMES = {
  jt_pawamaru_survey: '現調',
  jt_pawamaru_construction: '工事',
  jt_annual_inspection: '年次',
  jt_emergency_inspection: '駆付',
  jt_cleaning: '洗浄',
  jt_panel_detach: '脱着',
  jt_panel_removal: '撤去',
  jt_other: '他',
};

export default function MemberCard({ member, onClick }) {
  const manpowerValues = member.manpowerByJobType || {};
  const manpowerEntries = DEFAULT_JOB_TYPES.map(jt => ({
    id: jt.id,
    shortName: JOB_TYPE_SHORT_NAMES[jt.id] || jt.nameJa.substring(0, 2),
    value: manpowerValues[jt.id] ?? 0.5,
  }));

  // Calculate average manpower across all job types
  const avgManpower = manpowerEntries.length > 0
    ? manpowerEntries.reduce((sum, e) => sum + e.value, 0) / manpowerEntries.length
    : 0.5;

  const level = getManpowerLevel(avgManpower);

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

      {/* Manpower level summary */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl font-bold" style={{ color: level.color }}>
          {avgManpower.toFixed(2)}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: level.color }}
        >
          {level.label}
        </span>
        <span className="text-xs text-gray-400 ml-auto">平均人工</span>
      </div>

      {/* Manpower table */}
      <div className="grid grid-cols-4 gap-1">
        {manpowerEntries.map(entry => {
          const entryLevel = getManpowerLevel(entry.value);
          return (
            <div key={entry.id} className="text-center">
              <div className="text-[10px] text-gray-500 truncate">{entry.shortName}</div>
              <div
                className="text-xs font-bold"
                style={{ color: entryLevel.color }}
              >
                {entry.value}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-2 truncate">{member.outlookEmail}</p>
    </div>
  );
}
