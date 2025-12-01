// components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'primary', ...props },
  ref
) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants: Record<typeof variant, string> = {
    primary:
      'bg-orange-500 text-slate-950 shadow-[0_0_16px_rgba(249,115,22,0.65)] hover:brightness-110',
    secondary:
      'bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10',
    ghost:
      'bg-transparent text-slate-300 hover:bg-white/5',
  };

  return (
    <button ref={ref} className={clsx(base, variants[variant], className)} {...props} />
  );
});

export default Button;
