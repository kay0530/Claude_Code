const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

/**
 * Reusable badge component.
 * @param {{ children: React.ReactNode, color?: string, size?: string }}
 */
export default function Badge({ children, color = 'blue', size = 'sm' }) {
  const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.blue;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colorClass} ${sizeClass}`}>
      {children}
    </span>
  );
}
