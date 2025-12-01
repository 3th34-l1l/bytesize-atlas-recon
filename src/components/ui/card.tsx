// components/ui/card.tsx
import clsx from 'clsx';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.6)]',
        className
      )}
    >
      {children}
    </div>
  );
}
