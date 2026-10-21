import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UploadService } from '../upload/upload.service';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { RecruiterProfileDto } from './dto/recruiter-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { UserProfileDto } from '../common/swagger/models';


@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploads: UploadService,
  ) {}

  @Get(':username')
  @ApiOperation({ summary: 'Profil public d\'un utilisateur' })
  @ApiData({ type: UserProfileDto, description: 'Profil public' })
  async getProfile(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get(':username/activity')
  @ApiOperation({ summary: 'Activité récente d\'un utilisateur' })
  async getActivity(@Param('username') username: string) {
    return this.usersService.getActivity(username);
  }

  @Get(':username/badges')
  @ApiOperation({ summary: 'Badges d\'un utilisateur' })
  async getBadges(@Param('username') username: string) {
    return this.usersService.getBadges(username);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour son profil' })
  @ApiData({ type: UserProfileDto, description: 'Profil mis à jour' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Post('me/recruiter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activer ou modifier son profil recruteur (nom de l\'entreprise)' })
  @ApiData({ description: 'Profil recruteur activé' })
  enableRecruiter(@CurrentUser('id') userId: string, @Body() dto: RecruiterProfileDto) {
    return this.usersService.enableRecruiter(userId, dto.companyName);
  }

  @Patch('me/onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compléter son profil à l\'onboarding (champs vides uniquement)' })
  completeOnboarding(@CurrentUser('id') userId: string, @Body() dto: OnboardingDto) {
    return this.usersService.completeOnboarding(userId, dto);
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer son avatar après son envoi vers le stockage' })
  @ApiBody({ type: UpdateAvatarDto })
  @ApiData({ type: UserProfileDto, description: 'Avatar mis à jour' })
  async updateAvatar(@CurrentUser('id') userId: string, @Body() dto: UpdateAvatarDto) {
    const avatarUrl = await this.uploads.confirmAvatar(userId, dto.key);
    return this.usersService.updateAvatar(userId, avatarUrl);
  }
}
