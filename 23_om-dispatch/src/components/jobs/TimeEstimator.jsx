export default function TimeEstimator({ baseTime, conditions, activeConditionIds, requiredSkill, minPersonnel, maxPersonnel }) {
  const activeConditions = conditions.filter(c => activeConditionIds.includes(c.id));
  const totalMultiplier = activeConditions.reduce((acc, c) => acc * c.timeMultiplier, 1.0);
  const estimatedTime = baseTime * totalMultiplier;

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-bold text-gray-700 mb-3">想定所要時間</h4>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">基本時間</span>
          <span className="font-medium">{baseTime}h</span>
        </div>
        {activeConditions.map(c => (
          <div key={c.id} className="flex justify-between text-sm">
            <span className="text-gray-500">{c.nameJa}</span>
            <span className={`font-medium ${c.timeMultiplier > 1 ? 'text-red-600' : 'text-green-600'}`}>
              ×{c.timeMultiplier.toFixed(2)}
            </span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between">
          <span className="font-bold text-gray-700">合計推定時間</span>
          <span className="font-bold text-blue-600 text-lg">{estimatedTime.toFixed(1)}h</span>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">必要スキル合計</span>
          <span className="font-bold text-purple-600">{requiredSkill}</span>
        </div>
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
