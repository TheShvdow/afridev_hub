import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { PaymentDto } from '../common/swagger/models';
import { PaymentInitiatedDto, PaymentProductDto } from '../common/swagger/models-extra';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('products')
  @ApiOperation({ summary: 'Produits payants et leurs prix (catalogue côté serveur)' })
  @ApiData({ type: PaymentProductDto, array: true, description: 'Produits payants et prix fixés par le serveur' })
  listProducts() {
    return this.paymentsService.listProducts();
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payer un produit du catalogue via Bictorys (le prix est fixé par le serveur)' })
  @ApiData({ type: PaymentInitiatedDto, status: 201, description: 'Paiement initié : rediriger vers redirectUrl' })
  initiate(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(userId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statut d\'un paiement' })
  @ApiData({ type: PaymentDto, description: 'Paiement' })
  getPayment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paymentsService.getPayment(id, userId);
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des paiements' })
  @ApiData({ type: PaymentDto, array: true, description: 'Paiements de l\'utilisateur' })
  getHistory(@CurrentUser('id') userId: string) {
    return this.paymentsService.getUserPayments(userId);
  }

  // ── Webhook Bictorys (pas de guard : authentifié par signature) ──────

  @Post('webhooks/bictorys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Bictorys — confirmation de paiement' })
  @ApiData({ description: 'Webhook accepté' })
  @ApiHeader({ name: 'X-Secret-Key', required: false, description: 'Secret statique du webhook' })
  @ApiHeader({ name: 'X-Webhook-Signature', required: false, description: 'HMAC-SHA256 hex' })
  @ApiHeader({ name: 'X-Webhook-Timestamp', required: false, description: 'Unix ms, fenêtre de 5 minutes' })
  @ApiBody({ schema: { type: 'object', description: 'Payload Bictorys (id, status, paymentReference, amount, currency, …)' } })
  bictorysWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-secret-key') secretKey?: string,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf-8') ?? '';
    return this.paymentsService.handleBictorysWebhook(rawBody, { secretKey, signature, timestamp });
  }
}
