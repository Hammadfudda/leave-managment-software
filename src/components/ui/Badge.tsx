import type { ReactNode } from 'react';

type Variant = 'gray' | 'yellow' | 'blue' | 'green' | 'red' | 'orange' | 'teal';

const styles: Record<Variant, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
};

export default function Badge({
  children,
  variant = 'gray',
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
