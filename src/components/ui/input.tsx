// components/ui/input.tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-50 placeholder:text-slate-500 shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60',
        className
      )}
      {...props}
    />
  );
});

export default Input;
