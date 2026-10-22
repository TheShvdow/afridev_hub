import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class UserMeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  reputation!: number;

  @ApiProperty({ description: 'Emails d\'activité (FR-18)' })
  emailNotifications!: boolean;

  @ApiProperty()
  isRecruiter!: boolean;

  @ApiProperty({ nullable: true, example: 'Acme Dakar' })
  companyName!: string | null;

  @ApiProperty({ nullable: true, example: 'XOF', description: 'Devise d\'affichage des salaires' })
  preferredCurrency!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
