import {
  Controller,
  Post,
  Body,
  Req,
  Param,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { FinanceApplicationService } from '../../application/services/finance.service';
import { ZodValidationPipe } from '@farm/utils';
import { z } from 'zod';

const convertLedgerSchema = z.object({
  entityType: z.enum(['expense', 'sale', 'contract', 'marketListing']),
  entityId: z.string().uuid(),
  toCurrency: z.string().length(3).toUpperCase(),
});

const setLedgerStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'POSTED', 'VOIDED']),
});

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private readonly financeService: FinanceApplicationService) {}

  @Permission('finance.read')
  @UseGuards(AuthorizationGuard)
  @Post('convert')
  @UsePipes(new ZodValidationPipe(convertLedgerSchema))
  @HttpCode(HttpStatus.OK)
  async convertLedger(@Req() req: any, @Body() body: z.infer<typeof convertLedgerSchema>) {
    return this.financeService.convertLedger({
      ...body,
      organizationId: getOrgId(req),
    });
  }

  @Permission('finance.write')
  @UseGuards(AuthorizationGuard)
  @Post(':entityType/:entityId/status')
  @UsePipes(new ZodValidationPipe(setLedgerStatusSchema))
  @HttpCode(HttpStatus.OK)
  async setLedgerStatus(
    @Req() req: any,
    @Param('entityType') entityType: 'expense' | 'sale',
    @Param('entityId') entityId: string,
    @Body() body: z.infer<typeof setLedgerStatusSchema>,
  ) {
    return this.financeService.setLedgerStatus({
      entityType,
      entityId,
      status: body.status,
      organizationId: getOrgId(req),
    });
  }
}
