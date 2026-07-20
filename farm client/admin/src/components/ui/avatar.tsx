'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const initials = fallback || alt?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    if (src && !imageError) {
      return (
        <div
          ref={ref}
          className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
          {...props}
        >
          <img
            src={src}
            alt={alt || ''}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-sm',
          className
        )}
        {...props}
      >
        {initials}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };