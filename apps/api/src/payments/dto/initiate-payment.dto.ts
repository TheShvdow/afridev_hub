import { IsEnum, IsInt, IsPositive, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentEntityType, PaymentProvider } from '@prisma/client';

// Champs alignés sur le modèle Prisma Payment : amount (Int, unité de base), currency (ISO 4217),
// provider (enum), entityType (enum) + entityId.
export class InitiatePaymentDto {
  @ApiProperty({ example: 10000, description: 'Montant en unités de base (entier)' })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'XOF', description: 'Code devise ISO 4217' })
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex. XOF).' })
  currency!: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.WAVE })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentEntityType })
  @IsEnum(PaymentEntityType)
  entityType!: PaymentEntityType;

  @ApiProperty({ example: 'cmv834jwr000b90svzuzcjamz' })
  @IsString()
  entityId!: string;
}
