import { LucideIcon } from 'lucide-react';
import { Category } from '../../types';
import { getCategoryIcon } from '../../utils/categoryIcon';

export function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="no-scrollbar sticky top-16 z-20 flex gap-1 overflow-x-auto border-b border-broth-900/10 bg-cream-100/95 px-4 backdrop-blur-md">
      <TabButton label="Tudo" isActive={active === null} onClick={() => onSelect(null)} />
      {categories.map((category) => (
        <TabButton
          key={category.id}
          label={category.name}
          icon={getCategoryIcon(category.name)}
          isActive={active === category.id}
          onClick={() => onSelect(category.id)}
        />
      ))}
    </div>
  );
}

function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-sm font-semibold transition-colors ${
        isActive ? 'text-broth-900' : 'text-broth-700/60 hover:text-broth-900'
      }`}
    >
      {Icon && <Icon size={15} strokeWidth={2.25} className={isActive ? 'text-brand-500' : 'text-broth-700/50'} />}
      {label}
      <span
        className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500 transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  );
}
