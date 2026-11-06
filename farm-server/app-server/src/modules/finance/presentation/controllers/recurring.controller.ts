import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { RecurringTransactionService } from '../../application/services/recurring-transaction.service';
import { ZodValidationPipe } from '@farm/utils';
import { z } from 'zod';

const generateRecurringSchema = z.object({
  farmId: z.string().uuid(),
  asOfDate: z.string().datetime().optional(),
});

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurring: RecurringTransactionService) {}

  @Permission('finance.write')
  @UseGuards(AuthorizationGuard)
  @Post('generate')
  @UsePipes(new ZodValidationPipe(generateRecurringSchema))
  @HttpCode(HttpStatus.OK)
  async generate(@Req() req: any, @Body() body: z.infer<typeof generateRecurringSchema>) {
    return this.recurring.generateFromContracts({
      farmId: body.farmId,
      organizationId: getOrgId(req),
      asOfDate: body.asOfDate,
    });
  }
}
