import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DomainException } from '../common/errors/domain.exception';
import { ApiData } from '../common/swagger/api-data.decorator';
import { UserProfileDto } from '../common/swagger/models';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: { avatar: { type: 'string', format: 'binary', description: 'JPEG, PNG, WebP ou GIF (5 Mo max)' } },
    },
  })
  @ApiOperation({ summary: 'Changer son avatar' })
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiData({ type: UserProfileDto, description: 'Avatar mis à jour' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_AVATAR_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) throw new DomainException('USERS_FILE_MISSING', 'Aucun fichier fourni.', 400);
    // TODO: Upload vers Cloudflare R2 et retourner l'URL publique
    const avatarUrl = `https://placeholder.r2.dev/${userId}-${Date.now()}.${file.mimetype.split('/')[1]}`;
    return this.usersService.updateAvatar(userId, avatarUrl);
  }
}
