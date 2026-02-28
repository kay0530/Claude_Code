import Badge from '../shared/Badge';
import StretchIndicator from './StretchIndicator';
import { VEHICLE_LABELS } from '../../utils/constants';
import { SKILL_CATEGORIES } from '../../data/skillCategories';

const SCORE_LABELS = {
  skill: 'スキル',
  availability: '稼働',
  travel: '移動',
  leadership: 'リーダー',
  guidance: '指導',
};

/**
 * Shows ranked team recommendations.
 * @param {{ recommendations: Array, selectedIndex: number|null, onSelect: (index: number) => void }}
 */
export default function RecommendationPanel({ recommendations, selectedIndex, onSelect, stretchMultiplier }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">差配を実行すると候補チームが表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
        推奨チーム ({recommendations.length}件)
      </h3>
      {recommendations.map((rec, index) => (
        <RecommendationCard
          key={index}
          recommendation={rec}
          isSelected={selectedIndex === index}
          onClick={() => onSelect(index)}
          stretchMultiplier={stretchMultiplier}
        />
      ))}
    </div>
  );
}

/**
 * Individual recommendation card.
 */
function RecommendationCard({ recommendation, isSelected, onClick, stretchMultiplier }) {
  const { rank, team, score, breakdown, isStretch, stretchRatio, teamSkillTotal, requiredSkillTotal, vehicleArrangement, vehicleDetails, leadCandidate, mentoringPairs } = recommendation;

  const scorePercentage = Math.round((score / 10) * 100);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 shadow-md ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Header: Rank, Score, Stretch */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              rank === 1
                ? 'bg-yellow-100 text-yellow-700'
                : rank === 2
                  ? 'bg-gray-100 text-gray-600'
                  : rank === 3
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-50 text-gray-500'
            }`}
          >
            {rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-800">
                {score.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">/ 10</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStretch && (
            <StretchIndicator
              isStretch={isStretch}
              stretchMultiplier={stretchMultiplier}
              teamSkillTotal={teamSkillTotal}
              requiredSkillTotal={requiredSkillTotal}
            />
          )}
          {vehicleArrangement && vehicleArrangement !== 'invalid' && (
            <Badge color={vehicleArrangement === 'both' ? 'purple' : 'green'} size="sm">
              {VEHICLE_LABELS[vehicleArrangement] || vehicleDetails}
            </Badge>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            scorePercentage >= 70
              ? 'bg-green-500'
              : scorePercentage >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(scorePercentage, 100)}%` }}
        />
      </div>

      {/* Team members */}
      <div className="flex flex-wrap gap-2 mb-3">
        {team.map(member => (
          <div
            key={member.id}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              leadCandidate && leadCandidate.id === member.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: member.color }}
            >
              {member.nameJa.charAt(0)}
            </div>
            <span>{member.nameJa}</span>
            {leadCandidate && leadCandidate.id === member.id && (
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Skill breakdown chart */}
      <div className="grid grid-cols-5 gap-1.5">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="text-[10px] text-gray-500 mb-1 truncate">
              {SCORE_LABELS[key] || key}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min((value / 10) * 100, 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-medium text-gray-700 mt-0.5">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </div>
          </div>
        ))}
      </div>

      {/* Mentoring pairs display */}
      {mentoringPairs && mentoringPairs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12.75 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">指導ペア</span>
          </div>
          {mentoringPairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              {pair.mentor ? (
                <>
                  <span className="font-medium text-gray-800">{pair.mentor.nameJa}</span>
                  <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="text-orange-600">{pair.junior.nameJa}</span>
                  <span className="text-gray-400">（指導対象）</span>
                </>
              ) : (
                <span className="text-red-500 text-[11px]">
                  {pair.junior.nameJa}の指導者が不在
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
