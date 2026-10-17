import { Controller, Post, Req, Body, BadRequestException } from '@nestjs/common';
import { PaymentsApplicationService } from '../../application/services/payments.service';

/**
 * Public Paystack webhook (no guards by design):
 *  - AuthMiddleware allowlists `/payments/webhook` (Paystack sends no token);
 *  - EnvelopeInterceptor skips it so Paystack gets a plain ack;
 *  - PaymentsApplicationService verifies the `x-paystack-signature` HMAC over
 *    the raw body before acting on anything.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsApplicationService) {}

  @Post('webhook')
  async webhook(@Req() req: any, @Body() _body: any) {
    const raw = req.rawBody as Buffer | undefined;
    if (!raw) {
      // createApp() enables Nest rawBody — if it ever isn't there, failing
      // loudly is correct: Paystack will retry and we never act unverified.
      throw new BadRequestException('Raw body unavailable for signature verification');
    }
    return this.payments.handleWebhook(raw, String(req.headers['x-paystack-signature'] || ''));
  }
}
