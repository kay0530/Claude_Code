export const STATUS_LABELS = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-700' },
  estimated: { label: '見積済', color: 'bg-blue-100 text-blue-700' },
  dispatched: { label: '差配済', color: 'bg-purple-100 text-purple-700' },
  in_progress: { label: '実施中', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '完了', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
};

export const EMPLOYMENT_TYPE_LABELS = {
  regular: '正社員',
  freelancer: '業務委託',
};

export const VEHICLE_LABELS = {
  hiace: 'ハイエース',
  yodogawa_vehicle: '淀川車両（単独）',
  both: 'ハイエース + 淀川車両',
  multiple_hiace: '複数ハイエース',
};

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'ダッシュボード', icon: 'home' },
  { key: 'jobs', label: '案件管理', icon: 'briefcase' },
  { key: 'calendar', label: 'カレンダー', icon: 'calendar' },
  { key: 'members', label: 'メンバー', icon: 'users' },
  { key: 'settings', label: '設定', icon: 'settings' },
];
