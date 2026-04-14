import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  const variantClasses =
    variant === 'primary'
      ? 'bg-brand-500 text-white hover:bg-brand-400'
      : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500';

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${variantClasses} ${className}`}
      {...props}
    />
  );
}
