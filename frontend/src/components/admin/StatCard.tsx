import { ReactNode } from 'react';

export function StatCard({ label, value, icon, tone = 'neutral' }: { label: string; value: ReactNode; icon: ReactNode; tone?: 'neutral' | 'brand' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone === 'brand' ? 'bg-brand-600 text-white' : 'bg-broth-800/10 text-broth-800'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-broth-700">{label}</p>
        <p className="text-xl font-bold text-broth-900">{value}</p>
      </div>
    </div>
  );
}
