import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LabeledInputProps = Omit<React.ComponentProps<'input'>, 'id'> & {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  messageClassName?: string;
  requiredMark?: boolean;
};

const LabeledInput = React.forwardRef<HTMLInputElement, LabeledInputProps>(
  (
    {
      id,
      label,
      description,
      error,
      wrapperClassName,
      labelClassName,
      inputClassName,
      messageClassName,
      requiredMark = false,
      required,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const descriptionId = description ? `${id}-description` : undefined;
    const errorId = hasError ? `${id}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('grid gap-1.5', wrapperClassName)}>
        <Label htmlFor={id} className={labelClassName}>
          {label}
          {(required || requiredMark) && <span aria-hidden="true">*</span>}
        </Label>

        <Input
          id={id}
          ref={ref}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          className={inputClassName}
          {...props}
        />

        {description && !hasError && (
          <p id={descriptionId} className={cn('text-xs text-muted-foreground', messageClassName)}>
            {description}
          </p>
        )}

        {hasError && (
          <p id={errorId} className={cn('text-xs text-destructive', messageClassName)}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

LabeledInput.displayName = 'LabeledInput';

export { LabeledInput };
