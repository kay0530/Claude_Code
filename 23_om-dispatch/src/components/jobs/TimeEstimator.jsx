import { calculateRequiredManpower } from '../../utils/skillUtils';

export default function TimeEstimator({ baseTime, baseManpower, conditions, activeConditionIds, minPersonnel, maxPersonnel }) {
  const activeConditions = conditions.filter(c => activeConditionIds.includes(c.id));
  const requiredManpower = calculateRequiredManpower(baseManpower, activeConditions);

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-bold text-gray-700 mb-3">案件要件サマリー</h4>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">基本作業時間</span>
          <span className="font-medium">{baseTime}h</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">基本必要人工</span>
          <span className="font-medium">{baseManpower}</span>
        </div>
        {activeConditions.map(c => (
          <div key={c.id} className="flex justify-between text-sm">
            <span className="text-gray-500">{c.nameJa}</span>
            <span className={`font-medium ${
              c.adjustmentType === 'additive'
                ? (c.adjustmentValue > 0 ? 'text-red-600' : 'text-green-600')
                : (c.adjustmentValue > 1 ? 'text-red-600' : 'text-green-600')
            }`}>
              {c.adjustmentType === 'additive'
                ? `${c.adjustmentValue > 0 ? '+' : ''}${c.adjustmentValue}人工`
                : `×${c.adjustmentValue}`
              }
            </span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between">
          <span className="font-bold text-gray-700">必要人工合計</span>
          <span className="font-bold text-purple-600 text-lg">{requiredManpower.toFixed(1)}</span>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">推奨人数</span>
          <span className="font-bold text-gray-700">
            {minPersonnel === maxPersonnel ? `${minPersonnel}名` : `${minPersonnel}〜${maxPersonnel}名`}
          </span>
        </div>
      </div>
    </div>
  );
}
