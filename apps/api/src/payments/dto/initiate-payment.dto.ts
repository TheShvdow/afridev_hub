import { IsEnum, IsIn, IsOptional, IsString, Matches, ValidateNested, IsEmail, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PRODUCT_CODES, ProductCode } from '../catalog';

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

// Le montant, la devise et la cible viennent du catalogue côté serveur (catalog.ts) :
// le client ne choisit que le produit. Sans moyen de paiement, Bictorys affiche sa page de choix
// (checkout hébergé) ; sans pays, BICTORYS_COUNTRY s'applique (SN par défaut).
export class InitiatePaymentDto {
  @ApiProperty({ enum: PRODUCT_CODES, example: 'RECRUITER_PREMIUM_MONTHLY' })
  @IsIn(PRODUCT_CODES)
  product!: ProductCode;

  @ApiPropertyOptional({ enum: BictorysPaymentType, example: BictorysPaymentType.WAVE_MONEY, description: 'Absent : page de choix hébergée par Bictorys' })
  @IsOptional() @IsEnum(BictorysPaymentType)
  paymentType?: BictorysPaymentType;

  @ApiPropertyOptional({ enum: BictorysCountry, example: BictorysCountry.SN })
  @IsOptional() @IsEnum(BictorysCountry)
  country?: BictorysCountry;

  @ApiPropertyOptional({ type: ChargeCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChargeCustomerDto)
  customer?: ChargeCustomerDto;
}
