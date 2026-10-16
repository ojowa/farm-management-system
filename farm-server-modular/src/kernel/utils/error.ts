export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const prismaErrorResult = (error: any) => {
  const code = typeof error?.code === 'string' ? error.code : undefined;

  if (code === 'P2002') {
    const target = Array.isArray(error?.meta?.target)
      ? error.meta.target.join(', ')
      : error?.meta?.target;
    return {
      message: target
        ? `A record with that ${target} already exists`
        : 'A record with that value already exists',
      statusCode: 409,
      code,
    };
  }
  if (code === 'P2025') {
    return { message: 'Record not found', statusCode: 404, code };
  }
  if (code === 'P2003') {
    return {
      message: 'Related record not found or still in use',
      statusCode: 400,
      code,
    };
  }
  if (code === 'P2023' || code === 'P2018') {
    return { message: 'Invalid value provided', statusCode: 400, code };
  }
  if (code === 'P2011' || code === 'P2012' || code === 'P2010' || code === 'P2016') {
    return { message: 'Invalid request data', statusCode: 400, code };
  }

  if (error?.name === 'PrismaClientValidationError') {
    const lines = String(error.message || '')
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean);
    const detail = lines.find((line: string) =>
      /^(argument|invalid value|missing|unknown (argument|field)|expected)/i.test(line)
    );
    return { message: detail || 'Invalid request data', statusCode: 400, code: 'VALIDATION_ERROR' };
  }

  return undefined;
};

export const handleError = (error: any): { message: string; statusCode: number; code?: string } => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    };
  }
  const prismaResult = prismaErrorResult(error);
  if (prismaResult) return prismaResult;
  return {
    message: 'Internal Server Error',
    statusCode: 500,
  };
};
