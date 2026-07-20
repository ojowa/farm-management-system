'use client';

import { useState, useCallback } from 'react';
import { ZodSchema, ZodError } from 'zod';

interface ValidationErrors {
  [field: string]: string;
}

export function useFormValidation<T>(schema: ZodSchema<T>) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = useCallback((data: unknown): data is T => {
    try {
      schema.parse(data);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: ValidationErrors = {};
        err.errors.forEach((e) => {
          const field = e.path.join('.');
          if (!fieldErrors[field]) fieldErrors[field] = e.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  }, [schema]);

  const clearErrors = useCallback(() => setErrors({}), []);
  const getFieldError = useCallback((field: string) => errors[field], [errors]);

  return { errors, validate, clearErrors, getFieldError };
}
