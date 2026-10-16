import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Only the request BODY is validated. The pipe is usually attached with
    // @UsePipes at method level, so Nest also hands it @Param/@Query/@Req
    // values — parsing those (e.g. a `:id` path string) against an object
    // schema always throws, which made every PUT/PATCH with a bound :id
    // fail with 400 before its body was ever checked. Non-body args pass
    // through untouched; no schema in the codebase targets them.
    if (metadata.type !== 'body') return value;
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: any) {
      throw new BadRequestException('Validation failed', {
        cause: error,
        description: error.errors,
      });
    }
  }
}
