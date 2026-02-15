import React from 'react';
import { cn } from '../lib/utils';

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur',
        props.className
      )}
    />
  );
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/25 disabled:opacity-50 disabled:pointer-events-none';
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-b from-white/20 to-white/10 text-white border border-white/15 hover:from-white/25 hover:to-white/15',
    secondary: 'bg-white/10 text-white border border-white/10 hover:bg-white/15',
    ghost: 'bg-transparent text-white/80 hover:bg-white/10',
    danger: 'bg-red-500/15 text-red-100 border border-red-500/20 hover:bg-red-500/20',
  };
  const sizes: Record<string, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };
  return <button {...props} className={cn(base, variants[variant], sizes[size], className)} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/15',
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <textarea
      {...props}
      onInput={(e) => {
        adjustHeight(e as any);
        props.onInput?.(e);
      }}
      onFocus={(e) => {
        adjustHeight(e);
        props.onFocus?.(e);
      }}
      className={cn(
        'min-h-[100px] w-full resize-none overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/15',
        props.className
      )}
    />
  );
}

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn('text-sm text-white/70', props.className)} />;
}

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80', className)}>
      {children}
    </span>
  );
}
