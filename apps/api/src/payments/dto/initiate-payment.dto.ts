import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches, Min, ValidateNested, IsEmail, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentEntityType } from '@prisma/client';

// Moyens de paiement et pays tels que nommés par la doc Bictorys (§3 et §8).
export enum BictorysPaymentType {
  WAVE_MONEY   = 'wave_money',
  ORANGE_MONEY = 'orange_money',
  MTN_MONEY    = 'mtn_money',
  MOOV         = 'moov',
  TOGOCELL     = 'togocell',
  MOBICASH     = 'mobicash',
  MAXIT        = 'maxit',
  CARD         = 'card',
}

// Codes pays Bictorys (§9). Le guide cite BK pour le Burkina ; ses exemples disent BF : à trancher en sandbox.
export enum BictorysCountry {
  SN = 'SN',
  CI = 'CI',
  BK = 'BK',
  ML = 'ML',
  TG = 'TG',
  BJ = 'BJ',
}

export class ChargeCustomerDto {
  @ApiPropertyOptional({ example: 'Amadou Fall' })
  @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '+221771234567', description: 'Format +INDICATIF NUMERO, sans espaces' })
  @IsOptional() @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Le téléphone doit suivre le format +221771234567, sans espaces.' })
  phone?: string;

  @ApiPropertyOptional({ example: 'amadou@example.com' })
  @IsOptional() @IsEmail()
  email?: string;
}

export class InitiatePaymentDto {
  @ApiProperty({ example: 5000, minimum: 100, description: 'Montant en FCFA (entier, sans décimales)' })
  @IsInt()
  @IsPositive()
  @Min(100, { message: 'Le montant minimum est de 100 FCFA.' })
  amount!: number;

  @ApiProperty({ example: 'XOF', enum: ['XOF'] })
  @Matches(/^XOF$/, { message: 'Seul le franc CFA (XOF) est accepté.' })
  currency!: string;

  @ApiProperty({ enum: BictorysPaymentType, example: BictorysPaymentType.WAVE_MONEY })
  @IsEnum(BictorysPaymentType)
  paymentType!: BictorysPaymentType;

  @ApiProperty({ enum: BictorysCountry, example: BictorysCountry.SN })
  @IsEnum(BictorysCountry)
  country!: BictorysCountry;

  @ApiProperty({ enum: PaymentEntityType })
  @IsEnum(PaymentEntityType)
  entityType!: PaymentEntityType;

  @ApiProperty({ example: 'cmv834jwr000b90svzuzcjamz' })
  @IsString()
  entityId!: string;

  @ApiPropertyOptional({ type: ChargeCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChargeCustomerDto)
  customer?: ChargeCustomerDto;
}
