import { useApp } from '../../context/AppContext';
import MemberCard from './MemberCard';

export default function MemberListView({ onNavigate }) {
  const { state } = useApp();
  const { members } = state;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">メンバー</h2>
          <p className="text-sm text-gray-500 mt-1">O&Mグループ {members.length}名</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {members.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
