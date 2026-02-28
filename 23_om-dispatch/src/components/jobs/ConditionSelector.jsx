export default function ConditionSelector({ conditions, activeIds, onChange, jobTypeId }) {
  const applicableConditions = conditions.filter(
    c => c.applicableJobTypes.length === 0 || c.applicableJobTypes.includes(jobTypeId)
  );

  function toggle(condId) {
    if (activeIds.includes(condId)) {
      onChange(activeIds.filter(id => id !== condId));
    } else {
      onChange([...activeIds, condId]);
    }
  }

  if (applicableConditions.length === 0) {
    return <p className="text-sm text-gray-500">この案件種別に該当する条件はありません</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {applicableConditions.map(cond => {
        const active = activeIds.includes(cond.id);
        return (
          <button
            key={cond.id}
            onClick={() => toggle(cond.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {cond.nameJa}
            {active && cond.timeMultiplier !== 1.0 && (
              <span className="ml-1 opacity-80">
                ({cond.timeMultiplier < 1 ? '' : '+'}{((cond.timeMultiplier - 1) * 100).toFixed(0)}%)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
