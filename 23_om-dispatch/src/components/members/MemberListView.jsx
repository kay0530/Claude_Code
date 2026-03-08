import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import MemberCard from './MemberCard';
import MemberEditModal from './MemberEditModal';

export default function MemberListView() {
  const { state, dispatch } = useApp();
  const { members } = state;
  const [editingMember, setEditingMember] = useState(null);

  function handleSave(memberId, manpowerByJobType) {
    dispatch({
      type: 'UPDATE_MEMBER',
      payload: { id: memberId, manpowerByJobType },
    });
  }

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
            onClick={() => setEditingMember(member)}
          />
        ))}
      </div>

      <MemberEditModal
        key={editingMember?.id}
        member={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleSave}
      />
    </div>
  );
}
