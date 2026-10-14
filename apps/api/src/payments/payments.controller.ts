import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UseGuards,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentsService, PaymentProvider } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class InitiatePaymentDto {
  @ApiProperty({ example: 10000 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'XOF' })
  @IsString()
  currency!: string;

  @ApiProperty({ enum: ['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'STRIPE'] })
  @IsEnum(['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'STRIPE'])
  provider!: PaymentProvider;

  @ApiProperty({ example: 'JOB_PREMIUM_30D' })
  @IsString()
  purpose!: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initier un paiement' })
  initiate(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment({ ...dto, userId });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statut d\'un paiement' })
  getPayment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paymentsService.getPayment(id, userId);
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des paiements' })
  getHistory(@CurrentUser('id') userId: string) {
    return this.paymentsService.getUserPayments(userId);
  }

  // ── Webhooks (pas de guard — vérification par signature) ─────────────

  @Post('webhooks/wave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Wave' })
  waveWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('x-wave-signature') signature: string,
  ) {
    return this.paymentsService.handleWaveWebhook(payload, signature);
  }

  @Post('webhooks/orange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Orange Money' })
  orangeWebhook(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleOrangeWebhook(payload);
  }

  @Post('webhooks/mtn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook MTN MoMo' })
  mtnWebhook(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.handleMtnWebhook(payload);
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe' })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody!, signature);
  }
}
