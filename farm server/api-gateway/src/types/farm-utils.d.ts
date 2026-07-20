declare module '@farm/utils' {
  // Minimal type shim to unblock api-gateway compilation in this repo.

  export function handleError(...args: any[]): { statusCode: number; message: string; code?: string };

  export const ZodValidationPipe: any;
}

