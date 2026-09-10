import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary: 'bg-broth-800 text-white hover:bg-broth-900 disabled:bg-broth-700/50',
  outline: 'border-2 border-brand-500 text-brand-600 hover:bg-brand-50 disabled:opacity-50',
  ghost: 'text-broth-800 hover:bg-broth-800/10 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2 rounded-full gap-1.5',
  md: 'text-base px-5 py-3 rounded-full gap-2',
  lg: 'text-lg px-6 py-3.5 rounded-full gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, fullWidth, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-semibold transition-[background-color,color,border-color,transform] duration-150 ease-snap active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 size={18} className="animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
