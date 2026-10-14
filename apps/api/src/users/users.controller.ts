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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':username')
  @ApiOperation({ summary: 'Profil public d\'un utilisateur' })
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
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Changer son avatar' })
  @UseInterceptors(FileInterceptor('avatar'))
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
    if (!file) throw new BadRequestException('Aucun fichier fourni.');
    // TODO: Upload vers Cloudflare R2 et retourner l'URL publique
    const avatarUrl = `https://placeholder.r2.dev/${userId}-${Date.now()}.${file.mimetype.split('/')[1]}`;
    return this.usersService.updateAvatar(userId, avatarUrl);
  }
}
