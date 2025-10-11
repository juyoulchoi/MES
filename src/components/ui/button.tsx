import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 전역 Button 컴포넌트 (shadcn/ui 기반)
 * - 전역 커서 정책 강화: `!cursor-pointer`, `disabled:!cursor-not-allowed`
 * - variant / size 지원
 */

const base = [
  'inline-flex items-center justify-center gap-2 whitespace-nowrap',
  'rounded-md text-sm font-medium',
  '!cursor-pointer disabled:!cursor-not-allowed', // 중요도 부여로 레거시 CSS/전역 규칙을 이김
  'ring-offset-background focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
].join(' ');

export const buttonVariants = cva(base, {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline:
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      link: 'underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3',
      lg: 'h-10 rounded-md px-8',
      icon: 'h-9 w-9',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, className }),
          '!cursor-pointer disabled:!cursor-not-allowed'
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;
