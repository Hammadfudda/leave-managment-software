import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

import {
  Loader2,
} from 'lucide-react';

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success';

const variants:
  Record<
    Variant,
    string
  > = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',

    secondary:
      'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',

    ghost:
      'text-gray-600 hover:bg-gray-100',

    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',

    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  };

interface Props
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;

  children:
    ReactNode;

  /*
   * Standard backend-processing state.
   * Example:
   * <Button loading={saving} loadingText="Saving...">
   *   Save Changes
   * </Button>
   */
  loading?:
    boolean;

  loadingText?:
    ReactNode;
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  loading = false,
  loadingText,
  disabled,
  ...props
}: Props) {
  const isDisabled =
    Boolean(
      disabled ||
      loading
    );

  return (
    <button
      disabled={
        isDisabled
      }
      aria-busy={
        loading
          ? true
          : undefined
      }
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <Loader2
          size={16}
          className="animate-spin"
        />
      )}

      {loading
        ? loadingText ||
          children
        : children}
    </button>
  );
}
