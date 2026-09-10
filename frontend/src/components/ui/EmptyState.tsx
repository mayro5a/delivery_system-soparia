import { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-broth-800/20 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="text-broth-800/40">{icon}</div>}
      <p className="font-display text-lg font-semibold text-broth-900">{title}</p>
      {description && <p className="max-w-xs text-sm text-broth-700">{description}</p>}
      {action}
    </div>
  );
}
